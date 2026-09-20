import { findQuestionSet } from '../config/questions';
import { deleteSurvey } from '../lib/db';
import { fmtDateTime, formatAnswer, formatBytes, mapsUrl } from '../lib/utils';
import StatusPill from './StatusPill';

function Row({ label, children }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{children || <span className="muted">Chưa có</span>}</dd>
    </div>
  );
}

export default function SurveyDetail({ survey, online, onBack, onSync, notify }) {
  if (!survey) {
    return (
      <div className="page">
        <p className="empty">Không tìm thấy phiên khảo sát này.</p>
        <button type="button" className="btn secondary" onClick={onBack}>
          Về danh sách
        </button>
      </div>
    );
  }

  const set = findQuestionSet(survey.questionSetId);
  const st = survey.student || {};

  async function remove() {
    const msg =
      survey.status === 'synced'
        ? 'Xóa bản sao trên thiết bị? Dữ liệu trên Google Sheets vẫn được giữ.'
        : 'Phiên này CHƯA đồng bộ. Xóa sẽ mất dữ liệu vĩnh viễn. Vẫn xóa?';
    if (!window.confirm(msg)) return;
    await deleteSurvey(survey.id);
    notify('Đã xóa phiên khảo sát khỏi thiết bị.', 'info');
    onBack();
  }

  return (
    <div className="page">
      <section className="card">
        <div className="detail-head">
          <h2>{st.name || '(không tên)'}</h2>
          <StatusPill status={survey.status} />
        </div>
        {survey.lastError && survey.status !== 'synced' && <p className="field-error">Lỗi gần nhất: {survey.lastError}</p>}
        {survey.status === 'synced' && survey.syncedAt && (
          <p className="hint">
            Đồng bộ lúc {fmtDateTime(survey.syncedAt)}
            {survey.sheetRow ? `, dòng ${survey.sheetRow} trên Google Sheets` : ''}.
          </p>
        )}
        <dl>
          <Row label="Người phỏng vấn">{survey.interviewer}</Row>
          <Row label="Thời gian">{fmtDateTime(survey.createdAt)}</Row>
          <Row label="MSSV">{st.studentId}</Row>
          <Row label="Khoa / Ngành">{st.faculty}</Row>
          <Row label="Năm học">{st.year}</Row>
          <Row label="Liên hệ">{st.contact}</Row>
          <Row label="Bộ câu hỏi">{set?.title || survey.questionSetId}</Row>
        </dl>
        {survey.status !== 'synced' && (
          <button type="button" className="btn primary" onClick={() => onSync(true)} disabled={!online}>
            {online ? 'Đồng bộ phiên này ngay' : 'Cần có mạng để đồng bộ'}
          </button>
        )}
      </section>

      <section className="card">
        <h2>Câu trả lời</h2>
        <dl>
          {(set?.questions || []).map((q) => (
            <Row key={q.id} label={q.label}>
              {String(formatAnswer(survey.answers?.[q.id]))}
            </Row>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2>Hiện trường</h2>
        <dl>
          <Row label="Tọa độ GPS">
            {survey.gps && (
              <>
                {survey.gps.lat}, {survey.gps.lng} (sai số {Math.round(survey.gps.accuracy)} m){' '}
                <a href={mapsUrl(survey.gps)} target="_blank" rel="noreferrer">
                  Mở bản đồ
                </a>
              </>
            )}
          </Row>
          <Row label="Ghi chú">{survey.note}</Row>
        </dl>
        {survey.photos?.length > 0 && (
          <ul className="photo-grid">
            {survey.photos.map((p) => {
              const img = <img src={p.dataUrl || p.thumb} alt="Ảnh hiện trường" />;
              return (
                <li key={p.id}>
                  {p.driveUrl ? (
                    <a href={p.driveUrl} target="_blank" rel="noreferrer" title="Mở ảnh gốc trên Google Drive">
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                  {p.size ? <span className="photo-size">{formatBytes(p.size)}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onBack}>
          Về danh sách
        </button>
        <button type="button" className="btn danger" onClick={remove}>
          Xóa khỏi thiết bị
        </button>
      </div>
    </div>
  );
}
