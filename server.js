// BelajarTenun – server (tanpa dependency, Node >= 20).
import http from 'node:http';
import { extname, normalize } from 'node:path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config, ROOT } from './lib/config.js';
import { store, seedDataDir, applyRetention } from './lib/store.js';
import { aiEnabled, generate, createLiveToken, tts, usageStats, loadUsage } from './lib/ai.js';
import * as auth from './lib/auth.js';
import * as kb from './lib/knowledge.js';
import * as data from './lib/data.js';
import { buildStepCheckPrompt, interpretStepCheck, summarizeLogs, STEP_CHECK_SCHEMA } from './lib/core.js';
import { createSession } from './lib/session.js';
import { liveSetup, liveInstructions, LIVE_TOOLS } from './lib/live.js';
import * as sources from './lib/sources.js';
import * as pipeline from './lib/pipeline.js';
import { getAnalysis } from './lib/video-analysis.js';
import { generateDialogs, evaluateDialog, listDialogs } from './lib/dialog-gen.js';
import { pairsForModule } from './lib/exo-ego.js';
import { createAccessToken, livekitEnabled, roomForSession, toJsonSchema } from './lib/livekit.js';

const fail = (code, message) => Object.assign(new Error(message), { code });
const b64 = (img) => String(img || '').replace(/^data:image\/\w+;base64,/, '');

// ---------- AI: deteksi tahap (F3: multi-frame + contoh few-shot + output terstruktur) ----------
export async function checkStep(module, step, frames, { history = [], useExamples = true, excludeRecording = null } = {}) {
  if (!aiEnabled() || !step.auto_detect) return { status: 'uncertain', confidence: 0, observation: 'Konfirmasi manual.' };
  const imgs = frames.map(b64).filter(Boolean);
  if (!imgs.length) return { status: 'uncertain', confidence: 0, observation: 'Tidak ada gambar.' };
  const examples = useExamples ? await data.examplesFor(module.id, step.id, 2, excludeRecording) : [];
  const parts = [{ text: buildStepCheckPrompt(step, { frames: imgs.length, examples: examples.length, history }) }];
  for (const e of examples) parts.push({ inline_data: { mime_type: 'image/jpeg', data: e } });
  for (const f of imgs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: f } });
  const raw = await generate(parts, { json: true, schema: STEP_CHECK_SCHEMA, kind: 'check_step' });
  return interpretStepCheck(raw, step);
}

// ---------- Sesi belajar (dipakai web app, kacamata, dan Gemini Live) ----------
const sessions = new Map();
const SESSION_TTL_MS = 3 * 3600000;
async function startSession(body, user) {
  const module = await data.getModule(body.moduleId);
  const session = createSession(module, {
    checkStep: (step, frames, opts) => checkStep(module, step, frames, opts),
    ask: (q, step) => kb.answer(q, { step, moduleId: module.id, userId: user?.id }),
    log: (ev) => data.logEvent(ev).catch(() => {}),
  }, Date.now, { userId: user?.id ?? null, source: String(body.source || 'phone').slice(0, 20), audioOnly: Boolean(body.audioOnly) });
  sessions.set(session.state.id, { session, touched: Date.now(), userId: user?.id ?? null });
  return session;
}
function getSession(id, user) {
  const g = sessions.get(id);
  if (!g) throw fail(404, 'Sesi tidak ditemukan, mulai ulang');
  if (g.userId && g.userId !== user?.id && user?.role !== 'admin') throw fail(403, 'Bukan sesi milikmu');
  g.touched = Date.now();
  return g.session;
}
setInterval(() => { for (const [id, g] of sessions) if (Date.now() - g.touched > SESSION_TTL_MS) sessions.delete(id); }, 600000).unref();

async function withAudio(reply, body) {
  if (!body.audio || !config.ttsKey || !reply?.speak) return reply;
  try { return { ...reply, audio: await tts(reply.speak) }; } catch { return reply; }
}

const PARTNER = ['partner', 'admin'];
const sessionRoutes = (prefix) => ({
  [`POST ${prefix}/start`]: async (b, req) => withAudio((await startSession(b, await auth.currentUser(req))).start(), b),
  [`POST ${prefix}/frame`]: async (b, req) => withAudio(await getSession(b.sessionId, await auth.currentUser(req)).frame(b.image, { quality: b.quality, local: b.localPrediction }), b),
  [`POST ${prefix}/say`]: async (b, req) => withAudio(await getSession(b.sessionId, await auth.currentUser(req)).say(String(b.text || '').slice(0, 500)), b),
  [`POST ${prefix}/button`]: async (b, req) => withAudio(getSession(b.sessionId, await auth.currentUser(req)).button(b.action), b),
  [`POST ${prefix}/tick`]: async (b, req) => withAudio(getSession(b.sessionId, await auth.currentUser(req)).tick(), b),
});

const routes = {
  'GET /api/health': async () => ({ ok: true }),
  'GET /api/config': async (b, req) => ({
    ai: aiEnabled(), tts: Boolean(config.ttsKey), model: config.geminiModel, live: aiEnabled() || livekitEnabled(), liveModel: config.liveModel,
    livekit: livekitEnabled(),
    user: await auth.currentUser(req), authDisabled: config.authDisabled,
  }),

  // ----- Akun -----
  'POST /api/auth/register': async (b, req, res) => { const u = await auth.register(b); if (u.status === 'approved') res.setHeader('set-cookie', auth.sessionCookie(u.id)); return u; },
  'POST /api/auth/login': async (b, req, res) => {
    const u = await auth.login(b.email, b.password);
    if (u.status !== 'approved') throw fail(403, u.status === 'pending' ? 'Akun menunggu persetujuan admin' : 'Akun dinonaktifkan');
    res.setHeader('set-cookie', auth.sessionCookie(u.id)); return u;
  },
  'POST /api/auth/logout': async (b, req, res) => { res.setHeader('set-cookie', auth.clearCookie()); return { ok: true }; },
  'GET /api/auth/me': async (b, req) => ({ user: await auth.currentUser(req) }),
  'GET /api/auth/device-tokens': async (b, req) => ({ tokens: await auth.listDeviceTokens((await auth.requireRole(req)).id) }),
  'POST /api/auth/device-tokens': async (b, req) => auth.createDeviceToken((await auth.requireRole(req)).id, b.label),
  'POST /api/auth/device-tokens/revoke': async (b, req) => { await auth.revokeDeviceToken((await auth.requireRole(req)).id, b.id); return { ok: true }; },

  // ----- Admin (pola dashboard gateway VisionClaw) -----
  'GET /api/admin/users': async (b, req) => { await auth.requireRole(req, 'admin'); return { users: await auth.listUsers() }; },
  'POST /api/admin/users': async (b, req) => { await auth.requireRole(req, 'admin'); return auth.updateUser(b.id, b); },
  'GET /api/admin/stats': async (b, req) => {
    await auth.requireRole(req, 'admin');
    return { ai: usageStats(await loadUsage()), activeSessions: sessions.size, unanswered: (await kb.unanswered()).length, recordings: (await data.listRecordings()).length };
  },

  // ----- Kurikulum -----
  'GET /api/modules': async () => ({ modules: await data.listModules() }),
  'GET /api/module': async (b, req, res, url) => data.getModule(url.searchParams.get('id')),
  'POST /api/module': async (b, req) => { await data.saveModule(b, await auth.requireRole(req, ...PARTNER)); return { ok: true }; },

  // ----- Knowledge base -----
  'GET /api/knowledge': async (b, req) => { await auth.requireRole(req, ...PARTNER); return kb.loadKnowledge(); },
  'POST /api/knowledge': async (b, req) => { await auth.requireRole(req, ...PARTNER); await kb.saveKnowledge(b); return { ok: true }; },
  'GET /api/knowledge/unanswered': async (b, req) => { await auth.requireRole(req, ...PARTNER); return { items: await kb.unanswered() }; },
  'POST /api/ask': async (b, req) => {
    const module = await data.getModule(b.moduleId);
    return kb.answer(String(b.question || '').slice(0, 500), { step: module.steps.find((s) => s.id === b.stepId), moduleId: module.id, userId: (await auth.currentUser(req))?.id });
  },

  // ----- Dataset rekaman -----
  'GET /api/consent-scopes': async () => data.CONSENT_SCOPES,
  'GET /api/recordings': async (b, req) => { await auth.requireRole(req, ...PARTNER); return { recordings: await data.listRecordings() }; },
  'POST /api/recordings': async (b, req) => data.createRecording(b, await auth.requireRole(req, ...PARTNER)),
  'POST /api/recordings/segments': async (b, req) => { await auth.requireRole(req, ...PARTNER); return data.saveSegments(b.id, b.segments); },
  'POST /api/recordings/auto-annotate': async (b, req) => { await auth.requireRole(req, ...PARTNER); return { segments: await data.autoAnnotate(b.id) }; },
  'POST /api/recordings/withdraw': async (b, req) => data.withdrawConsent(b.id, (await auth.requireRole(req, ...PARTNER)).name),
  'POST /api/recordings/use-as-demo': async (b, req) => {
    await auth.requireRole(req, ...PARTNER);
    const rec = await data.getRecording(b.id);
    if (!rec.consent?.scopes?.includes('pembelajaran')) throw fail(400, 'Penenun tidak mengizinkan rekaman ini dipakai sebagai demo');
    const video = rec.files.find((f) => /\.(webm|mp4)$/.test(f));
    if (!video) throw fail(404, 'Rekaman video tidak ditemukan');
    const module = await data.getModule(rec.module);
    const step = module.steps.find((s) => s.id === (b.stepId || rec.stepId));
    if (!step) throw fail(400, 'Pilih tahap');
    step.demo_video = `recordings/${rec.id}/${video}`;
    if (b.start != null) step.demo_start = Number(b.start);
    await data.saveModule(module);
    return { ok: true, demo_video: step.demo_video };
  },
  'POST /api/check-step': async (b, req) => {
    await auth.requireRole(req, ...PARTNER);
    const module = await data.getModule(b.moduleId);
    const step = module.steps.find((s) => s.id === b.stepId);
    if (!step) throw fail(404, 'Tahap tidak ditemukan');
    return checkStep(module, step, b.images || [b.image], { useExamples: b.useExamples !== false, history: [] });
  },

  // ----- Sesi belajar -----
  ...sessionRoutes('/api/session'),
  ...sessionRoutes('/api/glasses'), // alias untuk klien kacamata (docs/KACAMATA.md)

  // ----- Gemini Live (F2) -----
  'POST /api/live/token': async (b, req) => {
    if (!aiEnabled()) throw fail(501, 'Gemini Live butuh GEMINI_API_KEY');
    const user = await auth.currentUser(req);
    const session = getSession(b.sessionId, user);
    const t = await createLiveToken();
    return { ...t, setup: liveSetup(session.state.module, { model: t.model, voice: t.voice, audioOnly: session.state.audioOnly }) };
  },
  'POST /api/live/tool': async (b, req) => {
    const out = await getSession(b.sessionId, await auth.currentUser(req)).tool(String(b.name), b.args);
    return { ...out, ui: out.ui ? await withAudio(out.ui, {}) : undefined };
  },

  // ----- LiveKit lokal + agen Gemini Live (docs/LIVEKIT.md) -----
  'POST /api/livekit/token': async (b, req) => {
    if (!livekitEnabled()) throw fail(501, 'LiveKit belum dikonfigurasi (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)');
    const user = await auth.currentUser(req);
    const session = getSession(b.sessionId, user);
    const room = roomForSession(session.state.id);
    const token = createAccessToken({
      identity: `murid-${(user?.id ?? 'tamu').slice(0, 12)}-${Math.random().toString(36).slice(2, 6)}`,
      name: user?.name ?? 'Murid', room,
      metadata: { sessionId: session.state.id, source: session.state.source, audioOnly: session.state.audioOnly },
    });
    return { url: config.livekitPublicUrl, token, room };
  },
  // Dipanggil agen Python saat bergabung ke ruang: instruksi + tools sesuai modul & mode sesi.
  'GET /api/agent/session-config': async (b, req, res, url) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && !config.authDisabled) throw fail(403, 'Khusus agen');
    const session = getSession(url.searchParams.get('sessionId'), user);
    return {
      sessionId: session.state.id, model: config.liveModel, voice: config.liveVoice,
      instructions: liveInstructions(session.state.module, { audioOnly: session.state.audioOnly }),
      tools: LIVE_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: toJsonSchema(t.parameters) })),
    };
  },

  // ----- Video → data belajar (lintas tradisi) -----
  'GET /api/licenses': async () => sources.LICENSES,
  'GET /api/sources': async (b, req) => { await auth.requireRole(req, ...PARTNER); return pipeline.sourcesOverview(); },
  'POST /api/sources': async (b, req) => sources.createSource(b, await auth.requireRole(req, ...PARTNER)),
  'POST /api/sources/update': async (b, req) => { await auth.requireRole(req, ...PARTNER); return sources.updateSource(b.id, b); },
  'POST /api/sources/delete': async (b, req) => { await auth.requireRole(req, ...PARTNER); await sources.removeSource(b.id); return { ok: true }; },
  'POST /api/sources/process': async (b, req) => { await auth.requireRole(req, ...PARTNER); await sources.getSource(b.id); pipeline.enqueue(b.id, { analyze: b.analyze !== false }); return { queued: true }; },
  'GET /api/sources/analysis': async (b, req, res, url) => { await auth.requireRole(req, ...PARTNER); return (await getAnalysis(url.searchParams.get('id'))) ?? {}; },
  'POST /api/curriculum/rebuild': async (b, req) => { await auth.requireRole(req, ...PARTNER); return pipeline.rebuildCurricula(); },
  'POST /api/dialogs/generate': async (b, req) => {
    await auth.requireRole(req, ...PARTNER);
    const module = await data.getModule(b.moduleId);
    const dialogs = await generateDialogs(module, { count: Math.min(10, Number(b.count) || 2) });
    const results = [];
    for (const d of dialogs) results.push(await evaluateDialog(d, () => createSession(module, { checkStep: async () => ({ status: 'uncertain', confidence: 0 }), ask: (q, step) => kb.answer(q, { step, moduleId: module.id }), log: () => {} })));
    return { dialogs, results };
  },
  'GET /api/dialogs': async (b, req, res, url) => { await auth.requireRole(req, ...PARTNER); return { dialogs: await listDialogs(url.searchParams.get('moduleId')) }; },
  'GET /api/exo-ego': async (b, req, res, url) => { await auth.requireRole(req, ...PARTNER); return pairsForModule(url.searchParams.get('moduleId')); },
  'GET /api/module/history': async (b, req, res, url) => { await auth.requireRole(req, ...PARTNER); return { history: (await store.readLines(`modules/${url.searchParams.get('id')}.history.jsonl`)).map((l) => JSON.parse(l)).reverse().slice(0, 200) }; },

  // ----- Arsip konservasi publik: hanya isi tervalidasi + atribusi; video hanya bila izinnya membolehkan -----
  'GET /api/arsip': async () => {
    const mods = [];
    for (const m of await data.listModules()) {
      const mod = await data.getModule(m.id);
      const steps = mod.steps.filter((s) => s.validated_by).map((s) => ({ title: s.title, instruction: s.instruction, success_criteria: s.success_criteria, tips: s.tips, common_mistakes: s.common_mistakes, validated_by: s.validated_by, genericStepId: s.genericStepId ?? null, provenance: s.provenance ?? [] }));
      if (steps.length) mods.push({ id: mod.id, title: mod.title, tradition: mod.tradition, region: mod.region ?? null, steps });
    }
    const knowledge = (await kb.loadKnowledge()).entries.filter((e) => e.status === 'tervalidasi').map(({ id, topic, question, answer, source, validated_by, module }) => ({ id, topic, question, answer, source, validated_by, module }));
    const srcs = (await sources.listSources()).map((s) => ({ id: s.id, title: s.title, channel: s.channel, url: s.url, tradition: s.tradition, region: s.region, loomType: s.loomType, technique: s.technique, license: s.license.status, video: sources.allows(s, 'arsip_video') && s.files?.includes('video.mp4') ? `sources/${s.id}/video.mp4` : null }));
    return { generatedAt: new Date().toISOString(), modules: mods, knowledge, sources: srcs };
  },

  'POST /api/tts': async (b) => ({ audio: await tts(b.text) }),

  // ----- Tracer & progres -----
  'POST /api/trace': async (b, req) => {
    const user = await auth.currentUser(req);
    for (const ev of (b.events || []).slice(0, 100)) await data.logEvent({ ...ev, userId: user?.id ?? null });
    return { ok: true };
  },
  'POST /api/log': async (b, req) => { await data.logEvent({ ...b, userId: (await auth.currentUser(req))?.id ?? null }); return { ok: true }; },
  'GET /api/progress': async (b, req, res, url) => {
    const user = await auth.currentUser(req);
    const moduleId = url.searchParams.get('moduleId');
    let lines = await data.readEvents();
    const mine = !user || !PARTNER.includes(user.role) || url.searchParams.get('mine') === '1';
    lines = lines.filter((l) => { try { const e = JSON.parse(l); return (!moduleId || e.module === moduleId) && (!mine || (user && e.userId === user.id)); } catch { return false; } });
    return { ...summarizeLogs(lines), scope: mine ? 'saya' : 'semua' };
  },

  // ----- Pendamping jarak jauh (WebRTC signaling) -----
  'POST /api/rtc/room': async () => ({ code: data.rtcCreateRoom() }),
  'POST /api/rtc/signal': async (b) => data.rtcPost(b.room, b),
  'GET /api/rtc/poll': async (b, req, res, url) => data.rtcPoll(url.searchParams.get('room'), url.searchParams.get('peer'), Number(url.searchParams.get('since') || 0)),
};

// ---------- Upload biner rekaman ----------
async function handleUpload(req, res, url) {
  await auth.requireRole(req, ...PARTNER);
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 300e6) throw fail(413, 'File terlalu besar'); chunks.push(c); }
  const q = url.searchParams;
  const label = q.get('stepId') ? { stepId: q.get('stepId'), label: q.get('label'), mistakeIndex: Number(q.get('mistakeIndex')) || null, t: Number(q.get('t')) || 0 } : null;
  return data.addRecordingFile(q.get('id'), q.get('name'), Buffer.concat(chunks), label);
}

// Video rekaman: pemula hanya boleh melihat rekaman yang diizinkan untuk pembelajaran.
async function serveRecording(req, res, path) {
  const [, id, file] = path.split('/').filter(Boolean);
  const rec = await data.getRecording(id).catch(() => null);
  const user = await auth.currentUser(req);
  const allowed = rec && (rec.consent?.scopes?.includes('pembelajaran') || PARTNER.includes(user?.role));
  if (!allowed || !rec.files.includes(file)) return res.writeHead(404).end('Not found');
  return serveRecordingBuffer(req, res, await store.readFile(`recordings/${id}/${file}`), file);
}

function serveRecordingBuffer(req, res, buf, file) {
  const headers = { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'private, max-age=3600', 'accept-ranges': 'bytes' };
  // Range request (206) wajib agar video bisa di-seek (anotasi, demo mulai di detik tertentu).
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m) {
    let start = m[1] === '' ? buf.length - Number(m[2]) : Number(m[1]);
    let end = m[1] !== '' && m[2] !== '' ? Number(m[2]) : buf.length - 1;
    start = Math.max(0, start); end = Math.min(end, buf.length - 1);
    if (start > end) return res.writeHead(416, { 'content-range': `bytes */${buf.length}` }).end();
    return res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${buf.length}`, 'content-length': end - start + 1 }).end(buf.subarray(start, end + 1));
  }
  res.writeHead(200, { ...headers, 'content-length': buf.length }).end(buf);
}

// Berkas sumber video: partner selalu; publik hanya bila izinnya membolehkan demo/arsip.
async function serveSourceFile(req, res, path) {
  const parts = path.split('/').filter(Boolean);
  const src = await sources.getSource(parts[1]).catch(() => null);
  const file = parts.slice(2).join('/');
  const user = await auth.currentUser(req);
  const ok = src && /^(video\.mp4|keyframes\/kf-\d+\.jpg)$/.test(file) && (PARTNER.includes(user?.role) || sources.allows(src, 'demo'));
  if (!ok) return res.writeHead(404).end('Not found');
  return serveRecordingBuffer(req, res, await store.readFile(`sources/${src.id}/${file}`), file);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.bin': 'application/octet-stream', '.webmanifest': 'application/manifest+json' };
const SECURITY_HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'permissions-policy': 'camera=(self), microphone=(self), bluetooth=(self)' };
const sendJson = (res, code, obj) => res.writeHead(code, { 'content-type': 'application/json', ...SECURITY_HEADERS }).end(JSON.stringify(obj));

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'POST' && url.pathname === '/api/recordings/upload') return sendJson(res, 200, await handleUpload(req, res, url));
    if (req.method === 'POST' && url.pathname === '/api/sources/upload') {
      await auth.requireRole(req, ...PARTNER);
      const m = await sources.attachVideoStream(url.searchParams.get('id'), req, String(url.searchParams.get('ext') || '').toLowerCase());
      if (url.searchParams.get('process') === '1') pipeline.enqueue(m.id);
      return sendJson(res, 200, m);
    }
    if (url.pathname.startsWith('/sources/')) return await serveSourceFile(req, res, url.pathname);
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      let body = {};
      if (req.method === 'POST') {
        let raw = '';
        for await (const c of req) { raw += c; if (raw.length > 12e6) throw fail(413, 'Terlalu besar'); }
        try { body = raw ? JSON.parse(raw) : {}; } catch { throw fail(400, 'JSON tidak valid'); }
      }
      return sendJson(res, 200, (await handler(body, req, res, url)) ?? {});
    }
    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Tidak ditemukan' });
    if (url.pathname.startsWith('/recordings/')) return await serveRecording(req, res, url.pathname);
    const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
    const buf = await readFile(join(ROOT, 'public', file)).catch(() => null);
    if (!buf) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', ...SECURITY_HEADERS }).end(buf);
  } catch (e) {
    if (typeof e.code !== "number") console.error(e);
    sendJson(res, typeof e.code === 'number' ? e.code : 500, { error: e.message });
  }
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await seedDataDir();
  await applyRetention().catch(() => {});
  server.listen(config.port, () => {
    console.log(`BelajarTenun berjalan di http://localhost:${config.port}`);
    console.log(`AI: ${aiEnabled() ? `aktif (${config.geminiModel}, live: ${config.liveModel})` : 'mode manual (GEMINI_API_KEY kosong)'} | TTS: ${config.ttsKey ? 'aktif' : 'suara browser'} | data: ${config.dataDir}`);
    if (config.authSecretIsRandom) console.warn('⚠ AUTH_SECRET belum diset: sesi login hilang setiap server restart.');
    if (config.authDisabled) console.warn('⚠ AUTH_DISABLED=1: semua orang dianggap admin. Jangan dipakai di produksi.');
  });
}
