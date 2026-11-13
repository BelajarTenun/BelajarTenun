// Render animatic utuh: node render-full.mjs [skala, default 0.5]
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const scale = Number(process.argv[2] || 0.5);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const composition = await selectComposition({ serveUrl, id: 'FULL-animatic' });
let last = -1;
await renderMedia({ composition, serveUrl, codec: 'h264', scale, crf: 26, outputLocation: 'out/FULL-animatic.mp4',
  onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log(`${p * 5}%`); } } });
console.log('selesai');
