import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const [id, outp, scale] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const composition = await selectComposition({ serveUrl, id });
await renderMedia({ composition, serveUrl, codec: 'h264', crf: 20, scale: Number(scale || 1), outputLocation: outp });
console.log('done');
