// Kerangka "Ruang tim": sidebar navigasi + kepala halaman yang seragam untuk semua halaman partner/admin.
// Dipasang di <head> setiap halaman tim: <script type="module" src="js/shell.js"></script>
const NAV = [
  ['Kurikulum', [['editor.html', 'Editor modul', 'M4 5h16M4 12h16M4 19h10'], ['sumber.html', 'Sumber video', 'M4 6h12v12H4zM16 10l4-2v8l-4-2'], ['validasi.html', 'Sesi validasi', 'M5 12l4 4L19 6']]],
  ['Data', [['rekam.html', 'Rekam', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'], ['anotasi.html', 'Anotasi', 'M4 18h16M7 14l3-8 3 8M8 11h4']]],
  ['Pemantauan', [['progres.html', 'Progres belajar', 'M4 19V9M10 19V5M16 19v-7M22 19H2'], ['admin.html', 'Admin', 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z']]],
  ['Pratinjau', [['/belajar', 'Lihat sebagai murid', 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']]],
];
const ARROW = '<svg class="ws-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const icon = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

function build() {
  const body = document.body;
  if (body.classList.contains('ws')) return;
  const here = location.pathname.split('/').pop() || 'index.html';
  const group = NAV.find(([, items]) => items.some(([h]) => h === here))?.[0] ?? '';

  const nav = document.createElement('aside');
  nav.className = 'ws-nav';
  nav.innerHTML = `
    <a class="ws-logo" href="/"><img src="icon.svg" alt=""><span>BelajarTenun<small>Tim</small></span></a>
    <nav aria-label="Ruang tim">${NAV.map(([title, items]) => `
      <p class="ws-group">${title}</p>
      ${items.map(([href, label, d]) => `<a href="${href}" class="ws-link${href === here ? ' active' : ''}"${href === here ? ' aria-current="page"' : ''}>${icon(d)}<span>${label}</span>${ARROW}</a>`).join('')}`).join('')}
    </nav>
    <button type="button" class="ws-link ws-account" id="ws-logout" title="Keluar">${icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9')}<span id="ws-user">Keluar</span></button>`;

  const main = document.createElement('main');
  main.className = 'ws-main';
  main.id = 'konten';
  main.tabIndex = -1;
  const inner = document.createElement('div');
  inner.className = 'ws-content';
  // Pindahkan isi halaman (kecuali script) ke area konten.
  [...body.childNodes].forEach((n) => { if (!(n.nodeName === 'SCRIPT')) inner.appendChild(n); });
  // Kepala halaman: label grup di atas judul; wordmark lama disembunyikan (logo ada di sidebar).
  const header = inner.querySelector('header.brand');
  if (header) {
    header.classList.add('ws-head');
    header.querySelector('.wordmark')?.remove();
    const h1 = header.querySelector('h1');
    if (h1) h1.insertAdjacentHTML('beforebegin', `<p class="ws-eyebrow">${group}</p>`);
  }
  nav.querySelector('#ws-logout').onclick = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' });
    location.href = '/';
  };
  main.appendChild(inner);
  body.classList.remove('page');
  body.classList.add('ws');
  const skip = document.createElement('a');
  skip.className = 'ws-skip'; skip.href = '#konten'; skip.textContent = 'Lewati ke konten';
  body.prepend(skip, nav, main);

  // Menu & label mengikuti peran: hanya admin yang melihat menu Admin.
  fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.json()).then(({ user }) => {
    if (!user) return;
    const admin = user.role === 'admin';
    document.getElementById('ws-logout').title = `Keluar dari akun ${user.name}`;
    nav.querySelector('.ws-logo small').textContent = admin ? 'Admin' : 'Partner';
    nav.querySelector('.ws-account').insertAdjacentHTML('beforeend', `<em class="ws-role ${admin ? 'is-admin' : ''}">${admin ? 'Admin' : 'Partner'}</em>`);
    if (!admin) nav.querySelector('a[href="admin.html"]')?.remove();
    body.dataset.role = user.role;
  }).catch(() => {});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
