// Utilitas bersama halaman BelajarTenun.
export async function api(path, body, opts = {}) {
  const res = await fetch(path, body !== undefined
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin', keepalive: opts.keepalive }
    : { credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || res.statusText), { status: res.status });
  return json;
}
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wajibkan login dengan peran tertentu; arahkan ke /masuk.html bila belum. */
export async function requireLogin(roles = []) {
  const cfg = await api('/api/config');
  const u = cfg.user;
  if (!u || (roles.length && !roles.includes(u.role) && u.role !== 'admin')) {
    location.href = `masuk.html?next=${encodeURIComponent(location.pathname + location.search)}${u ? '&role=1' : ''}`;
    return new Promise(() => {}); // berhenti di sini sampai halaman berpindah
  }
  return cfg;
}

/** Bar navigasi kecil berisi status akun. */
export function accountBadge(el, user) {
  if (!el) return;
  el.innerHTML = user
    ? `${esc(user.name)} · <span class="tag">${esc(user.role)}</span> · <a href="masuk.html">Akun</a>`
    : '<a href="masuk.html">Masuk / Daftar</a>';
}
