// Backup DATA_DIR (pengguna, modul, sesi, anotasi, rekaman) ke Cloud Storage sebagai arsip .tar.gz bertanggal.
//   node scripts/backup_gcs.js            sekali
//   node scripts/backup_gcs.js --loop     tiap BACKUP_INTERVAL_H jam (bawaan 24), dipakai layanan "backup" di docker compose
// Butuh BACKUP_GCS_BUCKET dan service account dengan peran Storage Object Creator pada bucket itu.
// Retensi diatur dengan lifecycle rule di bucket (mis. hapus setelah 30 hari), bukan oleh skrip ini.
// Pulihkan:  gsutil cp gs://<bucket>/backup/<berkas>.tar.gz . && tar -xzf <berkas>.tar.gz -C <DATA_DIR>
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { config } from '../lib/config.js';
import { getAccessToken } from '../lib/google-auth.js';

const bucket = process.env.BACKUP_GCS_BUCKET;
const intervalH = Number(process.env.BACKUP_INTERVAL_H || 24);

export async function backupOnce({ dataDir = config.dataDir, fetchImpl = fetch, token = getAccessToken } = {}) {
  if (!bucket) throw new Error('BACKUP_GCS_BUCKET belum diisi');
  const name = `backup/belajartenun-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
  const tar = spawn('tar', ['-czf', '-', '-C', dataDir, '.'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  tar.stderr.on('data', (d) => { err += d; });
  const res = await fetchImpl(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`, {
    method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/gzip' },
    body: Readable.toWeb(tar.stdout), duplex: 'half',
  });
  const code = await new Promise((r) => tar.on('close', r));
  if (code !== 0) throw new Error(`tar gagal (${code}): ${err.slice(0, 200)}`);
  if (!res.ok) throw new Error(`unggah backup gagal: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const obj = await res.json();
  return { name, bytes: Number(obj.size), at: new Date().toISOString() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const loop = process.argv.includes('--loop');
  do {
    try { console.log('backup ok', await backupOnce()); } catch (e) { console.error('backup GAGAL:', e.message); if (!loop) process.exit(1); }
    if (loop) await new Promise((r) => setTimeout(r, intervalH * 3600 * 1000));
  } while (loop);
}
