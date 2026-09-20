import { useEffect, useRef, useState } from 'react';
import { QUESTION_SETS, YEAR_OPTIONS, findQuestionSet } from '../config/questions';
import { saveSurvey } from '../lib/db';
import { getPosition } from '../lib/geo';
import { compressImage } from '../lib/image';
import { getLastInterviewer, setLastInterviewer } from '../lib/settings';
import { formatBytes, isEmptyAnswer, mapsUrl, toLocalInput, uid } from '../lib/utils';
import QuestionField from './QuestionField';

const MAX_PHOTOS = 5;

function Field({ label, required, error, hint, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label}
        {required && <b className="req"> *</b>}
      </span>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export default function SurveyForm({ onSaved, onCancel, notify }) {
  const [interviewer, setInterviewer] = useState(getLastInterviewer());
  const [when, setWhen] = useState(toLocalInput());
  const [setId, setSetId] = useState(QUESTION_SETS[0].id);
  const [student, setStudent] = useState({ name: '', studentId: '', faculty: '', year: '', contact: '' });
  const [answers, setAnswers] = useState({});
  const [gps, setGps] = useState(null);
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | ok | error
  const [gpsError, setGpsError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const camRef = useRef(null);
  const galRef = useRef(null);
  const set = findQuestionSet(setId);

  async function locate() {
    setGpsState('loading');
    setGpsError('');
    try {
      const pos = await getPosition();
      setGps(pos);
      setGpsState('ok');
    } catch (err) {
      setGpsError(err.message);
      setGpsState('error');
    }
  }

  // Tự lấy GPS khi mở form (người dùng vẫn có thể bấm lấy lại)
  useEffect(() => {
    locate();
  }, []);

  const changeSet = (id) => {
    setSetId(id);
    setAnswers({});
    setErrors({});
  };

  const setStudentField = (key) => (e) => setStudent((s) => ({ ...s, [key]: e.target.value }));

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      notify(`Tối đa ${MAX_PHOTOS} ảnh cho mỗi phiên.`, 'warn');
      return;
    }
    setPhotoBusy(true);
    try {
      const added = [];
      for (const f of files.slice(0, room)) {
        const img = await compressImage(f);
        added.push({ id: uid(), name: `photo_${Date.now()}_${added.length + 1}.jpg`, ...img });
      }
      setPhotos((p) => [...p, ...added]);
      if (files.length > room) notify(`Chỉ thêm được ${room} ảnh (tối đa ${MAX_PHOTOS}).`, 'warn');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setPhotoBusy(false);
    }
  }

  function validate() {
    const errs = {};
    if (!interviewer.trim()) errs.interviewer = 'Nhập tên người phỏng vấn.';
    if (!student.name.trim()) errs.name = 'Nhập họ tên sinh viên.';
    set.questions.forEach((q) => {
      if (q.required && isEmptyAnswer(answers[q.id])) errs[q.id] = 'Câu hỏi này bắt buộc.';
    });
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (!gps && !window.confirm('Chưa có tọa độ GPS. Vẫn lưu phiên khảo sát này?')) return;

    setSaving(true);
    try {
      const record = {
        id: uid(),
        createdAt: new Date(when || Date.now()).toISOString(),
        savedAt: new Date().toISOString(),
        interviewer: interviewer.trim(),
        student: {
          name: student.name.trim(),
          studentId: student.studentId.trim(),
          faculty: student.faculty.trim(),
          year: student.year,
          contact: student.contact.trim(),
        },
        questionSetId: set.id,
        answers,
        gps,
        photos,
        note: note.trim(),
        status: 'pending',
        attempts: 0,
        lastError: null,
      };
      await saveSurvey(record);
      setLastInterviewer(record.interviewer);
      onSaved(record);
    } catch (err) {
      notify(`Không lưu được vào thiết bị: ${err.message}`, 'error');
      setSaving(false);
    }
  }

  return (
    <form className="page form" onSubmit={submit} noValidate>
      <section className="card">
        <h2>Phiên khảo sát</h2>
        <Field label="Người phỏng vấn" required error={errors.interviewer}>
          <input
            type="text"
            value={interviewer}
            onChange={(e) => setInterviewer(e.target.value)}
            placeholder="Họ tên người phỏng vấn"
            autoComplete="name"
          />
        </Field>
        <Field label="Thời gian">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Bộ câu hỏi">
          <select value={setId} onChange={(e) => changeSet(e.target.value)}>
            {QUESTION_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="card">
        <h2>Thông tin sinh viên</h2>
        <Field label="Họ và tên" required error={errors.name}>
          <input type="text" value={student.name} onChange={setStudentField('name')} placeholder="Nguyễn Văn A" />
        </Field>
        <div className="row">
          <Field label="MSSV">
            <input type="text" inputMode="numeric" value={student.studentId} onChange={setStudentField('studentId')} />
          </Field>
          <Field label="Năm học">
            <select value={student.year} onChange={setStudentField('year')}>
              <option value="">Chọn…</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Khoa / Ngành">
          <input type="text" value={student.faculty} onChange={setStudentField('faculty')} placeholder="VD: Công nghệ thông tin" />
        </Field>
        <Field label="Liên hệ (SĐT hoặc email)">
          <input type="text" value={student.contact} onChange={setStudentField('contact')} />
        </Field>
      </section>

      <section className="card">
        <h2>{set.title}</h2>
        {set.questions.map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            value={answers[q.id]}
            error={errors[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
      </section>

      <section className="card">
        <h2>Vị trí hiện trường</h2>
        <div className={`gps ${gpsState}`}>
          {gpsState === 'loading' && <p>Đang lấy vị trí GPS…</p>}
          {gpsState === 'ok' && gps && (
            <>
              <p className="gps-coords">
                <span>Vĩ độ {gps.lat}</span>
                <span>Kinh độ {gps.lng}</span>
              </p>
              <p className="hint">
                Sai số khoảng {Math.round(gps.accuracy)} m.{' '}
                <a href={mapsUrl(gps)} target="_blank" rel="noreferrer">
                  Xem trên bản đồ (cần mạng)
                </a>
              </p>
            </>
          )}
          {gpsState === 'error' && <p className="field-error">{gpsError}</p>}
        </div>
        <button type="button" className="btn secondary" onClick={locate} disabled={gpsState === 'loading'}>
          {gps ? 'Lấy lại vị trí' : 'Lấy vị trí GPS'}
        </button>
      </section>

      <section className="card">
        <h2>Ảnh minh chứng</h2>
        <div className="row">
          <button type="button" className="btn secondary" onClick={() => camRef.current?.click()} disabled={photoBusy}>
            Chụp ảnh
          </button>
          <button type="button" className="btn secondary" onClick={() => galRef.current?.click()} disabled={photoBusy}>
            Chọn từ thư viện
          </button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        {photoBusy && <p className="hint">Đang xử lý ảnh…</p>}
        {photos.length > 0 && (
          <ul className="photo-grid">
            {photos.map((p) => (
              <li key={p.id}>
                <img src={p.thumb} alt="Ảnh hiện trường" />
                <span className="photo-size">{formatBytes(p.size)}</span>
                <button
                  type="button"
                  className="photo-remove"
                  aria-label="Xóa ảnh"
                  onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">Tối đa {MAX_PHOTOS} ảnh. Ảnh được nén tự động trước khi lưu.</p>
      </section>

      <section className="card">
        <h2>Ghi chú hiện trường</h2>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Địa điểm, bối cảnh, lưu ý…" />
      </section>

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn primary" disabled={saving || photoBusy}>
          {saving ? 'Đang lưu…' : 'Lưu phiên khảo sát'}
        </button>
      </div>
    </form>
  );
}
