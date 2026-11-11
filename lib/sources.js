// Sumber video tenun (internet, partner, kacamata) beserta status izinnya.
// Status izin menentukan ke mana data boleh mengalir (analisis, demo, latih model, arsip publik).
import { createHash, randomUUID } from 'node:crypto';
import { store } from './store.js';

const fail = (code, message) => Object.assign(new Error(message), { code });

export const LICENSES = {
  riset_internal: 'Video internet tanpa izin: hanya untuk analisis & draf kurikulum internal',
  cc_by: 'Lisensi terbuka (mis. Creative Commons) dengan atribusi',
  izin_tertulis: 'Ada izin tertulis dari pembuat video / penenun',
  milik_sendiri: 'Rekaman sendiri (mis. kacamata BelajarTenun)',
};

/** Matriks izin: pemakaian apa yang boleh untuk tiap status. */
const ALLOW = {
  analisis: ['riset_internal', 'cc_by', 'izin_tertulis', 'milik_sendiri'],
  demo: ['cc_by', 'izin_tertulis', 'milik_sendiri'],
  latih_model: ['cc_by', 'izin_tertulis', 'milik_sendiri'],
  arsip_video: ['cc_by', 'izin_tertulis', 'milik_sendiri'],
};
export const allows = (source, use) => Boolean(source && ALLOW[use]?.includes(source.license?.status));

const idOk = (id) => /^[\w-]+$/.test(id || '');
const clean = (v, n = 200) => (v == null ? null : String(v).trim().slice(0, n) || null);

export function normalizeMeta(body, existing = {}) {
  const status = body.license?.status ?? existing.license?.status;
  if (!LICENSES[status]) throw fail(400, 'Pilih status izin video');
  const tradition = clean(body.tradition ?? existing.tradition, 100);
  if (!tradition) throw fail(400, 'Tradisi tenun wajib diisi (mis. "Tenun ikat Sikka")');
  const url = clean(body.url ?? existing.url, 500);
  if (url && !/^https?:\/\//.test(url)) throw fail(400, 'URL harus diawali http(s)://');
  return {
    kind: ['internet', 'partner', 'kacamata'].includes(body.kind) ? body.kind : existing.kind ?? 'internet',
    url, title: clean(body.title ?? existing.title, 200), channel: clean(body.channel ?? existing.channel, 120),
    tradition, region: clean(body.region ?? existing.region, 100), loomType: clean(body.loomType ?? existing.loomType, 60),
    technique: clean(body.technique ?? existing.technique, 60), language: clean(body.language ?? existing.language, 30),
    viewpoint: ['exo', 'ego', 'campuran'].includes(body.viewpoint) ? body.viewpoint : existing.viewpoint ?? 'exo',
    license: { status, proof: clean(body.license?.proof ?? existing.license?.proof, 300), note: clean(body.license?.note ?? existing.license?.note, 500) },
    notes: clean(body.notes ?? existing.notes, 1000),
  };
}

export async function listSources() {
  const out = [];
  for (const d of await store.list('sources')) {
    const m = await store.readJson(`sources/${d}/meta.json`, null);
    if (m) out.push(m);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSource(id) {
  if (!idOk(id)) throw fail(400, 'ID tidak valid');
  const m = await store.readJson(`sources/${id}/meta.json`, null);
  if (!m) throw fail(404, 'Sumber tidak ditemukan');
  return m;
}
export const saveSource = (m) => store.writeJson(`sources/${m.id}/meta.json`, { ...m, updatedAt: new Date().toISOString() });

export async function createSource(body, user) {
  const meta = normalizeMeta(body);
  const slug = meta.tradition.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'tenun';
  const m = { id: `${slug}-${randomUUID().slice(0, 8)}`, ...meta, createdAt: new Date().toISOString(), createdBy: user?.name ?? null, files: [], sha256: null, status: 'baru', durationSec: null };
  await saveSource(m);
  return m;
}

export async function updateSource(id, body) {
  const m = await getSource(id);
  const updated = { ...m, ...normalizeMeta(body, m) };
  await saveSource(updated);
  return updated;
}

/** Simpan berkas video asli; tolak duplikat (hash sama dengan sumber lain). */
export async function attachVideo(id, buf, ext) {
  if (!/^(mp4|webm|mov|mkv)$/.test(ext)) throw fail(400, 'Format video harus mp4/webm/mov/mkv');
  const m = await getSource(id);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const dup = (await listSources()).find((s) => s.sha256 === sha256 && s.id !== id);
  if (dup) throw fail(409, `Video ini sudah ada sebagai sumber ${dup.id}`);
  const name = `original.${ext}`;
  await store.writeFile(`sources/${id}/${name}`, buf);
  m.files = [...new Set([...(m.files || []), name])];
  m.sha256 = sha256; m.status = 'diunggah'; m.original = name;
  await saveSource(m);
  return m;
}

export async function removeSource(id) {
  await getSource(id);
  await store.remove(`sources/${id}`);
  await store.remove(`analyses/${id}.json`);
}

/** Versi streaming (untuk video besar): tulis langsung ke disk sambil menghitung hash. */
export async function attachVideoStream(id, stream, ext, maxBytes = 4e9) {
  if (!/^(mp4|webm|mov|mkv)$/.test(ext)) throw fail(400, 'Format video harus mp4/webm/mov/mkv');
  const m = await getSource(id);
  const { createWriteStream } = await import('node:fs');
  const { mkdir, rename, rm } = await import('node:fs/promises');
  const dir = store.path(`sources/${id}`);
  await mkdir(dir, { recursive: true });
  const tmp = `${dir}/upload.tmp`;
  const hash = createHash('sha256');
  let size = 0;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmp);
    stream.on('data', (c) => { size += c.length; if (size > maxBytes) { stream.destroy(); reject(fail(413, 'Video terlalu besar')); } hash.update(c); });
    stream.on('error', reject); out.on('error', reject); out.on('finish', resolve);
    stream.pipe(out);
  }).catch(async (e) => { await rm(tmp, { force: true }); throw e; });
  const sha256 = hash.digest('hex');
  const dup = (await listSources()).find((s) => s.sha256 === sha256 && s.id !== id);
  if (dup) { await rm(tmp, { force: true }); throw fail(409, `Video ini sudah ada sebagai sumber ${dup.id}`); }
  const name = `original.${ext}`;
  await rename(tmp, `${dir}/${name}`);
  Object.assign(m, { files: [...new Set([...(m.files || []), name])], sha256, status: 'diunggah', original: name, sizeBytes: size });
  await saveSource(m);
  return m;
}
