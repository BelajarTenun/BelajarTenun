// Dialog tutor ↔ murid bertahap dari kurikulum (pola Google HowToDIV: video satu orang + tahap →
// dialog dua orang yang selaras dengan tahap & klip, termasuk sesi dengan kesalahan dan koreksinya).
// Dipakai untuk: (1) uji otomatis tutor, (2) kandidat entri knowledge base, (3) contoh gaya bicara.
import { aiEnabled, generate } from './ai.js';
import { store } from './store.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    turns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          role: { type: 'STRING', enum: ['tutor', 'murid'] },
          text: { type: 'STRING' },
          stepIndex: { type: 'INTEGER' },
          intent: { type: 'STRING', enum: ['instruksi', 'pertanyaan', 'jawaban', 'konfirmasi_selesai', 'koreksi', 'pujian'] },
        },
        required: ['role', 'text', 'stepIndex', 'intent'],
      },
    },
  },
  required: ['turns'],
};

function promptFor(module, scenario, mistakePlan) {
  const steps = module.steps.map((s, i) => `${i}. ${s.title}\n   Instruksi: ${s.instruction}\n   Berhasil bila: ${s.success_criteria}\n   Kesalahan umum: ${(s.common_mistakes || []).map((m) => `${m.mistake} → ${m.fix}`).join('; ') || '-'}`).join('\n');
  return `Buat percakapan realistis berbahasa Indonesia antara TUTOR ahli tenun (${module.tradition}) dan MURID pemula yang memakai kacamata berkamera, saat murid mengerjakan tahap-tahap berikut secara berurutan:
${steps}

Aturan:
- Tutor memberi instruksi tiap tahap, menjawab pertanyaan murid HANYA dengan informasi di atas, dan menunggu murid selesai.
- Murid sesekali bertanya hal wajar (kenapa, bagaimana, apa fungsi alat), lalu mengatakan "sudah" saat selesai.
- Satu giliran = 1–2 kalimat. stepIndex = tahap yang sedang dibahas.
${scenario === 'kesalahan' ? `- Skenario KESALAHAN: pada tahap ${mistakePlan.stepIndex} murid melakukan kesalahan "${mistakePlan.mistake}". Tutor menyadarinya dari kamera dan mengoreksi: "${mistakePlan.fix}" (intent "koreksi"). Murid memperbaiki lalu lanjut.` : '- Skenario NORMAL: murid mengerjakan semua tahap dengan benar.'}
- Jangan mengarang makna budaya, motif, atau sejarah.`;
}

/** Templat deterministik (tanpa AI) – berguna untuk tes & bila AI belum tersedia. */
export function templateDialog(module, scenario = 'normal', mistakePlan = null) {
  const turns = [];
  module.steps.forEach((s, i) => {
    turns.push({ role: 'tutor', text: s.instruction, stepIndex: i, intent: 'instruksi' });
    if (s.tips?.[0]) {
      turns.push({ role: 'murid', text: `Kenapa ${s.title.toLowerCase()} harus seperti itu?`, stepIndex: i, intent: 'pertanyaan' });
      turns.push({ role: 'tutor', text: s.tips[0], stepIndex: i, intent: 'jawaban' });
    }
    if (scenario === 'kesalahan' && mistakePlan?.stepIndex === i) turns.push({ role: 'tutor', text: mistakePlan.fix, stepIndex: i, intent: 'koreksi' });
    turns.push({ role: 'murid', text: 'Sudah.', stepIndex: i, intent: 'konfirmasi_selesai' });
  });
  return turns;
}

export async function generateDialogs(module, { count = 2, withMistakes = true, gen = aiEnabled() ? generate : null } = {}) {
  const out = [];
  const candidates = module.steps.flatMap((s, i) => (s.common_mistakes || []).map((m) => ({ stepIndex: i, ...m })));
  for (let n = 0; n < count; n++) {
    const scenario = withMistakes && candidates.length && n % 2 === 1 ? 'kesalahan' : 'normal';
    const plan = scenario === 'kesalahan' ? candidates[n % candidates.length] : null;
    let turns;
    if (gen) {
      try { turns = JSON.parse(await gen([{ text: promptFor(module, scenario, plan) }], { json: true, schema: SCHEMA, temperature: 0.7, kind: 'dialog_gen' })).turns; } catch { turns = null; }
    }
    turns ??= templateDialog(module, scenario, plan);
    const dialog = {
      id: `${module.id}-${Date.now().toString(36)}-${n}`, module: module.id, scenario, mistakePlan: plan, generatedBy: gen ? 'ai' : 'templat',
      createdAt: new Date().toISOString(),
      turns: turns.map((t) => ({ ...t, clip: module.steps[t.stepIndex]?.provenance?.[0] ?? null })),
    };
    await store.writeJson(`dialogs/${module.id}/${dialog.id}.json`, dialog);
    out.push(dialog);
  }
  return out;
}

export async function listDialogs(moduleId) {
  const out = [];
  for (const f of await store.list(`dialogs/${moduleId}`)) if (f.endsWith('.json')) out.push(await store.readJson(`dialogs/${moduleId}/${f}`));
  return out;
}

/** Pertanyaan murid + jawaban tutor dari dialog → kandidat entri knowledge base (status draft). */
export function kbCandidates(dialogs, moduleId) {
  const out = [];
  for (const d of dialogs) for (let i = 0; i < d.turns.length - 1; i++) {
    const q = d.turns[i], a = d.turns[i + 1];
    if (q.role === 'murid' && q.intent === 'pertanyaan' && a.role === 'tutor' && a.intent === 'jawaban') {
      out.push({ id: `dlg-${d.id}-${i}`, status: 'draft', module: moduleId, topic: 'dari-dialog', question: q.text, answer: a.text,
        keywords: [...new Set(q.text.toLowerCase().split(/\W+/).filter((w) => w.length > 4))].slice(0, 5), source: `dialog sintetis ${d.id}`, validated_by: null });
    }
  }
  return out;
}

/**
 * Uji tutor dengan dialog: jalankan giliran murid ke mesin sesi, lalu periksa
 * (a) "sudah" memajukan tahap yang benar, (b) pertanyaan mendapat jawaban bersumber.
 */
export async function evaluateDialog(dialog, makeSession) {
  const session = makeSession();
  session.start();
  let checks = 0, passed = 0;
  const failures = [];
  for (const t of dialog.turns) {
    if (t.role !== 'murid') continue;
    const before = session.state.index;
    const r = await session.say(t.text);
    if (t.intent === 'konfirmasi_selesai') {
      checks++;
      const ok = before === t.stepIndex && (r.step.index === before + 1 || r.finished);
      ok ? passed++ : failures.push({ turn: t.text, expected: t.stepIndex, before, after: r.step.index });
    } else if (t.intent === 'pertanyaan') {
      checks++;
      const ok = Boolean(r.speak) && (r.sources?.length ?? 0) > 0;
      ok ? passed++ : failures.push({ turn: t.text, reason: 'tidak ada jawaban bersumber' });
    }
  }
  return { dialog: dialog.id, checks, passed, score: checks ? passed / checks : 1, failures };
}
