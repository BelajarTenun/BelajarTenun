// Kurikulum (multi-modul), dataset rekaman, persetujuan, dan tracer.
import { randomUUID } from 'node:crypto';
import { store } from './store.js';
import { validateModule } from './core.js';
import { aiEnabled, generate } from './ai.js';

const fail = (code, message) => Object.assign(new Error(message), { code });

// ---------- Modul (F9: multi-modul) ----------
export async function listModules() {
  const out = [];
  for (const f of (await store.list('modules')).filter((x) => x.endsWith('.json')).sort()) {
    const m = await store.readJson(`modules/${f}`, null);
    if (m) out.push({ id: m.id, title: m.title, tradition: m.tradition, level: m.level, status: m.status, description: m.description, steps: m.steps.length, published: m.published !== false });
  }
  return out;
}
export async function getModule(id) {
  const mods = await listModules();
  const pick = id || mods.find((m) => m.published)?.id || mods[0]?.id;
  if (!pick || !/^[a-z0-9-]+$/.test(pick)) throw fail(404, 'Modul tidak ditemukan');
  const m = await store.readJson(`modules/${pick}.json`, null);
  if (!m) throw fail(404, 'Modul tidak ditemukan');
  return m;
}
export async function saveModule(m) {
  const errors = validateModule(m);
  if (!/^[a-z0-9-]+$/.test(m?.id || '')) errors.push('ID modul hanya huruf kecil, angka, "-"');
  if (errors.length) throw fail(400, errors.join('\n'));
  await store.writeJson(`modules/${m.id}.json`, m);
}

// ---------- Dataset rekaman (F6) ----------
export const CONSENT_SCOPES = {
  pembelajaran: 'Dipakai sebagai video demo untuk pemula',
  pengembangan_ai: 'Dipakai untuk menguji dan melatih AI pendeteksi tahap',
  publikasi: 'Boleh ditampilkan di publikasi / presentasi',
};
const idOk = (id) => /^[\w-]+$/.test(id || '');

export async function listRecordings() {
  const out = [];
  for (const d of await store.list('recordings')) {
    const meta = await store.readJson(`recordings/${d}/meta.json`, null);
    if (meta) out.push(meta);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getRecording(id) {
  if (!idOk(id)) throw fail(400, 'ID tidak valid');
  const m = await store.readJson(`recordings/${id}/meta.json`, null);
  if (!m) throw fail(404, 'Rekaman tidak ditemukan');
  return m;
}
const saveRecording = (m) => store.writeJson(`recordings/${m.id}/meta.json`, m);

export async function createRecording(body, user) {
  const module = await getModule(body.moduleId);
  const full = body.stepId === 'full';
  const step = module.steps.find((s) => s.id === body.stepId);
  if (!full && !step) throw fail(400, 'Tahap tidak dikenal');
  if (!full && !['done', 'not_yet', 'mistake'].includes(body.label)) throw fail(400, 'Label harus done / not_yet / mistake');
  if (!full && body.label === 'mistake' && !step.common_mistakes[(body.mistakeIndex ?? 0) - 1]) throw fail(400, 'Pilih kesalahan yang dicontohkan');
  const c = body.consent || {};
  if (c.given !== true || !String(c.name || '').trim()) throw fail(400, 'Persetujuan penenun (dengan nama) wajib diisi');
  const scopes = (c.scopes || []).filter((x) => CONSENT_SCOPES[x]);
  if (!scopes.length) throw fail(400, 'Pilih minimal satu cakupan penggunaan');
  const id = `${new Date().toISOString().slice(0, 10)}-${full ? 'sesi' : step.id}-${randomUUID().slice(0, 8)}`;
  const meta = {
    id, module: module.id, stepId: full ? 'full' : step.id,
    label: full ? null : body.label, mistakeIndex: !full && body.label === 'mistake' ? body.mistakeIndex : null,
    weaver: String(body.weaver || c.name).slice(0, 100), community: String(body.community || '').slice(0, 100) || null,
    recordedBy: user?.name ?? String(body.recordedBy || '').slice(0, 100), recordedById: user?.id ?? null,
    device: String(body.device || 'phone').slice(0, 30),
    consent: { given: true, name: String(c.name).slice(0, 100), scopes, date: new Date().toISOString(), witness: String(c.witness || '').slice(0, 100) || null, withdrawn: false },
    notes: String(body.notes || '').slice(0, 1000), createdAt: new Date().toISOString(), files: [], segments: [], frames: [],
  };
  await saveRecording(meta);
  return meta;
}

export async function addRecordingFile(id, name, buf, frameLabel) {
  if (!idOk(id) || !/^[\w-]+\.(webm|mp4|jpg)$/.test(name || '')) throw fail(400, 'Nama file tidak valid');
  const meta = await getRecording(id);
  if (meta.consent?.withdrawn) throw fail(410, 'Persetujuan sudah dicabut');
  await store.writeFile(`recordings/${id}/${name}`, buf);
  if (!meta.files.includes(name)) meta.files.push(name);
  if (frameLabel) meta.frames = [...(meta.frames || []).filter((f) => f.file !== name), { file: name, ...frameLabel }];
  await saveRecording(meta);
  return { ok: true, size: buf.length };
}

/** Anotasi timeline (format ala WTaG StepDetection): [{stepId, label, mistakeIndex, start, end}] dalam detik. */
export async function saveSegments(id, segments) {
  const meta = await getRecording(id);
  const module = await getModule(meta.module);
  const clean = [];
  for (const [i, sg] of (segments || []).entries()) {
    const step = module.steps.find((s) => s.id === sg.stepId);
    if (!step) throw fail(400, `Segmen ${i + 1}: tahap tidak dikenal`);
    if (!['done', 'not_yet', 'mistake'].includes(sg.label)) throw fail(400, `Segmen ${i + 1}: label tidak valid`);
    const start = Number(sg.start), end = Number(sg.end);
    if (!(start >= 0 && end > start)) throw fail(400, `Segmen ${i + 1}: waktu tidak valid`);
    clean.push({ stepId: step.id, label: sg.label, mistakeIndex: sg.label === 'mistake' ? Number(sg.mistakeIndex) || 1 : null, start, end, by: sg.by === 'ai' ? 'ai' : 'manusia' });
  }
  meta.segments = clean.sort((a, b) => a.start - b.start);
  await saveRecording(meta);
  return meta;
}

/** Cabut persetujuan: semua file dihapus, hanya catatan pencabutan yang disimpan. */
export async function withdrawConsent(id, by) {
  const meta = await getRecording(id);
  await store.remove(`recordings/${id}`);
  await store.append('logs/consent.jsonl', JSON.stringify({ type: 'consent_withdrawn', recording: id, weaver: meta.weaver, by, at: new Date().toISOString() }) + '\n');
  return { ok: true };
}

/** Semua frame berlabel dari dataset (untuk evaluasi, few-shot, dan pelatihan). */
export function labeledFrames(rec) {
  if (rec.consent?.withdrawn) return [];
  if (rec.frames?.length) return rec.frames.map((f) => ({ recording: rec.id, ...f }));
  if (rec.stepId === 'full') return [];
  return rec.files.filter((f) => f.endsWith('.jpg')).sort().map((file, i, arr) => ({ recording: rec.id, file, stepId: rec.stepId, label: rec.label, mistakeIndex: rec.mistakeIndex, last: i === arr.length - 1 }));
}
const canUseForAI = (rec) => rec.consent?.scopes?.includes('pengembangan_ai') ?? Boolean(rec.consent);

/** Contoh foto BENAR untuk few-shot (F3), di-cache 5 menit. */
const exCache = new Map();
export async function examplesFor(moduleId, stepId, n = 2, excludeRecording = null) {
  const key = `${moduleId}/${stepId}`;
  const c = exCache.get(key);
  if (!excludeRecording && c && Date.now() - c.at < 300000) return c.images;
  const recs = (await listRecordings()).filter((r) => r.module === moduleId && canUseForAI(r) && r.id !== excludeRecording);
  const frames = recs.flatMap(labeledFrames).filter((f) => f.stepId === stepId && f.label === 'done' && (f.last !== false));
  const images = [];
  for (const f of frames.slice(0, n)) {
    try { images.push((await store.readFile(`recordings/${f.recording}/${f.file}`)).toString('base64')); } catch { /* lewati */ }
  }
  if (!excludeRecording) exCache.set(key, { at: Date.now(), images });
  return images;
}

/** Usulan anotasi otomatis dari video (Gemini video understanding). Partner tinggal mengoreksi. */
export async function autoAnnotate(id) {
  if (!aiEnabled()) throw fail(501, 'Butuh GEMINI_API_KEY');
  const meta = await getRecording(id);
  const module = await getModule(meta.module);
  const video = meta.files.find((f) => /\.(webm|mp4)$/.test(f));
  if (!video) throw fail(404, 'Video tidak ada');
  const buf = await store.readFile(`recordings/${id}/${video}`);
  if (buf.length > 18e6) throw fail(413, 'Video > 18 MB; potong dulu atau anotasi manual');
  const steps = module.steps.map((s) => `- ${s.id}: ${s.title}. Berhasil bila: ${s.success_criteria}. Kesalahan: ${s.common_mistakes.map((m, i) => `${i + 1}) ${m.mistake}`).join('; ')}`).join('\n');
  const raw = await generate([
    { inline_data: { mime_type: video.endsWith('.mp4') ? 'video/mp4' : 'video/webm', data: buf.toString('base64') } },
    { text: `Video ini adalah rekaman sudut pandang mata seorang penenun. Tandai kapan setiap tahap berikut dikerjakan.\n${steps}\n\nBalas JSON: {"segments":[{"stepId":"…","label":"done"|"mistake"|"not_yet","mistakeIndex":null|nomor,"start":detik,"end":detik}]}. label "done" untuk bagian ketika tahap tampak berhasil diselesaikan, "not_yet" untuk bagian ketika sedang dikerjakan, "mistake" bila terlihat kesalahan. Hanya tandai yang benar-benar terlihat.` },
  ], { json: true, kind: 'auto_annotate' });
  const parsed = JSON.parse(raw);
  return (parsed.segments || []).map((s) => ({ ...s, by: 'ai' })).filter((s) => module.steps.some((x) => x.id === s.stepId));
}

// ---------- Tracer (pola VisionClaw Tracer: teks saja, tanpa gambar) ----------
const MAX_FIELD = 2000;
const IMAGE_KEY = /image|frame|audio|b64|base64|data/i;
export function sanitizeEvent(ev) {
  const out = {};
  for (const [k, v] of Object.entries(ev || {})) {
    if (typeof v === 'string' && IMAGE_KEY.test(k) && v.length > 200) continue; // pertahanan lapis kedua
    if (typeof v === 'string') out[k] = v.length > MAX_FIELD ? v.slice(0, MAX_FIELD) + '…[dipotong]' : v;
    else if (typeof v === 'number' || typeof v === 'boolean' || v === null) out[k] = v;
    else if (typeof v === 'object') out[k] = JSON.parse(JSON.stringify(v, (key, val) => (typeof val === 'string' && val.length > 200 && IMAGE_KEY.test(key) ? undefined : val)));
  }
  return out;
}
export const logEvent = (ev) => store.append('logs/sessions.jsonl', JSON.stringify({ ...sanitizeEvent(ev), at: ev.at || new Date().toISOString() }) + '\n');
export const readEvents = () => store.readLines('logs/sessions.jsonl');

// ---------- Signaling WebRTC untuk pendamping jarak jauh ----------
// Pola "share your glasses POV live to a browser viewer" dari VisionClaw, tanpa server tambahan:
// pertukaran SDP/ICE lewat HTTP polling sederhana.
const rooms = new Map();
const ROOM_TTL = 3 * 3600000;
export function rtcCreateRoom() {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  rooms.set(code, { created: Date.now(), seq: 0, messages: [] });
  return code;
}
export function rtcPost(code, msg) {
  const r = rooms.get(String(code).toUpperCase());
  if (!r) throw fail(404, 'Kode ruang tidak ditemukan');
  const m = { seq: ++r.seq, from: String(msg.from).slice(0, 40), to: msg.to ? String(msg.to).slice(0, 40) : null, type: String(msg.type).slice(0, 30), data: msg.data };
  r.messages.push(m);
  if (r.messages.length > 500) r.messages.shift();
  return { seq: m.seq };
}
export function rtcPoll(code, peer, since = 0) {
  const r = rooms.get(String(code).toUpperCase());
  if (!r) throw fail(404, 'Kode ruang tidak ditemukan');
  return { messages: r.messages.filter((m) => m.seq > since && m.from !== peer && (!m.to || m.to === peer)) };
}
setInterval(() => { for (const [k, r] of rooms) if (Date.now() - r.created > ROOM_TTL) rooms.delete(k); }, 600000).unref();
