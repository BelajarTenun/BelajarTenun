// Akun & peran. Pola dari VisionClaw gateway/src/auth.ts:
// - token disimpan dalam bentuk hash, token mentah hanya ada di perangkat;
// - akun partner/admin harus disetujui admin (status "pending" → "approved");
// - kode akses perangkat (kacamata) = bearer token per akun, bisa dicabut.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { config } from './config.js';
import { store } from './store.js';

export const ROLES = ['pemula', 'partner', 'admin'];
const FILE = 'users.json';
const SESSION_DAYS = 30;
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const fail = (code, message) => Object.assign(new Error(message), { code });

const load = () => store.readJson(FILE, { users: [] });
const save = (db) => store.writeJson(FILE, db);
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, community: u.community ?? null, createdAt: u.createdAt };

function hashPassword(pw, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  const a = Buffer.from(hash || '', 'hex'), b = scryptSync(pw, salt || '', 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function register({ name, email, password, role = 'pemula', community }) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail(400, 'Email tidak valid');
  if (String(password || '').length < 8) throw fail(400, 'Kata sandi minimal 8 karakter');
  if (!['pemula', 'partner'].includes(role)) throw fail(400, 'Peran tidak valid');
  const db = await load();
  if (db.users.some((u) => u.email === email)) throw fail(409, 'Email sudah terdaftar');
  const first = db.users.length === 0;
  const domainOk = config.autoApproveDomains.includes(email.split('@')[1]);
  const user = {
    id: randomUUID(), name: String(name || email).slice(0, 100), email,
    role: first ? 'admin' : role,                       // pengguna pertama menjadi admin
    status: first || role === 'pemula' || domainOk ? 'approved' : 'pending',
    community: community ? String(community).slice(0, 100) : null,
    passHash: hashPassword(password), deviceTokens: [], createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await save(db);
  return publicUser(user);
}

export async function login(email, password) {
  const db = await load();
  const u = db.users.find((x) => x.email === String(email || '').trim().toLowerCase());
  if (!u || !u.passHash || !checkPassword(String(password || ''), u.passHash)) throw fail(401, 'Email atau kata sandi salah');
  return publicUser(u);
}

/** Masuk/daftar lewat Google: akun dicocokkan dengan ID Google, lalu email. Akun baru = pemula. */
export async function loginWithGoogle({ sub, email, name }) {
  email = String(email).trim().toLowerCase();
  const db = await load();
  let u = db.users.find((x) => x.googleSub === sub) || db.users.find((x) => x.email === email);
  if (!u) {
    const first = db.users.length === 0;
    u = { id: randomUUID(), name: String(name).slice(0, 100), email, role: first ? 'admin' : 'pemula', status: 'approved',
      community: null, passHash: null, deviceTokens: [], createdAt: new Date().toISOString() };
    db.users.push(u);
  }
  u.googleSub = sub;
  await save(db);
  return publicUser(u);
}

// ---------- Cookie sesi bertanda tangan (HMAC) ----------
const sign = (v) => createHmac('sha256', config.authSecret).update(v).digest('base64url');
export function sessionCookie(userId) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const v = `${userId}.${exp}`;
  return `bt_session=${v}.${sign(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export const clearCookie = () => 'bt_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';

function parseCookie(header = '') {
  const m = /(?:^|;\s*)bt_session=([^;]+)/.exec(header);
  if (!m) return null;
  const [id, exp, sig] = m[1].split('.');
  const v = `${id}.${exp}`;
  const good = sig && sign(v).length === sig.length && timingSafeEqual(Buffer.from(sign(v)), Buffer.from(sig));
  return good && Number(exp) > Date.now() ? id : null;
}

/** Pengguna dari cookie atau header "Authorization: Bearer <kode akses perangkat>". */
export async function currentUser(req) {
  // Agen LiveKit (agent/main.py) memakai rahasia bersama; boleh mengakses semua sesi.
  if (config.agentToken && req.headers['x-agent-token'] && req.headers['x-agent-token'].length === config.agentToken.length
    && timingSafeEqual(Buffer.from(req.headers['x-agent-token']), Buffer.from(config.agentToken))) {
    return { id: 'agent', name: 'Agen tutor', role: 'admin', status: 'approved' };
  }
  if (config.authDisabled) return { id: 'dev', name: 'Developer', role: 'admin', status: 'approved' };
  const db = await load();
  const id = parseCookie(req.headers.cookie);
  let u = id && db.users.find((x) => x.id === id);
  const bearer = /^Bearer\s+(\S+)/.exec(req.headers.authorization || '')?.[1];
  if (!u && bearer) {
    const h = sha256(bearer);
    u = db.users.find((x) => x.deviceTokens?.some((t) => t.hash === h));
  }
  return u && u.status === 'approved' ? publicUser(u) : null;
}

export async function requireRole(req, ...roles) {
  const u = await currentUser(req);
  if (!u) throw fail(401, 'Silakan masuk dulu');
  if (roles.length && !roles.includes(u.role) && u.role !== 'admin') throw fail(403, 'Akses tidak diizinkan untuk peran ini');
  return u;
}

// ---------- Admin ----------
export async function listUsers() { return (await load()).users.map(publicUser); }
export async function updateUser(id, { role, status }) {
  const db = await load();
  const u = db.users.find((x) => x.id === id);
  if (!u) throw fail(404, 'Pengguna tidak ditemukan');
  if (role) { if (!ROLES.includes(role)) throw fail(400, 'Peran tidak valid'); u.role = role; }
  if (status) { if (!['approved', 'pending', 'disabled'].includes(status)) throw fail(400, 'Status tidak valid'); u.status = status; }
  await save(db);
  return publicUser(u);
}

// ---------- Kode akses perangkat (kacamata) ----------
export async function createDeviceToken(userId, label = 'kacamata') {
  const db = await load();
  const u = db.users.find((x) => x.id === userId);
  if (!u) throw fail(404, 'Pengguna tidak ditemukan');
  const raw = `bt_${randomBytes(24).toString('base64url')}`;
  u.deviceTokens = [...(u.deviceTokens || []), { id: randomUUID().slice(0, 8), label: String(label).slice(0, 40), hash: sha256(raw), createdAt: new Date().toISOString() }].slice(-5);
  await save(db);
  return { token: raw, note: 'Simpan kode ini di aplikasi kacamata. Kode tidak bisa ditampilkan lagi.' };
}
export async function listDeviceTokens(userId) {
  const u = (await load()).users.find((x) => x.id === userId);
  return (u?.deviceTokens || []).map(({ id, label, createdAt }) => ({ id, label, createdAt }));
}
export async function revokeDeviceToken(userId, tokenId) {
  const db = await load();
  const u = db.users.find((x) => x.id === userId);
  if (u) u.deviceTokens = (u.deviceTokens || []).filter((t) => t.id !== tokenId);
  await save(db);
}
