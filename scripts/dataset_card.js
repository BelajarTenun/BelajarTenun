// Kartu dataset (mengikuti "Datasheets for Datasets", Gebru et al. 2021) yang dibuat dari data nyata:
// komposisi per penenun/tahap/label, cakupan izin, pembagian train/val/test, dan rekaman yang izinnya dicabut.
//
//   node scripts/dataset_card.js [--module tidore-dasar]
//
// Hasil: logs/eval/<waktu>-dataset-card.md. Nama penenun tidak ditulis; diganti kode P1, P2, ….
import * as data from '../lib/data.js';
import { store } from '../lib/store.js';
import { splitFor, groupOf, datasetHash, runManifest, mdTable } from '../lib/benchmark.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? def : process.argv[i + 1] ?? true; };
const module = await data.getModule(arg('module'));
const all = (await data.listRecordings()).filter((r) => r.module === module.id);
const withdrawn = all.filter((r) => r.consent?.withdrawn).length;
const recs = all.filter((r) => !r.consent?.withdrawn);
const groups = [...new Set(recs.map(groupOf))];
const code = new Map(groups.map((g, i) => [g, `P${i + 1}`]));
const frames = recs.flatMap((r) => data.labeledFrames(r).map((f) => ({ ...f, split: splitFor(groupOf(r)), weaver: code.get(groupOf(r)) })));
const count = (xs, key) => xs.reduce((m, x) => ((m[x[key] ?? '–'] = (m[x[key] ?? '–'] || 0) + 1), m), {});
const scopes = recs.flatMap((r) => r.consent?.scopes || []);
const manifest = runManifest({ task: 'dataset-card', module: module.id, datasetHash: datasetHash(frames) });

const bySplit = count(frames, 'split'), byLabel = count(frames, 'label');
const md = [
  `# Kartu dataset: ${module.title}`, '',
  `Dibuat ${manifest.at} · sidik jari data ${manifest.datasetHash} · commit ${manifest.commit}`, '',
  '## Motivasi', 'Melatih dan mengevaluasi tutor tenun yang membimbing pemula dari kamera kacamata: mengenali tahap yang sedang dikerjakan dan kesalahan umum.', '',
  '## Komposisi',
  mdTable(['Ukuran', 'Jumlah'], [
    ['Penenun (kelompok)', groups.length], ['Rekaman aktif', recs.length], ['Rekaman yang izinnya dicabut (dikeluarkan)', withdrawn],
    ['Frame berlabel', frames.length], ['Segmen beranotasi', recs.reduce((s, r) => s + (r.segments?.length || 0), 0)],
  ]), '',
  '### Frame per tahap × label',
  mdTable(['Tahap', ...['done', 'not_yet', 'mistake']], module.steps.map((s) => [s.id, ...['done', 'not_yet', 'mistake'].map((l) => frames.filter((f) => f.stepId === s.id && f.label === l).length)])), '',
  '### Frame per penenun (anonim) dan split',
  mdTable(['Penenun', 'Split', 'Frame'], groups.map((g) => [code.get(g), splitFor(g), frames.filter((f) => f.weaver === code.get(g)).length])), '',
  `Split: train ${bySplit.train || 0} · val ${bySplit.val || 0} · test ${bySplit.test || 0} frame. Label: ${JSON.stringify(byLabel)}.`, '',
  '## Pengumpulan', 'Rekaman dari kacamata (sudut pandang penenun) dan kamera samping, direkam penenun mitra lewat halaman Rekam. Label dibuat penenun/anotator di halaman Anotasi; usulan AI selalu ditinjau manusia.', '',
  '## Izin dan etika',
  mdTable(['Cakupan izin', 'Rekaman'], Object.entries(count(scopes.map((s) => ({ s })), 's'))), '',
  '- Setiap rekaman punya persetujuan tertulis per cakupan (pembelajaran, pengembangan AI, arsip).',
  '- Rekaman tanpa cakupan "pengembangan_ai" tidak dipakai untuk melatih/menguji model.',
  '- Penenun dapat mencabut izin kapan saja; rekaman langsung dikeluarkan dari dataset.',
  '- Nama penenun tidak dimuat di kartu ini dan tidak ikut dalam ekspor dataset.', '',
  '## Pembagian & kebocoran', 'Pembagian per penenun (hash deterministik, 60/20/20). Frame dari satu penenun hanya ada di satu split, sehingga skor uji mengukur kemampuan pada penenun yang belum pernah dilihat.', '',
  '## Keterbatasan', `- ${groups.length < 5 ? 'Jumlah penenun masih sedikit: interval kepercayaan lebar dan hasil belum bisa digeneralisasi.' : 'Periksa keragaman penenun, alat, dan cahaya sebelum generalisasi.'}`,
  '- Satu tradisi/alat tenun; hasil belum berlaku untuk tradisi lain tanpa data tambahan.',
].join('\n');
const stamp = manifest.at.replace(/[:.]/g, '-');
await store.writeFile(`logs/eval/${stamp}-dataset-card.md`, md);
console.log(md);
