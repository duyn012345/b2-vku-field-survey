/**
 * Nén ảnh phía client trước khi lưu IndexedDB / gửi lên Apps Script.
 * - dataUrl: ảnh chính (tối đa 1280px, JPEG ~0.72) ~ 100-250KB
 * - thumb:   ảnh nhỏ 240px để hiển thị danh sách (giữ lại cả sau khi đồng bộ)
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này. Hãy thử ảnh khác.'));
    };
    img.src = url;
  });
}

function draw(img, maxSize, quality) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImage(file, { maxSize = 1280, quality = 0.72 } = {}) {
  const { img, url } = await loadImage(file);
  try {
    const dataUrl = draw(img, maxSize, quality);
    const thumb = draw(img, 240, 0.6);
    // độ dài base64 -> số byte xấp xỉ
    const size = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);
    return { dataUrl, thumb, size };
  } finally {
    URL.revokeObjectURL(url);
  }
}
