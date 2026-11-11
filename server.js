// BelajarTenun – server prototipe v0 (tanpa dependency, Node >= 20).
import http from 'node:http';
import { readFile, writeFile, appendFile, mkdir, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createSession } from './lib/session.js';
import { extname, join, normalize } from 'node:path';
import { searchKnowledge, buildStepCheckPrompt, interpretStepCheck, buildQaPrompt, validateModule, summarizeLogs } from './lib/core.js';

const ROOT = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 3000);
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TTS_KEY = process.env.GOOGLE_TTS_API_KEY || '';
const EDITOR_TOKEN = process.env.EDITOR_TOKEN || '';

const loadJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));
let moduleData = await loadJson('data/tidore-dasar.json');
let knowledge = await loadJson('data/knowledge.json');

async function gemini(parts, json = false) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.1 } : { temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
}

const findStep = (id) => moduleData.steps.find((s) => s.id === id);

const RECORDINGS = join(ROOT, 'data/recordings');
async function listRecordings() {
  const dirs = await readdir(RECORDINGS).catch(() => []);
  const out = [];
  for (const d of dirs) {
    const meta = await readFile(join(RECORDINGS, d, 'meta.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (meta) out.push(meta);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Upload file biner (video .webm / frame .jpg) ke rekaman yang sudah dibuat.
async function handleUpload(req, res, url) {
  requireEditor(req);
  const id = url.searchParams.get('id') || '';
  const name = url.searchParams.get('name') || '';
  if (!/^[\w-]+$/.test(id) || !/^[\w-]+\.(webm|mp4|jpg)$/.test(name)) throw fail(400, 'Nama file tidak valid');
  const metaPath = join(RECORDINGS, id, 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8').catch(() => { throw fail(404, 'Rekaman tidak ada'); }));
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 300e6) throw fail(413, 'File terlalu besar'); chunks.push(c); }
  await writeFile(join(RECORDINGS, id, name), Buffer.concat(chunks));
  if (!meta.files.includes(name)) meta.files.push(name);
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, size }));
}

const fail = (code, message) => Object.assign(new Error(message), { code });
// Editor dilindungi token jika EDITOR_TOKEN diset (wajib saat aplikasi dipasang publik).
function requireEditor(req) {
  if (EDITOR_TOKEN && req.headers['x-editor-token'] !== EDITOR_TOKEN) throw fail(401, 'Token editor salah');
}
async function saveJson(path, data) {
  await writeFile(join(ROOT, path), JSON.stringify(data, null, 2) + '\n');
}

// Fungsi AI yang dipakai bersama oleh web app (HP) dan Glasses API.
async function aiCheckStep(step, image) {
  if (!GEMINI_KEY || !step.auto_detect) return { status: 'uncertain', confidence: 0, observation: 'Konfirmasi manual.' };
  const data = String(image || '').replace(/^data:image\/\w+;base64,/, '');
  const raw = await gemini([{ text: buildStepCheckPrompt(step) }, { inline_data: { mime_type: 'image/jpeg', data } }], true);
  return interpretStepCheck(raw, step);
}
async function aiAsk(question, step) {
  const hits = searchKnowledge(knowledge.entries, question);
  if (!GEMINI_KEY) {
    return hits.length
      ? { answer: hits[0].answer, sources: hits.map((h) => h.id), mode: 'keyword' }
      : { answer: 'Maaf, aku belum punya jawaban tervalidasi untuk itu. Coba tanyakan ke penenun pendampingmu.', sources: [], mode: 'keyword' };
  }
  const answer = await gemini([{ text: buildQaPrompt(question, step, hits.length ? hits : knowledge.entries) }]);
  return { answer: answer.trim(), sources: hits.map((h) => h.id), mode: 'ai' };
}
async function logEvent(ev) {
  await mkdir(join(ROOT, 'logs'), { recursive: true });
  await appendFile(join(ROOT, 'logs/sessions.jsonl'), JSON.stringify({ ...ev, at: new Date().toISOString() }) + '\n');
}

// ---------- Glasses API: sesi disimpan di server ----------
const glassesSessions = new Map();
const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
function getGlassesSession(id) {
  const g = glassesSessions.get(id);
  if (!g) throw fail(404, 'Sesi tidak ditemukan, mulai ulang dengan /api/glasses/start');
  g.touched = Date.now();
  return g.session;
}
setInterval(() => { for (const [id, g] of glassesSessions) if (Date.now() - g.touched > SESSION_TTL_MS) glassesSessions.delete(id); }, 600000).unref();
async function withAudio(reply, body) {
  if (!body.audio || !TTS_KEY || !reply.speak) return reply;
  try { return { ...reply, audio: (await routes['POST /api/tts']({ text: reply.speak })).audio }; } catch { return reply; }
}

const routes = {
  'GET /api/config': async () => ({ ai: Boolean(GEMINI_KEY), tts: Boolean(TTS_KEY), model: GEMINI_MODEL }),
  'GET /api/module': async () => moduleData,
  'GET /api/knowledge': async () => knowledge,
  'GET /api/editor-auth': async () => ({ required: Boolean(EDITOR_TOKEN) }),

  'POST /api/module': async (body, req) => {
    requireEditor(req);
    const errors = validateModule(body);
    if (errors.length) throw fail(400, errors.join('\n'));
    moduleData = body;
    await saveJson('data/tidore-dasar.json', moduleData);
    return { ok: true };
  },

  'POST /api/knowledge': async (body, req) => {
    requireEditor(req);
    if (!Array.isArray(body.entries)) throw fail(400, 'entries harus berupa daftar');
    for (const [i, e] of body.entries.entries()) {
      if (!e.id || !e.question || !e.answer) throw fail(400, `Entri ${i + 1}: id, question, answer wajib diisi`);
      e.keywords = Array.isArray(e.keywords) ? e.keywords : [];
    }
    knowledge = body;
    await saveJson('data/knowledge.json', knowledge);
    return { ok: true };
  },

  // ---------- Dataset rekaman (bahan demo, evaluasi, dan pelatihan model CV) ----------
  'POST /api/recordings': async (body, req) => {
    requireEditor(req);
    const step = findStep(body.stepId);
    if (!step) throw fail(400, 'Tahap tidak dikenal');
    if (!['done', 'not_yet', 'mistake'].includes(body.label)) throw fail(400, 'Label harus done / not_yet / mistake');
    if (body.label === 'mistake' && !step.common_mistakes[(body.mistakeIndex ?? 0) - 1]) throw fail(400, 'Pilih kesalahan yang dicontohkan');
    if (body.consent !== true) throw fail(400, 'Persetujuan penenun wajib dicentang');
    const id = `${new Date().toISOString().slice(0, 10)}-${step.id}-${randomUUID().slice(0, 8)}`;
    const meta = {
      id, module: moduleData.id, stepId: step.id, label: body.label,
      mistakeIndex: body.label === 'mistake' ? body.mistakeIndex : null,
      weaver: String(body.weaver || '').slice(0, 100), recordedBy: String(body.recordedBy || '').slice(0, 100),
      consent: true, notes: String(body.notes || '').slice(0, 1000), createdAt: new Date().toISOString(), files: [],
    };
    await mkdir(join(RECORDINGS, id), { recursive: true });
    await saveJson(`data/recordings/${id}/meta.json`, meta);
    return { id };
  },

  'GET /api/recordings': async () => ({ recordings: await listRecordings() }),

  'POST /api/recordings/use-as-demo': async (body, req) => {
    requireEditor(req);
    const rec = (await listRecordings()).find((r) => r.id === body.id);
    const video = rec?.files.find((f) => f.endsWith('.webm') || f.endsWith('.mp4'));
    if (!video) throw fail(404, 'Rekaman video tidak ditemukan');
    findStep(rec.stepId).demo_video = `recordings/${rec.id}/${video}`;
    await saveJson('data/tidore-dasar.json', moduleData);
    return { ok: true, demo_video: findStep(rec.stepId).demo_video };
  },

  'GET /api/progress': async () => {
    const raw = await readFile(join(ROOT, 'logs/sessions.jsonl'), 'utf8').catch(() => '');
    return summarizeLogs(raw.split('\n').filter(Boolean));
  },

  'POST /api/check-step': async (body) => {
    const step = findStep(body.stepId);
    if (!step) throw fail(404, 'Tahap tidak ditemukan');
    return aiCheckStep(step, body.image);
  },

  'POST /api/ask': async (body) => aiAsk(String(body.question || '').slice(0, 500), findStep(body.stepId)),

  // Glasses API – lihat docs/KACAMATA.md. Tambahkan "audio": true untuk menerima MP3 (base64) siap putar.
  'POST /api/glasses/start': async (body) => {
    const session = createSession(moduleData, {
      checkStep: aiCheckStep,
      ask: async (q, step) => (await aiAsk(q, step)).answer,
      log: (ev) => logEvent(ev).catch(() => {}),
    });
    glassesSessions.set(session.state.id, { session, touched: Date.now() });
    return withAudio(session.start(), body);
  },
  'POST /api/glasses/frame': async (body) => withAudio(await getGlassesSession(body.sessionId).frame(body.image), body),
  'POST /api/glasses/say': async (body) => withAudio(await getGlassesSession(body.sessionId).say(String(body.text || '').slice(0, 500)), body),
  'POST /api/glasses/button': async (body) => withAudio(getGlassesSession(body.sessionId).button(body.action), body),

  'POST /api/tts': async (body) => {
    if (!TTS_KEY) throw Object.assign(new Error('TTS server tidak aktif'), { code: 501 });
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': TTS_KEY },
      body: JSON.stringify({
        input: { text: String(body.text || '').slice(0, 1000) },
        voice: { languageCode: 'id-ID' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
      }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    return { audio: (await res.json()).audioContent };
  },

  // Log progres untuk Learning validation (satu baris JSON per kejadian).
  'POST /api/log': async (body) => { await logEvent(body); return { ok: true }; },
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/api/recordings/upload') {
    return handleUpload(req, res, url).catch((e) =>
      res.writeHead(e.code || 500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message })));
  }
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler) {
    try {
      let body = {};
      if (req.method === 'POST') {
        let raw = '';
        for await (const c of req) { raw += c; if (raw.length > 8e6) throw Object.assign(new Error('Terlalu besar'), { code: 413 }); }
        body = raw ? JSON.parse(raw) : {};
      }
      const out = await handler(body, req);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
    } catch (e) {
      console.error(e.message);
      res.writeHead(e.code || 500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const base = file.startsWith('/recordings/') ? join(ROOT, 'data') : join(ROOT, 'public');
    const data = await readFile(join(base, file));
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`BelajarTenun berjalan di http://localhost:${PORT}`);
  console.log(`AI vision/Q&A: ${GEMINI_KEY ? 'aktif (' + GEMINI_MODEL + ')' : 'mode manual'} | TTS server: ${TTS_KEY ? 'aktif' : 'pakai suara browser'}`);
});
