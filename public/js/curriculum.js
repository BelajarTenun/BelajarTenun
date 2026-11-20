// Format latihan bagian (4C/ID) untuk Editor modul. Sama dengan lib/core.js parsePractice/formatPractice (dites di server).
export const PRACTICE_MEASURES = ['hitungan', 'ritme', 'visual'];
export function parsePractice(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, instruction = '', reps = '', measure = ''] = l.split('|').map((x) => x.trim());
    return { name, instruction, reps: Math.max(1, Number.parseInt(reps, 10) || 5), measure: PRACTICE_MEASURES.includes(measure) ? measure : 'hitungan' };
  });
}
export const formatPractice = (ps) => (ps || []).map((p) => [p.name, p.instruction, p.reps, p.measure].join(' | ')).join('\n');
