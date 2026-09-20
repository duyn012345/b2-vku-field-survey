import { findQuestionSet } from '../config/questions';
import { getAllSurveys, updateSurvey } from './db';
import { getSettings } from './settings';
import { formatAnswer, fmtSheetTime } from './utils';

/**
 * Đồng bộ: IndexedDB -> Google Apps Script -> Google Sheets (1 phiên = 1 dòng) + Google Drive (ảnh).
 *
 * Trạng thái hiển thị: Offline -> Đang đồng bộ -> Đã đồng bộ / Lỗi
 *  - phase 'idle' | 'syncing' | 'done' | 'error'  (Offline được suy ra từ navigator.onLine)
 */
const MAX_AUTO_ATTEMPTS = 5; // lỗi từ phía server: tự thử tối đa 5 lần, sau đó chờ người dùng bấm "Đồng bộ ngay"

let running = false;
let state = { phase: 'idle', message: '', current: 0, total: 0 };
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export function subscribeSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSyncState() {
  return state;
}

class SyncError extends Error {
  constructor(message, { network = false } = {}) {
    super(message);
    this.isNetwork = network;
  }
}

function buildPayload(s) {
  const set = findQuestionSet(s.questionSetId);
  return {
    id: s.id,
    createdAt: s.createdAt,
    createdAtLocal: fmtSheetTime(s.createdAt),
    interviewer: s.interviewer,
    student: s.student || {},
    questionSetId: s.questionSetId,
    questionSetTitle: set ? set.title : s.questionSetId,
    answers: (set ? set.questions : []).map((q) => ({
      key: q.id,
      header: q.short || q.label,
      value: formatAnswer(s.answers?.[q.id]),
    })),
    answersJson: JSON.stringify(s.answers || {}),
    gps: s.gps || null,
    note: s.note || '',
    photos: (s.photos || [])
      .filter((p) => p.dataUrl)
      .map((p, i) => ({
        name: p.name || `photo_${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        base64: p.dataUrl.split(',')[1],
      })),
    device: navigator.userAgent,
  };
}

async function callApi(gasUrl, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(gasUrl, {
      method: 'POST',
      // text/plain => "simple request", không bị preflight CORS (Apps Script không hỗ trợ OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new SyncError(
      err.name === 'AbortError'
        ? 'Hết thời gian chờ máy chủ.'
        : 'Không kết nối được máy chủ. Kiểm tra mạng, URL Apps Script và quyền truy cập "Anyone".',
      { network: true }
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new SyncError(`Máy chủ trả về lỗi HTTP ${res.status}.`);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new SyncError('Phản hồi không hợp lệ từ Apps Script. Hãy deploy lại Web App với quyền truy cập "Anyone".');
  }
  if (!data.ok) throw new SyncError(data.error || 'Apps Script báo lỗi.');
  return data;
}

/** Kiểm tra kết nối tới Apps Script (nút "Kiểm tra kết nối" trong Cài đặt). */
export async function pingServer(gasUrl, apiKey) {
  return callApi(gasUrl, { action: 'ping', apiKey }, 20000);
}

export async function syncAll({ manual = false } = {}) {
  if (running) return;
  if (!navigator.onLine) return;

  const all = await getAllSurveys();
  const unsynced = all.filter((s) => s.status !== 'synced');
  if (unsynced.length === 0) {
    if (state.phase !== 'syncing') setState({ phase: 'idle', message: '' });
    return;
  }

  const { gasUrl, apiKey } = getSettings();
  if (!gasUrl) {
    setState({ phase: 'error', message: 'Chưa cấu hình URL Google Apps Script (vào Cài đặt).' });
    return;
  }

  const queue = unsynced.filter((s) => manual || (s.attempts || 0) < MAX_AUTO_ATTEMPTS);
  if (queue.length === 0) return;

  running = true;
  let ok = 0;
  let failed = 0;
  let lastError = '';
  setState({ phase: 'syncing', message: '', current: 0, total: queue.length });

  try {
    for (let i = 0; i < queue.length; i++) {
      const s = queue[i];
      setState({ current: i + 1 });
      await updateSurvey(s.id, { status: 'syncing' });
      try {
        const res = await callApi(gasUrl, { action: 'submit', apiKey, survey: buildPayload(s) }, 120000);
        await updateSurvey(s.id, (cur) => ({
          ...cur,
          status: 'synced',
          syncedAt: new Date().toISOString(),
          lastError: null,
          sheetRow: res.row || null,
          // Giải phóng bộ nhớ: bỏ ảnh gốc sau khi đã lên Drive, giữ thumbnail + link Drive
          photos: (cur.photos || []).map((p, idx) => ({
            id: p.id,
            name: p.name,
            size: p.size,
            thumb: p.thumb,
            driveUrl: (res.photoUrls && res.photoUrls[idx]) || '',
          })),
        }));
        ok++;
      } catch (err) {
        failed++;
        lastError = err.message;
        await updateSurvey(s.id, (cur) => ({
          ...cur,
          // Lỗi mạng: giữ 'pending' để tự thử lại; lỗi từ server: 'error'
          status: err.isNetwork ? 'pending' : 'error',
          lastError: err.message,
          attempts: err.isNetwork ? cur.attempts || 0 : (cur.attempts || 0) + 1,
        }));
        if (err.isNetwork) break; // mạng rớt giữa chừng -> dừng, đợi lần sau
      }
    }
  } finally {
    running = false;
  }

  if (failed > 0) setState({ phase: 'error', message: lastError, current: 0, total: 0 });
  else setState({ phase: 'done', message: `Đã đồng bộ ${ok} phiên khảo sát`, current: 0, total: 0 });
}
