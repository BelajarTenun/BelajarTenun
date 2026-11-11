// Kebijakan "kapan tutor bicara" (F4). Diadaptasi dari tugas Instructor Decision Making
// di Watch-Talk-and-Guide: (1) bicara atau diam, (2) niat bicara, (3) isi ucapan.

export const POLICY = {
  minGapMs: 10000,        // jeda minimum antar ucapan proaktif
  hintAfterMs: 45000,     // tanpa kemajuan selama ini → beri petunjuk
  maxHints: 3,            // setelah ini tawarkan video demo / panggil pendamping
  repeatFixAfterMs: 30000 // koreksi yang sama tidak diulang lebih cepat dari ini
};

/**
 * state: { lastProgressAt, lastSpokeAt, hintsGiven, lastFix:{text,at} }
 * event: { type: 'tick' } | { type: 'check', result } ; step: tahap aktif
 * Mengembalikan { talk:boolean, intent, text }.
 */
export function decide(state, event, step, now, policy = POLICY) {
  const quiet = { talk: false, intent: 'diam', text: '' };
  const sinceSpoke = now - (state.lastSpokeAt ?? 0);

  if (event.type === 'check' && event.result?.status === 'mistake' && event.result.fix) {
    const same = state.lastFix?.text === event.result.fix && now - state.lastFix.at < policy.repeatFixAfterMs;
    if (same || sinceSpoke < policy.minGapMs / 2) return quiet;
    return { talk: true, intent: 'koreksi', text: event.result.fix };
  }

  if (event.type === 'tick' || event.type === 'check') {
    const stuck = now - (state.lastProgressAt ?? now) >= policy.hintAfterMs * ((state.hintsGiven || 0) + 1);
    if (!stuck || sinceSpoke < policy.minGapMs) return quiet;
    const tips = step?.tips?.length ? step.tips : [step?.instruction].filter(Boolean);
    if ((state.hintsGiven || 0) < policy.maxHints && tips.length) {
      const tip = tips[(state.hintsGiven || 0) % tips.length];
      return { talk: true, intent: 'petunjuk', text: `Petunjuk: ${tip}` };
    }
    if ((state.hintsGiven || 0) === policy.maxHints) {
      return { talk: true, intent: 'tawar_bantuan', text: 'Sepertinya tahap ini agak sulit. Mau lihat video contohnya lagi? Ucapkan "contoh". Kamu juga bisa memanggil pendamping.' };
    }
  }
  return quiet;
}
