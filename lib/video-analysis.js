// Analisis video tenun per sumber dengan Gemini (video + audio).
// Bertingkat: (a) transkrip narasi bercap waktu → (b) tahap kasar + waktu → (c) rincian per tahap.
// Dijalankan 2× pada suhu rendah; tahap yang tidak konsisten ditandai "ragu".
// Hasil mentah disimpan apa adanya di analyses/<sourceId>.json (dengan versi prompt) untuk perbandingan.
import { store } from './store.js';
import { config } from './config.js';
import { generate, isVertex } from './ai.js';
import { getAccessToken } from './google-auth.js';

export const PROMPT_VERSION = 'video-steps-v1';
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
async function uploadToGcs(buf, mimeType, displayName) {
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
    mistakes: arr(obj({ mistake: STR, fix: STR })), narration_quotes: arr(STR), confidence: NUM,
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
  detail: (src, steps) => `${ctx(src)} Untuk setiap tahap berikut (lihat video pada rentang waktunya), tulis:
- instruction: instruksi singkat seperti diucapkan guru kepada pemula (bahasa Indonesia, 1–2 kalimat)
- success_visual: seperti apa tampilan bila tahap BERHASIL (yang terlihat kamera)
- tips: petunjuk singkat
- mistakes: kesalahan yang terlihat ATAU disebut penenun, beserta cara memperbaiki. Jangan mengarang; kosongkan bila tidak ada bukti.
- narration_quotes: kutipan ucapan penenun yang relevan
- confidence: 0–1 seberapa yakin
Juga daftar istilah lokal (terms) yang diucapkan, dengan dugaan maknanya. JANGAN mengarang makna motif atau filosofi.
Tahap:\n${steps.map((s, i) => `${i}. [${s.start}-${s.end}] ${s.title}`).join('\n')}`,
};

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / Math.max(1e-6, Math.max(a.end, b.end) - Math.min(a.start, b.start));
const tok = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
const jacc = (a, b) => { const A = tok(a), B = tok(b); const i = [...A].filter((x) => B.has(x)).length; return i / Math.max(1, A.size + B.size - i); };

/** Tandai tahap yang tidak muncul konsisten di dua kali analisis. */
export function markConsistency(runA, runB) {
  return runA.map((s) => {
    const best = Math.max(0, ...runB.map((t) => 0.6 * overlap(s, t) + 0.4 * jacc(s.title, t.title)));
    return { ...s, consistency: +best.toFixed(2), ragu: best < 0.35 };
  });
}

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
  const transcript = (await ask(prompts.transcript(source), TRANSCRIPT_SCHEMA).catch(() => ({ segments: [] }))).segments || [];
  onProgress?.('tahap (1/2)');
  const a = await ask(prompts.steps(source, transcript), STEPS_SCHEMA, 0.1);
  onProgress?.('tahap (2/2, cek konsistensi)');
  const b = await ask(prompts.steps(source, transcript), STEPS_SCHEMA, 0.4).catch(() => a);
  const steps = markConsistency(a.steps || [], b.steps || []).sort((x, y) => x.start - y.start);
  onProgress?.('rincian per tahap');
  const d = steps.length ? await ask(prompts.detail(source, steps), DETAIL_SCHEMA) : { steps: [], terms: [] };
  for (const det of d.steps || []) if (steps[det.index]) Object.assign(steps[det.index], { instruction: det.instruction, success_visual: det.success_visual, tips: det.tips || [], mistakes: det.mistakes || [], narrationQuotes: det.narration_quotes || [], confidence: det.confidence });

  const analysis = {
    sourceId: source.id, tradition: source.tradition, region: source.region ?? null, model: config.geminiModel, promptVersion: PROMPT_VERSION,
    createdAt: new Date().toISOString(), goal: a.goal, viewpoint: a.viewpoint, loomType: a.loomType ?? source.loomType ?? null,
    transcript, steps: steps.map((s, i) => ({ key: `${source.id}#${i}`, ...s })), terms: d.terms || [],
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
