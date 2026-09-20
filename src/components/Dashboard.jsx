import { useMemo, useState } from 'react';
import { findQuestionSet } from '../config/questions';
import { fmtDateTime } from '../lib/utils';
import StatusPill from './StatusPill';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ đồng bộ' },
  { id: 'error', label: 'Lỗi' },
  { id: 'synced', label: 'Đã đồng bộ' },
];

export default function Dashboard({ surveys, loading, onOpen, onNew, onSync, online }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const total = surveys.length;
  const synced = surveys.filter((s) => s.status === 'synced').length;
  const pending = total - synced; // pending + syncing + error
  const errors = surveys.filter((s) => s.status === 'error').length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((s) => {
      if (filter === 'pending' && !(s.status === 'pending' || s.status === 'syncing')) return false;
      if (filter === 'error' && s.status !== 'error') return false;
      if (filter === 'synced' && s.status !== 'synced') return false;
      if (!q) return true;
      return [s.student?.name, s.student?.studentId, s.interviewer].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [surveys, filter, query]);

  return (
    <div className="page">
      <section className="stats" aria-label="Thống kê">
        <div className="stat">
          <strong>{total}</strong>
          <span>Tổng phiên</span>
        </div>
        <div className="stat ok">
          <strong>{synced}</strong>
          <span>Đã đồng bộ</span>
        </div>
        <div className={`stat ${pending > 0 ? 'warn' : ''}`}>
          <strong>{pending}</strong>
          <span>Chờ đồng bộ{errors > 0 ? ` (${errors} lỗi)` : ''}</span>
        </div>
      </section>

      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, MSSV, người phỏng vấn"
          aria-label="Tìm kiếm"
        />
        <button type="button" className="btn secondary" onClick={() => onSync(true)} disabled={!online || pending === 0}>
          Đồng bộ ngay
        </button>
      </div>

      <div className="chips" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`chip ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Đang tải dữ liệu…</p>
      ) : list.length === 0 ? (
        <div className="empty">
          <p>{total === 0 ? 'Chưa có phiên khảo sát nào.' : 'Không có phiên nào khớp bộ lọc.'}</p>
          {total === 0 && (
            <button type="button" className="btn primary" onClick={onNew}>
              Bắt đầu phiên đầu tiên
            </button>
          )}
        </div>
      ) : (
        <ul className="list">
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" className="item" onClick={() => onOpen(s.id)}>
                <div className="item-main">
                  <strong>{s.student?.name || '(không tên)'}</strong>
                  <span className="muted">
                    {s.student?.studentId ? `MSSV ${s.student.studentId}` : 'Không có MSSV'}
                  </span>
                  <span className="muted small">{findQuestionSet(s.questionSetId)?.title || s.questionSetId}</span>
                </div>
                <div className="item-side">
                  <StatusPill status={s.status} />
                  <span className="muted small">{fmtDateTime(s.createdAt)}</span>
                  <span className="muted small">
                    {s.gps ? 'Có GPS' : 'Không GPS'}, {s.photos?.length || 0} ảnh
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="fab" onClick={onNew}>
        Phiên mới
      </button>
    </div>
  );
}
