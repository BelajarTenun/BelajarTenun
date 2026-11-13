// Akses ke layanan Google AI: Gemini (teks+gambar+video), embeddings, Live (token sementara), TTS.
// Semua pemanggilan dicatat (latensi, token) untuk evaluasi biaya & kecepatan (F7).
import { getAccessToken } from './google-auth.js';
import { config } from './config.js';
import { store } from './store.js';

const BASE = 'https://generativelanguage.googleapis.com';
export const isVertex = () => config.aiProvider === 'vertex';
export const aiEnabled = () => (isVertex() ? Boolean(config.vertexProject) : Boolean(config.geminiKey));

/** Alamat & header untuk "models/<model>:<metode>" di penyedia yang aktif. */
export async function endpoint(path, apiVersion = 'v1beta') {
  if (!isVertex()) return { url: `${BASE}/${apiVersion}/${path}`, headers: { 'x-goog-api-key': config.geminiKey } };
  const loc = config.vertexLocation;
  const host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${config.vertexProject}/locations/${loc}/publishers/google/${path}`;
  return { url, headers: { authorization: `Bearer ${await getAccessToken()}` } };
}

const usage = [];
function record(kind, ms, meta = {}) {
  const ev = { kind, ms, ...meta, at: new Date().toISOString() };
  usage.push(ev); if (usage.length > 2000) usage.shift();
  store.append('logs/ai-usage.jsonl', JSON.stringify(ev) + '\n').catch(() => {});
}

export function usageStats(events = usage) {
  const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0);
  const byKind = {};
  for (const e of events) (byKind[e.kind] ??= []).push(e);
  const out = {};
  for (const [kind, evs] of Object.entries(byKind)) {
    const ms = evs.map((e) => e.ms).sort((a, b) => a - b);
    const inTok = evs.reduce((a, e) => a + (e.inTok || 0), 0), outTok = evs.reduce((a, e) => a + (e.outTok || 0), 0);
    out[kind] = {
      calls: evs.length, errors: evs.filter((e) => e.error).length, p50: pct(ms, 0.5), p95: pct(ms, 0.95),
      inputTokens: inTok, outputTokens: outTok,
      estCostUsd: +((inTok / 1000) * config.costPer1kInput + (outTok / 1000) * config.costPer1kOutput).toFixed(4),
    };
  }
  return out;
}
export const loadUsage = async () => (await store.readLines('logs/ai-usage.jsonl')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

async function call(path, body, kind, apiVersion = 'v1beta') {
  const t0 = Date.now();
  try {
    const { url, headers } = await endpoint(path, apiVersion);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    record(kind, Date.now() - t0, { inTok: data.usageMetadata?.promptTokenCount, outTok: data.usageMetadata?.candidatesTokenCount });
    return data;
  } catch (e) {
    record(kind, Date.now() - t0, { error: String(e.message).slice(0, 200) });
    throw e;
  }
}

/** parts: [{text}|{inline_data:{mime_type,data}}]. schema: JSON schema opsional untuk output terstruktur. */
export async function generate(parts, { json = false, schema, temperature, kind = 'generate', model = config.geminiModel } = {}) {
  const generationConfig = { temperature: temperature ?? (json ? 0.1 : 0.3) };
  if (json) { generationConfig.responseMimeType = 'application/json'; if (schema) generationConfig.responseSchema = schema; }
  const data = await call(`models/${model}:generateContent`, { contents: [{ role: 'user', parts }], generationConfig }, kind);
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
}

export async function embed(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  if (isVertex()) {
    const data = await call(`models/${config.embedModel}:predict`, { instances: texts.map((content) => ({ content, task_type: taskType })) }, 'embed');
    return data.predictions.map((p) => p.embeddings.values);
  }
  const data = await call(`models/${config.embedModel}:batchEmbedContents`, {
    requests: texts.map((text) => ({ model: `models/${config.embedModel}`, content: { parts: [{ text }] }, taskType })),
  }, 'embed');
  return data.embeddings.map((e) => e.values);
}

/**
 * Token sementara untuk Gemini Live, supaya HP/kacamata tersambung langsung ke Gemini
 * tanpa pernah memegang API key. Satu kali pakai, kedaluwarsa 30 menit.
 */
export async function createLiveToken() {
  // Vertex AI tidak menerbitkan token sementara untuk browser: Live lewat agen LiveKit di server.
  if (isVertex()) throw Object.assign(new Error('Dengan Vertex AI, Gemini Live berjalan lewat LiveKit (set LIVEKIT_URL dan jalankan agen)'), { code: 501 });
  const now = Date.now();
  const data = await call('auth_tokens', {
    uses: 1,
    expireTime: new Date(now + 30 * 60000).toISOString(),
    newSessionExpireTime: new Date(now + 2 * 60000).toISOString(),
  }, 'live_token', 'v1alpha');
  return { token: data.name, model: config.liveModel, voice: config.liveVoice, expiresAt: new Date(now + 30 * 60000).toISOString() };
}

export async function tts(text) {
  if (!config.ttsKey) throw Object.assign(new Error('TTS server tidak aktif'), { code: 501 });
  const t0 = Date.now();
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': config.ttsKey },
    body: JSON.stringify({ input: { text: String(text).slice(0, 1000) }, voice: { languageCode: 'id-ID' }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 } }),
  });
  record('tts', Date.now() - t0, res.ok ? {} : { error: String(res.status) });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return (await res.json()).audioContent;
}
