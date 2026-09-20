import { useCallback, useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import StatusBar from './components/StatusBar';
import SurveyDetail from './components/SurveyDetail';
import SurveyForm from './components/SurveyForm';
import Toast from './components/Toast';
import { useHashRoute, useInstallPrompt, useOnline, useSurveys, useSyncState } from './hooks';
import { resetStuckSyncing } from './lib/db';
import { syncAll } from './lib/sync';

function parseRoute(path) {
  if (path === '/new') return { name: 'new', title: 'Phiên khảo sát mới' };
  if (path === '/settings') return { name: 'settings', title: 'Cài đặt' };
  if (path.startsWith('/survey/')) return { name: 'detail', title: 'Chi tiết phiên', id: decodeURIComponent(path.slice(8)) };
  return { name: 'home', title: 'VKU Field Survey' };
}

export default function App() {
  const [path, navigate] = useHashRoute();
  const online = useOnline();
  const sync = useSyncState();
  const { list: surveys, loading } = useSurveys();
  const { canInstall, install } = useInstallPrompt();
  const [toast, setToast] = useState(null);

  const route = parseRoute(path);
  const pendingCount = surveys.filter((s) => s.status !== 'synced').length;

  const notify = useCallback((message, type = 'info') => setToast({ message, type, id: Date.now() }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const runSync = useCallback((manual = true) => syncAll({ manual }), []);

  /* ---- Các thời điểm tự động đồng bộ: mở app, có mạng trở lại, quay lại tab, mỗi 30 giây ---- */
  useEffect(() => {
    let alive = true;
    resetStuckSyncing().then(() => {
      if (alive) syncAll();
    });
    // Xin trình duyệt không tự xoá dữ liệu IndexedDB khi thiếu bộ nhớ
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    const onOnline = () => syncAll();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncAll();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => syncAll(), 30000);
    return () => {
      alive = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  /* ---- Thông báo khi đổi trạng thái mạng ---- */
  const prevOnline = useRef(online);
  useEffect(() => {
    if (prevOnline.current === online) return;
    prevOnline.current = online;
    notify(
      online ? 'Đã có mạng. Đang đồng bộ dữ liệu chờ…' : 'Mất kết nối. Ứng dụng chuyển sang chế độ Offline.',
      online ? 'ok' : 'warn'
    );
  }, [online, notify]);

  /* ---- Thông báo kết quả đồng bộ ---- */
  const prevSync = useRef(sync);
  useEffect(() => {
    const prev = prevSync.current;
    prevSync.current = sync;
    if (prev.phase === sync.phase && prev.message === sync.message) return;
    if (sync.phase === 'done') notify(sync.message, 'ok');
    else if (sync.phase === 'error') notify(`Lỗi đồng bộ: ${sync.message}`, 'error');
  }, [sync, notify]);

  const handleSaved = () => {
    navigate('/');
    notify(
      navigator.onLine
        ? 'Đã lưu phiên khảo sát. Đang đồng bộ…'
        : 'Đã lưu offline trên thiết bị. Sẽ tự đồng bộ khi có mạng.',
      'ok'
    );
    syncAll();
  };

  let view;
  if (route.name === 'new') {
    view = <SurveyForm onSaved={handleSaved} onCancel={() => navigate('/')} notify={notify} />;
  } else if (route.name === 'settings') {
    view = <Settings online={online} canInstall={canInstall} onInstall={install} onSync={runSync} notify={notify} />;
  } else if (route.name === 'detail') {
    view = loading ? (
      <div className="page">
        <p className="empty">Đang tải…</p>
      </div>
    ) : (
      <SurveyDetail
        survey={surveys.find((s) => s.id === route.id)}
        online={online}
        onBack={() => navigate('/')}
        onSync={runSync}
        notify={notify}
      />
    );
  } else {
    view = (
      <Dashboard
        surveys={surveys}
        loading={loading}
        online={online}
        onOpen={(id) => navigate(`/survey/${encodeURIComponent(id)}`)}
        onNew={() => navigate('/new')}
        onSync={runSync}
      />
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <header className="header">
          {route.name !== 'home' ? (
            <button type="button" className="header-btn" onClick={() => navigate('/')} aria-label="Quay lại">
              ←
            </button>
          ) : (
            <img className="logo" src="/favicon.svg" alt="" width="28" height="28" />
          )}
          <h1>{route.title}</h1>
          {route.name === 'home' && (
            <button type="button" className="header-text-btn" onClick={() => navigate('/settings')}>
              Cài đặt
            </button>
          )}
        </header>
        <StatusBar online={online} sync={sync} pendingCount={pendingCount} onSync={runSync} />
      </div>
      <main>{view}</main>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
