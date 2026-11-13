// BelajarTenun – aplikasi pemula di HP.
import { api, $, esc, accountBadge } from './js/api.js';
import { PhoneCamera, GlassesCamera } from './js/sources.js';
import { TutorClient } from './js/tutor.js';
import { renderCard } from './js/cards.js';
import { shareView } from './js/rtc.js';
import { earcon } from './js/earcons.js';

const state = { config: null, module: null, tutor: null, share: null, events: { questions: 0, auto: 0 }, startedAt: 0 };
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
const feedback = (text, kind = 'info') => { const f = $('feedback'); f.textContent = text; f.className = `feedback ${kind}`; };

// ---------- Render balasan tutor ----------
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
  else if (r.display?.startsWith('📌')) feedback(r.display, 'info');
  else if (r.intent === 'instruksi') { feedback(state.config.ai && step?.auto_detect ? 'Aku memperhatikan… tekan "Sudah" kalau selesai.' : 'Tekan "Sudah" atau ucapkan "sudah" kalau selesai.'); $('answer').hidden = true; }
}

function showDemo(url, intent) {
  const step = state.module.steps[state.tutor.stepIndex];
  if (!step) return;
  if (intent === 'instruksi' && !url && !step.tips?.length) return;
  $('demo-title').textContent = step.title;
  const start = step.demo_start && !String(url).includes('#') ? `#t=${step.demo_start}` : '';
  $('demo-media').innerHTML = url ? `<video src="${esc(url)}${start}" controls autoplay muted playsinline loop></video>` : '<p class="step-count">(Video demonstrasi dari penenun belum tersedia untuk tahap ini.)</p>';
  $('demo-tips').innerHTML = (step.tips || []).map((t) => `<li>${esc(t)}</li>`).join('') + (url && step.demo_attribution ? `<li class="step-count">Sumber video: ${esc(step.demo_attribution)}</li>` : '');
  $('demo').hidden = false;
}
const closeDemo = () => { $('demo').hidden = true; $('demo-media').innerHTML = ''; };

// ---------- Hands-free ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let hfRec = null;
function startHandsfree() {
  if (!Recognition) return alert('Browser ini belum mendukung pengenalan suara. Coba Chrome.');
  hfRec = new Recognition(); hfRec.lang = 'id-ID'; hfRec.continuous = true;
  hfRec.onresult = (e) => {
    if (speechSynthesis.speaking) return; // jangan menangkap suara tutor sendiri
    const text = e.results[e.results.length - 1][0].transcript.trim();
    if (/^(coba|mulai|siap)\b/i.test(text)) return closeDemo();
    state.tutor.say(text);
  };
  hfRec.onend = () => { if (hfRec) try { hfRec.start(); } catch {} };
  hfRec.start(); $('hf-status').hidden = false;
}
function stopHandsfree() { const r = hfRec; hfRec = null; r?.stop(); $('hf-status').hidden = true; }

// ---------- Sesi ----------
async function start() {
  const choice = $('camera-source').value;
  const glasses = choice !== 'phone';
  $('cam').hidden = glasses; $('cam-img').hidden = !glasses;
  const cam = glasses ? new GlassesCamera({ profile: choice, intervalMs: 2000 }) : new PhoneCamera();
  cam.onstatus = (t) => feedback(t);
  cam.onbattery = (b) => { $('battery').textContent = `· 🔋 ${b}%`; };
  try { await cam.start(glasses ? $('cam-img') : $('cam')); }
  catch (e) { alert(glasses ? `Kacamata tidak tersambung: ${e.message}` : 'Kamera tidak bisa dibuka. Latihan tetap bisa berjalan dengan konfirmasi manual.'); }
  try { localStorage.setItem('bt_camera', choice); } catch {}
  state.camera = cam; state.events = { questions: 0, auto: 0 }; state.startedAt = Date.now();
  $('cards').innerHTML = ''; $('transcript').innerHTML = ''; $('badges').textContent = '';
  show('session');
  state.tutor = new TutorClient({
    moduleId: state.module.id, source: cam, serverTts: state.config.tts,
    ui: {
      show: renderReply,
      card: (c) => renderCard($('cards'), c),
      demo: showDemo,
      status: (t) => { if (!$('feedback').textContent) feedback(t); },
      finish,
      transcript: (role, text) => { const t = $('transcript'); t.hidden = false; t.insertAdjacentHTML('beforeend', `<p class="${role}">${role === 'user' ? '🗣️' : '🧵'} ${esc(text)}</p>`); t.scrollTop = t.scrollHeight; },
    },
  });
  await state.tutor.start();
  if ($('live').checked) {
    try { await state.tutor.startLive(); $('badges').textContent = '· 🎧 Live'; } catch (e) { feedback(`Live tidak tersedia: ${e.message}. Pakai mode standar.`, 'warn'); }
  }
  if ($('handsfree').checked && !state.tutor.live) startHandsfree();
}

function stop() { stopHandsfree(); state.tutor?.stop(); state.camera?.stop(); state.share?.stop(); state.share = null; closeDemo(); }

function finish() {
  const mins = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  stop();
  $('summary').textContent = `Kamu menyelesaikan ${state.module.steps.length} tahap dalam ±${mins} menit.`;
  $('summary-list').innerHTML = `<li>${state.events.questions} pertanyaan diajukan ke tutor</li>`;
  show('finish');
}

// ---------- Kuesioner ----------
const answers = {};
document.querySelectorAll('.scale').forEach((el) => {
  el.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}">${n}</button>`).join('');
  el.onclick = (e) => { const v = e.target.dataset.v; if (!v) return; answers[el.dataset.q] = Number(v); el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
});
$('survey').onsubmit = async (e) => {
  e.preventDefault();
  await api('/api/log', { type: 'survey', sessionId: state.tutor?.sessionId, module: state.module.id, ...answers, text: $('survey-text').value }).catch(() => {});
  $('survey').innerHTML = '<p>Terima kasih! 🙏</p>';
};

// ---------- Tombol ----------
$('start').onclick = start;
$('demo-go').onclick = closeDemo;
$('btn-done').onclick = () => state.tutor.button('next');
$('btn-repeat').onclick = () => state.tutor.button('demo');
$('btn-pin').onclick = () => { state.tutor.button('pin'); $('btn-pin').classList.toggle('on'); };
$('btn-exit').onclick = () => { stop(); show('home'); };
$('again').onclick = () => location.reload();
$('btn-ask').onclick = () => {
  if (state.tutor.live) return feedback('Mode Live: langsung bicara saja.');
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
  if (!state.camera?.stream) return feedback('Kamera belum aktif.', 'warn');
  state.share = await shareView(state.camera.stream, {
    onViewers: (n) => feedback(`🧑‍🏫 ${n} pendamping melihat`, 'ok'),
    onMessage: (m) => { earcon('captured'); feedback(`🧑‍🏫 ${m.from}: ${m.text}`, 'ok'); const u = new SpeechSynthesisUtterance(m.text); u.lang = 'id-ID'; speechSynthesis.speak(u); state.tutor.tracer.emit('companion_message', { text: m.text }); },
  });
  $('btn-share').classList.add('on');
  feedback(`Kode pendamping: ${state.share.code} — bagikan ke penenun pendampingmu (halaman /pendamping.html).`, 'ok');
};

// ---------- Init ----------
async function selectModule(id) {
  state.module = await api(`/api/module${id ? `?id=${encodeURIComponent(id)}` : ''}`);
  const m = state.module;
  $('module-title').textContent = m.title;
  $('module-desc').textContent = m.description;
  $('module-status').textContent = m.status || '';
  $('module-steps').innerHTML = m.steps.map((s) => `<li>${esc(s.title)}</li>`).join('');
  $('start').disabled = false;
  try { localStorage.setItem('bt_module', m.id); } catch {}
}

(async () => {
  state.config = await api('/api/config');
  accountBadge($('account'), state.config.user);
  const { modules } = await api('/api/modules');
  const pub = modules.filter((m) => m.published);
  if (pub.length > 1) {
    $('modules').innerHTML = `<label class="picker">Modul <select id="module-select">${pub.map((m) => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('')}</select></label>`;
    $('module-select').onchange = (e) => selectModule(e.target.value);
  }
  let saved = null; try { saved = localStorage.getItem('bt_module'); } catch {}
  await selectModule(pub.some((m) => m.id === saved) ? saved : pub[0]?.id);
  if ($('module-select')) $('module-select').value = state.module.id;
  $('live-wrap').hidden = !state.config.live;
  try { const c = localStorage.getItem('bt_camera'); if (c) $('camera-source').value = c; } catch {}
  if (!GlassesCamera.supported()) for (const o of [...$('camera-source').options].slice(1)) { o.disabled = true; o.text += ' (butuh Chrome Android)'; }
  $('mode').textContent = state.config.ai ? `Mode AI aktif · deteksi tahap otomatis (${state.config.model})` : 'Mode manual · AI belum dikonfigurasi (lihat README)';
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
