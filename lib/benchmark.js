// Pembagian data & catatan reproduksi untuk evaluasi.
// Data dibagi PER PENENUN (bukan per frame): frame dari penenun yang sama tidak boleh ada
// di data latih dan data uji sekaligus, karena model bisa "menghafal" tangan, alat, dan cahaya
// orang itu (kebocoran data). Pembagian deterministik dari hash, jadi sama di setiap mesin.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const h = (s) => createHash('sha256').update(String(s)).digest('hex');

/** train / val / test (default 60/20/20) berdasarkan kunci kelompok, mis. nama penenun. */
export function splitFor(groupKey, { val = 0.2, test = 0.2, salt = 'belajartenun-v1' } = {}) {
  const x = parseInt(h(`${salt}:${String(groupKey).trim().toLowerCase()}`).slice(0, 8), 16) / 0xffffffff;
  return x < test ? 'test' : x < test + val ? 'val' : 'train';
}

/** Kunci kelompok rekaman: penenun; rekaman tanpa nama penenun dianggap kelompok sendiri. */
export const groupOf = (rec) => rec.weaver || rec.consent?.name || `rekaman:${rec.id}`;

/** Sidik jari himpunan data uji: berubah bila ada frame/label yang berubah. */
export function datasetHash(items) {
  return h(items.map((i) => `${i.recording}/${i.file}:${i.stepId}:${i.label}:${i.mistakeIndex ?? ''}`).sort().join('\n')).slice(0, 16);
}

export function gitCommit() {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
}

/** Catatan yang wajib menyertai setiap angka evaluasi supaya bisa diulang. */
export function runManifest(extra = {}) {
  return { at: new Date().toISOString(), commit: gitCommit(), node: process.version, ...extra };
}

/** Tabel markdown sederhana untuk laporan. */
export function mdTable(headers, rows) {
  return [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}
export const pct = (x) => (x == null ? '–' : `${(x * 100).toFixed(1)}%`);
export const ci = (c) => (c?.value == null ? '–' : `${pct(c.value)} [${pct(c.low)}, ${pct(c.high)}]`);
