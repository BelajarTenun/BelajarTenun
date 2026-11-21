// Komponen kecil Ruang tim supaya formulir tidak memanjang ke bawah:
//  - segmented(): <select data-seg> → tombol pilihan (radiogroup). Select asli tetap jadi sumber nilai & event "change".
//  - wizard(): blok [data-wstep] → satu langkah per layar dengan penanda progres, tombol Kembali/Lanjut,
//    dan validasi isian wajib per langkah (reportValidity). Tombol kirim asli tampil di langkah terakhir.

export function segmented(root = document) {
  for (const sel of root.querySelectorAll('select[data-seg]')) {
    if (sel.dataset.segReady) continue;
    sel.dataset.segReady = '1';
    const box = document.createElement('div');
    box.className = `seg${sel.dataset.seg === 'cards' ? ' seg-cards' : ''}`;
    box.setAttribute('role', 'radiogroup');
    const label = sel.closest('label');
    if (label) box.setAttribute('aria-label', label.firstChild?.textContent?.trim() || sel.id);
    sel.hidden = true;
    sel.after(box);
    const render = () => {
      box.innerHTML = '';
      for (const o of sel.options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(o.value === sel.value));
        const [title, ...rest] = o.textContent.split(':');
        b.innerHTML = `<b>${esc(title.trim())}</b>${rest.length ? `<small>${esc(rest.join(':').trim())}</small>` : ''}`;
        b.onclick = () => { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); render(); };
        box.append(b);
      }
    };
    render();
    sel.addEventListener('change', render);
    // Opsi yang diisi belakangan (mis. daftar izin dari API) ikut tampil.
    new MutationObserver(render).observe(sel, { childList: true });
  }
}

export function wizard(container, { onStep } = {}) {
  const steps = [...container.querySelectorAll(':scope [data-wstep]')];
  if (!steps.length) return null;
  const head = document.createElement('ol');
  head.className = 'wz-head';
  head.innerHTML = steps.map((s, i) => `<li data-i="${i}"><span>${i + 1}</span>${esc(s.dataset.wstep)}</li>`).join('');
  steps[0].before(head);
  const nav = container.querySelector('[data-wnav]') || (() => { const d = document.createElement('div'); d.className = 'wz-nav'; steps.at(-1).after(d); return d; })();
  const submit = nav.querySelector('[data-wsubmit]');
  const back = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Kembali', className: 'wz-back' });
  const next = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Lanjut', className: 'primary wz-next' });
  nav.prepend(back);
  if (submit) submit.before(next); else nav.append(next);
  let i = 0;
  const valid = () => [...steps[i].querySelectorAll('input, select, textarea')].every((el) => el.hidden || el.closest('[hidden]') || el.reportValidity());
  const show = (n) => {
    i = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, k) => { s.hidden = k !== i; });
    head.querySelectorAll('li').forEach((li, k) => { li.className = k < i ? 'done' : k === i ? 'now' : ''; });
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    if (submit) submit.hidden = i !== steps.length - 1;
    steps[i].querySelector('input:not([type=hidden]):not([type=checkbox]), select:not([hidden]), textarea')?.focus({ preventScroll: true });
    onStep?.(i);
  };
  next.onclick = () => { if (valid()) show(i + 1); };
  back.onclick = () => show(i - 1);
  head.onclick = (e) => { const li = e.target.closest('li'); if (li && Number(li.dataset.i) < i) show(Number(li.dataset.i)); };
  show(0);
  return { show, get index() { return i; } };
}

/** Area seret-lepas untuk <input type=file>: menampilkan nama & ukuran berkas terpilih. */
export function dropzone(input) {
  const zone = document.createElement('label');
  zone.className = 'dz';
  zone.htmlFor = input.id;
  zone.innerHTML = '<b>Seret video ke sini</b><span>atau klik untuk memilih berkas</span><em></em>';
  input.classList.add('dz-input');
  input.before(zone);
  const show = () => { const f = input.files[0]; zone.querySelector('em').textContent = f ? `${f.name} · ${(f.size / 1e6).toFixed(1)} MB` : ''; zone.classList.toggle('has', Boolean(f)); };
  input.addEventListener('change', show);
  for (const ev of ['dragover', 'dragenter']) zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) zone.addEventListener(ev, () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; show(); } });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
