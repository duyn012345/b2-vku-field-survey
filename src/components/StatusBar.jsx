/**
 * Băng trạng thái đồng bộ: Offline -> Đang đồng bộ -> Đã đồng bộ / Lỗi
 */
export default function StatusBar({ online, sync, pendingCount, onSync }) {
  let kind;
  let text;
  let action = null;

  if (!online) {
    kind = 'offline';
    text = pendingCount > 0 ? `Offline – ${pendingCount} phiên chờ đồng bộ` : 'Offline – dữ liệu lưu trên thiết bị';
  } else if (sync.phase === 'syncing') {
    kind = 'syncing';
    text = `Đang đồng bộ ${sync.current}/${sync.total}…`;
  } else if (sync.phase === 'error') {
    kind = 'error';
    text = `Lỗi đồng bộ: ${sync.message}`;
    action = 'Thử lại';
  } else if (pendingCount > 0) {
    kind = 'pending';
    text = `${pendingCount} phiên chờ đồng bộ`;
    action = 'Đồng bộ ngay';
  } else {
    kind = 'done';
    text = 'Đã đồng bộ';
  }

  return (
    <div className={`statusbar ${kind}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span className="statusbar-text">{text}</span>
      {action && (
        <button type="button" className="statusbar-btn" onClick={() => onSync(true)}>
          {action}
        </button>
      )}
      {kind === 'syncing' && <span className="progress" aria-hidden="true" />}
    </div>
  );
}
