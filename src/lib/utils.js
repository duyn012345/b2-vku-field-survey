export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback cho ngữ cảnh không an toàn (http, thiết bị cũ)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const pad = (n) => String(n).padStart(2, '0');

/** Giá trị cho <input type="datetime-local"> theo giờ địa phương */
export function toLocalInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Hiển thị dd/mm/yyyy hh:mm */
export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** yyyy-MM-dd HH:mm:ss theo giờ thiết bị (ghi vào Google Sheets) */
export function fmtSheetTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function mapsUrl(gps) {
  return `https://www.google.com/maps?q=${gps.lat},${gps.lng}`;
}

export function formatAnswer(v) {
  if (Array.isArray(v)) return v.join('; ');
  return v == null ? '' : v;
}

export function isEmptyAnswer(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

export function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
