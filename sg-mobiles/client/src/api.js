const TOKEN_KEY = 'sg_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// Thin fetch wrapper: JSON in/out, bearer token, throws Error(message) on non-2xx.
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const effectivePrice = (p) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);

export const discountPct = (p) =>
  p.salePrice && p.salePrice < p.price ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;

// Sends raw text (e.g. CSV) instead of JSON.
export async function apiText(path, text, contentType = 'text/csv') {
  const headers = { 'Content-Type': contentType };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method: 'POST', headers, body: text });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// Downloads an authenticated file response (e.g. CSV export).
export async function download(path, filename) {
  const token = getToken();
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "Out for Delivery" -> "out-for-delivery", for CSS class names.
export const statusKey = (s) => String(s || '').toLowerCase().replace(/\s+/g, '-');

export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
