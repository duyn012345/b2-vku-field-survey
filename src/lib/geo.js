/**
 * Lấy vị trí GPS. GPS không cần Internet nên vẫn hoạt động khi offline.
 * Lưu ý: Geolocation API chỉ chạy trên HTTPS (hoặc localhost).
 */
export function getPosition({ timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Thiết bị không hỗ trợ định vị GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Number(pos.coords.latitude.toFixed(7)),
          lng: Number(pos.coords.longitude.toFixed(7)),
          accuracy: pos.coords.accuracy,
          capturedAt: new Date(pos.timestamp).toISOString(),
        }),
      (err) => reject(new Error(geoMessage(err))),
      { enableHighAccuracy: true, timeout, maximumAge: 10000 }
    );
  });
}

function geoMessage(err) {
  switch (err.code) {
    case 1:
      return 'Bạn đã từ chối quyền vị trí. Hãy cho phép truy cập vị trí trong cài đặt trình duyệt.';
    case 2:
      return 'Không xác định được vị trí. Hãy ra nơi thoáng hơn rồi thử lại.';
    case 3:
      return 'Lấy vị trí quá lâu. Hãy thử lại.';
    default:
      return 'Không lấy được vị trí GPS.';
  }
}
