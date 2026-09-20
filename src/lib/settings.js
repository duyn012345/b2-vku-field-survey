const KEY = 'vku-survey-settings';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/** Ưu tiên giá trị người dùng nhập trong Cài đặt; nếu trống dùng biến môi trường lúc build. */
export function getSettings() {
  const s = read();
  return {
    gasUrl: (s.gasUrl || import.meta.env.VITE_GAS_URL || '').trim(),
    apiKey: (s.apiKey ?? import.meta.env.VITE_API_KEY ?? '').trim(),
  };
}

export function getRawSettings() {
  const s = read();
  return { gasUrl: s.gasUrl || '', apiKey: s.apiKey || '' };
}

export function saveSettings(patch) {
  localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
}

export function getLastInterviewer() {
  return read().lastInterviewer || '';
}

export function setLastInterviewer(name) {
  saveSettings({ lastInterviewer: name });
}
