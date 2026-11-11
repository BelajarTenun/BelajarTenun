// Pasangan video luar (exo: video internet/partner) ↔ kacamata (ego: rekaman murid/penenun berkacamata).
// Pola EgoExoLearn: orang belajar dari demonstrasi exo lalu mengerjakan sendiri dari sudut ego.
// Di sini: segmen ego (anotasi rekaman) dipasangkan dengan segmen exo (provenance tahap modul) per tahap.
import { listRecordings, getModule, listModules } from './data.js';
import { getSource, allows } from './sources.js';

/** Kumpulkan pasangan per tahap untuk satu modul. */
export async function pairsForModule(moduleId) {
  const module = await getModule(moduleId);
  const recs = (await listRecordings()).filter((r) => r.module === moduleId && !r.consent?.withdrawn);
  const pairs = [];
  for (const step of module.steps) {
    const ego = recs.flatMap((r) => [
      ...(r.segments || []).filter((s) => s.stepId === step.id).map((s) => ({ recording: r.id, start: s.start, end: s.end, label: s.label })),
      ...(r.stepId === step.id ? [{ recording: r.id, start: 0, end: null, label: r.label }] : []),
    ]);
    const exo = [];
    for (const p of step.provenance || []) {
      const src = await getSource(p.sourceId).catch(() => null);
      if (src) exo.push({ ...p, tradition: src.tradition, viewpoint: src.viewpoint, canShowAsDemo: allows(src, 'demo'), url: src.url, title: src.title, channel: src.channel });
    }
    pairs.push({ stepId: step.id, title: step.title, genericStepId: step.genericStepId ?? null, ego, exo, coverage: { ego: ego.length, exo: exo.length } });
  }
  return { module: module.id, pairs };
}

/** Contoh demo exo dari tradisi lain untuk tahap generik yang sama (hanya sumber yang boleh ditampilkan). */
export async function crossTraditionDemos(genericStepId, excludeModuleId) {
  if (!genericStepId) return [];
  const out = [];
  for (const m of await listModules()) {
    if (m.id === excludeModuleId) continue;
    const mod = await getModule(m.id);
    for (const s of mod.steps.filter((x) => x.genericStepId === genericStepId)) {
      for (const p of s.provenance || []) {
        const src = await getSource(p.sourceId).catch(() => null);
        if (src && allows(src, 'demo')) out.push({ module: mod.id, tradition: mod.tradition, sourceId: src.id, start: p.start, end: p.end });
      }
    }
  }
  return out;
}
