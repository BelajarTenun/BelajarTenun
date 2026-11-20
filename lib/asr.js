// Transkrip narasi dengan Google Cloud Speech-to-Text v2 (model Chirp 3) – cap waktu tingkat kata.
// Dipakai pipeline video bila ASR_MODEL diisi (mis. "chirp_3") dan Vertex/GCS dikonfigurasi;
// tanpa itu pipeline memakai transkrip dari Gemini (cap waktunya kurang presisi).
// Audio diambil dari hasil pra-proses (sources/<id>/audio.wav, 16 kHz mono).
import { config } from './config.js';
import { store } from './store.js';
import { getAccessToken } from './google-auth.js';
import { uploadToGcs } from './video-analysis.js';

export const asrEnabled = () => Boolean(config.asrModel && config.vertexProject && config.vertexBucket);
const sec = (d) => (d == null ? 0 : typeof d === 'string' ? parseFloat(d) : Number(d.seconds || 0) + Number(d.nanos || 0) / 1e9);

/** Ubah hasil kata-per-kata menjadi segmen kalimat (jeda > gap detik memulai segmen baru). */
export function wordsToSegments(results, gap = 0.8) {
  const segs = [];
  for (const r of results || []) for (const alt of (r.alternatives || []).slice(0, 1)) {
    let cur = null;
    for (const w of alt.words || []) {
      const s = sec(w.startOffset), e = sec(w.endOffset);
      if (!cur || s - cur.end > gap) { cur = { start: +s.toFixed(2), end: +e.toFixed(2), text: w.word }; segs.push(cur); }
      else { cur.end = +e.toFixed(2); cur.text += ` ${w.word}`; }
    }
    if (!alt.words?.length && alt.transcript) segs.push({ start: sec(r.resultEndOffset) , end: sec(r.resultEndOffset), text: alt.transcript.trim() });
  }
  return segs;
}

/**
 * Transkripsi satu sumber. deps (tes): { fetch, token, upload, readAudio, sleep }.
 * Memakai batchRecognize (audio > 1 menit) dan menunggu operasi selesai.
 */
export async function transcribeSource(source, deps = {}) {
  const f = deps.fetch ?? fetch;
  const token = await (deps.token ?? getAccessToken)();
  const audio = await (deps.readAudio ?? ((s) => store.readFile(`sources/${s.id}/audio.wav`)))(source);
  const { uri } = await (deps.upload ?? uploadToGcs)(audio, 'audio/wav', `${source.id}-audio.wav`);
  const loc = config.asrLocation;
  const host = loc === 'global' ? 'speech.googleapis.com' : `${loc}-speech.googleapis.com`;
  const recognizer = `projects/${config.vertexProject}/locations/${loc}/recognizers/_`;
  const body = {
    config: {
      autoDecodingConfig: {}, model: config.asrModel, languageCodes: config.asrLanguages,
      features: { enableWordTimeOffsets: true, enableAutomaticPunctuation: true },
    },
    files: [{ uri }],
    recognitionOutputConfig: { inlineResponseConfig: {} },
  };
  const h = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const r = await f(`https://${host}/v2/${recognizer}:batchRecognize`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Speech-to-Text menolak: ${r.status} ${(await r.text()).slice(0, 200)}`);
  let op = await r.json();
  const sleep = deps.sleep ?? ((ms) => new Promise((res) => setTimeout(res, ms)));
  for (let i = 0; !op.done && i < 120; i++) {
    await sleep(5000);
    op = await (await f(`https://${host}/v2/${op.name}`, { headers: h })).json();
  }
  if (!op.done) throw new Error('Speech-to-Text belum selesai setelah 10 menit');
  if (op.error) throw new Error(`Speech-to-Text gagal: ${op.error.message}`);
  const res = Object.values(op.response?.results || {})[0];
  if (res?.error) throw new Error(`Speech-to-Text gagal: ${res.error.message}`);
  return wordsToSegments(res?.transcript?.results ?? res?.inlineResult?.transcript?.results);
}
