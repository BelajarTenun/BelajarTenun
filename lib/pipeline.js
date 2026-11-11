// Orkestrasi alur video → data belajar, dengan antrean pekerjaan berurutan (satu per satu,
// karena ffmpeg & analisis video berat). Status disimpan di meta sumber (field "pipeline").
import { store } from './store.js';
import { getSource, saveSource, listSources, allows } from './sources.js';
import { preprocessSource } from './preprocess.js';
import { analyzeSource, listAnalyses } from './video-analysis.js';
import { buildCurricula, mergeModule } from './alignment.js';
import { loadKnowledge, saveKnowledge } from './knowledge.js';
import { aiEnabled } from './ai.js';

let chain = Promise.resolve();
const queue = new Map(); // sourceId → status

// Progres rinci (sering berubah) hanya di memori; ke disk hanya saat pergantian tahap, berurutan.
function progress(id, stage, detail) { queue.set(id, { ...(queue.get(id) || {}), stage, detail, updatedAt: new Date().toISOString() }); }
async function setStage(id, stage, extra = {}) {
  const m = await getSource(id);
  m.pipeline = { ...(m.pipeline || {}), stage, ...extra, updatedAt: new Date().toISOString() };
  await saveSource(m);
  queue.set(id, m.pipeline);
}

/** Masukkan sumber ke antrean: pra-proses lalu analisis AI. deps untuk tes (analyze, preprocess). */
export function enqueue(sourceId, { analyze = true, deps = {} } = {}) {
  queue.set(sourceId, { stage: 'antre' });
  chain = chain.then(async () => {
    try {
      let src = await getSource(sourceId);
      if (!src.original) throw new Error('Video belum diunggah');
      await setStage(sourceId, 'pra-proses');
      const pre = await (deps.preprocess ?? preprocessSource)(src, { onProgress: (p) => progress(sourceId, 'pra-proses', p) });
      src = await getSource(sourceId);
      Object.assign(src, { durationSec: pre.durationSec, width: pre.width, height: pre.height, hasAudio: pre.hasAudio, keyframes: pre.keyframes, scenes: pre.scenes, chunks: pre.chunks, files: [...new Set([...(src.files || []), ...pre.files])], status: 'siap-analisis' });
      await saveSource(src);
      if (analyze) {
        if (!allows(src, 'analisis')) throw new Error('Status izin tidak membolehkan analisis');
        if (!aiEnabled() && !deps.analyze) throw Object.assign(new Error('Analisis butuh GEMINI_API_KEY'), { soft: true });
        await setStage(sourceId, 'analisis');
        const a = await (deps.analyze ?? analyzeSource)(src, deps.analyzeDeps, (p) => progress(sourceId, 'analisis', p));
        src = await getSource(sourceId);
        src.status = 'teranalisis'; src.analysisSummary = { steps: a.steps.length, ragu: a.steps.filter((s) => s.ragu).length, terms: a.terms.length, viewpoint: a.viewpoint };
        await saveSource(src);
      }
      await setStage(sourceId, 'selesai', { error: null, detail: null });
    } catch (e) {
      await setStage(sourceId, e.soft ? 'menunggu-ai' : 'gagal', { error: e.message }).catch(() => {});
    }
  });
  return chain;
}
export const pipelineStatus = () => Object.fromEntries(queue);

/** Bangun ulang kurikulum draf dari semua analisis. Kolom tervalidasi tidak ditimpa. */
export async function rebuildCurricula(opts = {}) {
  const analyses = (await listAnalyses()).filter(Boolean);
  if (!analyses.length) throw Object.assign(new Error('Belum ada video yang teranalisis'), { code: 400 });
  const { modules, clusters, terms } = await buildCurricula(analyses, opts);
  const saved = [];
  for (const draft of modules) {
    const existing = await store.readJson(`modules/${draft.id}.json`, null);
    const merged = mergeModule(existing, draft);
    // Video demo otomatis: potongan sumber yang izinnya membolehkan ditonton pemula.
    for (const st of merged.steps) {
      if (st.demo_video) continue;
      for (const p of st.provenance || []) {
        const src = await getSource(p.sourceId).catch(() => null);
        if (src && allows(src, 'demo') && src.files?.includes('video.mp4')) { st.demo_video = `sources/${src.id}/video.mp4#t=${Math.floor(p.start)},${Math.ceil(p.end)}`; st.demo_attribution = [src.title, src.channel].filter(Boolean).join(' – ') || src.url; break; }
      }
    }
    await store.writeJson(`modules/${draft.id}.json`, merged);
    saved.push({ id: merged.id, title: merged.title, steps: merged.steps.length, sources: merged.sources.length });
  }
  // Istilah lokal → kandidat knowledge base (draft), digabung per istilah & tradisi.
  const kb = await loadKnowledge();
  let added = 0;
  for (const t of terms) {
    const id = `istilah-${t.tradition}-${t.term}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    if (kb.entries.some((e) => e.id === id)) continue;
    kb.entries.push({
      id, status: 'draft', topic: 'istilah', module: null, question: `Apa itu "${t.term}" dalam ${t.tradition}?`,
      answer: `[DUGAAN AI – wajib divalidasi] ${t.meaning_guess}`, keywords: [String(t.term).toLowerCase()],
      source: `video ${t.sourceId}${t.said_at != null ? ` detik ${t.said_at}` : ''}`, validated_by: null,
    });
    added++;
  }
  await saveKnowledge(kb);
  const report = { builtAt: new Date().toISOString(), analyses: analyses.length, modules: saved, clusters, termsAdded: added };
  await store.writeJson('cache/curriculum-report.json', report);
  return report;
}

export async function sourcesOverview() {
  const sources = await listSources();
  const byTradition = {};
  for (const s of sources) (byTradition[s.tradition] ??= { total: 0, analyzed: 0, minutes: 0 }), byTradition[s.tradition].total++, s.status === 'teranalisis' && byTradition[s.tradition].analyzed++, byTradition[s.tradition].minutes += Math.round((s.durationSec || 0) / 60);
  return { sources, byTradition, queue: pipelineStatus(), report: await store.readJson('cache/curriculum-report.json', null) };
}
