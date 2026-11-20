// Analisis video tenun per sumber dengan Gemini (video + audio).
// Bertingkat: (a) transkrip narasi bercap waktu → (b) tahap kasar + waktu → (c) rincian per tahap.
// Dijalankan 2× pada suhu rendah; tahap yang tidak konsisten ditandai "ragu".
// Hasil mentah disimpan apa adanya di analyses/<sourceId>.json (dengan versi prompt) untuk perbandingan.
import { store } from './store.js';
import { config } from './config.js';
import { generate, isVertex } from './ai.js';
import { getAccessToken } from './google-auth.js';

export const PROMPT_VERSION = 'video-steps-v2';
// v2: 3× self-consistency + konsensus median, verifikasi batas tahap pada klip pendek, tipe kesalahan EgoPER, transkrip ASR bila ada.
export const MISTAKE_TYPES = ['slip', 'correction', 'modification', 'addition', 'omission'];
const BASE = 'https://generativelanguage.googleapis.com';

/** Unggah berkas ke Gemini Files API (resumable) lalu tunggu sampai ACTIVE. */
export async function uploadToGemini(buf, mimeType, displayName) {
  if (isVertex()) return uploadToGcs(buf, mimeType, displayName);
  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.geminiKey, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(buf.length), 'X-Goog-Upload-Header-Content-Type': mimeType, 'content-type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!start.ok || !uploadUrl) throw new Error(`Gagal memulai unggah ke Gemini: ${start.status}`);
  const up = await fetch(uploadUrl, { method: 'POST', headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize', 'content-length': String(buf.length) }, body: buf });
  if (!up.ok) throw new Error(`Unggah ke Gemini gagal: ${up.status}`);
  let { file } = await up.json();
  for (let i = 0; i < 60 && file.state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    file = await (await fetch(`${BASE}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': config.geminiKey } })).json();
  }
  if (file.state !== 'ACTIVE') throw new Error(`Berkas Gemini tidak aktif (${file.state})`);
  return { uri: file.uri, mimeType, name: file.name };
}

/** Vertex AI tidak punya Files API: video diunggah ke Cloud Storage lalu dirujuk dengan gs://. */
export async function uploadToGcs(buf, mimeType, displayName) {
  if (!config.vertexBucket) throw new Error('Analisis video dengan Vertex AI butuh VERTEX_GCS_BUCKET');
  const name = `belajartenun/${Date.now()}-${String(displayName).replace(/[^\w.-]+/g, '_')}`;
  const res = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${config.vertexBucket}/o?uploadType=media&name=${encodeURIComponent(name)}`, {
    method: 'POST', headers: { authorization: `Bearer ${await getAccessToken()}`, 'content-type': mimeType }, body: buf,
  });
  if (!res.ok) throw new Error(`Unggah ke Cloud Storage gagal: ${res.status}`);
  return { uri: `gs://${config.vertexBucket}/${name}`, mimeType, name };
}

const STR = { type: 'STRING' }, NUM = { type: 'NUMBER' };
const arr = (items) => ({ type: 'ARRAY', items });
const obj = (properties, required = Object.keys(properties)) => ({ type: 'OBJECT', properties, required });

export const TRANSCRIPT_SCHEMA = obj({ segments: arr(obj({ start: NUM, end: NUM, text: STR, speaker: STR }, ['start', 'end', 'text'])), language: STR }, ['segments']);
export const STEPS_SCHEMA = obj({
  goal: STR, viewpoint: { type: 'STRING', enum: ['exo', 'ego', 'campuran'] }, loomType: STR,
  steps: arr(obj({ title: STR, start: NUM, end: NUM, actions: arr(STR), tools: arr(STR), materials: arr(STR) }, ['title', 'start', 'end', 'actions', 'tools'])),
}, ['goal', 'viewpoint', 'steps']);
export const DETAIL_SCHEMA = obj({
  steps: arr(obj({
    index: { type: 'INTEGER' }, instruction: STR, success_visual: STR, tips: arr(STR),
    mistakes: arr(obj({ mistake: STR, fix: STR, type: { type: 'STRING', enum: MISTAKE_TYPES } }, ['mistake', 'fix', 'type'])), narration_quotes: arr(STR), confidence: NUM,
  }, ['index', 'instruction', 'success_visual', 'mistakes', 'confidence'])),
  terms: arr(obj({ term: STR, meaning_guess: STR, said_at: NUM }, ['term', 'meaning_guess'])),
}, ['steps', 'terms']);

const ctx = (src) => `Tradisi: ${src.tradition}${src.region ? `, daerah ${src.region}` : ''}${src.loomType ? `, alat ${src.loomType}` : ''}${src.technique ? `, teknik ${src.technique}` : ''}.`;

export const prompts = {
  transcript: (src) => `Transkripsikan semua ucapan dalam video tenun ini dengan cap waktu (detik). ${ctx(src)} Tulis istilah lokal apa adanya. Jangan menerjemahkan. Jika tidak ada ucapan, kembalikan segments kosong.`,
  steps: (src, transcript) => `Video ini menunjukkan proses menenun tradisional. ${ctx(src)}
Tandai tahap-tahap proses yang BENAR-BENAR terlihat, berurutan, dengan detik mulai & akhir. Satu tahap = satu aksi bermakna (mis. "membuka mulut lungsi", "memasukkan pakan", "merapatkan pakan"). Gunakan bahasa Indonesia untuk judul; sebut alat dengan nama yang terdengar/terlihat.
Tentukan sudut kamera: "exo" (direkam orang lain), "ego" (dari kepala penenun), atau "campuran".
${transcript?.length ? `Narasi penenun (gunakan sebagai petunjuk urutan, bukan pengganti penglihatan):\n${transcript.slice(0, 200).map((s) => `[${s.start}-${s.end}] ${s.text}`).join('\n')}` : ''}`,
  boundary: (src, step, t) => `${ctx(src)} Klip ini dimulai beberapa detik sebelum detik ${t} video asli. Tahap yang diperiksa: "${step.title}". Pada AKHIR klip, apakah tahap ini sudah SELESAI dan tahap berikutnya sudah dimulai? Jawab berdasarkan yang terlihat saja.`,
  detail: (src, steps) => `${ctx(src)} Untuk setiap tahap berikut (lihat video pada rentang waktunya), tulis:
- instruction: instruksi singkat seperti diucapkan guru kepada pemula (bahasa Indonesia, 1–2 kalimat)
- success_visual: seperti apa tampilan bila tahap BERHASIL (yang terlihat kamera)
- tips: petunjuk singkat
- mistakes: kesalahan yang terlihat ATAU disebut penenun, beserta cara memperbaiki dan tipenya (slip = salah gerak sesaat; correction = salah lalu dibetulkan; modification = dilakukan dengan cara berbeda; addition = langkah tak perlu; omission = langkah terlewat). Jangan mengarang; kosongkan bila tidak ada bukti.
- narration_quotes: kutipan ucapan penenun yang relevan
- confidence: 0–1 seberapa yakin
Juga daftar istilah lokal (terms) yang diucapkan, dengan dugaan maknanya. JANGAN mengarang makna motif atau filosofi.
Tahap:\n${steps.map((s, i) => `${i}. [${s.start}-${s.end}] ${s.title}`).join('\n')}`,
};

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / Math.max(1e-6, Math.max(a.end, b.end) - Math.min(a.start, b.start));
const tok = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
const jacc = (a, b) => { const A = tok(a), B = tok(b); const i = [...A].filter((x) => B.has(x)).length; return i / Math.max(1, A.size + B.size - i); };

/** Tandai tahap yang tidak muncul konsisten di dua kali analisis (dipertahankan untuk analisis v1). */
export function markConsistency(runA, runB) {
  return runA.map((s) => {
    const best = Math.max(0, ...runB.map((t) => 0.6 * overlap(s, t) + 0.4 * jacc(s.title, t.title)));
    return { ...s, consistency: +best.toFixed(2), ragu: best < 0.35 };
  });
}

const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const matchScore = (s, t) => 0.6 * overlap(s, t) + 0.4 * jacc(s.title, t.title);

/**
 * Konsensus self-consistency dari ≥2 kali analisis (Wang dkk. 2023, diterapkan pada segmentasi):
 * jangkar = run dengan jumlah tahap median; tiap tahap jangkar dicocokkan ke tahap terbaik di run lain;
 * batas = median dari pasangan yang cocok; support = berapa run memuat tahap itu; ragu bila support < mayoritas.
 */
export function consensusSteps(runs, minMatch = 0.35) {
  const valid = runs.filter((r) => Array.isArray(r) && r.length);
  if (!valid.length) return [];
  const anchor = [...valid].sort((a, b) => a.length - b.length)[valid.length >> 1];
  const need = Math.floor(valid.length / 2) + 1;
  return anchor.map((s) => {
    const matches = [s];
    for (const run of valid) {
      if (run === anchor) continue;
      const best = run.map((t) => [t, matchScore(s, t)]).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= minMatch) matches.push(best[0]);
    }
    const support = matches.length;
    return {
      ...s, start: +median(matches.map((m) => m.start)).toFixed(1), end: +median(matches.map((m) => m.end)).toFixed(1),
      support, runs: valid.length, consistency: +(support / valid.length).toFixed(2), ragu: support < need,
      boundarySpread: +Math.max(...matches.map((m) => m.end)) - Math.min(...matches.map((m) => m.end)),
    };
  }).sort((a, b) => a.start - b.start);
}

/**
 * Verifikasi batas akhir tiap tahap dengan pertanyaan biner pada klip pendek (cap waktu Gemini hanya akurat ~detik
 * dan dilaporkan melompat). Probe di t-δ, t, t+δ; batas digeser ke probe paling awal yang menjawab "sudah selesai".
 * askAt(step, t) → Promise<{done:boolean, confidence:number}>
 */
export async function verifyBoundaries(steps, askAt, { delta = 2, maxSteps = 20 } = {}) {
  const out = steps.map((s) => ({ ...s }));
  for (const s of out.filter((x) => !x.ragu).slice(0, maxSteps)) {
    const probes = [s.end - delta, s.end, s.end + delta].filter((t) => t > s.start);
    const answers = [];
    for (const t of probes) {
      try { answers.push({ t, ...(await askAt(s, t)) }); } catch { /* probe gagal: abaikan */ }
    }
    const first = answers.find((a) => a.done && (a.confidence ?? 1) >= 0.5);
    s.boundaryVerified = answers.length ? Boolean(first) : null;
    if (first && first.t !== s.end) { s.endOriginal = s.end; s.end = +first.t.toFixed(1); }
  }
  return out;
}

export const BOUNDARY_SCHEMA = obj({ done: { type: 'BOOLEAN' }, confidence: NUM, evidence: STR }, ['done', 'confidence']);

/**
 * Analisis satu sumber. deps (untuk tes) = { generate, upload, readVideo }.
 * Mengembalikan objek analisis dan menyimpannya.
 */
export async function analyzeSource(source, deps = {}, onProgress) {
  const gen = deps.generate ?? generate;
  const upload = deps.upload ?? uploadToGemini;
  const buf = deps.readVideo ? await deps.readVideo(source) : await store.readFile(`sources/${source.id}/video.mp4`);
  onProgress?.('unggah ke Gemini');
  const file = await upload(buf, 'video/mp4', source.id);
  const video = { file_data: { mime_type: file.mimeType, file_uri: file.uri } };
  const ask = async (text, schema, temperature = 0.1) => JSON.parse(await gen([video, { text }], { json: true, schema, temperature, kind: 'video_analysis' }));

  onProgress?.('transkrip narasi');
  // ASR khusus (Chirp, cap waktu kata) bila tersedia; Gemini sebagai cadangan.
  const transcript = (deps.transcribe ? await deps.transcribe(source).catch(() => null) : null)
    ?? (await ask(prompts.transcript(source), TRANSCRIPT_SCHEMA).catch(() => ({ segments: [] }))).segments ?? [];
  const runs = [];
  for (const [i, temp] of [0.1, 0.3, 0.5].entries()) {
    onProgress?.(`tahap (${i + 1}/3, self-consistency)`);
    const r = await ask(prompts.steps(source, transcript), STEPS_SCHEMA, temp).catch(() => null);
    if (r) runs.push(r);
  }
  if (!runs.length) throw new Error('analisis tahap gagal di semua percobaan');
  const a = runs[0];
  onProgress?.('verifikasi batas tahap');
  const clip = (t) => ({ ...video, video_metadata: { start_offset: `${Math.max(0, Math.floor(t - 6))}s`, end_offset: `${Math.ceil(t)}s` } });
  const askAt = async (step, t) => JSON.parse(await gen([clip(t), { text: prompts.boundary(source, step, t) }], { json: true, schema: BOUNDARY_SCHEMA, temperature: 0, kind: 'boundary_check' }));
  const steps = await verifyBoundaries(consensusSteps(runs.map((r) => r.steps || [])), deps.askAt ?? askAt, { maxSteps: deps.maxBoundaryChecks ?? 20 });
  onProgress?.('rincian per tahap');
  const d = steps.length ? await ask(prompts.detail(source, steps), DETAIL_SCHEMA) : { steps: [], terms: [] };
  for (const det of d.steps || []) if (steps[det.index]) Object.assign(steps[det.index], { instruction: det.instruction, success_visual: det.success_visual, tips: det.tips || [], mistakes: det.mistakes || [], narrationQuotes: det.narration_quotes || [], confidence: det.confidence });

  const analysis = {
    sourceId: source.id, tradition: source.tradition, region: source.region ?? null, model: config.geminiModel, promptVersion: PROMPT_VERSION,
    createdAt: new Date().toISOString(), goal: a.goal, viewpoint: a.viewpoint, loomType: a.loomType ?? source.loomType ?? null,
    transcript, transcriptSource: deps.transcribe ? 'asr' : 'gemini', runs: runs.length,
    steps: steps.map((s, i) => ({ key: `${source.id}#${i}`, ...s })), terms: d.terms || [],
  };
  await store.writeJson(`analyses/${source.id}.json`, analysis);
  return analysis;
}

export const getAnalysis = (sourceId) => store.readJson(`analyses/${sourceId}.json`, null);
export async function listAnalyses() {
  const out = [];
  for (const f of await store.list('analyses')) if (f.endsWith('.json')) out.push(await store.readJson(`analyses/${f}`));
  return out;
}
