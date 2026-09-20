/**
 * VKU Field Survey – Backend (Google Apps Script Web App)
 *
 * Luồng: PWA (POST JSON) -> doPost -> lưu ảnh vào Google Drive -> ghi 1 dòng vào Google Sheets
 *
 * Đặc điểm:
 *  - Idempotent: mỗi phiên có ID (UUID). Gửi lại cùng ID sẽ KHÔNG tạo dòng/ảnh trùng.
 *  - LockService: tránh ghi đè khi nhiều thiết bị đồng bộ cùng lúc.
 *  - Cột câu trả lời được tạo động theo bộ câu hỏi (thêm câu hỏi mới => tự thêm cột).
 */

const CONFIG = {
  SHEET_NAME: 'Surveys',
  DRIVE_FOLDER_NAME: 'VKU_Survey_Photos',
  // Để trống nếu script được tạo từ menu Extensions > Apps Script của chính Google Sheet (bound script).
  SPREADSHEET_ID: '',
  // Tuỳ chọn. Nếu đặt, phải trùng với VITE_API_KEY (hoặc ô "API key" trong màn hình Cài đặt của app).
  API_KEY: '',
};

// Các cột cố định (thứ tự đúng như trên Sheet). Cột câu trả lời được nối thêm phía sau.
const FIXED_HEADERS = [
  'ID phiên',
  'Thời gian khảo sát',
  'Thời gian đồng bộ',
  'Người phỏng vấn',
  'Họ tên sinh viên',
  'MSSV',
  'Khoa/Ngành',
  'Năm học',
  'Liên hệ',
  'Bộ câu hỏi',
  'Latitude',
  'Longitude',
  'Sai số GPS (m)',
  'Link bản đồ',
  'Số ảnh',
  'Link ảnh',
  'Ghi chú',
  'Answers JSON',
];

/* ============================ Web App endpoints ============================ */

function doGet() {
  return json_({ ok: true, service: 'VKU Field Survey API', time: new Date().toISOString() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (CONFIG.API_KEY && body.apiKey !== CONFIG.API_KEY) {
      return json_({ ok: false, error: 'Sai hoặc thiếu API key' });
    }
    if (body.action === 'ping') {
      return json_({ ok: true, pong: true, time: new Date().toISOString() });
    }
    if (body.action === 'submit') {
      return json_(Object.assign({ ok: true }, saveSurvey_(body.survey)));
    }
    return json_({ ok: false, error: 'action không hợp lệ: ' + body.action });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

/** Chạy hàm này 1 lần trong editor để cấp quyền (Sheets + Drive) và tạo sẵn Sheet/Folder. */
function setup() {
  const sheet = getSheet_();
  ensureHeaders_(sheet, []);
  const folder = getFolder_();
  Logger.log('Sheet: ' + sheet.getParent().getUrl());
  Logger.log('Drive folder: ' + folder.getUrl());
}

/* ================================ Core logic ================================ */

function saveSurvey_(s) {
  if (!s || !s.id) throw new Error('Thiếu ID phiên khảo sát');
  if (!s.interviewer || !String(s.interviewer).trim()) throw new Error('Thiếu tên người phỏng vấn');

  const sheet = getSheet_();
  const answers = s.answers || [];
  const headers = ensureHeaders_(sheet, answers.map(function (a) { return a.header; }));

  // 1) Idempotent: phiên đã có trên Sheet -> trả kết quả cũ
  const existingRow = findRowById_(sheet, s.id);
  if (existingRow > 0) {
    const cell = sheet.getRange(existingRow, headers.indexOf('Link ảnh') + 1).getValue();
    return {
      row: existingRow,
      duplicate: true,
      photoUrls: String(cell || '').split('\n').filter(Boolean),
    };
  }

  // 2) Lưu ảnh vào Drive (đặt tên theo ID phiên => gửi lại không tạo file trùng)
  const photoUrls = uploadPhotos_(s);

  // 3) Ghi 1 dòng
  const gps = s.gps || null;
  const student = s.student || {};
  const row = new Array(headers.length).fill('');
  const put = function (header, value) {
    const i = headers.indexOf(header);
    if (i >= 0) row[i] = safe_(value);
  };

  put('ID phiên', s.id);
  put('Thời gian khảo sát', s.createdAtLocal || s.createdAt);
  put('Thời gian đồng bộ', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));
  put('Người phỏng vấn', s.interviewer);
  put('Họ tên sinh viên', student.name);
  put('MSSV', student.studentId);
  put('Khoa/Ngành', student.faculty);
  put('Năm học', student.year);
  put('Liên hệ', student.contact);
  put('Bộ câu hỏi', s.questionSetTitle || s.questionSetId);
  put('Latitude', gps ? gps.lat : '');
  put('Longitude', gps ? gps.lng : '');
  put('Sai số GPS (m)', gps && gps.accuracy != null ? Math.round(gps.accuracy) : '');
  put('Link bản đồ', gps ? 'https://www.google.com/maps?q=' + gps.lat + ',' + gps.lng : '');
  put('Số ảnh', photoUrls.length);
  put('Link ảnh', photoUrls.join('\n'));
  put('Ghi chú', s.note);
  put('Answers JSON', s.answersJson);
  answers.forEach(function (a) {
    put(a.header, a.value);
  });

  const r = sheet.getLastRow() + 1;
  // MSSV / Liên hệ giữ dạng text để không mất số 0 đầu
  sheet.getRange(r, headers.indexOf('MSSV') + 1).setNumberFormat('@');
  sheet.getRange(r, headers.indexOf('Liên hệ') + 1).setNumberFormat('@');
  sheet.getRange(r, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();

  return { row: r, duplicate: false, photoUrls: photoUrls, syncedAt: new Date().toISOString() };
}

function uploadPhotos_(s) {
  const photos = s.photos || [];
  if (!photos.length) return [];
  const folder = getFolder_();

  return photos.map(function (p, i) {
    const name = s.id + '_' + (i + 1) + '.jpg';
    const existing = folder.getFilesByName(name);
    let file;
    if (existing.hasNext()) {
      file = existing.next();
    } else {
      const blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mimeType || 'image/jpeg', name);
      file = folder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (err) {
        // Google Workspace của trường có thể chặn chia sẻ công khai -> vẫn giữ file, link chỉ mở được trong domain
      }
    }
    return file.getUrl();
  });
}

/* ================================== Helpers ================================== */

function getSpreadsheet_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_() {
  const ss = getSpreadsheet_();
  if (!ss) throw new Error('Không tìm thấy Google Sheet. Hãy tạo script từ menu Extensions > Apps Script của Sheet, hoặc điền CONFIG.SPREADSHEET_ID.');
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  return sheet;
}

/** Đảm bảo hàng tiêu đề tồn tại và có đủ cột cho các câu hỏi. Trả về mảng tiêu đề hiện tại. */
function ensureHeaders_(sheet, answerHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, FIXED_HEADERS.length).setValues([FIXED_HEADERS]);
    sheet.setFrozenRows(1);
  }
  const lastCol = sheet.getLastColumn();
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (headers[0] !== FIXED_HEADERS[0]) {
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" đã có dữ liệu khác định dạng. Hãy dùng sheet trống hoặc đổi CONFIG.SHEET_NAME.');
  }

  const missing = [];
  answerHeaders.concat(FIXED_HEADERS).forEach(function (h) {
    if (h && headers.indexOf(h) < 0 && missing.indexOf(h) < 0) missing.push(h);
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8eef4');
  return headers;
}

function findRowById_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const found = sheet.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return found ? found.getRow() : -1;
}

function getFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('FOLDER_ID');
  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (err) {}
  }
  const it = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

/** Chặn formula injection: chuỗi bắt đầu bằng = + - @ sẽ được ép thành text. */
function safe_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v == null ? '' : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
