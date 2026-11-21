// Render panjang dalam potongan agar tidak kehabisan memori, lalu gabung.
// node render-chunks.mjs <id> <out.mp4> [detikPerPotongan]
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [id, out, secs = '40'] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const composition = await selectComposition({ serveUrl, id });
const step = Number(secs) * composition.fps;
const dir = `out/chunks-${id}`; fs.mkdirSync(dir, { recursive: true });
const parts = [];
for (let a = 0, k = 0; a < composition.durationInFrames; a += step, k++) {
  const b = Math.min(composition.durationInFrames - 1, a + step - 1);
  const file = `${dir}/p${String(k).padStart(2, '0')}.mp4`;
  if (!fs.existsSync(file)) {
    await renderMedia({ composition, serveUrl, codec: 'h264', crf: 20, frameRange: [a, b], outputLocation: file, concurrency: 3, offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024 });
  }
  parts.push(file); console.log('✓', file);
}
fs.writeFileSync(`${dir}/list.txt`, parts.map((p) => `file '${path.resolve(p)}'`).join('\n'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-c', 'copy', out]);
console.log('selesai', out);
