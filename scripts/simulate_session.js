// Simulasi sesi Live ujung ke ujung (rencana bagian 7.2).
// Rekaman ego (video) + audio murid diputar sebagai kamera & mic palsu Chrome ke aplikasi SUNGGUHAN
// (React → LiveKit → agen → Gemini Live), lalu event sesi dinilai terhadap label emas waktu tahap.
//
//   node scripts/simulate_session.js --url https://belajartenun.com --token $AGENT_TOKEN \
//        --case data/eval/sim/contoh.json [--headed]
//
// Berkas kasus (JSON):
//   { "module": "tidore-dasar", "video": "rekaman.mp4", "audio": "murid.wav" (opsional),
//     "offset": 0, "steps": [{ "end": 42.0 }, ...] }   // detik selesai tiap tahap pada video (label penenun)
// Video/audio relatif terhadap berkas kasus. Butuh ffmpeg (konversi ke y4m/wav) dan Playwright + Chromium.
// Hasil: logs/eval/<waktu>-sim.json (+ ringkasan di konsol). Kode keluar 1 bila gerbang rilis gagal.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { scoreSession, gate } from '../lib/sim-score.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const url = (arg('url', 'http://localhost:3000')).replace(/\/$/, '');
const token = arg('token', process.env.AGENT_TOKEN);
const casePaths = process.argv.flatMap((a, i) => (process.argv[i - 1] === '--case' ? [a] : []));
if (!token || !casePaths.length) { console.error('Pakai: --url URL --token AGENT_TOKEN --case kasus.json [--case ...]'); process.exit(2); }

// require (bukan import) supaya Playwright yang terpasang global juga ditemukan.
const { chromium } = createRequire(import.meta.url)('playwright');
const results = [];
for (const casePath of casePaths) {
  const c = JSON.parse(readFileSync(casePath, 'utf8'));
  const base = dirname(resolve(casePath));
  const tmp = mkdtempSync(join(tmpdir(), 'bt-sim-'));
  // Chrome hanya menerima y4m (video) & wav (audio) sebagai perangkat palsu.
  const y4m = join(tmp, 'cam.y4m');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(base, c.video), '-vf', 'scale=640:-2,fps=15', '-pix_fmt', 'yuv420p', y4m]);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(base, c.video)]).toString().trim());
  let wav = join(tmp, 'mic.wav');
  if (c.audio) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(base, c.audio), '-ar', '48000', '-ac', '1', wav]);
  else execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono`, '-t', String(Math.ceil(dur)), wav]);

  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`, `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  // Login sebagai murid simulasi (cookie dari server, tanpa Google).
  const login = await ctx.request.post(`${url}/api/admin/sim-login`, { headers: { 'x-agent-token': token } });
  if (!login.ok()) throw new Error(`sim-login gagal: ${login.status()}`);
  let sessionId = null;
  page.on('response', async (r) => { if (r.url().endsWith('/api/session/start')) sessionId = (await r.json().catch(() => ({}))).sessionId ?? sessionId; });

  await page.goto(`${url}/belajar/${c.module}/siapkan`);
  // Di desktop dengan LiveKit, Siapkan menampilkan QR pasangan HP; simulasi memakai "webcam" palsu Chrome.
  const webcam = page.getByText('Pakai webcam laptop saja'), nyalakan = page.getByRole('button', { name: /Nyalakan kamera/ });
  await webcam.or(nyalakan).first().waitFor({ timeout: 20000 });
  if (await webcam.isVisible()) await webcam.click();
  await page.getByRole('button', { name: /Nyalakan kamera/ }).click();
  await page.getByRole('button', { name: /Mulai latihan|Lanjutkan latihan/ }).click();
  await page.waitForSelector('.lv-live.aktif', { timeout: 30000 }).catch(() => console.warn('Live belum aktif dalam 30 dtk; sesi tetap dinilai'));
  // Biarkan rekaman berjalan sampai habis (+ jeda agar tutor sempat bereaksi pada tahap terakhir).
  await page.waitForTimeout((dur + (c.tail ?? 15)) * 1000);
  await page.getByRole('button', { name: 'Akhiri sesi' }).click().catch(() => {});
  await page.waitForTimeout(2000);
  await browser.close();

  if (!sessionId) throw new Error('sessionId tidak tertangkap (sesi tidak dimulai?)');
  const ev = await (await fetch(`${url}/api/admin/session-events?sessionId=${sessionId}`, { headers: { 'x-agent-token': token } })).json();
  const score = scoreSession(ev.events, c);
  results.push({ case: casePath, sessionId, durationSec: dur, score });
  console.log(`\n${casePath}  sesi ${sessionId}`);
  for (const r of score.steps) console.log(`  tahap ${r.step + 1}: ${r.verdict}${r.delta != null ? ` (${r.delta > 0 ? '+' : ''}${r.delta} dtk, ${r.source}${r.source === 'vision' && !r.verifiedByCheck ? ', TANPA cek kamera' : ''})` : ''}`);
  console.log(`  bicara/menit ${score.talkPerMin} · search_knowledge ${score.cultureCalls}`);
}

const g = gate(results.map((r) => r.score));
console.log(`\nGerbang: tepat waktu ${(g.onTime * 100).toFixed(0)}% · terlalu cepat ${(g.premature * 100).toFixed(0)}% · maju tanpa cek ${g.unverified} → ${g.pass ? 'LULUS' : 'GAGAL'}`);
mkdirSync('logs/eval', { recursive: true });
writeFileSync(`logs/eval/${new Date().toISOString().replace(/[:.]/g, '-')}-sim.json`, JSON.stringify({ url, gate: g, results }, null, 2));
process.exit(g.pass ? 0 : 1);
