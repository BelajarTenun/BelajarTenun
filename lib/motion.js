// Ukuran gerak per tahap untuk satu analisis video (bagian 2.1 & 2.7 "Dari data ke kurikulum"):
//  - ritme hentakan dari sources/<id>/audio.wav (selalu, bila audio ada)
//  - kinematika tangan dari sources/<id>/hands.json (bila sudah dibuat scripts/hand_pose.py)
// Disimpan di analisis (steps[i].motion) sebagai DATA DESKRIPTIF untuk penenun & kurikulum.
// Belum dipakai menilai murid sampai lolos scripts/validate_motion.js.
import { store } from './store.js';
import { readWav, rhythmForSegment } from './rhythm.js';
import { segmentKinematics } from './kinematics.js';

export async function enrichMotion(analysis, { readFile = (p) => store.readFile(p) } = {}) {
  const id = analysis.sourceId;
  const wav = await readFile(`sources/${id}/audio.wav`).then(readWav).catch(() => null);
  const hands = await readFile(`sources/${id}/hands.json`).then((b) => JSON.parse(String(b)).frames).catch(() => null);
  let n = 0;
  for (const s of analysis.steps) {
    if (!(s.end > s.start)) continue;
    const motion = {};
    if (wav) { const { onsets, ...r } = rhythmForSegment(wav, s.start, s.end); motion.rhythm = r; }
    if (hands) motion.hands = segmentKinematics(hands, s.start, s.end);
    if (Object.keys(motion).length) { s.motion = motion; n++; }
  }
  analysis.motion = { audio: Boolean(wav), hands: Boolean(hands), steps: n, validated: false };
  return analysis;
}
