// Alur video → data belajar: unit + integrasi (ffmpeg sungguhan, Gemini disimulasikan).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'bt-video-'));
process.env.DATA_DIR = dir;
process.env.GEMINI_API_KEY = '';
const { seedDataDir, store } = await import('../lib/store.js');
const sources = await import('../lib/sources.js');
const { analyzeSource, markConsistency } = await import('../lib/video-analysis.js');
const { mapTerms, loadTaxonomy, prepareSteps, cluster, canonicalOrder, mergeModule, buildCurricula } = await import('../lib/alignment.js');
const pipeline = await import('../lib/pipeline.js');
const { templateDialog, evaluateDialog, kbCandidates, generateDialogs } = await import('../lib/dialog-gen.js');
const { createSession } = await import('../lib/session.js');
const { parseCsv } = await import('../scripts/import_sources.js');
const { motifEntries } = await import('../scripts/import_motif_dataset.js');
const { pairsForModule } = await import('../lib/exo-ego.js');

const hasFfmpeg = (() => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
before(seedDataDir);
after(() => rmSync(dir, { recursive: true, force: true }));

// Analisis palsu yang meniru keluaran Gemini untuk dua tradisi.
const FAKE = {
  'Tenun ikat Sikka': [
    { title: 'Membuka mulut lungsi dengan pedang', start: 0, end: 2, actions: ['membuka mulut lungsi'], tools: ['pedang', 'lungsi'] },
    { title: 'Memasukkan pakan dengan teropong', start: 2, end: 4, actions: ['meluncurkan sekoci'], tools: ['teropong', 'pakan'] },
    { title: 'Merapatkan pakan', start: 4, end: 6, actions: ['menghentak'], tools: ['belida'] },
  ],
  'Songket Palembang': [
    { title: 'Membuka celah lungsi', start: 0, end: 2, actions: ['mengangkat lungsi'], tools: ['belida'] },
    { title: 'Mencukit motif dengan lidi', start: 2, end: 4, actions: ['mencukit'], tools: ['lidi'] },
    { title: 'Melewatkan sekoci berisi pakan', start: 4, end: 5, actions: ['memasukkan benang pakan'], tools: ['sekoci'] },
    { title: 'Menghentak pakan agar rapat', start: 5, end: 7, actions: ['merapatkan'], tools: ['pedang'] },
  ],
};
function fakeGenerate(tradition) {
  return async (parts, { schema }) => {
    const props = Object.keys(schema.properties);
    if (props.includes('segments')) return JSON.stringify({ segments: [{ start: 1, end: 2, text: 'ini pedang, kami sebut belida' }] });
    if (props.includes('goal')) return JSON.stringify({ goal: 'menenun kain', viewpoint: 'exo', loomType: 'gedogan', steps: FAKE[tradition] });
    return JSON.stringify({
      steps: FAKE[tradition].map((s, index) => ({ index, instruction: `${s.title} dengan perlahan.`, success_visual: `Terlihat hasil: ${s.title.toLowerCase()}`, tips: ['Jaga lungsi tetap tegang'], mistakes: index === 2 ? [{ mistake: 'Hentakan tidak rata', fix: 'Pegang pedang di kedua ujungnya' }] : [], narration_quotes: [], confidence: 0.9 })),
      terms: [{ term: 'belida', meaning_guess: 'pedang untuk merapatkan pakan', said_at: 1.5 }],
    });
  };
}
const fakeDeps = (tradition) => ({ generate: fakeGenerate(tradition), upload: async () => ({ uri: 'files/x', mimeType: 'video/mp4' }), readVideo: async () => Buffer.from('x') });

test('matriks izin: video internet tanpa izin tidak boleh jadi demo / latih model / arsip video', () => {
  const s = (status) => ({ license: { status } });
  assert.equal(sources.allows(s('riset_internal'), 'analisis'), true);
  for (const use of ['demo', 'latih_model', 'arsip_video']) assert.equal(sources.allows(s('riset_internal'), use), false);
  assert.equal(sources.allows(s('cc_by'), 'demo'), true);
  assert.throws(() => sources.normalizeMeta({ tradition: 'x' }), /izin/);
  assert.throws(() => sources.normalizeMeta({ license: { status: 'cc_by' } }), /Tradisi/);
});

test('taksonomi memetakan sinonim lintas daerah', async () => {
  const tax = await loadTaxonomy();
  assert.deepEqual(mapTerms(['teropong'], tax.tools), ['sekoci']);
  assert.deepEqual(mapTerms(['belida'], tax.tools), ['pedang']);
  assert.deepEqual(mapTerms(['menghentak pakan'], tax.actions), ['rapatkan-pakan']);
});

test('penyelarasan: tahap serupa dari dua tradisi digabung, tahap khas tetap terpisah, urutan kanonik benar', async () => {
  const tax = await loadTaxonomy();
  const analyses = Object.entries(FAKE).map(([tradition, steps], i) => ({ sourceId: `s${i}`, tradition, steps: steps.map((s) => ({ ...s, confidence: 0.9 })) }));
  const clusters = canonicalOrder(cluster(prepareSteps(analyses, tax)));
  const shared = clusters.filter((c) => c.traditions.length === 2).map((c) => c.actionId);
  assert.deepEqual(shared.sort(), ['buka-mulut-lungsi', 'masukkan-pakan', 'rapatkan-pakan']);
  const songket = clusters.find((c) => c.actionId === 'membuat-motif-songket');
  assert.deepEqual(songket.traditions, ['Songket Palembang']);
  const order = clusters.filter((c) => c.traditions.length === 2).map((c) => c.actionId);
  assert.deepEqual(order, ['buka-mulut-lungsi', 'masukkan-pakan', 'rapatkan-pakan']);
});

test('cek konsistensi menandai tahap yang tidak muncul di analisis kedua', () => {
  const r = markConsistency([{ title: 'membuka mulut lungsi', start: 0, end: 2 }, { title: 'menari', start: 10, end: 12 }], [{ title: 'membuka mulut lungsi', start: 0, end: 2.5 }]);
  assert.equal(r[0].ragu, false);
  assert.equal(r[1].ragu, true);
});

test('merge tidak menimpa kolom yang sudah divalidasi / diubah penenun', () => {
  const old = { id: 'm', steps: [{ id: 'a', title: 'Judul penenun', instruction: 'Instruksi penenun', fieldStatus: { title: 'tervalidasi', instruction: 'diubah', tips: 'usulan_ai' }, tips: ['lama'] }] };
  const draft = { id: 'm', sources: ['x'], steps: [{ id: 'a', title: 'Judul AI', instruction: 'Instruksi AI', tips: ['baru'], fieldStatus: { title: 'usulan_ai', instruction: 'usulan_ai', tips: 'usulan_ai' }, provenance: [{ sourceId: 'x', start: 1, end: 2 }] }] };
  const m = mergeModule(old, draft);
  assert.equal(m.steps[0].title, 'Judul penenun');
  assert.equal(m.steps[0].instruction, 'Instruksi penenun');
  assert.deepEqual(m.steps[0].tips, ['baru']);
  assert.equal(m.steps[0].provenance[0].sourceId, 'x');
});

test('impor CSV & dataset motif (draft + atribusi)', () => {
  const rows = parseCsv('title,tradition,license\n"Tenun, ""A""",Sikka,cc_by\n');
  assert.deepEqual(rows[0], { title: 'Tenun, "A"', tradition: 'Sikka', license: 'cc_by' });
  const e = motifEntries([{ Motif_Name: 'Mawarani', Province: 'NTT', Meaning: 'Lambang kesuburan' }], { dataset: 'Motif NTT', license: 'CC BY 4.0' });
  assert.equal(e[0].status, 'draft');
  assert.match(e[0].source, /Motif NTT \(CC BY 4.0\)/);
});

test('dialog HowToDIV (templat) + uji tutor + kandidat knowledge base', async () => {
  const mod = JSON.parse(readFileSync(new URL('../data/modules/tidore-dasar.json', import.meta.url)));
  const turns = templateDialog(mod, 'kesalahan', { stepIndex: 2, mistake: 'x', fix: 'perbaiki' });
  assert.ok(turns.some((t) => t.intent === 'koreksi' && t.stepIndex === 2));
  const r = await evaluateDialog({ id: 'd', turns }, () => createSession(mod, { checkStep: async () => ({ status: 'uncertain' }), ask: async () => ({ answer: 'ok', sources: ['a'] }), log: () => {} }));
  assert.equal(r.score, 1);
  assert.ok(kbCandidates([{ id: 'd', turns }], mod.id).length >= 1);
});

test('integrasi: unggah → ffmpeg pra-proses → analisis → kurikulum dua tradisi → demo hanya dari sumber berizin', { skip: !hasFfmpeg && 'ffmpeg tidak ada' }, async () => {
  const vid = join(dir, 'uji.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=8:size=320x240:rate=10', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8', '-shortest', '-pix_fmt', 'yuv420p', vid]);
  const made = [];
  for (const [tradition, status] of [['Tenun ikat Sikka', 'cc_by'], ['Songket Palembang', 'riset_internal']]) {
    const s = await sources.createSource({ tradition, title: `Video ${tradition}`, url: 'https://contoh.id/v', license: { status } });
    const { createReadStream } = await import('node:fs');
    await sources.attachVideoStream(s.id, createReadStream(vid), 'mp4').catch(async (e) => {
      // video sama → ditolak sebagai duplikat; buat varian berbeda
      if (e.code !== 409) throw e;
      const v2 = join(dir, 'uji2.mp4');
      execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=duration=8:size=320x240:rate=10', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=8', '-shortest', '-pix_fmt', 'yuv420p', v2]);
      await sources.attachVideoStream(s.id, createReadStream(v2), 'mp4');
    });
    await pipeline.enqueue(s.id, { deps: { analyze: (src, d, p) => analyzeSource(src, fakeDeps(tradition), p) } });
    made.push(await sources.getSource(s.id));
  }
  for (const s of made) {
    assert.equal(s.pipeline.stage, 'selesai', s.pipeline.error);
    assert.equal(s.status, 'teranalisis');
    assert.ok(Math.abs(s.durationSec - 8) < 0.5);
    assert.ok(s.keyframes.length >= 2, 'keyframe tersimpan');
    assert.ok(existsSync(join(dir, `sources/${s.id}/video.mp4`)));
    assert.ok(existsSync(join(dir, `sources/${s.id}/audio.wav`)));
  }
  const report = await pipeline.rebuildCurricula({ useEmbeddings: false });
  const ids = report.modules.map((m) => m.id).sort();
  assert.deepEqual(ids, ['dasar-lintas-tradisi', 'draf-songket-palembang', 'draf-tenun-ikat-sikka']);
  const sikka = await store.readJson('modules/draf-tenun-ikat-sikka.json');
  assert.equal(sikka.published, false);
  assert.ok(sikka.steps.every((s) => s.fieldStatus.instruction === 'usulan_ai' && s.provenance.length));
  assert.ok(sikka.steps.some((s) => s.demo_video?.startsWith(`sources/${made[0].id}/`)), 'demo dari sumber cc_by');
  const songket = await store.readJson('modules/draf-songket-palembang.json');
  assert.ok(songket.steps.every((s) => !s.demo_video?.includes(made[1].id)), 'sumber riset_internal tidak jadi demo');
  assert.ok(report.termsAdded >= 1);

  // Penenun memvalidasi satu kolom → bangun ulang tidak menimpanya
  sikka.steps[0].instruction = 'Instruksi dari penenun'; sikka.steps[0].fieldStatus.instruction = 'tervalidasi';
  await store.writeJson('modules/draf-tenun-ikat-sikka.json', sikka);
  await pipeline.rebuildCurricula({ useEmbeddings: false });
  assert.equal((await store.readJson('modules/draf-tenun-ikat-sikka.json')).steps[0].instruction, 'Instruksi dari penenun');

  // Dialog dari draf + pasangan exo/ego
  const dialogs = await generateDialogs(sikka, { count: 2, gen: null });
  assert.equal(dialogs.length, 2);
  const pairs = await pairsForModule('draf-tenun-ikat-sikka');
  assert.ok(pairs.pairs.every((p) => p.coverage.exo >= 1));
});

test('modul satu tradisi tidak memakai judul/sumber dari tradisi lain', async () => {
  const analyses = Object.entries(FAKE).map(([tradition, steps], i) => ({ sourceId: `s${i}`, tradition, steps: steps.map((s) => ({ ...s, confidence: 0.9, instruction: `${s.title}.` })) }));
  const { modules } = await buildCurricula(analyses, { useEmbeddings: false });
  const sikka = modules.find((m) => m.tradition === 'Tenun ikat Sikka');
  assert.deepEqual(sikka.sources, ['s0']);
  assert.deepEqual(sikka.steps.map((s) => s.title), FAKE['Tenun ikat Sikka'].map((s) => s.title));
  assert.ok(sikka.steps.every((s) => s.provenance.every((p) => p.sourceId === 's0')));
});
