const LABELS = {
  pending: 'Chờ đồng bộ',
  syncing: 'Đang đồng bộ',
  synced: 'Đã đồng bộ',
  error: 'Lỗi',
};

export default function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{LABELS[status] || status}</span>;
}
