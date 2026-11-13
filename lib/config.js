// Konfigurasi dari environment. Semua bersifat opsional: tanpa key, aplikasi tetap jalan di mode manual.
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const env = process.env;
export const ROOT = new URL('..', import.meta.url).pathname;

export const config = {
  port: Number(env.PORT || 3000),
  dataDir: env.DATA_DIR || join(ROOT, 'data'),       // di Cloud Run: folder mount Cloud Storage
  seedDir: join(ROOT, 'data'),
  geminiKey: env.GEMINI_API_KEY || '',
  // Penyedia Gemini: "vertex" (Vertex AI, kredensial service account) atau "gemini" (API key AI Studio).
  // Otomatis vertex bila GOOGLE_CLOUD_PROJECT diset dan GEMINI_API_KEY kosong.
  aiProvider: env.AI_PROVIDER || (env.GOOGLE_CLOUD_PROJECT && !env.GEMINI_API_KEY ? 'vertex' : 'gemini'),
  vertexProject: env.GOOGLE_CLOUD_PROJECT || '',
  vertexLocation: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  vertexBucket: env.VERTEX_GCS_BUCKET || '',             // untuk analisis video panjang (pengganti Files API)
  geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
  // Model Live default sama dengan VisionClaw (agent/main.py); bisa diganti.
  // Nama model Live berbeda di Vertex AI dan AI Studio.
  liveModel: env.GEMINI_LIVE_MODEL || (env.AI_PROVIDER === 'vertex' || (env.GOOGLE_CLOUD_PROJECT && !env.GEMINI_API_KEY)
    ? 'gemini-live-2.5-flash-native-audio' : 'gemini-2.5-flash-native-audio-preview-12-2025'),
  liveVoice: env.GEMINI_VOICE || 'Puck',
  embedModel: env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  ttsKey: env.GOOGLE_TTS_API_KEY || '',
  authSecret: env.AUTH_SECRET || randomBytes(32).toString('hex'),
  authSecretIsRandom: !env.AUTH_SECRET,
  authDisabled: env.AUTH_DISABLED === '1',          // hanya untuk pengembangan lokal / tes
  autoApproveDomains: (env.AUTO_APPROVE_DOMAINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  kbServeDraft: env.KB_SERVE_DRAFT !== '0',          // produksi: set 0 agar hanya jawaban tervalidasi dipakai
  retentionDays: Number(env.RETENTION_DAYS || 180),
  costPer1kInput: Number(env.COST_PER_1K_INPUT_USD || 0),
  // LiveKit lokal (lihat docs/LIVEKIT.md). Kosong = LiveKit nonaktif, pakai Gemini Live langsung.
  livekitUrl: env.LIVEKIT_URL || '',                          // dipakai agen & server, mis. ws://localhost:7880
  livekitPublicUrl: env.LIVEKIT_PUBLIC_URL || env.LIVEKIT_URL || '', // alamat yang dibuka browser/HP
  livekitApiKey: env.LIVEKIT_API_KEY || '',
  livekitApiSecret: env.LIVEKIT_API_SECRET || '',
  agentToken: env.AGENT_TOKEN || '',                          // rahasia bersama server ↔ agen Python
  costPer1kOutput: Number(env.COST_PER_1K_OUTPUT_USD || 0),
};
