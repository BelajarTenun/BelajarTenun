// BelajarTenun – klien sesi belajar (state machine tahap, kamera, suara, Q&A).
const $ = (id) => document.getElementById(id);
const CHECK_INTERVAL_MS = 6000;

const state = { config: {}, module: null, index: 0, events: [], sessionId: crypto.randomUUID(), timer: null, busy: false, stream: null };

const api = async (path, body) => {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
};
const log = (type, data = {}) => {
  const ev = { sessionId: state.sessionId, module: state.module?.id, step: currentStep()?.id, type, ...data };
  state.events.push({ ...ev, t: Date.now() });
  api('/api/log', ev).catch(() => {});
};
const currentStep = () => state.module?.steps[state.index];
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));

// ---------- Suara ----------
let audio;
async function speak(text) {
  audio?.pause(); speechSynthesis.cancel();
  if (state.config.tts) {
    try {
      const { audio: b64 } = await api('/api/tts', { text });
      audio = new Audio(`data:audio/mp3;base64,${b64}`);
      return audio.play();
    } catch { /* jatuh ke suara browser */ }
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; u.rate = 0.95;
  speechSynthesis.speak(u);
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function listenOnce() {
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = 'id-ID'; r.interimResults = false;
    r.onresult = (e) => resolve(e.results[0][0].transcript);
    r.onerror = (e) => reject(e.error);
    r.onend = () => resolve('');
    r.start();
  });
}

// ---------- Alur tahap ----------
function feedback(text, kind = 'info') { const f = $('feedback'); f.textContent = text; f.className = `feedback ${kind}`; }

function renderStep() {
  const s = currentStep(), n = state.module.steps.length;
  $('bar').style.width = `${(state.index / n) * 100}%`;
  $('step-count').textContent = `Tahap ${state.index + 1} dari ${n}`;
  $('step-title').textContent = s.title;
  $('step-instruction').textContent = s.instruction;
  feedback(state.config.ai && s.auto_detect ? 'Aku sedang memperhatikan… tekan "Sudah" kalau kamu selesai.' : 'Tekan "Sudah" atau ucapkan "sudah" kalau selesai.');
  $('answer').hidden = true;
  speak(s.instruction);
  log('step_start');
}

function nextStep(source) {
  log('step_done', { source });
  state.index++;
  if (state.index >= state.module.steps.length) return finish();
  feedback('Bagus! Lanjut ke tahap berikutnya.', 'ok');
  setTimeout(renderStep, 1200);
}

async function checkStep() {
  const s = currentStep();
  if (!state.config.ai || !s?.auto_detect || state.busy || document.hidden) return;
  state.busy = true;
  try {
    const v = $('cam'), c = $('snap');
    const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
    c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
    const r = await api('/api/check-step', { stepId: s.id, image: c.toDataURL('image/jpeg', 0.7) });
    log('check', { status: r.status, confidence: r.confidence });
    if (s !== currentStep()) return;
    if (r.status === 'done') { speak('Bagus, tahap ini sudah selesai.'); nextStep('vision'); }
    else if (r.status === 'mistake') { feedback(`⚠️ ${r.fix}`, 'warn'); speak(r.fix); }
    else if (r.status === 'not_yet' && r.observation) feedback(r.observation, 'info');
  } catch (e) {
    console.warn('check gagal', e);
  } finally { state.busy = false; }
}

async function ask(question) {
  if (!question.trim()) return;
  $('answer').hidden = false; $('answer').textContent = '…';
  log('question', { question });
  try {
    const { answer } = await api('/api/ask', { question, stepId: currentStep()?.id });
    $('answer').textContent = answer;
    speak(answer);
  } catch (e) { $('answer').textContent = 'Maaf, tutor sedang tidak bisa dihubungi.'; }
}

// Perintah suara singkat; selain itu dianggap pertanyaan.
function handleUtterance(text) {
  const t = text.toLowerCase().trim();
  if (/^(sudah|selesai|lanjut)\b/.test(t)) return nextStep('voice');
  if (/^(ulang|ulangi)\b/.test(t)) return speak(currentStep().instruction);
  return ask(text);
}

// ---------- Layar ----------
async function start() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 1280 }, audio: false });
    $('cam').srcObject = state.stream;
  } catch { alert('Kamera tidak bisa dibuka. Latihan tetap bisa berjalan dengan konfirmasi manual.'); }
  state.index = 0; state.events = []; state.sessionId = crypto.randomUUID();
  show('session'); log('session_start'); renderStep();
  state.timer = setInterval(checkStep, CHECK_INTERVAL_MS);
}

function stop() {
  clearInterval(state.timer); state.stream?.getTracks().forEach((t) => t.stop());
  speechSynthesis.cancel(); audio?.pause();
}

function finish() {
  stop(); log('session_done');
  const q = state.events.filter((e) => e.type === 'question').length;
  const auto = state.events.filter((e) => e.type === 'step_done' && e.source === 'vision').length;
  const mins = Math.max(1, Math.round((Date.now() - state.events[0].t) / 60000));
  $('summary').textContent = `Kamu menyelesaikan ${state.module.steps.length} tahap dalam ±${mins} menit.`;
  $('summary-list').innerHTML = `<li>${q} pertanyaan diajukan ke tutor</li><li>${auto} tahap dikenali otomatis oleh kamera</li>`;
  show('finish'); speak('Selamat! Latihan dasar selesai.');
}

$('start').onclick = start;
$('btn-done').onclick = () => nextStep('button');
$('btn-repeat').onclick = () => speak(currentStep().instruction);
$('btn-exit').onclick = () => { log('session_exit'); stop(); show('home'); };
$('again').onclick = () => show('home');
$('btn-ask').onclick = async () => {
  if (!Recognition) { $('ask-form').hidden = !$('ask-form').hidden; $('ask-input').focus(); return; }
  const b = $('btn-ask'); b.classList.add('listening'); b.textContent = '🎙️ Mendengar…';
  try { handleUtterance(await listenOnce()); }
  catch { $('ask-form').hidden = false; }
  finally { b.classList.remove('listening'); b.textContent = '🎙️ Tanya'; }
};
$('ask-form').onsubmit = (e) => { e.preventDefault(); handleUtterance($('ask-input').value); $('ask-input').value = ''; };

// ---------- Init ----------
(async () => {
  [state.config, state.module] = await Promise.all([api('/api/config'), api('/api/module')]);
  const m = state.module;
  $('module-title').textContent = m.title;
  $('module-desc').textContent = m.description;
  $('module-status').textContent = m.status;
  $('module-steps').innerHTML = m.steps.map((s) => `<li>${s.title}</li>`).join('');
  $('mode').textContent = state.config.ai ? `Mode AI aktif · deteksi tahap otomatis (${state.config.model})` : 'Mode manual · AI belum dikonfigurasi (lihat README)';
  $('start').disabled = false;
})();
