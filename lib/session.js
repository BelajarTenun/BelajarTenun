// Mesin sesi belajar: sumber kebenaran tahap untuk semua klien (HP, kacamata, Gemini Live).
// AI tidak bisa memindah tahap sendiri; ia harus lewat aturan di sini.

import { decide, POLICY } from './policy.js';

const HUD_MAX = 60; // layar kacamata kecil: 1–2 baris pendek
export const hud = (text) => (text.length <= HUD_MAX ? text : text.slice(0, HUD_MAX - 1).trimEnd() + '…');
const MAX_FRAMES = 3;

/**
 * deps = {
 *   checkStep(step, frames[], {history}) → {status, confidence, fix?, observation?}
 *   ask(question, step) → {answer, sources}
 *   log(event)
 * }
 * opts = { userId, source: 'phone'|'openglass'|'frame'|'mentra'|'sim', audioOnly, policy }
 */
export function createSession(module, deps, now = () => Date.now(), opts = {}) {
  const policy = { ...POLICY, ...(opts.policy || {}) };
  const s = {
    id: crypto.randomUUID(), module, index: 0, finished: false, busy: false, lastCheck: 0,
    frames: [], pinned: false, history: [], doneStreak: 0, lastDoneAt: 0,
    lastProgressAt: now(), lastSpokeAt: 0, hintsGiven: 0, lastFix: null,
    notes: [], userId: opts.userId ?? null, source: opts.source ?? 'unknown', audioOnly: Boolean(opts.audioOnly),
  };
  const step = () => module.steps[s.index];
  const progress = () => ({ index: s.index, total: module.steps.length, title: step()?.title ?? null, id: step()?.id ?? null });
  const label = () => (s.finished ? 'Latihan selesai 🎉' : `${s.index + 1}/${module.steps.length} ${step().title}`);
  const log = (type, data = {}) => deps.log?.({ sessionId: s.id, userId: s.userId, module: module.id, step: step()?.id, type, source: s.source, ...data });

  function reply(speak, display, extra = {}) {
    if (speak) s.lastSpokeAt = now();
    return { sessionId: s.id, speak, display: hud(display || label()), step: progress(), finished: s.finished, ...extra };
  }

  function intro(prefix = '') {
    const st = step();
    log('step_start');
    return reply(`${prefix}Tahap ${s.index + 1}. ${st.title}. ${st.instruction}`, label(), { demo_video: st.demo_video ?? null, intent: 'instruksi' });
  }

  function advance(source) {
    if (s.finished) return reply('Latihan sudah selesai.', label());
    log('step_done', { source });
    s.index++; s.history = []; s.doneStreak = 0; s.hintsGiven = 0; s.lastFix = null; s.lastProgressAt = now(); s.lastDoneAt = 0;
    if (s.index >= module.steps.length) {
      s.finished = true;
      log('session_done');
      return reply('Selamat! Latihan dasar selesai.', label(), { intent: 'selesai' });
    }
    return intro('Bagus! ');
  }

  function proactive(event) {
    const d = decide(s, event, step(), now(), policy);
    if (!d.talk) return null;
    if (d.intent === 'petunjuk' || d.intent === 'tawar_bantuan') s.hintsGiven++;
    if (d.intent === 'koreksi') s.lastFix = { text: d.text, at: now() };
    log('tutor_talk', { intent: d.intent });
    return reply(d.text, d.intent === 'koreksi' ? `⚠ ${d.text}` : d.text, { intent: d.intent });
  }

  /** Jalankan deteksi pada frame terkini, dengan smoothing: "selesai" butuh N konfirmasi berturut-turut. */
  async function runCheck() {
    const st = step();
    // Model lokal di HP (F8): bila sangat yakin untuk tahap ini, pakai hasilnya tanpa memanggil AI cloud.
    const local = s.lastLocal && s.lastLocal.stepId === st.id && s.lastLocal.confidence >= (st.local_min_confidence ?? 0.9) && ['done', 'not_yet'].includes(s.lastLocal.label) ? s.lastLocal : null;
    const r = local
      ? { status: local.label, confidence: local.confidence, observation: '', via: 'lokal' }
      : await deps.checkStep(st, s.frames.map((f) => f.b64), { history: s.history });
    s.history.push({ status: r.status, observation: r.observation });
    if (s.history.length > 6) s.history.shift();
    log('check', { status: r.status, confidence: r.confidence, via: r.via ?? 'cloud', frames: s.frames.length, viewAgeMs: s.frames.length ? now() - s.frames.at(-1).at : null });
    if (st !== step()) return { result: r, stale: true };
    if (r.status === 'done') { s.doneStreak++; s.lastDoneAt = now(); } else if (r.status !== 'uncertain') s.doneStreak = 0;
    if (r.status === 'not_yet' || r.status === 'done') s.lastProgressAt = Math.max(s.lastProgressAt, now() - policy.hintAfterMs / 2);
    return { result: r, confirmed: s.doneStreak >= (st.confirm_frames ?? 2) };
  }

  const tools = {
    get_current_step() {
      const st = step();
      return { response: { tahap: s.index + 1, total: module.steps.length, judul: st?.title, instruksi: st?.instruction, kriteria_berhasil: st?.success_criteria, tips: st?.tips, kesalahan_umum: st?.common_mistakes, selesai: s.finished } };
    },
    async check_my_work() {
      if (!s.frames.length) return { response: { hasil: 'tidak_ada_gambar', pesan: 'Belum ada gambar kamera yang jelas.' } };
      const { result, confirmed } = await runCheck();
      if (confirmed) { const r = advance('vision'); return { response: { hasil: 'selesai', tahap_berikutnya: r.step }, ui: r }; }
      return { response: { hasil: result.status, keyakinan: result.confidence, pengamatan: result.observation, perbaikan: result.fix ?? null, perlu_konfirmasi: result.status === 'done' } };
    },
    mark_step_done({ user_confirmed } = {}) {
      // Hanya boleh maju bila pengguna mengonfirmasi dengan suara ATAU deteksi kamera baru saja menyatakan selesai.
      const recentVision = s.lastDoneAt && now() - s.lastDoneAt < 20000;
      if (!user_confirmed && !recentVision) return { response: { ditolak: true, alasan: 'Tanyakan dulu ke pengguna apakah tahap ini sudah selesai, atau minta ia menunjukkan hasilnya ke kamera.' } };
      const r = advance(user_confirmed ? 'voice' : 'vision');
      return { response: { berhasil: true, tahap_sekarang: r.step, selesai: r.finished }, ui: r };
    },
    report_mistake({ mistake_index } = {}) {
      const m = step()?.common_mistakes?.[(mistake_index ?? 0) - 1];
      if (!m) return { response: { error: 'Nomor kesalahan tidak ada di kurikulum' } };
      log('check', { status: 'mistake', confidence: 1, via: 'live' });
      s.lastFix = { text: m.fix, at: now() };
      return { response: { perbaikan: m.fix }, ui: reply('', `⚠ ${m.fix}`, { intent: 'koreksi' }) };
    },
    async search_knowledge({ question } = {}) {
      log('question', { question });
      const a = await deps.ask(String(question || ''), step());
      return { response: { jawaban: a.answer, sumber: a.sources } };
    },
    repeat_instruction() { const r = intro(); return { response: { instruksi: r.speak }, ui: r }; },
    play_demo() { return { response: { ada_video: Boolean(step()?.demo_video) }, ui: { sessionId: s.id, demo_video: step()?.demo_video ?? null, display: hud('▶ Video contoh'), step: progress() } }; },
    show_card(card = {}) {
      // Protokol kartu VisionClaw v1: info | list | image; uuid sama = ganti kartu.
      const c = { uuid: String(card.uuid || 'kartu'), type: ['info', 'list', 'image'].includes(card.type) ? card.type : 'info', title: card.title, value: card.value, body: card.body, facts: card.facts, items: card.items, image_url: card.image_url, fallback_text: String(card.fallback_text || card.title || '') };
      return { response: { ditampilkan: true, catatan: s.audioOnly ? 'Kacamata tanpa layar: ucapkan isi pentingnya.' : 'Lanjutkan bicara secara natural.' }, ui: { sessionId: s.id, card: c, display: hud(c.fallback_text), step: progress() } };
    },
    save_note({ text } = {}) {
      const n = { id: s.notes.length + 1, text: String(text || '').slice(0, 300), step: step()?.id, at: new Date(now()).toISOString() };
      s.notes.push(n); log('note', { text: n.text });
      return { response: { tersimpan: true, jumlah: s.notes.length }, ui: { sessionId: s.id, card: notesCard(), step: progress() } };
    },
    recall_notes() { return { response: { catatan: s.notes.map((n) => n.text) }, ui: { sessionId: s.id, card: notesCard(), step: progress() } }; },
  };
  const notesCard = () => ({ uuid: 'catatan', type: 'list', title: 'Catatan belajarku', items: s.notes.map((n) => ({ glyph: '•', title: n.text })), fallback_text: `${s.notes.length} catatan` });

  return {
    state: s,
    start() { log('session_start', { audioOnly: s.audioOnly }); return intro(); },

    /** Terima foto (base64 JPEG) dari kamera. meta.quality: hasil filter kualitas di perangkat. */
    async frame(imageB64, meta = {}, minIntervalMs = 4000) {
      if (s.finished) return reply('', label(), { skipped: true });
      if (meta.quality && meta.quality.ok === false) return reply('', label(), { skipped: true, reason: 'kualitas' });
      if (!s.pinned) { s.frames.push({ b64: imageB64, at: now() }); if (s.frames.length > MAX_FRAMES) s.frames.shift(); }
      s.lastLocal = meta.local ?? null;
      const st = step();
      if (!st.auto_detect || s.busy || now() - s.lastCheck < minIntervalMs) {
        return proactive({ type: 'tick' }) ?? reply('', label(), { skipped: true });
      }
      s.busy = true; s.lastCheck = now();
      try {
        const { result, confirmed, stale } = await runCheck();
        if (stale) return reply('', label(), { skipped: true });
        if (confirmed) return advance('vision');
        return proactive({ type: 'check', result }) ?? reply('', label(), { observation: result.observation, status: result.status });
      } finally { s.busy = false; }
    },

    /** Dipanggil berkala oleh klien tanpa kamera aktif, untuk petunjuk proaktif. */
    tick() { return s.finished ? reply('', label(), { skipped: true }) : (proactive({ type: 'tick' }) ?? reply('', label(), { skipped: true })); },

    async say(text) {
      const t = String(text || '').toLowerCase().trim();
      if (!t) return reply('', label());
      if (s.finished) return reply('Latihan sudah selesai.', label());
      if (/^(sudah|selesai|lanjut)\b/.test(t)) return advance('voice');
      if (/^(ulang|ulangi)\b/.test(t)) return intro();
      if (/^(contoh|demo|lihat contoh)\b/.test(t)) return tools.play_demo().ui;
      if (/^(catat|simpan catatan)\b/.test(t)) return tools.save_note({ text: text.replace(/^\S+\s*/, '') }).ui;
      log('question', { question: text });
      const a = await deps.ask(text, step());
      return reply(a.answer, a.answer, { sources: a.sources, intent: 'jawaban' });
    },

    button(action) {
      if (action === 'next') return advance('button');
      if (action === 'repeat') return intro();
      if (action === 'demo') return tools.play_demo().ui;
      if (action === 'pin') { s.pinned = !s.pinned; log('pin', { pinned: s.pinned }); return reply('', s.pinned ? '📌 Tampilan dibekukan' : label(), { pinned: s.pinned }); }
      return reply('', label());
    },

    /** Eksekusi tool dari Gemini Live. Mengembalikan { response, ui? }. */
    async tool(name, args) {
      const fn = tools[name];
      if (!fn) return { response: { error: `Tool ${name} tidak dikenal` } };
      log('tool', { name });
      return fn(args || {});
    },
  };
}
