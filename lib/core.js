// Logika inti BelajarTenun yang tidak bergantung pada jaringan (mudah dites).

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ');

/** Cari entri knowledge base paling relevan dengan pencocokan kata kunci sederhana. */
export function searchKnowledge(entries, question, limit = 3) {
  const q = norm(question);
  const words = new Set(q.split(/\s+/).filter((w) => w.length > 2));
  return entries
    .map((e) => {
      let score = 0;
      for (const k of e.keywords) if (q.includes(norm(k).trim())) score += 3;
      for (const w of norm(e.question).split(/\s+/)) if (words.has(w)) score += 1;
      return { entry: e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

/** Prompt untuk vision model: menilai apakah tahap sudah selesai. */
export function buildStepCheckPrompt(step) {
  const mistakes = step.common_mistakes.map((m, i) => `${i + 1}. ${m.mistake}`).join('\n');
  return `Kamu adalah asisten penilai latihan menenun tradisional. Gambar ini diambil dari kamera di kepala pengguna (sudut pandang mata).

Tahap yang sedang dilatih: "${step.title}"
Instruksi: ${step.instruction}
Kriteria berhasil: ${step.success_criteria}
Kesalahan umum yang bisa dikenali:
${mistakes || '-'}

Nilai HANYA berdasarkan apa yang terlihat. Jika gambar kurang jelas atau kamu ragu, pilih "uncertain".
Balas dalam JSON: {"status":"done"|"not_yet"|"mistake"|"uncertain","mistake_index":nomor atau null,"confidence":0..1,"observation":"kalimat singkat bahasa Indonesia"}`;
}

/** Normalisasi jawaban model menjadi keputusan yang aman. */
export function interpretStepCheck(raw, step, minConfidence = 0.6) {
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
    if (m) Object.assign(out, { mistake: m.mistake, fix: m.fix });
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
