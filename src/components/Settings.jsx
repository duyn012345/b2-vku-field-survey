import { useEffect, useState } from 'react';
import { clearSynced } from '../lib/db';
import { getRawSettings, getSettings, saveSettings } from '../lib/settings';
import { pingServer } from '../lib/sync';
import { formatBytes } from '../lib/utils';

export default function Settings({ online, canInstall, onInstall, onSync, notify }) {
  const raw = getRawSettings();
  const effective = getSettings();
  const [gasUrl, setGasUrl] = useState(raw.gasUrl);
  const [apiKey, setApiKey] = useState(raw.apiKey);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState(null); // { ok, message }
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((e) => setStorage(e)).catch(() => {});
    }
  }, []);

  function save() {
    saveSettings({ gasUrl: gasUrl.trim(), apiKey: apiKey.trim() });
    notify('Đã lưu cài đặt.', 'ok');
    onSync(true);
  }

  async function runTest() {
    const url = gasUrl.trim() || effective.gasUrl;
    if (!url) {
      setTest({ ok: false, message: 'Chưa có URL Apps Script.' });
      return;
    }
    setTesting(true);
    setTest(null);
    try {
      await pingServer(url, apiKey.trim() || effective.apiKey);
      setTest({ ok: true, message: 'Kết nối thành công. Apps Script đã sẵn sàng.' });
    } catch (err) {
      setTest({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function purge() {
    if (!window.confirm('Xóa bản sao trên thiết bị của các phiên ĐÃ đồng bộ? Dữ liệu trên Google Sheets vẫn được giữ.')) return;
    const n = await clearSynced();
    notify(`Đã xóa ${n} phiên đã đồng bộ khỏi thiết bị.`, 'info');
  }

  return (
    <div className="page">
      <section className="card">
        <h2>Kết nối Google Apps Script</h2>
        <label className="field">
          <span className="field-label">URL Web App (kết thúc bằng /exec)</span>
          <input
            type="url"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder={effective.gasUrl || 'https://script.google.com/macros/s/.../exec'}
          />
          <span className="hint">Để trống để dùng giá trị VITE_GAS_URL đã cấu hình lúc build.</span>
        </label>
        <label className="field">
          <span className="field-label">API key (nếu có đặt trong Code.gs)</span>
          <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
        </label>
        {test && <p className={test.ok ? 'hint ok-text' : 'field-error'}>{test.message}</p>}
        <div className="row">
          <button type="button" className="btn secondary" onClick={runTest} disabled={testing || !online}>
            {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
          </button>
          <button type="button" className="btn primary" onClick={save}>
            Lưu cài đặt
          </button>
        </div>
        {!online && <p className="hint">Đang offline, cần có mạng để kiểm tra kết nối.</p>}
      </section>

      <section className="card">
        <h2>Thiết bị</h2>
        {storage && (
          <p className="hint">
            Bộ nhớ ứng dụng: {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
          </p>
        )}
        <div className="row">
          {canInstall && (
            <button type="button" className="btn secondary" onClick={onInstall}>
              Cài ứng dụng lên màn hình chính
            </button>
          )}
          <button type="button" className="btn secondary" onClick={purge}>
            Dọn dữ liệu đã đồng bộ
          </button>
        </div>
        {!canInstall && (
          <p className="hint">
            Cài đặt: Android/Chrome chọn menu ⋮ → “Cài đặt ứng dụng”; iPhone/Safari chọn Chia sẻ → “Thêm vào Màn hình chính”.
          </p>
        )}
      </section>
    </div>
  );
}
