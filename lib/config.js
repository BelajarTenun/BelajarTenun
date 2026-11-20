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
  vertexBucket: env.VERTEX_GCS_BUCKET || '',
  // ASR Chirp (Speech-to-Text v2) untuk transkrip video bercap waktu kata. Kosong = pakai Gemini.
  asrModel: env.ASR_MODEL || '',
  asrLocation: env.ASR_LOCATION || 'us',
  asrLanguages: (env.ASR_LANGUAGES || 'id-ID').split(',').map((x) => x.trim()).filter(Boolean),             // untuk analisis video panjang (pengganti Files API)
  geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
  // Model Live: daftar dipisah koma, urut prioritas. Agen memakai model PERTAMA yang benar-benar bisa tersambung
  // (agent/main.py pick_live_model), sehingga pensiunnya satu model tidak mematikan tutor.
  // Vertex: gemini-3.8-live (GA) lalu gemini-live-2.5-flash-native-audio sebagai cadangan.
  liveModels: (env.GEMINI_LIVE_MODEL || (env.AI_PROVIDER === 'vertex' || (env.GOOGLE_CLOUD_PROJECT && !env.GEMINI_API_KEY)
    ? 'gemini-3.8-live,gemini-live-2.5-flash-native-audio' : 'gemini-3.8-live,gemini-2.5-flash-native-audio-preview-12-2025'))
    .split(',').map((m) => m.trim()).filter(Boolean),
  get liveModel() { return this.liveModels[0]; },
  liveVoice: env.GEMINI_VOICE || 'Puck',
  embedModel: env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  ttsKey: env.GOOGLE_TTS_API_KEY || '',
  // Masuk dengan Google (OAuth client "Web application" di Google Cloud Console).
  googleClientId: env.GOOGLE_OAUTH_CLIENT_ID || '',
  googleClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  publicUrl: env.PUBLIC_URL || (env.DOMAIN ? `https://${env.DOMAIN}` : ''),
  authSecret: env.AUTH_SECRET || randomBytes(32).toString('hex'),
  authSecretIsRandom: !env.AUTH_SECRET,
  // Masuk/daftar dengan email + kata sandi. Bawaan: mati (hanya Google). Tes & pengembangan lokal boleh menyalakan.
  passwordLogin: env.PASSWORD_LOGIN === '1',
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
