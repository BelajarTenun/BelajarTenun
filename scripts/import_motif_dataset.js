// Impor dataset motif tenun (mis. "East Nusa Tenggara Traditional Textile Motif" di Mendeley) ke knowledge base
// sebagai entri DRAFT dengan atribusi dataset. Periksa lisensi dataset sebelum memakai!
//   node scripts/import_motif_dataset.js motif.csv --dataset "Nama dataset" --license "CC BY 4.0" --url https://…
// Kolom CSV yang dikenali (huruf besar/kecil bebas): motif|nama_motif|motif_name, kategori|category,
//   provinsi|province|daerah|region, makna|meaning|philosophy|filosofi, teknik|technique
import { readFile } from 'node:fs/promises';
import { parseCsv } from './import_sources.js';
import { loadKnowledge, saveKnowledge } from '../lib/knowledge.js';

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? null : process.argv[i + 1]; };
const pick = (row, keys) => { for (const [k, v] of Object.entries(row)) if (keys.includes(k.toLowerCase().trim()) && v) return v; return null; };

export function motifEntries(rows, { dataset, license, url }) {
  const out = new Map();
  for (const r of rows) {
    const name = pick(r, ['motif', 'nama_motif', 'motif_name', 'nama motif']);
    const meaning = pick(r, ['makna', 'meaning', 'philosophy', 'filosofi', 'philosophical meaning']);
    if (!name || !meaning) continue;
    const region = pick(r, ['provinsi', 'province', 'daerah', 'region']);
    const technique = pick(r, ['teknik', 'technique']);
    const id = `motif-${name}-${region ?? ''}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').slice(0, 60);
    out.set(id, {
      id, status: 'draft', topic: 'motif', module: null,
      question: `Apa makna motif ${name}${region ? ` dari ${region}` : ''}?`,
      answer: `${meaning}${technique ? ` (teknik: ${technique})` : ''}`,
      keywords: [name.toLowerCase(), 'motif', 'makna', ...(region ? [region.toLowerCase()] : [])],
      source: `Dataset: ${dataset}${license ? ` (${license})` : ''}${url ? ` – ${url}` : ''}`, validated_by: null,
    });
  }
  return [...out.values()];
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  const dataset = arg('dataset');
  if (!file || !dataset) { console.error('Pemakaian: node scripts/import_motif_dataset.js motif.csv --dataset "Nama" --license "…" --url https://…'); process.exit(1); }
  const entries = motifEntries(parseCsv(await readFile(file, 'utf8')), { dataset, license: arg('license'), url: arg('url') });
  const kb = await loadKnowledge();
  const fresh = entries.filter((e) => !kb.entries.some((x) => x.id === e.id));
  kb.entries.push(...fresh);
  await saveKnowledge(kb);
  console.log(`${fresh.length} entri motif ditambahkan sebagai DRAFT (wajib divalidasi penenun sebelum dipakai tutor).`);
}
