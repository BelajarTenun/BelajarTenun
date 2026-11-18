// node stills.mjs <id> <frame,frame,...> <outprefix>  → beberapa frame PNG kecil + lembar gabungan
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const [id, frames, out] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const composition = await selectComposition({ serveUrl, id });
for (const fr of frames.split(',').map(Number)) {
  await renderStill({ composition, serveUrl, frame: fr, output: `${out}-${String(fr).padStart(5, '0')}.png`, scale: 0.33 });
}
console.log('ok');
