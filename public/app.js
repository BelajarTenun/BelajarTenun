// BelajarTenun – aplikasi pemula.
// Alur: Beranda (pilih modul) → Pengenalan (video singkat + penjelasan) → Siapkan kacamata → Praktik → Selesai.
import { api, $, esc, accountBadge } from './js/api.js';
import { PhoneCamera, GlassesCamera } from './js/sources.js';
import { TutorClient } from './js/tutor.js';
import { renderCard } from './js/cards.js';
import { shareView } from './js/rtc.js';
import { earcon } from './js/earcons.js';
import { assessFrame } from './js/quality.js';

const state = { config: null, modules: [], module: null, tutor: null, camera: null, share: null, events: { questions: 0 }, startedAt: 0, flowStartedAt: 0 };
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
  if (id !== 'intro') stopIntroMedia();
  if (id !== 'setup') clearInterval(state.qualityTimer);
}
const feedback = (text, kind = 'info') => { const f = $('feedback'); f.textContent = text; f.className = `feedback ${kind}`; };
const log = (type, data = {}) => api('/api/log', { type, module: state.module?.id, ...data }).catch(() => {});
function speak(text) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = 0.95; speechSynthesis.speak(u); return u; }

// ====================== 1. Beranda ======================
function renderModules() {
  const list = state.modules;
  $('module-list').innerHTML = list.length ? list.map((m) => `
    <article class="module-card">
      <div>
        <p class="module-meta">${esc(m.tradition || 'Tenun')} · ${m.steps} tahap</p>
        <h3>${esc(m.title)}</h3>
        <p class="hint">${esc(m.description || '')}</p>
      </div>
      <button class="primary" data-module="${esc(m.id)}">Mulai belajar</button>
    </article>`).join('') : '<p class="hint">Belum ada modul yang diterbitkan.</p>';
}
$('module-list').onclick = (e) => { const id = e.target.dataset?.module; if (id) openIntro(id); };

// ====================== 2. Pengenalan ======================
// Media pengenalan, berurutan menurut ketersediaan:
//  a. intro.video  – video tutorial singkat modul (dari penenun / sumber berizin)
//  b. daftar putar contoh tiap tahap (demo_video tiap tahap), dengan keterangan tahap
//  c. ringkasan bergambar: kartu tahap yang berganti otomatis + bisa dibacakan
let introTimer = null;
function stopIntroMedia() { clearInterval(introTimer); introTimer = null; $('intro-media').querySelector('video')?.pause(); speechSynthesis.cancel(); }

async function openIntro(id) {
  state.module = await api(`/api/module?id=${encodeURIComponent(id)}`);
  try { localStorage.setItem('bt_module', id); } catch {}
  const m = state.module, intro = m.intro || {};
  state.flowStartedAt = Date.now();
  $('intro-title').textContent = m.title;
  $('intro-meta').textContent = [m.tradition, intro.duration_min ? `±${intro.duration_min} menit` : null, `${m.steps.length} tahap`].filter(Boolean).join(' · ');
  $('intro-summary').textContent = intro.summary || m.description || '';
  $('intro-tools').innerHTML = (intro.tools?.length ? intro.tools : ['Alat tenun dengan benang lungsi terpasang']).map((t) => `<li>${esc(t)}</li>`).join('');
  $('intro-points').innerHTML = (intro.points?.length ? intro.points : [
    'Tutor membacakan instruksi tiap tahap lewat earbuds; tanganmu tetap bebas.',
    'Kamera melihat lungsi dan tanganmu, lalu memberi tahu kalau tahap sudah selesai atau perlu diperbaiki.',
    'Tekan tombol kacamata untuk lanjut, atau ucapkan "sudah".',
  ]).map((t) => `<li>${esc(t)}</li>`).join('');
  $('intro-steps').innerHTML = m.steps.map((s) => `<li><b>${esc(s.title)}</b><span>${esc(s.instruction)}</span></li>`).join('');
  show('intro');
  renderIntroMedia();
  log('intro_open');
}

function renderIntroMedia() {
  const m = state.module, intro = m.intro || {};
  const box = $('intro-media'), cap = $('intro-caption');
  stopIntroMedia();
  box.onclick = null;
  if (intro.video) {
    box.innerHTML = `<video src="${esc(intro.video)}" controls playsinline preload="metadata"></video>`;
    cap.textContent = intro.video_attribution ? `Video: ${intro.video_attribution}` : '';
    box.querySelector('video').onended = () => log('intro_video_done');
    return;
  }
  const clips = m.steps.filter((s) => s.demo_video);
  if (clips.length) {
    let i = 0;
    box.innerHTML = '<video controls playsinline muted autoplay></video>';
    const v = box.querySelector('video');
    const play = () => { const s = clips[i]; v.src = s.demo_video; cap.textContent = `Contoh tahap ${m.steps.indexOf(s) + 1}: ${s.title}${s.demo_attribution ? ` · ${s.demo_attribution}` : ''}`; v.play().catch(() => {}); };
    v.onended = () => { i = (i + 1) % clips.length; play(); };
    // klip demo bisa berupa potongan (#t=awal,akhir); pindah ke klip berikutnya saat potongan selesai
    v.ontimeupdate = () => { const end = /#t=[\d.]+,([\d.]+)/.exec(clips[i].demo_video)?.[1]; if (end && v.currentTime >= Number(end)) v.onended(); };
    play();
    return;
  }
  // Ringkasan bergambar
  let i = 0;
  box.innerHTML = `<div class="slides">${m.steps.map((s, k) => `<div class="slide${k ? '' : ' on'}"><span class="slide-n">Tahap ${k + 1} dari ${m.steps.length}</span><h4>${esc(s.title)}</h4><p>${esc(s.instruction)}</p></div>`).join('')}
    <div class="slide-dots">${m.steps.map((_, k) => `<button class="dot${k ? '' : ' on'}" data-slide="${k}" aria-label="Tahap ${k + 1}"></button>`).join('')}</div></div>`;
  cap.textContent = 'Video pengenalan untuk modul ini belum tersedia. Berikut ringkasan tahapnya.';
  const go = (k) => { i = k; box.querySelectorAll('.slide').forEach((el, j) => el.classList.toggle('on', j === k)); box.querySelectorAll('.dot').forEach((el, j) => el.classList.toggle('on', j === k)); };
  box.onclick = (e) => { if (e.target.dataset.slide) { go(Number(e.target.dataset.slide)); clearInterval(introTimer); } };
  introTimer = setInterval(() => go((i + 1) % m.steps.length), 5000);
}

$('intro-listen').onclick = () => {
  const m = state.module, intro = m.intro || {};
  speak([intro.summary || m.description, `Ada ${m.steps.length} tahap.`, ...m.steps.map((s, k) => `Tahap ${k + 1}, ${s.title}.`), 'Setelah ini, kita siapkan kacamata.'].filter(Boolean).join(' '));
  log('intro_listen');
};
$('intro-next').onclick = () => { log('intro_done', { seconds: Math.round((Date.now() - state.flowStartedAt) / 1000) }); openSetup(); };

// ====================== 3. Siapkan kacamata ======================
const btOk = GlassesCamera.supported();
const chosenCamera = () => { const v = document.querySelector('input[name="cam"]:checked').value; return v === 'other' ? $('other-device').value : v; };

function openSetup() {
  if (!btOk) {
    $('bt-warning').hidden = false;
    document.querySelectorAll('input[name="cam"]').forEach((r) => { if (r.value !== 'phone') r.disabled = true; });
    document.querySelector('input[name="cam"][value="phone"]').checked = true;
  } else {
    let saved = null; try { saved = localStorage.getItem('bt_camera'); } catch {}
    if (saved === 'phone') document.querySelector('input[name="cam"][value="phone"]').checked = true;
  }
  updateConnectLabel();
  show('setup');
}
function updateConnectLabel() {
  $('connect').textContent = state.camera ? 'Sambungkan ulang' : chosenCamera() === 'phone' ? 'Nyalakan kamera HP' : 'Sambungkan kacamata';
}
$('camera-choice').onchange = () => { disconnectCamera(); updateConnectLabel(); };

function disconnectCamera() {
  state.camera?.stop(); state.camera = null;
  $('preview-video').hidden = true; $('preview-img').hidden = true; $('preview-empty').hidden = false;
  $('preview-quality').textContent = ''; $('start').disabled = true; clearInterval(state.qualityTimer);
}

$('connect').onclick = async () => {
  disconnectCamera();
  const choice = chosenCamera();
  const phone = choice === 'phone';
  const cam = phone ? new PhoneCamera() : new GlassesCamera({ profile: choice, intervalMs: 2000 });
  cam.onstatus = (t) => { $('preview-quality').textContent = t; };
  cam.onbattery = (b) => { $('battery').textContent = `· Baterai ${b}%`; };
  $('preview-quality').className = 'feedback info';
  $('preview-quality').textContent = phone ? 'Membuka kamera…' : 'Pilih kacamata di jendela Bluetooth…';
  try {
    await cam.start(phone ? $('preview-video') : $('preview-img'));
  } catch (e) {
    $('preview-quality').textContent = phone ? 'Kamera tidak bisa dibuka. Izinkan akses kamera, atau lanjut tanpa kamera.' : `Kacamata tidak tersambung: ${e.message}`;
    $('preview-quality').className = 'feedback warn';
    return;
  }
  state.camera = cam;
  try { localStorage.setItem('bt_camera', choice); } catch {}
  $('preview-empty').hidden = true; (phone ? $('preview-video') : $('preview-img')).hidden = false;
  $('start').disabled = false;
  updateConnectLabel();
  // Cek kualitas gambar terus-menerus supaya murid bisa mengatur sudut pandang & cahaya.
  clearInterval(state.qualityTimer);
  state.qualityTimer = setInterval(() => {
    const el = phone ? $('preview-video') : $('preview-img');
    if (!phone && !cam.lastPhotoAt) return;
    const q = assessFrame(el);
    const tip = { 'terlalu gelap': 'Cari tempat yang lebih terang.', buram: 'Tahan kepala sebentar atau bersihkan lensa.', 'terlalu terang': 'Hindari cahaya langsung ke kamera.' }[q.reason] || '';
    $('preview-quality').textContent = q.ok ? 'Gambar jelas. Pastikan lungsi dan tanganmu terlihat.' : `Gambar ${q.reason}. ${tip}`;
    $('preview-quality').className = `feedback ${q.ok ? 'ok' : 'warn'}`;
  }, 1200);
  log('setup_connected', { camera: choice });
};
$('test-audio').onclick = () => speak('Halo, ini suara tutor BelajarTenun. Kalau suara ini terdengar di earbuds, kamu siap.');
$('skip-camera').onclick = () => { disconnectCamera(); startPractice(); };
$('start').onclick = () => startPractice();
document.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { if (b.dataset.go === 'home') disconnectCamera(); show(b.dataset.go); }));

// ====================== 4. Praktik ======================
function renderReply(r) {
  const m = state.module, step = m.steps[r.step?.index] ?? null;
  if (r.step && step) {
    $('bar').style.width = `${(r.step.index / r.step.total) * 100}%`;
    $('step-count').textContent = `Tahap ${r.step.index + 1} dari ${r.step.total}`;
    $('step-title').textContent = step.title;
    $('step-instruction').textContent = step.instruction;
  }
  if (r.intent === 'koreksi') feedback(r.display, 'warn');
  else if (r.intent === 'jawaban') { $('answer').hidden = false; $('answer').textContent = r.speak; state.events.questions++; }
  else if (r.intent === 'petunjuk' || r.intent === 'tawar_bantuan') feedback(r.speak, 'info');
  else if (r.observation) feedback(r.observation, 'info');
  else if (r.display?.startsWith('Tampilan dibekukan')) feedback(r.display, 'info');
  else if (r.intent === 'instruksi') { feedback(state.config.ai && step?.auto_detect ? 'Aku memperhatikan… tekan "Sudah" kalau selesai.' : 'Tekan "Sudah" atau ucapkan "sudah" kalau selesai.'); $('answer').hidden = true; }
}

function showDemo(url, intent) {
  const step = state.module.steps[state.tutor.stepIndex];
  if (!step) return;
  // Pengenalan sudah ditonton di awal: saat praktik, contoh hanya muncul bila diminta atau ada videonya.
  if (intent === 'instruksi' && !url) return;
  $('demo-title').textContent = step.title;
  const start = step.demo_start && !String(url).includes('#') ? `#t=${step.demo_start}` : '';
  $('demo-media').innerHTML = url ? `<video src="${esc(url)}${start}" controls autoplay muted playsinline loop></video>` : '<p class="step-count">Video contoh untuk tahap ini belum tersedia.</p>';
  $('demo-tips').innerHTML = (step.tips || []).map((t) => `<li>${esc(t)}</li>`).join('') + (url && step.demo_attribution ? `<li class="step-count">Sumber video: ${esc(step.demo_attribution)}</li>` : '');
  $('demo').hidden = false;
}
const closeDemo = () => { $('demo').hidden = true; $('demo-media').innerHTML = ''; };

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let hfRec = null;
function startHandsfree() {
  if (!Recognition) return feedback('Browser ini belum mendukung perintah suara. Coba Chrome.', 'warn');
  hfRec = new Recognition(); hfRec.lang = 'id-ID'; hfRec.continuous = true;
  hfRec.onresult = (e) => {
    if (speechSynthesis.speaking) return;
    const text = e.results[e.results.length - 1][0].transcript.trim();
    if (/^(coba|mulai|siap)\b/i.test(text)) return closeDemo();
    state.tutor.say(text);
  };
  hfRec.onend = () => { if (hfRec) try { hfRec.start(); } catch {} };
  hfRec.start(); $('hf-status').hidden = false;
}
function stopHandsfree() { const r = hfRec; hfRec = null; r?.stop(); $('hf-status').hidden = true; }

async function startPractice() {
  clearInterval(state.qualityTimer);
  const cam = state.camera;
  // Pindahkan tampilan kamera dari layar persiapan ke layar praktik.
  const glasses = cam && !(cam instanceof PhoneCamera);
  $('cam').hidden = !!glasses; $('cam-img').hidden = !glasses;
  if (cam instanceof PhoneCamera) { $('cam').srcObject = cam.stream; cam.element = $('cam'); }
  else if (cam) cam.element = $('cam-img');
  state.events = { questions: 0 }; state.startedAt = Date.now();
  $('cards').innerHTML = ''; $('transcript').innerHTML = ''; $('badges').textContent = ''; $('answer').hidden = true; feedback('');
  show('session');
  log('practice_start', { camera: cam ? cam.kind : 'tanpa kamera' });
  state.tutor = new TutorClient({
    moduleId: state.module.id, source: cam, serverTts: state.config.tts,
    ui: {
      show: renderReply,
      card: (c) => renderCard($('cards'), c),
      demo: showDemo,
      status: (t) => { if (!$('feedback').textContent) feedback(t); },
      finish,
      transcript: (role, text) => { const t = $('transcript'); t.hidden = false; t.insertAdjacentHTML('beforeend', `<p class="${role}"><b>${role === 'user' ? 'Kamu' : 'Tutor'}</b> ${esc(text)}</p>`); t.scrollTop = t.scrollHeight; },
    },
  });
  await state.tutor.start();
  if ($('live').checked) {
    try { await state.tutor.startLive(); $('badges').textContent = '· Live'; } catch (e) { feedback(`Mode real-time tidak tersedia: ${e.message}. Memakai mode standar.`, 'warn'); }
  }
  if ($('handsfree').checked && !state.tutor.live) startHandsfree();
}

function stopPractice() { stopHandsfree(); state.tutor?.stop(); state.share?.stop(); state.share = null; closeDemo(); }

function finish() {
  const mins = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  stopPractice(); disconnectCamera();
  $('summary').textContent = `Kamu menyelesaikan ${state.module.steps.length} tahap ${state.module.title} dalam ±${mins} menit.`;
  $('summary-list').innerHTML = `<li>${state.events.questions} pertanyaan diajukan ke tutor</li>`;
  show('finish');
}

// ====================== 5. Selesai: kuesioner ======================
const answers = {};
document.querySelectorAll('.scale').forEach((el) => {
  el.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}">${n}</button>`).join('');
  el.onclick = (e) => { const v = e.target.dataset.v; if (!v) return; answers[el.dataset.q] = Number(v); el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
});
$('survey').onsubmit = async (e) => {
  e.preventDefault();
  await log('survey', { sessionId: state.tutor?.sessionId, ...answers, text: $('survey-text').value });
  $('survey').innerHTML = '<p>Terima kasih atas masukanmu.</p>';
};

// ====================== Tombol praktik ======================
$('demo-go').onclick = closeDemo;
$('btn-done').onclick = () => state.tutor.button('next');
$('btn-repeat').onclick = () => state.tutor.button('demo');
$('btn-pin').onclick = () => { state.tutor.button('pin'); $('btn-pin').classList.toggle('on'); };
$('btn-exit').onclick = () => { if (confirm('Keluar dari latihan?')) { stopPractice(); disconnectCamera(); show('home'); } };
$('again').onclick = () => show('home');
$('replay-intro').onclick = () => openIntro(state.module.id);
$('btn-ask').onclick = () => {
  if (state.tutor.live) return feedback('Mode real-time: langsung bicara saja.');
  if (!Recognition) { $('ask-form').hidden = !$('ask-form').hidden; return $('ask-input').focus(); }
  const r = new Recognition(); r.lang = 'id-ID';
  $('btn-ask').classList.add('listening');
  r.onresult = (e) => state.tutor.say(e.results[0][0].transcript);
  r.onerror = () => { $('ask-form').hidden = false; };
  r.onend = () => $('btn-ask').classList.remove('listening');
  r.start();
};
$('ask-form').onsubmit = (e) => { e.preventDefault(); state.tutor.say($('ask-input').value); $('ask-input').value = ''; };
$('btn-share').onclick = async () => {
  if (state.share) { state.share.stop(); state.share = null; $('btn-share').classList.remove('on'); return feedback('Berbagi tampilan dihentikan.'); }
  if (!state.camera?.stream) return feedback('Berbagi tampilan hanya tersedia dengan kamera HP.', 'warn');
  state.share = await shareView(state.camera.stream, {
    onViewers: (n) => feedback(`${n} pendamping sedang melihat`, 'ok'),
    onMessage: (m) => { earcon('captured'); feedback(`${m.from}: ${m.text}`, 'ok'); speak(m.text); state.tutor.tracer.emit('companion_message', { text: m.text }); },
  });
  $('btn-share').classList.add('on');
  feedback(`Kode pendamping: ${state.share.code}. Bagikan ke penenun pendampingmu.`, 'ok');
};

// ====================== Mulai ======================
(async () => {
  state.config = await api('/api/config');
  accountBadge($('account'), state.config.user);
  const { modules } = await api('/api/modules');
  state.modules = modules.filter((m) => m.published);
  renderModules();
  $('live-wrap').hidden = !state.config.live;
  if (['partner', 'admin'].includes(state.config.user?.role)) { $('partner-link').href = 'editor.html'; $('partner-link').textContent = 'Ruang penenun & tim'; }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
