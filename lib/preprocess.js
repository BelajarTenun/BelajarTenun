// Pra-proses video dengan ffmpeg/ffprobe (harus terpasang di komputer/server pemroses).
// Hasil per sumber: video.mp4 (480p), audio.wav (16 kHz mono), keyframes/kf-<detik>.jpg (tiap 2 dtk, buang yang buram),
// chunks (pembagian 10 menit untuk analisis), scenes (pergantian adegan).
import { spawn } from 'node:child_process';
import { readdir, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { store } from './store.js';

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { err += d; if (err.length > 2e6) err = err.slice(-1e6); });
  p.on('error', (e) => reject(Object.assign(new Error(`${cmd} tidak bisa dijalankan: ${e.message}. Pasang ffmpeg.`), { code: 501 })));
  p.on('close', (code) => (code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} gagal (${code}): ${err.slice(-400)}`))));
});

export async function probe(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  return { durationSec: Number(j.format.duration) || 0, width: v?.width, height: v?.height, hasAudio: j.streams.some((s) => s.codec_type === 'audio') };
}

/** Ketajaman sederhana dari JPEG kecil (varians gradien) memakai ffmpeg → gray raw. */
async function sharpness(file) {
  const { out } = await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=96:-1,format=gray', '-f', 'rawvideo', '-']);
    const chunks = [];
    p.stdout.on('data', (d) => chunks.push(d));
    p.on('error', reject);
    p.on('close', () => resolve({ out: Buffer.concat(chunks) }));
  });
  if (out.length < 200) return 0;
  const w = 96, h = Math.floor(out.length / w);
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = out[i - 1] + out[i + 1] + out[i - w] + out[i + w] - 4 * out[i];
    n++; const d = lap - mean; mean += d / n; m2 += d * (lap - mean);
  }
  return n > 1 ? m2 / (n - 1) : 0;
}

export const CHUNK_SEC = 600;

export async function preprocessSource(source, { keyframeEvery = 2, minSharpness = 25, onProgress } = {}) {
  const dir = store.path(`sources/${source.id}`);
  const input = join(dir, source.original);
  const info = await probe(input);
  onProgress?.('normalisasi video');
  await run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-vf', 'scale=-2:min(480\\,ih)', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', join(dir, 'video.mp4')]);
  if (info.hasAudio) {
    onProgress?.('ekstrak audio');
    await run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-vn', '-ac', '1', '-ar', '16000', join(dir, 'audio.wav')]);
  }
  onProgress?.('keyframe');
  const kfDir = join(dir, 'keyframes');
  await rm(kfDir, { recursive: true, force: true }); await mkdir(kfDir, { recursive: true });
  await run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-vf', `fps=1/${keyframeEvery},scale=640:-2`, '-q:v', '4', join(kfDir, 'raw-%05d.jpg')]);
  const keyframes = [];
  for (const f of (await readdir(kfDir)).sort()) {
    const t = (Number(f.match(/(\d+)/)[1]) - 1) * keyframeEvery;
    const s = await sharpness(join(kfDir, f));
    const name = `kf-${String(t).padStart(5, '0')}.jpg`;
    if (s < minSharpness) { await rm(join(kfDir, f)); continue; }
    await store.writeFile(`sources/${source.id}/keyframes/${name}`, await readFile(join(kfDir, f)));
    await rm(join(kfDir, f));
    keyframes.push({ t, file: name, sharpness: Math.round(s) });
  }
  onProgress?.('deteksi adegan');
  const { err } = await run('ffmpeg', ['-v', 'info', '-i', input, '-vf', "select='gt(scene,0.35)',showinfo", '-f', 'null', '-']).catch(() => ({ err: '' }));
  const scenes = [...err.matchAll(/pts_time:([\d.]+)/g)].map((m) => +Number(m[1]).toFixed(1));
  const chunks = [];
  for (let s = 0; s < info.durationSec; s += CHUNK_SEC) chunks.push({ start: s, end: Math.min(info.durationSec, s + CHUNK_SEC) });
  return { ...info, keyframes, scenes, chunks, files: ['video.mp4', ...(info.hasAudio ? ['audio.wav'] : [])] };
}

/** Potong segmen video (untuk unggah per bagian ke Gemini atau klip demo). */
export async function cutSegment(sourceId, start, end, outName) {
  const dir = store.path(`sources/${sourceId}`);
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', String(start), '-to', String(end), '-i', join(dir, 'video.mp4'), '-c', 'copy', join(dir, outName)]);
  return outName;
}
