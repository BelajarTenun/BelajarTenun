// Logika inti BelajarTenun yang tidak bergantung pada jaringan (mudah dites).

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ');

/** Cari entri knowledge base paling relevan dengan pencocokan kata kunci sederhana. */
// Kata yang terlalu umum untuk menandai kecocokan: kata tanya/sambung, dan kata domain yang muncul
// di hampir semua pertanyaan (mis. "tenun", "benang"). Tanpa ini, "harga kain tenun?" dianggap cocok.
const STOPWORDS = new Set(('apa yang dan atau itu ini ada aku saya kamu kok sih dong nya kenapa mengapa bagaimana gimana cara '
  + 'untuk buat dari dengan pada dalam harus bisa boleh tidak nggak gak jadi kalau kapan siapa berapa mana dipakai pakai '
  + 'tenun tenunan menenun kain benang alat').split(' '));
const MIN_SCORE = 2; // satu istilah kunci, atau minimal dua kata bermakna yang sama

export function searchKnowledge(entries, question, limit = 3) {
  const q = norm(question);
  const words = new Set(q.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
  return entries
    .map((e) => {
      let score = 0;
      for (const k of e.keywords) { const kk = norm(k).trim(); if (kk && !STOPWORDS.has(kk) && q.includes(kk)) score += 3; }
      for (const w of new Set(norm(e.question).split(/\s+/))) if (words.has(w)) score += 1;
      return { entry: e, score };
    })
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

/**
 * Prompt untuk vision model: menilai apakah tahap sudah selesai.
 * opts.frames = jumlah foto terkini (urut lama→baru), opts.examples = jumlah foto contoh BENAR dari penenun,
 * opts.history = keputusan sebelumnya (konteks, ide dari Watch-Talk-and-Guide).
 */
export function buildStepCheckPrompt(step, opts = {}) {
  const { frames = 1, examples = 0, history = [] } = opts;
  const mistakes = step.common_mistakes.map((m, i) => `${i + 1}. ${m.mistake}`).join('\n');
  const hist = history.length ? history.slice(-3).map((h) => `- ${h.status}${h.observation ? ': ' + h.observation : ''}`).join('\n') : '-';
  return `Kamu adalah asisten penilai latihan menenun tradisional. Foto diambil dari kamera di kepala/kacamata pengguna (sudut pandang mata).
${examples ? `\n${examples} foto pertama adalah CONTOH BENAR dari penenun profesional untuk tahap ini (hanya referensi, BUKAN milik pengguna).` : ''}
${frames > 1 ? `${frames} foto berikutnya adalah kondisi pengguna, berurutan dari yang lama ke yang terbaru. Nilai berdasarkan foto TERBARU; foto sebelumnya hanya konteks gerakan.` : 'Foto berikutnya adalah kondisi pengguna saat ini.'}

Tahap yang sedang dilatih: "${step.title}"
Instruksi: ${step.instruction}
Kriteria berhasil: ${step.success_criteria}
Kesalahan umum yang bisa dikenali:
${mistakes || '-'}
Penilaian sebelumnya:
${hist}

Nilai HANYA berdasarkan apa yang terlihat. Jika foto kurang jelas, tangan/lungsi tidak terlihat, atau kamu ragu, pilih "uncertain".
Balas dalam JSON: {"status":"done"|"not_yet"|"mistake"|"uncertain","mistake_index":nomor atau null,"confidence":0..1,"observation":"kalimat singkat bahasa Indonesia"}`;
}

/** JSON schema untuk output terstruktur Gemini. */
export const STEP_CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['done', 'not_yet', 'mistake', 'uncertain'] },
    mistake_index: { type: 'INTEGER', nullable: true },
    confidence: { type: 'NUMBER' },
    observation: { type: 'STRING' },
  },
  required: ['status', 'confidence', 'observation'],
};

/** Normalisasi jawaban model menjadi keputusan yang aman. */
export function interpretStepCheck(raw, step, minConfidence = step?.min_confidence ?? 0.6) {
  let r;
  try {
    r = typeof raw === 'string' ? JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim()) : raw;
  } catch {
    return { status: 'uncertain', confidence: 0, observation: 'Jawaban AI tidak terbaca.' };
  }
  const allowed = ['done', 'not_yet', 'mistake', 'uncertain'];
  let status = allowed.includes(r?.status) ? r.status : 'uncertain';
  const confidence = Number.isFinite(r?.confidence) ? r.confidence : 0;
  // Keputusan "selesai" atau "salah" butuh keyakinan cukup; selain itu minta konfirmasi pengguna.
  if ((status === 'done' || status === 'mistake') && confidence < minConfidence) status = 'uncertain';
  const out = { status, confidence, observation: String(r?.observation ?? '') };
  if (status === 'mistake') {
    const m = step.common_mistakes[(r.mistake_index ?? 0) - 1];
    if (m) Object.assign(out, { mistake: m.mistake, fix: m.fix, mistakeIndex: r.mistake_index });
    else out.status = 'uncertain';
  }
  return out;
}

/** Prompt Q&A yang membatasi jawaban pada knowledge base tervalidasi. */
export function buildQaPrompt(question, step, entries) {
  const kb = entries.map((e) => `- T: ${e.question}\n  J: ${e.answer}`).join('\n');
  return `Kamu adalah tutor menenun BelajarTenun. Jawab pertanyaan pemula dalam bahasa Indonesia yang singkat (maks 3 kalimat), ramah, dan mudah diucapkan.
ATURAN: jawab HANYA berdasarkan pengetahuan di bawah. Jika jawabannya tidak ada, katakan bahwa kamu belum punya informasi tervalidasi dan sarankan bertanya ke penenun pendamping. Jangan mengarang makna motif, pakem, atau sejarah.

Tahap pengguna saat ini: ${step ? step.title + ' – ' + step.instruction : '-'}

Pengetahuan tervalidasi:
${kb || '(kosong)'}

Pertanyaan: ${question}`;
}

/** Validasi struktur modul sebelum disimpan dari editor. Mengembalikan daftar error. */
export function validateModule(m) {
  const errors = [];
  if (!m || typeof m !== 'object') return ['Modul tidak valid'];
  for (const k of ['id', 'title', 'steps']) if (!m[k]) errors.push(`Field "${k}" wajib diisi`);
  if (!Array.isArray(m.steps) || m.steps.length === 0) return [...errors, 'Modul harus punya minimal 1 tahap'];
  const ids = new Set();
  m.steps.forEach((s, i) => {
    const at = `Tahap ${i + 1}`;
    if (!/^[a-z0-9-]+$/.test(s.id || '')) errors.push(`${at}: id hanya huruf kecil, angka, dan tanda "-"`);
    if (ids.has(s.id)) errors.push(`${at}: id "${s.id}" dobel`);
    ids.add(s.id);
    for (const k of ['title', 'instruction', 'success_criteria']) if (!String(s[k] || '').trim()) errors.push(`${at}: "${k}" wajib diisi`);
    if (!Array.isArray(s.common_mistakes)) errors.push(`${at}: common_mistakes harus berupa daftar`);
    else s.common_mistakes.forEach((c, j) => { if (!c.mistake || !c.fix) errors.push(`${at}: kesalahan #${j + 1} butuh "mistake" dan "fix"`); });
  });
  return errors;
}

/** Ringkas log sesi (JSONL) menjadi metrik untuk learning & technical validation. */
export function summarizeLogs(lines) {
  const sessions = new Map();
  const steps = {};
  const survey = { n: 0, sums: {}, counts: {}, comments: [] };
  for (const line of lines) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'survey') {
      survey.n++;
      for (const k of ['mudah', 'paham', 'percaya_diri']) if (Number.isFinite(e[k])) { survey.sums[k] = (survey.sums[k] || 0) + e[k]; survey.counts[k] = (survey.counts[k] || 0) + 1; }
      if (e.text) survey.comments.push(e.text);
      continue;
    }
    if (!e.sessionId) continue;
    const s = sessions.get(e.sessionId) ?? { id: e.sessionId, module: e.module, source: e.source ?? null, start: e.at, end: e.at, done: false, stepsDone: 0, questions: 0 };
    s.end = e.at;
    if (!s.source && e.source) s.source = e.source;
    if (e.type === 'session_done') s.done = true;
    if (e.type === 'question') s.questions++;
    sessions.set(e.sessionId, s);
    if (!e.step) continue;
    const st = (steps[e.step] ??= { step: e.step, done: 0, vision: 0, manual: 0, questions: 0, mistakes: 0, checks: 0, hints: 0 });
    if (e.type === 'step_done') { st.done++; s.stepsDone++; e.source === 'vision' ? st.vision++ : st.manual++; }
    if (e.type === 'question') st.questions++;
    if (e.type === 'check') { st.checks++; if (e.status === 'mistake') st.mistakes++; }
    if (e.type === 'tutor_talk' && (e.intent === 'petunjuk' || e.intent === 'tawar_bantuan')) st.hints++;
  }
  const list = [...sessions.values()].map((s) => ({ ...s, minutes: Math.round((new Date(s.end) - new Date(s.start)) / 6000) / 10 }));
  const avg = (k) => (survey.counts[k] ? +(survey.sums[k] / survey.counts[k]).toFixed(1) : null);
  return {
    totalSessions: list.length,
    completed: list.filter((s) => s.done).length,
    completionRate: list.length ? list.filter((s) => s.done).length / list.length : 0,
    sessions: list.sort((a, b) => String(b.start).localeCompare(String(a.start))),
    steps: Object.values(steps),
    survey: { n: survey.n, mudah: avg('mudah'), paham: avg('paham'), percaya_diri: avg('percaya_diri'), comments: survey.comments.reverse() },
  };
}

/** Bandingkan keputusan AI dengan label manusia (technical validation). */
export function scoreEvaluation(results) {
  const n = results.length;
  const correct = results.filter((r) => r.predicted === r.label).length;
  const predictedDone = results.filter((r) => r.predicted === 'done');
  const falseDone = predictedDone.filter((r) => r.label !== 'done').length;
  const labelDone = results.filter((r) => r.label === 'done');
  return {
    n,
    accuracy: n ? correct / n : 0,
    doneRecall: labelDone.length ? labelDone.filter((r) => r.predicted === 'done').length / labelDone.length : 0,
    falseDoneRate: predictedDone.length ? falseDone / predictedDone.length : 0,
    uncertainRate: n ? results.filter((r) => r.predicted === 'uncertain').length / n : 0,
  };
}

/** Matriks kebingungan label × prediksi. */
export function confusionMatrix(results) {
  const labels = ['done', 'not_yet', 'mistake', 'uncertain', 'error'];
  const m = Object.fromEntries(labels.slice(0, 3).map((l) => [l, Object.fromEntries(labels.map((p) => [p, 0]))]));
  for (const r of results) if (m[r.label]) m[r.label][r.predicted in m[r.label] ? r.predicted : 'error']++;
  return m;
}
