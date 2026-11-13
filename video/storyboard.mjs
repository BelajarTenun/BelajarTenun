// Render 3 frame kunci per adegan untuk storyboard → out/sb/<id>-<n>.jpg
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
export const SB = [
  ['01', 'A01-teks-tangan-andrew-preview'], ['02', 'A02-masalah'], ['03', 'SB03-andrew-kacamata-andrew-preview'],
  ['04', 'A04-logo'], ['05', 'A05-grid-open-source-andrew-preview'], ['06', 'A06-computer-vision'], ['07', 'A07-validasi'],
  ['08', 'A08-mulai'], ['09', 'A09-tahap'], ['10', 'A10-kosakata'], ['11', 'A11-koreksi'],
  ['12', 'SB12-wajah-tanya-andrew-preview'], ['13', 'SB13-wajah-luar-modul-andrew-preview'], ['14', 'A14-pendamping'],
  ['15', 'SB15-andrew-akses-andrew-preview'], ['16', 'A16-catatan'], ['17', 'A17-progres'], ['19', 'A19-arsip'],
];
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
fs.mkdirSync('out/sb', { recursive: true });
for (const [, id] of SB) {
  const composition = await selectComposition({ serveUrl, id });
  for (const [n, r] of [[1, 0.2], [2, 0.55], [3, 0.92]]) {
    await renderStill({ composition, serveUrl, output: `out/sb/${id}-${n}.jpeg`, imageFormat: 'jpeg', jpegQuality: 80, frame: Math.floor(composition.durationInFrames * r), scale: 0.5 });
  }
  console.log('✓', id);
}
