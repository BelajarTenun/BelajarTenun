// Impor massal sumber video dari CSV.
//   node scripts/import_sources.js daftar.csv [--analyze]
// Kolom CSV (baris pertama = header): path,url,title,channel,tradition,region,loomType,technique,viewpoint,license,notes
//   path     : berkas video lokal (boleh kosong bila hanya mencatat URL)
//   license  : riset_internal | cc_by | izin_tertulis | milik_sendiri
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createSource, attachVideo } from '../lib/sources.js';
import { enqueue } from '../lib/pipeline.js';

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some((x) => x !== '')) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  if (!file) { console.error('Pemakaian: node scripts/import_sources.js daftar.csv [--analyze]'); process.exit(1); }
  const rows = parseCsv(await readFile(file, 'utf8'));
  for (const r of rows) {
    try {
      const s = await createSource({ ...r, license: { status: r.license, note: r.license_note } }, { name: 'impor CSV' });
      if (r.path) { await attachVideo(s.id, await readFile(r.path), extname(r.path).slice(1).toLowerCase()); if (process.argv.includes('--analyze')) await enqueue(s.id); }
      console.log('✔', s.id, r.title || r.url || r.path);
    } catch (e) { console.log('✘', r.title || r.path || r.url, '-', e.message); }
  }
}
