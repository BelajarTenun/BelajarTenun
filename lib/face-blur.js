// Blur wajah sebelum gambar masuk dataset (rencana 3.2, UU PDP): deteksi wajah dengan Cloud Vision API
// (images:annotate FACE_DETECTION, kredensial service account yang sama), lalu blur kotak wajah dengan ffmpeg.
// Kotak diperbesar 25% supaya rambut/telinga ikut tertutup.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getAccessToken } from './google-auth.js';

/** → [{x,y,w,h}] dalam piksel. */
export async function detectFaces(jpeg, { fetchImpl = fetch, token = getAccessToken } = {}) {
  const r = await fetchImpl('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: Buffer.from(jpeg).toString('base64') }, features: [{ type: 'FACE_DETECTION', maxResults: 20 }] }] }),
  });
  if (!r.ok) throw new Error(`Vision API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const faces = (await r.json()).responses?.[0]?.faceAnnotations ?? [];
  return faces.map((f) => {
    const v = (f.boundingPoly?.vertices ?? []).map((p) => ({ x: p.x ?? 0, y: p.y ?? 0 }));
    const xs = v.map((p) => p.x), ys = v.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }).filter((b) => b.w > 0 && b.h > 0);
}

const run = (args) => new Promise((res, rej) => execFile('ffmpeg', args, (e, _o, err) => (e ? rej(new Error(String(err).slice(-300))) : res())));

/** Blur kotak-kotak pada JPEG; mengembalikan JPEG baru (tanpa wajah = gambar asli). */
export async function blurBoxes(jpeg, boxes, { pad = 0.25 } = {}) {
  if (!boxes.length) return jpeg;
  const dir = await mkdtemp(join(tmpdir(), 'bt-blur-'));
  try {
    await writeFile(join(dir, 'in.jpg'), jpeg);
    const chains = [];
    let last = '0:v';
    boxes.forEach((b, i) => {
      const px = Math.round(b.w * pad), py = Math.round(b.h * pad);
      const x = Math.max(0, b.x - px), y = Math.max(0, b.y - py), w = b.w + 2 * px, h = b.h + 2 * py;
      // crop dibatasi ke ukuran gambar oleh ffmpeg (min(...)), blur kuat, lalu ditempel kembali.
      chains.push(`[0:v]crop=min(${w}\\,iw-${x}):min(${h}\\,ih-${y}):${x}:${y},boxblur=20:5[f${i}]`, `[${last}][f${i}]overlay=${x}:${y}[o${i}]`);
      last = `o${i}`;
    });
    await run(['-v', 'error', '-y', '-i', join(dir, 'in.jpg'), '-filter_complex', chains.join(';'), '-map', `[${last}]`, '-q:v', '3', join(dir, 'out.jpg')]);
    return await readFile(join(dir, 'out.jpg'));
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export async function blurFaces(jpeg, deps = {}) {
  const boxes = await detectFaces(jpeg, deps);
  return { jpeg: await blurBoxes(jpeg, boxes), faces: boxes.length };
}
