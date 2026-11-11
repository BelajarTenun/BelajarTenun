// BelajarTenun – server prototipe v0 (tanpa dependency, Node >= 20).
import http from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { searchKnowledge, buildStepCheckPrompt, interpretStepCheck, buildQaPrompt } from './lib/core.js';

const ROOT = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 3000);
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TTS_KEY = process.env.GOOGLE_TTS_API_KEY || '';

const loadJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));
const moduleData = await loadJson('data/tidore-dasar.json');
const knowledge = await loadJson('data/knowledge.json');

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

const routes = {
  'GET /api/config': async () => ({ ai: Boolean(GEMINI_KEY), tts: Boolean(TTS_KEY), model: GEMINI_MODEL }),
  'GET /api/module': async () => moduleData,

  'POST /api/check-step': async (body) => {
    const step = findStep(body.stepId);
    if (!step) throw Object.assign(new Error('Tahap tidak ditemukan'), { code: 404 });
    if (!GEMINI_KEY || !step.auto_detect) return { status: 'uncertain', confidence: 0, observation: 'Konfirmasi manual.' };
    const image = String(body.image || '').replace(/^data:image\/\w+;base64,/, '');
    const raw = await gemini([{ text: buildStepCheckPrompt(step) }, { inline_data: { mime_type: 'image/jpeg', data: image } }], true);
    return interpretStepCheck(raw, step);
  },

  'POST /api/ask': async (body) => {
    const question = String(body.question || '').slice(0, 500);
    const step = findStep(body.stepId);
    const hits = searchKnowledge(knowledge.entries, question);
    if (!GEMINI_KEY) {
      return hits.length
        ? { answer: hits[0].answer, sources: hits.map((h) => h.id), mode: 'keyword' }
        : { answer: 'Maaf, aku belum punya jawaban tervalidasi untuk itu. Coba tanyakan ke penenun pendampingmu.', sources: [], mode: 'keyword' };
    }
    const context = hits.length ? hits : knowledge.entries;
    const answer = await gemini([{ text: buildQaPrompt(question, step, context) }]);
    return { answer: answer.trim(), sources: hits.map((h) => h.id), mode: 'ai' };
  },

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
  'POST /api/log': async (body) => {
    await mkdir(join(ROOT, 'logs'), { recursive: true });
    await appendFile(join(ROOT, 'logs/sessions.jsonl'), JSON.stringify({ ...body, at: new Date().toISOString() }) + '\n');
    return { ok: true };
  },
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler) {
    try {
      let body = {};
      if (req.method === 'POST') {
        let raw = '';
        for await (const c of req) { raw += c; if (raw.length > 8e6) throw Object.assign(new Error('Terlalu besar'), { code: 413 }); }
        body = raw ? JSON.parse(raw) : {};
      }
      const out = await handler(body);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
    } catch (e) {
      console.error(e.message);
      res.writeHead(e.code || 500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const data = await readFile(join(ROOT, 'public', file));
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`BelajarTenun berjalan di http://localhost:${PORT}`);
  console.log(`AI vision/Q&A: ${GEMINI_KEY ? 'aktif (' + GEMINI_MODEL + ')' : 'mode manual'} | TTS server: ${TTS_KEY ? 'aktif' : 'pakai suara browser'}`);
});
