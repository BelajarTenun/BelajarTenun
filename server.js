// BelajarTenun – server (tanpa dependency, Node >= 20).
import http from 'node:http';
import { extname, normalize } from 'node:path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config, ROOT } from './lib/config.js';
import { store, seedDataDir, applyRetention } from './lib/store.js';
import { aiEnabled, isVertex, generate, createLiveToken, tts, usageStats, loadUsage } from './lib/ai.js';
import * as auth from './lib/auth.js';
import * as kb from './lib/knowledge.js';
import * as data from './lib/data.js';
import { buildStepCheckPrompt, interpretStepCheck, summarizeLogs, STEP_CHECK_SCHEMA } from './lib/core.js';
import { createSession } from './lib/session.js';
import { myMastery, sessionDetail } from './lib/learner.js';
import { liveSetup, liveInstructions, LIVE_TOOLS } from './lib/live.js';
import * as sources from './lib/sources.js';
import * as pipeline from './lib/pipeline.js';
import { getAnalysis } from './lib/video-analysis.js';
import { generateDialogs, evaluateDialog, listDialogs } from './lib/dialog-gen.js';
import { pairsForModule } from './lib/exo-ego.js';
import { runDiagnostics } from './lib/diagnostics.js';
import { stepDifficulty, masteryByLearner } from './lib/learning-analytics.js';
import { googleLoginEnabled, authUrl, profileFromCode } from './lib/google-login.js';
import { createAccessToken, livekitEnabled, roomForSession, toJsonSchema } from './lib/livekit.js';
const pairs = new Map(); // kode pasangan HP-kamera → { userId, exp }

// ----- Masuk dengan Google: alihkan ke Google, lalu kembali ke /api/auth/google/callback -----
async function googleRoute(req, res, url) {
  const back = (path) => res.writeHead(302, { location: path, ...SECURITY_HEADERS }).end();
  if (!googleLoginEnabled()) return back('/masuk?galat=google');
  if (url.pathname === '/api/auth/google') {
    const { url: to, state } = authUrl(req);
    const next = /^\/(?!\/)[\w/.-]*$/.test(url.searchParams.get('lanjut') || '') ? url.searchParams.get('lanjut') : '/belajar';
    res.setHeader('set-cookie', `bt_oauth=${state}.${encodeURIComponent(next)}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${config.publicUrl.startsWith('https') ? '; Secure' : ''}`);
    return back(to);
  }
  const saved = /(?:^|;\s*)bt_oauth=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '';
  const [state, next = '%2Fbelajar'] = saved.split('.');
  if (!state || state !== url.searchParams.get('state') || !url.searchParams.get('code')) return back('/masuk?galat=google');
  try {
    const user = await auth.loginWithGoogle(await profileFromCode(req, url.searchParams.get('code')));
    res.setHeader('set-cookie', [auth.sessionCookie(user.id), 'bt_oauth=; Path=/api/auth/google; Max-Age=0']);
    // Tujuan bawaan setelah masuk berbeda per peran: pemula belajar, partner ke Editor, admin ke Dashboard admin.
    const target = decodeURIComponent(next);
    return back(target === '/belajar' ? homeFor(user) : target);
  } catch { return back('/masuk?galat=google'); }
}

const PARTNER_ROLES = ['partner', 'admin'];
export const homeFor = (user) => ({ admin: '/admin.html', partner: '/editor.html' }[user?.role] ?? '/belajar');
const TEAM_PAGES = {
  'admin.html': ['admin'], 'progres.html': PARTNER_ROLES,
  'editor.html': PARTNER_ROLES, 'validasi.html': PARTNER_ROLES, 'rekam.html': PARTNER_ROLES, 'anotasi.html': PARTNER_ROLES, 'sumber.html': PARTNER_ROLES,
};
const WEB_DIST = join(ROOT, 'web', 'dist');
const fail = (code, message) => Object.assign(new Error(message), { code });
const b64 = (img) => String(img || '').replace(/^data:image\/\w+;base64,/, '');

// ---------- AI: deteksi tahap (F3: multi-frame + contoh few-shot + output terstruktur) ----------
export async function checkStep(module, step, frames, { history = [], patternRows, useExamples = !config.stepCheckModel, excludeRecording = null, allowExample = null, model = config.stepCheckModel || config.geminiModel } = {}) {
  if (!aiEnabled() || !step.auto_detect) return { status: 'uncertain', confidence: 0, observation: 'Konfirmasi manual.' };
  const imgs = frames.map(b64).filter(Boolean);
  if (!imgs.length) return { status: 'uncertain', confidence: 0, observation: 'Tidak ada gambar.' };
  const examples = useExamples ? await data.examplesFor(module.id, step.id, 2, excludeRecording, allowExample) : [];
  const parts = [{ text: buildStepCheckPrompt(step, { frames: imgs.length, examples: examples.length, history, patternRows }) }];
  for (const e of examples) parts.push({ inline_data: { mime_type: 'image/jpeg', data: e } });
  for (const f of imgs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: f } });
  const raw = await generate(parts, { json: true, schema: STEP_CHECK_SCHEMA, kind: 'check_step', model });
  return interpretStepCheck(raw, step);
}

// ---------- Sesi belajar (dipakai web app, kacamata, dan Gemini Live) ----------
const sessions = new Map();
const SESSION_TTL_MS = 3 * 3600000;
async function startSession(body, user) {
  const module = await data.getModule(body.moduleId);
  // Informasi pendukung (4C/ID): hanya entri pengetahuan yang boleh dipakai (tervalidasi, kecuali KB_SERVE_DRAFT).
  const kbOk = new Map(kb.servable((await kb.loadKnowledge()).entries, module.id).map((e) => [e.id, e]));
  const session = createSession(module, {
    supportive: (ids) => ids.map((id) => kbOk.get(id)).filter(Boolean).map((e) => ({ topik: e.question, isi: e.answer, sumber: e.source ?? null })),
    checkStep: (step, frames, opts) => checkStep(module, step, frames, opts),
    ask: (q, step) => kb.answer(q, { step, moduleId: module.id, userId: user?.id }),
    log: (ev) => data.logEvent(ev).catch(() => {}),
  }, Date.now, { userId: user?.id ?? null, source: String(body.source || 'phone').slice(0, 20), audioOnly: Boolean(body.audioOnly), startIndex: Number(body.startStep) || 0 });
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
  [`POST ${prefix}/frame`]: async (b, req) => withAudio(await getSession(b.sessionId, await auth.currentUser(req)).frame(b.image, { quality: b.quality, local: b.localPrediction, ageMs: b.ageMs }), b),
  [`POST ${prefix}/say`]: async (b, req) => withAudio(await getSession(b.sessionId, await auth.currentUser(req)).say(String(b.text || '').slice(0, 500)), b),
  [`POST ${prefix}/button`]: async (b, req) => withAudio(getSession(b.sessionId, await auth.currentUser(req)).button(b.action), b),
  [`POST ${prefix}/tick`]: async (b, req) => withAudio(getSession(b.sessionId, await auth.currentUser(req)).tick(), b),
});

const routes = {
  'GET /api/health': async () => ({ ok: true }),
  'GET /api/config': async (b, req) => ({
    ai: aiEnabled(), tts: Boolean(config.ttsKey), model: config.geminiModel, live: (aiEnabled() && !isVertex()) || livekitEnabled(), aiProvider: config.aiProvider, liveModel: config.liveModel,
    livekit: livekitEnabled(), googleLogin: googleLoginEnabled(), passwordLogin: config.passwordLogin,
    home: homeFor(await auth.currentUser(req)),
    user: await auth.currentUser(req), authDisabled: config.authDisabled,
  }),

  // ----- Akun -----
  'POST /api/auth/register': async (b, req, res) => {
    if (!config.passwordLogin) throw fail(403, 'Pendaftaran hanya lewat akun Google'); const u = await auth.register(b); if (u.status === 'approved') res.setHeader('set-cookie', auth.sessionCookie(u.id)); return u; },
  'POST /api/auth/login': async (b, req, res) => {
    if (!config.passwordLogin) throw fail(403, 'Masuk hanya lewat akun Google');
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

  'GET /api/admin/diagnostics': async (b, req) => { await auth.requireRole(req, 'admin'); return runDiagnostics(); },

  // ----- Kurikulum -----
  'GET /api/modules': async () => ({ modules: await data.listModules() }),
  // Kain Bercerita (publik, tanpa login): dibuka dari modul atau dari QR di label kain.
  'GET /api/story': async (b, req, res, url) => {
    const id = url.searchParams.get('id'), mod = url.searchParams.get('module'), code = url.searchParams.get('code');
    const all = await Promise.all((await store.list('stories')).filter((f) => f.endsWith('.json')).map((f) => store.readJson(`stories/${f}`, null)));
    const st = all.find((x) => x && (x.id === id || (mod && x.module === mod) || (code && x.pieces?.some((p) => p.code === code))));
    if (!st) throw fail(404, 'Cerita tidak ditemukan');
    if (code) data.logEvent({ type: 'qr_scan', story: st.id, code }).catch(() => {});
    return { ...st, piece: code ? st.pieces.find((p) => p.code === code) : null, pieces: undefined };
  },
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
  // Video pengenalan modul: dari rekaman partner atau sumber video yang izinnya membolehkan ditonton pemula.
  'POST /api/module/intro-video': async (b, req) => {
    const user = await auth.requireRole(req, ...PARTNER);
    const module = await data.getModule(b.moduleId);
    let video, attribution = null;
    if (b.recordingId) {
      const rec = await data.getRecording(b.recordingId);
      if (!rec.consent?.scopes?.includes('pembelajaran')) throw fail(400, 'Penenun tidak mengizinkan rekaman ini ditonton pemula');
      const f = rec.files.find((x) => /\.(webm|mp4)$/.test(x));
      if (!f) throw fail(404, 'Rekaman tidak punya video');
      video = `recordings/${rec.id}/${f}`; attribution = rec.weaver ? `Penenun: ${rec.weaver}` : null;
    } else if (b.sourceId) {
      const src = await sources.getSource(b.sourceId);
      if (!sources.allows(src, 'demo')) throw fail(400, 'Status izin video ini tidak membolehkan ditonton pemula');
      if (!src.files?.includes('video.mp4')) throw fail(400, 'Video belum dipra-proses');
      video = `sources/${src.id}/video.mp4`; attribution = [src.title, src.channel].filter(Boolean).join(' – ') || src.url;
    } else if (b.clear) video = null;
    else throw fail(400, 'Pilih rekaman atau sumber video');
    if (video && (Number.isFinite(b.start) || Number.isFinite(b.end))) video += `#t=${Math.floor(b.start || 0)}${Number.isFinite(b.end) ? `,${Math.ceil(b.end)}` : ''}`;
    module.intro = { ...(module.intro || {}), video, video_attribution: video ? attribution : null };
    await data.saveModule(module, user);
    return { ok: true, intro: module.intro };
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
  // ----- HP sebagai kamera untuk laptop: pasangkan lewat kode/QR, gambar HP dikirim lewat ruang LiveKit "pair-<kode>" -----
  'POST /api/pair/new': async (b, req) => {
    if (!livekitEnabled()) throw fail(501, 'LiveKit belum dikonfigurasi');
    const user = await auth.currentUser(req);
    if (!user) throw fail(401, 'Masuk dulu');
    for (const [k, v] of pairs) if (v.exp < Date.now()) pairs.delete(k);
    let code; do code = String(Math.floor(100000 + Math.random() * 900000)); while (pairs.has(code));
    pairs.set(code, { userId: user.id, exp: Date.now() + 15 * 60 * 1000 });
    return { code, expiresInSec: 900 };
  },
  'POST /api/pair/token': async (b, req) => {
    if (!livekitEnabled()) throw fail(501, 'LiveKit belum dikonfigurasi');
    const code = String(b.code || '').replace(/\D/g, '');
    const p = pairs.get(code);
    if (!p || p.exp < Date.now()) throw fail(404, 'Kode tidak berlaku. Buat kode baru di laptop.');
    const camera = b.role === 'camera';
    if (!camera) { const user = await auth.currentUser(req); if (user?.id !== p.userId) throw fail(403, 'Kode milik akun lain'); }
    if (camera) p.exp = Date.now() + 6 * 3600 * 1000; // sudah dipakai: berlaku selama sesi latihan
    const room = `pair-${code}`;
    const token = createAccessToken({
      identity: `${camera ? 'hp' : 'laptop'}-${Math.random().toString(36).slice(2, 8)}`, name: camera ? 'Kamera HP' : 'Laptop', room,
      grants: camera ? { canSubscribe: false, canPublishData: false } : { canPublish: false, canPublishData: false },
    });
    return { url: config.livekitPublicUrl, token, room };
  },
  // Heartbeat agen: model Live yang benar-benar bisa tersambung (agent/main.py heartbeat_loop).
  'GET /api/agent/live-models': async (b, req) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && !config.authDisabled) throw fail(403, 'Khusus agen');
    return { models: config.liveModels };
  },
  'POST /api/agent/heartbeat': async (b, req) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && !config.authDisabled) throw fail(403, 'Khusus agen');
    await store.writeJson('agent-heartbeat.json', { ok: Boolean(b.ok), model: b.model ?? null, candidates: b.candidates ?? [], error: b.error ?? null, at: new Date().toISOString() });
    return { ok: true };
  },
  // ----- Simulasi sesi (scripts/simulate_session.js, rencana 7.2): khusus token agen -----
  // Akun murid khusus simulasi (email *.local, tidak bisa login Google) supaya harness bisa jalan di CI tanpa akun manusia.
  'POST /api/admin/sim-login': async (b, req, res) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && !config.authDisabled) throw fail(403, 'Khusus agen');
    let sim = await auth.loginWithGoogle({ sub: 'simulasi-belajartenun', email: 'simulasi@belajartenun.local', name: 'Murid Simulasi' });
    // Selalu pemula: di database kosong pengguna pertama otomatis admin, dan simulasi tidak boleh menjadi admin.
    if (sim.role !== 'pemula') sim = await auth.updateUser(sim.id, { role: 'pemula' });
    res.setHeader('set-cookie', auth.sessionCookie(sim.id));
    return { user: sim };
  },
  'GET /api/admin/session-events': async (b, req, res, url) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && user.role !== 'admin') throw fail(403, 'Khusus admin');
    const id = url.searchParams.get('sessionId');
    if (!id) throw fail(400, 'sessionId wajib');
    const events = (await data.readEvents()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e?.sessionId === id);
    return { events };
  },
  // Dipanggil agen Python saat bergabung ke ruang: instruksi + tools sesuai modul & mode sesi.
  'GET /api/agent/session-config': async (b, req, res, url) => {
    const user = await auth.requireRole(req, 'admin');
    if (user.id !== 'agent' && !config.authDisabled) throw fail(403, 'Khusus agen');
    const session = getSession(url.searchParams.get('sessionId'), user);
    return {
      sessionId: session.state.id, model: config.liveModel, models: config.liveModels, voice: config.liveVoice,
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
  'POST /api/tts': async (b, req) => { await auth.requireRole(req); return { audio: await tts(String(b.text || '').slice(0, 1000)) }; },

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
  // Dashboard murid: penguasaan tahap (3 status) dan detail sesi milik sendiri.
  'GET /api/me/mastery': async (b, req) => {
    const user = await auth.requireRole(req);
    const events = (await data.readEvents()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e?.userId === user.id);
    const modules = (await Promise.all((await data.listModules()).map((m) => data.getModule(m.id).catch(() => null)))).filter(Boolean);
    return { mastery: myMastery(events, user.id, modules) };
  },
  'GET /api/me/session': async (b, req, res, url) => {
    const user = await auth.requireRole(req);
    const id = url.searchParams.get('id');
    const events = (await data.readEvents()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e?.sessionId === id && e.userId === user.id);
    if (!events.length) throw fail(404, 'Sesi tidak ditemukan');
    return sessionDetail(events, await data.getModule(events[0].module).catch(() => null));
  },
  // Analitik belajar untuk revisi kurikulum: tahap tersulit + penguasaan (BKT) per murid. Khusus tim.
  'GET /api/admin/learning': async (b, req, res, url) => {
    await auth.requireRole(req, ...PARTNER);
    const module = await data.getModule(url.searchParams.get('moduleId'));
    const events = (await data.readEvents()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e?.module === module.id);
    const mastery = masteryByLearner(events);
    const perStep = Object.fromEntries(module.steps.map((s) => {
      const rows = mastery.filter((m) => m.step === s.id);
      return [s.id, { learners: rows.length, mastered: rows.filter((m) => m.mastered).length, meanMastery: rows.length ? +(rows.reduce((t, m) => t + m.mastery, 0) / rows.length).toFixed(2) : null }];
    }));
    return { module: module.id, difficulty: stepDifficulty(events, module), mastery: perStep };
  },

};

// ---------- Upload biner rekaman ----------
// Foto kain sampul modul (kartu di halaman pilih modul). JPEG/PNG/WebP, maks 8 MB, disimpan di DATA_DIR.
const COVER_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
async function handleCoverUpload(req, url) {
  await auth.requireRole(req, ...PARTNER);
  const id = url.searchParams.get('id') || '';
  if (!/^[a-z0-9-]+$/.test(id)) throw fail(400, 'ID modul tidak valid');
  const ext = COVER_TYPES[String(req.headers['content-type']).split(';')[0]];
  if (!ext) throw fail(400, 'Foto harus JPEG, PNG, atau WebP');
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 8e6) throw fail(413, 'Foto maksimal 8 MB'); chunks.push(c); }
  const name = `${id}-${Date.now().toString(36)}.${ext}`;
  await store.writeFile(`module-media/${name}`, Buffer.concat(chunks));
  return { url: `/media/modules/${name}` };
}
async function serveModuleMedia(res, pathname) {
  const name = pathname.slice('/media/modules/'.length);
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(name)) return res.writeHead(404).end();
  const buf = await store.readFile(`module-media/${name}`).catch(() => null);
  if (!buf) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[name.split('.').pop()], 'cache-control': 'public, max-age=31536000, immutable', ...SECURITY_HEADERS }).end(buf);
}

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
    if (req.method === 'POST' && url.pathname === '/api/module/cover') return sendJson(res, 200, await handleCoverUpload(req, url));
    if (req.method === 'POST' && url.pathname === '/api/sources/upload') {
      await auth.requireRole(req, ...PARTNER);
      const m = await sources.attachVideoStream(url.searchParams.get('id'), req, String(url.searchParams.get('ext') || '').toLowerCase());
      if (url.searchParams.get('process') === '1') pipeline.enqueue(m.id);
      return sendJson(res, 200, m);
    }
    if (url.pathname.startsWith('/sources/')) return await serveSourceFile(req, res, url.pathname);
    if (url.pathname.startsWith('/api/auth/google')) return await googleRoute(req, res, url);
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
    if (url.pathname.startsWith('/media/modules/')) return await serveModuleMedia(res, url.pathname);
    const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
    // Halaman Ruang tim dikunci di server: pemula & tamu tidak pernah menerima HTML-nya.
    const need = TEAM_PAGES[file.replace(/^\//, '')];
    if (need) {
      const user = await auth.currentUser(req);
      if (!user || !(need.includes(user.role) || user.role === 'admin')) {
        const to = user ? homeFor(user) : `/masuk?lanjut=${encodeURIComponent(url.pathname)}`;
        return res.writeHead(302, { location: to, 'cache-control': 'no-store', ...SECURITY_HEADERS }).end();
      }
      res.setHeader('cache-control', 'no-store');
    }
    // Aplikasi pemula (React, web/dist) didahulukan; halaman tim & modul JS bersama dari public/.
    let buf = await readFile(join(WEB_DIST, file)).catch(() => null) ?? await readFile(join(ROOT, 'public', file)).catch(() => null);
    let type = MIME[extname(file)];
    // Rute aplikasi (/belajar/..., /masuk) tanpa ekstensi: kirim index.html React.
    if (!buf && !extname(file)) { buf = await readFile(join(WEB_DIST, 'index.html')).catch(() => null); type = MIME['.html']; }
    if (!buf) return res.writeHead(404).end('Not found');
    if (file.startsWith('/assets/')) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    res.writeHead(200, { 'content-type': type || 'application/octet-stream', ...SECURITY_HEADERS }).end(buf);
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
    console.log(`AI: ${aiEnabled() ? `${config.aiProvider} (${config.geminiModel}, live: ${config.liveModel})` : 'mode manual (GEMINI_API_KEY atau GOOGLE_CLOUD_PROJECT kosong)'} | TTS: ${config.ttsKey ? 'aktif' : 'suara browser'} | data: ${config.dataDir}`);
    if (config.authSecretIsRandom) console.warn('Peringatan: AUTH_SECRET belum diset: sesi login hilang setiap server restart.');
    if (config.authDisabled) console.warn('Peringatan: AUTH_DISABLED=1: semua orang dianggap admin. Jangan dipakai di produksi.');
  });
}
