// Ringkasan untuk dashboard murid (hanya data milik murid itu sendiri).
import { masteryByLearner } from './learning-analytics.js';

/** Status penguasaan sederhana untuk murid: dikuasai / dilatih / belum. Angka BKT tidak ditampilkan mentah. */
export const masteryState = (m) => (!m || !m.attempts ? 'belum' : m.mastered ? 'dikuasai' : 'dilatih');

/** Penguasaan per modul per tahap untuk satu murid. */
export function myMastery(events, userId, modules) {
  const rows = masteryByLearner(events.filter((e) => e.userId === userId));
  return Object.fromEntries(modules.map((m) => [m.id, Object.fromEntries(m.steps.map((s) => {
    const r = rows.find((x) => x.module === m.id && x.step === s.id);
    return [s.id, { state: masteryState(r), attempts: r?.attempts ?? 0 }];
  }))]));
}

/** Detail satu sesi dari log peristiwa: tahap yang dikerjakan, koreksi, latihan, catatan, pertanyaan. */
export function sessionDetail(events, module) {
  if (!events.length) return null;
  const at = (e) => new Date(e.at).getTime();
  const steps = new Map();
  const get = (id) => {
    if (!steps.has(id)) { const s = module?.steps.find((x) => x.id === id); steps.set(id, { id, title: s?.title ?? id, done: false, via: null, corrections: 0, hints: 0, checks: 0, patternRows: 0 }); }
    return steps.get(id);
  };
  const out = { id: events[0].sessionId, module: events[0].module, start: events[0].at, end: events.at(-1).at, done: false, practice: [], notes: [], questions: [] };
  for (const e of events) {
    if (e.type === 'session_done') out.done = true;
    if (e.type === 'note' && e.text) out.notes.push(e.text);
    if (e.type === 'question' && e.question) out.questions.push(e.question);
    if (!e.step) continue;
    const s = get(e.step);
    if (e.type === 'step_done') { s.done = true; s.via = e.source ?? null; }
    if (e.type === 'tutor_talk' && e.intent === 'koreksi') s.corrections++;
    if (e.type === 'tutor_talk' && (e.intent === 'petunjuk' || e.intent === 'tawar_bantuan')) s.hints++;
    if (e.type === 'check') { s.checks++; if (e.status === 'mistake') s.corrections++; }
    if (e.type === 'pattern_row') s.patternRows = Math.max(s.patternRows, e.row ?? 0);
    if (e.type === 'practice') out.practice.push({ step: s.title, name: e.name, repsDone: e.repsDone, target: e.target });
  }
  out.minutes = Math.max(0, Math.round((at(events.at(-1)) - at(events[0])) / 6000) / 10);
  out.steps = [...steps.values()];
  out.resumeIndex = module ? Math.max(0, module.steps.findIndex((s) => !steps.get(s.id)?.done)) : 0;
  return out;
}
