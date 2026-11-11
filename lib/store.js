// Penyimpanan berbasis folder (DATA_DIR). Lokal: ./data. Produksi: bucket Cloud Storage yang
// di-mount sebagai volume Cloud Run (lihat docs/DEPLOY.md), jadi kode tidak perlu SDK cloud.
import { readFile, writeFile, appendFile, mkdir, readdir, rm, rename, cp, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { config } from './config.js';

const safe = (p) => {
  const n = normalize(p).replace(/^([/\\])+/, '');
  if (n.startsWith('..')) throw Object.assign(new Error('Path tidak valid'), { code: 400 });
  return join(config.dataDir, n);
};

export const store = {
  path: safe,
  async readJson(p, fallback) {
    try { return JSON.parse(await readFile(safe(p), 'utf8')); } catch (e) { if (fallback !== undefined) return fallback; throw e; }
  },
  async writeJson(p, data) {
    const f = safe(p);
    await mkdir(dirname(f), { recursive: true });
    const tmp = `${f}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`; // tulis atomik
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
    await rename(tmp, f);
  },
  async writeFile(p, buf) { const f = safe(p); await mkdir(dirname(f), { recursive: true }); await writeFile(f, buf); },
  readFile: (p) => readFile(safe(p)),
  async append(p, line) { const f = safe(p); await mkdir(dirname(f), { recursive: true }); await appendFile(f, line); },
  async readLines(p) { return (await readFile(safe(p), 'utf8').catch(() => '')).split('\n').filter(Boolean); },
  list: (p) => readdir(safe(p)).catch(() => []),
  remove: (p) => rm(safe(p), { recursive: true, force: true }),
  exists: (p) => stat(safe(p)).then(() => true, () => false),
};

/** Salin data awal (kurikulum, knowledge) ke DATA_DIR bila belum ada. */
export async function seedDataDir() {
  if (normalize(config.dataDir) === normalize(config.seedDir)) return;
  for (const item of ['modules', 'knowledge.json', 'taxonomy.json']) {
    if (!(await store.exists(item))) await cp(join(config.seedDir, item), safe(item), { recursive: true });
  }
}

/** Hapus log yang lebih tua dari RETENTION_DAYS (privasi). */
export async function applyRetention(now = Date.now()) {
  const cutoff = now - config.retentionDays * 86400000;
  for (const file of ['logs/sessions.jsonl', 'logs/unanswered.jsonl', 'logs/ai-usage.jsonl']) {
    const lines = await store.readLines(file);
    const keep = lines.filter((l) => { try { return Date.parse(JSON.parse(l).at) >= cutoff; } catch { return false; } });
    if (keep.length !== lines.length) await store.writeFile(file, keep.map((l) => l + '\n').join(''));
  }
}
