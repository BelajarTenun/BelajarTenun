// Mesin sesi belajar di sisi server, untuk perangkat "bodoh" seperti smart glasses.
// Kacamata hanya mengirim: foto kamera, teks ucapan (hasil speech-to-text), atau tombol.
// Server membalas: kalimat untuk diucapkan + teks pendek untuk layar lensa (HUD).

const HUD_MAX = 60; // layar kacamata kecil: 1–2 baris pendek

export const hud = (text) => (text.length <= HUD_MAX ? text : text.slice(0, HUD_MAX - 1).trimEnd() + '…');

/**
 * deps = { checkStep(step, imageB64) → {status, fix?, observation?}, ask(question, step) → answer string, log(event) }
 */
export function createSession(module, deps, now = () => Date.now()) {
  const s = { id: crypto.randomUUID(), module, index: 0, finished: false, lastCheck: 0, busy: false, createdAt: now() };
  const step = () => module.steps[s.index];
  const progress = () => ({ index: s.index, total: module.steps.length, title: step()?.title ?? null });
  const reply = (speak, display, extra = {}) => ({ sessionId: s.id, speak, display: hud(display), step: progress(), finished: s.finished, ...extra });
  const log = (type, data = {}) => deps.log?.({ sessionId: s.id, module: module.id, step: step()?.id, type, source: 'glasses', ...data });

  function intro() {
    const st = step();
    log('step_start');
    return reply(`Tahap ${s.index + 1}. ${st.title}. ${st.instruction}`, `${s.index + 1}/${module.steps.length} ${st.title}`,
      { demo_video: st.demo_video ?? null });
  }

  function next(source) {
    if (s.finished) return reply('Latihan sudah selesai.', 'Latihan selesai 🎉');
    log('step_done', { source });
    s.index++;
    if (s.index >= module.steps.length) {
      s.finished = true;
      log('session_done');
      return reply('Selamat! Latihan dasar selesai.', 'Latihan selesai 🎉');
    }
    const r = intro();
    return { ...r, speak: `Bagus! ${r.speak}` };
  }

  const handlers = {
    start() { log('session_start'); return intro(); },

    async frame(imageB64, minIntervalMs = 4000) {
      const st = step();
      if (s.finished) return reply('', 'Latihan selesai 🎉');
      // Kacamata bisa mengirim frame terus; batasi agar biaya & jeda AI wajar.
      if (!st.auto_detect || s.busy || now() - s.lastCheck < minIntervalMs) return reply('', `${s.index + 1}/${module.steps.length} ${st.title}`, { skipped: true });
      s.busy = true; s.lastCheck = now();
      try {
        const r = await deps.checkStep(st, imageB64);
        log('check', { status: r.status, confidence: r.confidence });
        if (st !== step()) return reply('', progress().title ?? '');
        if (r.status === 'done') return next('vision');
        if (r.status === 'mistake') return reply(r.fix, `⚠ ${r.fix}`);
        return reply('', `${s.index + 1}/${module.steps.length} ${st.title}`, { observation: r.observation });
      } finally { s.busy = false; }
    },

    async say(text) {
      const t = String(text || '').toLowerCase().trim();
      if (!t) return reply('', progress().title ?? '');
      if (s.finished) return reply('Latihan sudah selesai.', 'Latihan selesai 🎉');
      if (/^(sudah|selesai|lanjut)\b/.test(t)) return next('voice');
      if (/^(ulang|ulangi|contoh|demo)\b/.test(t)) return intro();
      log('question', { question: text });
      const answer = await deps.ask(text, step());
      return reply(answer, answer);
    },

    button(action) {
      if (action === 'next') return next('button');
      if (action === 'repeat') return intro();
      return reply('', progress().title ?? '');
    },
  };
  return { state: s, ...handlers };
}
