// Render semua (atau sebagian) komposisi ke out/.
//   npm run render                → semua
//   npm run render -- A06 A09     → hanya yang id-nya diawali A06 / A09
//   npm run render -- --still     → gambar PNG satu frame per komposisi (cepat, untuk cek)
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition, getCompositions } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const still = args.includes('--still');
const filters = args.filter((a) => !a.startsWith('--'));
const browserExecutable = process.env.REMOTION_BROWSER || (fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const comps = (await getCompositions(serveUrl, { browserExecutable })).filter((c) => !filters.length || filters.some((f) => c.id.startsWith(f)));
fs.mkdirSync('out', { recursive: true });
for (const c of comps) {
  const composition = await selectComposition({ serveUrl, id: c.id, browserExecutable });
  const alpha = c.id.endsWith('-overlay');
  if (still) {
    const frame = Math.floor(c.durationInFrames * 0.7);
    await renderStill({ composition, serveUrl, output: `out/${c.id}.png`, frame, browserExecutable });
  } else {
    await renderMedia({
      composition, serveUrl, browserExecutable,
      codec: alpha ? 'prores' : 'h264',
      proResProfile: alpha ? '4444' : undefined,
      imageFormat: alpha ? 'png' : 'jpeg',
      pixelFormat: alpha ? 'yuva444p10le' : 'yuv420p',
      outputLocation: `out/${c.id}.${alpha ? 'mov' : 'mp4'}`,
    });
  }
  console.log('✓', c.id);
}
