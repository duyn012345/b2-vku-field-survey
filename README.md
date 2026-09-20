# VKU Field Survey PWA

Ứng dụng PWA **offline-first** để phỏng vấn/khảo sát nhu cầu việc làm của sinh viên VKU tại hiện trường.
Tạo phiên khảo sát, lấy GPS, chụp ảnh minh chứng ngay cả khi **không có mạng**; khi có Internet, dữ liệu tự động đồng bộ lên **Google Sheets** (1 phiên = 1 dòng) và **Google Drive** (ảnh, URL ảnh lưu trong Sheets).

```
React PWA  ──►  IndexedDB (trên thiết bị)  ──►  Google Apps Script (Web App)  ──►  Google Sheets  (1 phiên = 1 dòng)
 (Service Worker, GPS, Camera)                        │                          └►  Google Drive   (ảnh, URL ghi vào Sheets)
```

## Tính năng

| Yêu cầu | Cách thực hiện | File chính |
|---|---|---|
| Tạo phiên khảo sát (tên người phỏng vấn bắt buộc, thời gian, thông tin SV, bộ câu hỏi) | Form có kiểm tra bắt buộc, bộ câu hỏi cấu hình bằng dữ liệu | `src/components/SurveyForm.jsx`, `src/config/questions.js` |
| Định vị GPS | `navigator.geolocation` (tự lấy khi mở form, có nút lấy lại) | `src/lib/geo.js` |
| Chụp/chọn ảnh | `<input type="file" capture>` + nén ảnh bằng canvas (≤1280px) | `src/lib/image.js` |
| Offline | Lưu vào IndexedDB; Service Worker precache app shell | `src/lib/db.js`, `vite.config.js` |
| Online → tự đồng bộ | Đồng bộ khi mở app / có mạng trở lại / quay lại tab / mỗi 30 giây / bấm tay | `src/lib/sync.js`, `src/App.jsx` |
| Google Sheets | Apps Script ghi mỗi phiên 1 dòng, cột câu trả lời tạo động | `apps-script/Code.gs` |
| Google Drive | Ảnh lưu vào thư mục `VKU_Survey_Photos`, URL ghi vào Sheets | `apps-script/Code.gs` |
| Thông báo trạng thái | Băng trạng thái `Offline → Đang đồng bộ → Đã đồng bộ / Lỗi` + toast | `src/components/StatusBar.jsx`, `Toast.jsx` |
| Dashboard | Tổng phiên / Đã đồng bộ / Chờ đồng bộ + danh sách, lọc, tìm kiếm, xem chi tiết | `src/components/Dashboard.jsx` |

**Chống trùng dữ liệu:** mỗi phiên có UUID. Apps Script kiểm tra ID trước khi ghi và đặt tên ảnh theo `<ID>_<n>.jpg`, nên gửi lại (do mất mạng giữa chừng) không tạo dòng hoặc ảnh trùng.

## Cấu trúc thư mục

```
vku-field-survey/
├─ apps-script/
│  ├─ Code.gs              # Backend Google Apps Script
│  └─ appsscript.json      # Manifest (múi giờ, quyền Web App)
├─ public/                 # favicon + icon PWA
├─ src/
│  ├─ config/questions.js  # Bộ câu hỏi
│  ├─ lib/                 # db (IndexedDB), sync, geo, image, settings, utils
│  ├─ components/          # Dashboard, SurveyForm, SurveyDetail, Settings, StatusBar, Toast...
│  ├─ hooks.js             # useOnline, useSurveys, useHashRoute...
│  ├─ App.jsx, main.jsx, styles.css
├─ vite.config.js          # Vite + vite-plugin-pwa (Service Worker + manifest)
└─ .env.example
```

## Bước 1 – Thiết lập Google Sheets + Apps Script

1. Tạo một **Google Sheet** mới (ví dụ `VKU Survey Data`).
2. Menu **Extensions → Apps Script** (script gắn với Sheet này).
3. Xóa code mặc định, dán toàn bộ nội dung `apps-script/Code.gs`.
4. (Khuyến nghị) Bật **Project Settings → Show "appsscript.json" manifest file** rồi dán nội dung `apps-script/appsscript.json` (múi giờ `Asia/Ho_Chi_Minh`).
5. (Tuỳ chọn) Đặt `CONFIG.API_KEY` là một chuỗi bí mật bất kỳ.
6. Chọn hàm **`setup`** → **Run** → cấp quyền truy cập Sheets và Drive (chỉ cần làm 1 lần). Hàm này tạo sẵn sheet `Surveys` và thư mục `VKU_Survey_Photos`.
7. **Deploy → New deployment → Select type: Web app**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
8. Copy **Web app URL** (kết thúc bằng `/exec`).

> Mỗi lần sửa `Code.gs` phải **Deploy → Manage deployments → Edit → Version: New version** thì thay đổi mới có hiệu lực.

> Nếu tài khoản trường (Google Workspace) chặn chia sẻ công khai, link ảnh chỉ mở được với tài khoản trong domain. Ảnh vẫn được lưu đầy đủ trong Drive.

## Bước 2 – Chạy local

```bash
npm install
cp .env.example .env      # điền VITE_GAS_URL (và VITE_API_KEY nếu có)
npm run dev
```

Kiểm thử đầy đủ PWA/Service Worker cần bản build:

```bash
npm run build
npm run preview
```

Có thể không điền `.env`, mà nhập URL trong màn hình **Cài đặt** của app → bấm **Kiểm tra kết nối**.

> GPS và Camera chỉ hoạt động trên **HTTPS** (hoặc `localhost`). Để thử trên điện thoại hãy dùng bản deploy HTTPS ở bước 3.

## Bước 3 – Đưa lên GitHub và deploy HTTPS

```bash
git init && git add . && git commit -m "VKU Field Survey PWA"
git branch -M main
git remote add origin https://github.com/<user>/vku-field-survey.git
git push -u origin main
```

**Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git → chọn repo.
Build command `npm run build`, Output directory `dist`, thêm biến môi trường `VITE_GAS_URL` (và `VITE_API_KEY`, `NODE_VERSION=20`).

**Vercel:** Add New Project → Import repo → Framework Preset *Vite* (tự nhận) → thêm Environment Variables `VITE_GAS_URL`, `VITE_API_KEY` → Deploy.

## Bước 4 – Kiểm thử nghiệm thu (checklist)

1. Mở link HTTPS trên điện thoại (Chrome/Android hoặc Safari/iOS) → **Cài ứng dụng lên màn hình chính**.
2. Mở app khi còn mạng 1 lần để Service Worker tải xong app shell.
3. Bật **chế độ máy bay** → băng trạng thái chuyển **Offline**.
4. Tạo 2–3 phiên khảo sát (lấy GPS, chụp ảnh) → Dashboard hiện **Chờ đồng bộ**.
5. Tắt hẳn app và mở lại khi vẫn offline → dữ liệu vẫn còn (IndexedDB).
6. Tắt chế độ máy bay → trạng thái **Đang đồng bộ → Đã đồng bộ**, Dashboard cập nhật.
7. Kiểm tra Google Sheets: mỗi phiên 1 dòng, có tọa độ, link ảnh; kiểm tra thư mục Drive `VKU_Survey_Photos`.
8. Thử sai URL Apps Script → trạng thái **Lỗi** với thông báo rõ ràng; sửa lại → bấm **Thử lại**.

## Ghi chú kỹ thuật

- **CORS với Apps Script:** app gửi `POST` với `Content-Type: text/plain` (request "đơn giản") để không bị preflight `OPTIONS` – Apps Script không hỗ trợ OPTIONS. Body vẫn là JSON.
- **Nén ảnh:** ảnh được resize ≤1280px, JPEG quality 0.72 (~100–250 KB) trước khi lưu và gửi. Sau khi đồng bộ, ảnh gốc trong IndexedDB được thay bằng thumbnail + link Drive để tiết kiệm bộ nhớ.
- **Trạng thái phiên:** `pending → syncing → synced | error`. Lỗi mạng giữ `pending` (tự thử lại); lỗi từ server chuyển `error` (tự thử tối đa 5 lần, sau đó chờ bấm *Đồng bộ ngay*).
- **Bảo vệ dữ liệu:** app xin `navigator.storage.persist()` để trình duyệt không tự xoá IndexedDB.
- **Bảo mật:** `API_KEY` trong app web chỉ là rào cản nhẹ (ai xem mã nguồn đều thấy). Nếu cần bảo mật thật, hãy thêm đăng nhập cho người phỏng vấn.
- **Sửa bộ câu hỏi:** chỉnh `src/config/questions.js`. Cột mới sẽ tự được thêm vào Sheets. Nếu đổi `short` của câu hỏi, Sheets sẽ tạo cột mới thay vì đổi tên cột cũ.
- **Hướng mở rộng:** Background Sync API, đăng nhập người phỏng vấn, xuất CSV, lưu nháp form, bản đồ các điểm khảo sát.

## Gợi ý mục lục Technical Report (2–4 trang)

1. Mục tiêu và phạm vi
2. Kiến trúc hệ thống (sơ đồ React → IndexedDB → Apps Script → Sheets/Drive)
3. Thiết kế offline-first: Service Worker, IndexedDB schema, hàng đợi đồng bộ, xử lý lỗi/trùng lặp
4. Thu thập GPS/ảnh và tối ưu (nén ảnh, quyền truy cập)
5. Backend Apps Script và cấu trúc Google Sheets/Drive
6. Kiểm thử (kịch bản offline/online) và kết quả
7. Hạn chế và hướng phát triển
