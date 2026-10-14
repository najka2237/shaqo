const BASE = import.meta.env.VITE_API_URL || '/api';
export const getToken = () => localStorage.getItem('token');

async function request(method, path, { body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token) { localStorage.removeItem('token'); window.dispatchEvent(new Event('auth-expired')); }
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p) => request('DELETE', p),
  upload: (p, form) => request('POST', p, { form }),
  // list + total count (X-Total-Count header) for pagination
  async getWithTotal(path) {
    const headers = getToken() ? { Authorization: `Bearer ${getToken()}` } : {};
    const res = await fetch(BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return { items: data, total: Number(res.headers.get('X-Total-Count')) || data.length };
  },
  // download a protected file (CSV report)
  async download(path, filename) {
    const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error('Download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob()); a.download = filename; a.click();
  },
  // open a protected file (CV) in a new tab
  async openFile(path) {
    const res = await fetch(BASE + path.replace(/^\/api(?=\/)/, ''), { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error('File not available');
    window.open(URL.createObjectURL(await res.blob()), '_blank');
  },
};
export const assetUrl = (u) => (u ? (u.startsWith('http') ? u : BASE.replace(/\/api$/, '') + u) : null);
