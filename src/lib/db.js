import { openDB } from 'idb';

/**
 * IndexedDB – nơi lưu toàn bộ phiên khảo sát trên thiết bị (offline-first).
 *
 * Bản ghi:
 * {
 *   id, createdAt, interviewer,
 *   student: { name, studentId, faculty, year, contact },
 *   questionSetId, answers: { [questionId]: value },
 *   gps: { lat, lng, accuracy, capturedAt } | null,
 *   photos: [{ id, name, dataUrl, thumb, size, driveUrl? }],
 *   note,
 *   status: 'pending' | 'syncing' | 'synced' | 'error',
 *   attempts, lastError, syncedAt, sheetRow
 * }
 */
const DB_NAME = 'vku-field-survey';
const STORE = 'surveys';

let dbPromise;
const listeners = new Set();

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

function emit() {
  listeners.forEach((fn) => fn());
}

/** Đăng ký nhận thông báo khi dữ liệu thay đổi (để UI tự cập nhật). */
export function subscribeDB(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function saveSurvey(survey) {
  const db = await getDB();
  await db.put(STORE, survey);
  emit();
}

export async function getAllSurveys() {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Cập nhật an toàn trong 1 transaction. patch có thể là object hoặc hàm (cur) => next. */
export async function updateSurvey(id, patch) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const cur = await tx.store.get(id);
  if (!cur) {
    await tx.done;
    return null;
  }
  const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch };
  await tx.store.put(next);
  await tx.done;
  emit();
  return next;
}

export async function deleteSurvey(id) {
  const db = await getDB();
  await db.delete(STORE, id);
  emit();
}

/** Nếu app bị tắt giữa chừng khi đang đồng bộ, đưa các phiên 'syncing' về 'pending'. */
export async function resetStuckSyncing() {
  const all = await getAllSurveys();
  for (const s of all) {
    if (s.status === 'syncing') await updateSurvey(s.id, { status: 'pending' });
  }
}

/** Xoá bản sao trên thiết bị của các phiên đã đồng bộ (dữ liệu vẫn còn trên Google Sheets). */
export async function clearSynced() {
  const all = await getAllSurveys();
  const synced = all.filter((s) => s.status === 'synced');
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(synced.map((s) => tx.store.delete(s.id)));
  await tx.done;
  emit();
  return synced.length;
}
