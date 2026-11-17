// Cek koneksi menyeluruh untuk admin: konfigurasi, AI (teks, gambar, embeddings), LiveKit, TTS, login Google, penyimpanan.
// Setiap cek berdiri sendiri, dibatasi waktunya, dan melaporkan ok / gagal / dilewati beserta alasannya.
import { deflateSync } from 'node:zlib';
import { config } from './config.js';
import { store } from './store.js';
import { aiEnabled, isVertex, generate, embed, tts } from './ai.js';
import { getAccessToken } from './google-auth.js';
import { livekitEnabled } from './livekit.js';
import { googleLoginEnabled } from './google-login.js';

const skip = (why) => { throw Object.assign(new Error(why), { skip: true }); };

async function run(name, fn, timeoutMs = 25000) {
  const t0 = Date.now();
  try {
    const detail = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error(`tidak menjawab dalam ${timeoutMs / 1000} dtk`)), timeoutMs))]);
    return { name, status: 'ok', ms: Date.now() - t0, detail: String(detail ?? '') };
  } catch (e) {
    return { name, status: e.skip ? 'skip' : 'gagal', ms: Date.now() - t0, detail: String(e.message).slice(0, 300) };
  }
}

/** Gambar PNG kecil (kotak bergaris) untuk menguji Gemini membaca gambar. */
function testPng(w = 32, h = 32) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; const on = x % 8 < 4; raw[o] = on ? 212 : 20; raw[o + 1] = on ? 184 : 28; raw[o + 2] = on ? 102 : 58; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}

export async function runDiagnostics() {
  const checks = [];
  checks.push(await run('Konfigurasi keamanan', async () => {
    const issues = [];
    if (config.authDisabled) issues.push('AUTH_DISABLED=1 (semua orang dianggap admin!)');
    if (config.authSecretIsRandom) issues.push('AUTH_SECRET kosong (sesi hilang tiap restart)');
    if (!config.publicUrl) issues.push('PUBLIC_URL/DOMAIN kosong');
    if (issues.length) throw new Error(issues.join('; '));
    return `alamat publik ${config.publicUrl}${config.passwordLogin ? ' · login kata sandi AKTIF' : ' · hanya login Google'}`;
  }));
  checks.push(await run('Penyimpanan data', async () => {
    const f = `logs/diag-${Date.now()}.txt`;
    await store.writeFile(f, 'ok'); const back = (await store.readFile(f)).toString(); await store.remove?.(f);
    if (back !== 'ok') throw new Error('isi berkas tidak cocok');
    return `bisa tulis & baca di ${config.dataDir}`;
  }));
  checks.push(await run('Kredensial Google Cloud (Vertex)', async () => {
    if (!isVertex()) skip('AI_PROVIDER bukan vertex');
    await getAccessToken();
    return `project ${config.vertexProject}, region ${config.vertexLocation}`;
  }));
  checks.push(await run('AI: menjawab teks', async () => {
    if (!aiEnabled()) skip('AI belum dikonfigurasi');
    const out = await generate([{ text: 'Balas hanya dengan satu kata: siap' }], { kind: 'diagnostik' });
    return `${config.aiProvider}/${config.geminiModel} menjawab "${out.trim().slice(0, 40)}"`;
  }));
  checks.push(await run('AI: membaca gambar (cek tahap)', async () => {
    if (!aiEnabled()) skip('AI belum dikonfigurasi');
    const out = await generate([{ text: 'Gambar ini berisi garis-garis tegak. Sebutkan dua warna utamanya dalam bahasa Indonesia, singkat.' }, { inline_data: { mime_type: 'image/png', data: testPng() } }], { kind: 'diagnostik' });
    return `jawaban: "${out.trim().slice(0, 80)}"`;
  }));
  checks.push(await run('AI: embeddings (tanya jawab berbasis makna)', async () => {
    if (!aiEnabled()) skip('AI belum dikonfigurasi');
    const [v] = await embed(['benang lungsi dan pakan'], 'RETRIEVAL_QUERY');
    return `${config.embedModel}, vektor ${v.length} dimensi`;
  }));
  checks.push(await run('LiveKit (suara realtime)', async () => {
    if (!livekitEnabled()) skip('LIVEKIT_URL / kunci belum diisi');
    const url = config.livekitUrl.replace(/^ws/, 'http');
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} menjawab ${r.status}`);
    return `server ${url} hidup · alamat untuk HP ${config.livekitPublicUrl}`;
  }, 8000));
  checks.push(await run('Agen Gemini Live', async () => {
    if (!livekitEnabled()) skip('butuh LiveKit');
    if (!config.agentToken) throw new Error('AGENT_TOKEN kosong: agen tidak bisa mengambil konfigurasi sesi');
    const last = (await store.readLines('logs/sessions.jsonl').catch(() => [])).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.type === 'live_start' && e.engine === 'livekit');
    return last ? `sesi Live terakhir via agen: ${last.at || last.ts || 'tercatat'}` : 'AGENT_TOKEN ada; belum ada sesi Live tercatat (uji dari halaman praktik)';
  }));
  checks.push(await run('Login Google', async () => {
    if (!googleLoginEnabled()) throw new Error('GOOGLE_OAUTH_CLIENT_ID / SECRET kosong');
    return `redirect URI yang harus terdaftar: ${(config.publicUrl || '').replace(/\/$/, '')}/api/auth/google/callback`;
  }));
  checks.push(await run('Suara Google TTS (opsional)', async () => {
    if (!config.ttsKey) skip('GOOGLE_TTS_API_KEY kosong; aplikasi memakai suara browser');
    const a = await tts('Halo');
    return `audio ${Math.round(a.length * 0.75 / 1024)} KB`;
  }));
  return { at: new Date().toISOString(), ok: checks.every((c) => c.status !== 'gagal'), checks };
}
