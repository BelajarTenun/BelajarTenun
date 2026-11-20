// Impor video proses menenun berlisensi terbuka dari Wikimedia Commons ke Sumber video.
//   docker compose --env-file ../.env exec app node scripts/import_commons.js [--analyze] [--dry-run]
//
// Daftar di bawah dikurasi dari pencarian Commons (20 Nov 2026): hanya video proses menenun dengan tangan.
// Lisensi DIPERIKSA ULANG dari Commons saat impor; hanya CC BY / CC BY-SA / CC0 / domain publik yang diberi
// status "cc_by" (boleh analisis, demo dengan atribusi, latih model). Lisensi lain dilewati.
// Video ogv/mpg dikonversi ke mp4 (ffmpeg). Duplikat (hash sama) ditolak oleh lib/sources.js.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { createSource, attachVideo, listSources, removeSource } from '../lib/sources.js';
import { enqueue } from '../lib/pipeline.js';

const T = (title, tradition, region, loomType, technique, viewpoint = 'exo') => ({ title, tradition, region, loomType, technique, viewpoint });
export const KURASI = [
  T('Weefsels van Sumba Weeknummer 65-42 - Open Beelden - 17616.ogv', 'Tenun ikat Sumba', 'Sumba, NTT, Indonesia', 'arsip film 1965', 'ikat'),
  T('Weefonderricht Weeknummer 69-25 - Open Beelden - 31827.ogv', 'Pelajaran menenun (Belanda)', 'Belanda', 'alat tenun tangan', 'tenun polos'),
  T('Bäuerliche Leinenweberei - 2. Aufschlagen des Webstuhls.webm', 'Tenun linen pedesaan Jerman', 'Jerman', 'alat tenun kayu injak', 'tenun polos'),
  T('Bäuerliche Leinenweberei - 3. Aufbäumen, Anknüpfen und Schlichten der Webkette.webm', 'Tenun linen pedesaan Jerman', 'Jerman', 'alat tenun kayu injak', 'persiapan lungsi'),
  T('Bäuerliche Leinenweberei - 4. Die Herstellung von Leinwand.webm', 'Tenun linen pedesaan Jerman', 'Jerman', 'alat tenun kayu injak', 'tenun polos'),
  ...['', ' 3', ' 4', '5', ' 6', ' 7', ' 8', ' 9', ' 10'].map((n) => T(`Weaving jamdani at BSCIC Jamdani palli, Narayanganj${n}.webm`, 'Tenun jamdani', 'Narayanganj, Bangladesh', 'alat tenun tangan (ATBM)', 'tenun tambahan pakan')),
  T('Handloom Telar artesanal Webstuhl 01.ogv', 'Tenun tangan', null, 'alat tenun tangan (ATBM)', 'tenun polos'),
  T('Handloom Telar artesanal Webstuhl 02.ogv', 'Tenun tangan', null, 'alat tenun tangan (ATBM)', 'tenun polos'),
  T('Handloom Telar artesanal Webstuhl 03.ogv', 'Tenun tangan', null, 'alat tenun tangan (ATBM)', 'tenun polos'),
  T('Handloom.webm', 'Tenun tangan', null, 'alat tenun tangan (ATBM)', 'tenun polos'),
  ...['1804', '1806', '1811', '1822'].map((n) => T(`Weaving Tant Saree by Handloom - 2 Natun Phulia - Nadia 2016-11-12 ${n}.webm`, 'Tenun tant (sari)', 'Nadia, Benggala Barat, India', 'alat tenun tangan (ATBM)', 'tenun polos')),
  T('Making handwoven DHAKA fabric in Nepal • ढाका.webm', 'Tenun dhaka', 'Nepal', 'alat tenun tangan', 'tenun motif'),
  T('Pattu weaving in Kullu district, Himachal Pradesh.webm', 'Tenun pattu', 'Kullu, India', 'alat tenun tangan', 'tenun motif'),
  T('Silk weaving in Thailand.webm', 'Tenun sutra Thailand', 'Thailand', 'alat tenun tangan', 'tenun sutra'),
  T('Organizando los hilos.ogv', 'Tenun tradisional Amerika Latin', null, 'alat tenun tangan', 'persiapan lungsi'),
  T('TexFestivalActopan045.webm', 'Tenun tradisional Meksiko', 'Actopan, Meksiko', 'alat tenun tangan', 'tenun'),
  T('The Art of Ewe Kente.webm', 'Tenun kente Ewe', 'Ghana', 'alat tenun pita sempit', 'kente'),
  ...['01', '02', '03', '04', '05', '06', '10'].map((n) => T(`Kente weaving ${n}.webm`, 'Tenun kente', 'Ghana', 'alat tenun pita sempit', 'kente')),
  T('Narrow shuttle loom.webm', 'Tenun pita', null, 'alat tenun pita sempit', 'tenun polos'),
];

const UA = { 'User-Agent': 'WeavingEducationImporter/1.0 (open-licensed weaving videos for education)' };
const OPEN = (lic) => /^(CC BY(-SA)? \d|CC0|Public domain)/i.test(lic || '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 1e7 }, (e, _o, err) => (e ? rej(new Error(String(err).slice(-300))) : res())));

async function commonsInfo(titles) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist|Credit', titles: titles.map((t) => `File:${t}`).join('|') })}`;
  for (let a = 0; a < 8; a++) {
    await sleep(3000);
    const r = await fetch(url, { headers: UA });
    if (r.status === 429) { await sleep(30000 * (a + 1)); continue; }
    if (!r.ok) throw new Error(`Commons ${r.status}`);
    return Object.values((await r.json()).query.pages);
  }
  throw new Error('Commons terus menolak (429)');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const dry = process.argv.includes('--dry-run');
  const already = new Set((await listSources()).map((s) => s.url));
  let ok = 0, skip = 0;
  for (let i = 0; i < KURASI.length; i += 10) {
    const batch = KURASI.slice(i, i + 10);
    const pages = await commonsInfo(batch.map((b) => b.title));
    for (const k of batch) {
      const p = pages.find((x) => x.title.replace(/^File:/, '') === k.title.replace(/_/g, ' '));
      const ii = p?.imageinfo?.[0], md = ii?.extmetadata ?? {};
      const lic = md.LicenseShortName?.value, artist = (md.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
      if (!ii) { console.log('✘ tidak ditemukan:', k.title); skip++; continue; }
      if (!OPEN(lic)) { console.log('✘ lisensi tidak terbuka:', lic, k.title); skip++; continue; }
      if (already.has(ii.descriptionurl)) { console.log('• sudah ada:', k.title); continue; }
      if (dry) { console.log('✓ (dry-run)', lic, k.title); ok++; continue; }
      const dir = await mkdtemp(join(tmpdir(), 'bt-commons-'));
      try {
        const ext = extname(ii.url).slice(1).toLowerCase();
        const raw = join(dir, `asli.${ext}`);
        await sleep(2000);
        const res = await fetch(ii.url, { headers: UA });
        if (!res.ok) throw new Error(`unduh ${res.status}`);
        await writeFile(raw, Buffer.from(await res.arrayBuffer()));
        let file = raw, fext = ext;
        if (!/^(mp4|webm|mov|mkv)$/.test(ext)) {
          file = join(dir, 'video.mp4'); fext = 'mp4';
          await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', file]);
        }
        const s = await createSource({
          title: k.title.replace(/\.[a-z0-9]+$/i, ''), url: ii.descriptionurl, channel: artist || 'Wikimedia Commons',
          tradition: k.tradition, region: k.region, loomType: k.loomType, technique: k.technique, viewpoint: k.viewpoint,
          license: { status: 'cc_by', proof: ii.descriptionurl, note: `${lic} · ${artist || 'lihat halaman Commons'} · via Wikimedia Commons (atribusi wajib saat ditampilkan)` },
        }, { name: 'impor Wikimedia Commons' });
        // Video gagal disimpan (mis. duplikat) → hapus lagi catatan sumbernya supaya tidak ada sumber kosong.
        try { await attachVideo(s.id, await readFile(file), fext); } catch (e) { await removeSource(s.id); throw e; }
        if (process.argv.includes('--analyze')) enqueue(s.id);
        console.log('✔', s.id, lic, k.title);
        ok++;
      } catch (e) { console.log('✘', k.title, '-', e.message); skip++; }
      finally { await rm(dir, { recursive: true, force: true }); }
    }
  }
  console.log(`\nSelesai: ${ok} diimpor, ${skip} dilewati.${process.argv.includes('--analyze') ? ' Analisis berjalan di antrean; pantau di Sumber video.' : ' Jalankan analisis dari halaman Sumber video.'}`);
}
