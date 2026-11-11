// LiveKit lokal (self-hosted): token akses JWT HS256 dibuat sendiri, tanpa SDK.
// Arsitektur (pola VisionClaw): HP/kacamata menerbitkan mic + kamera ke ruang LiveKit;
// agen Python (agent/main.py) bergabung, menjalankan Gemini Live, dan mengeksekusi tools ke mesin sesi.
import { createHmac } from 'node:crypto';
import { config } from './config.js';

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function createAccessToken({ identity, name, room, metadata, ttlSec = 6 * 3600, grants = {} }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.livekitApiKey, sub: identity, name, nbf: now - 10, exp: now + ttlSec,
    metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata ?? {}),
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, ...grants },
  };
  const unsigned = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}`;
  return `${unsigned}.${createHmac('sha256', config.livekitApiSecret).update(unsigned).digest('base64url')}`;
}

export const livekitEnabled = () => Boolean(config.livekitUrl && config.livekitApiKey && config.livekitApiSecret);
export const roomForSession = (sessionId) => `bt-${sessionId}`;

/** Ubah skema tools Gemini (tipe huruf besar) ke JSON Schema biasa untuk livekit-agents (raw_schema). */
export function toJsonSchema(s) {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) out[k] = k === 'type' && typeof v === 'string' ? v.toLowerCase() : toJsonSchema(v);
  return out;
}
