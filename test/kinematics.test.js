import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackHands, handFeatures, segmentKinematics, mannWhitney } from '../lib/kinematics.js';

/** Tangan kanan bergerak bolak-balik horizontal (mis. menghentak) dengan periode tertentu; telapak 0,1. */
function frames({ period = 1, amp = 0.2, dur = 10, fps = 30, jitter = 0 }) {
  const out = [];
  let r = 7;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647 - 0.5; };
  for (let i = 0; i <= dur * fps; i++) {
    const t = i / fps, x = 0.5 + amp * Math.sin((2 * Math.PI * t) / period) + jitter * rnd();
    const lm = Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0 }));
    lm[9] = { x, y: 0.4, z: 0 };
    out.push({ t, hands: [{ handedness: 'Right', landmarks: lm }] });
  }
  return out;
}

test('kinematika: siklus gerak & lintasan sesuai gerakan sintetis', () => {
  const f = handFeatures(trackHands(frames({ period: 1 })).Right);
  // Bolak-balik: dua puncak kecepatan per periode → ~20 siklus dalam 10 dtk.
  assert.ok(f.cycles >= 18 && f.cycles <= 21, String(f.cycles));
  // Lintasan: 4·amp per periode / telapak 0,1 → 8 telapak per detik × 10 dtk ≈ 80.
  assert.ok(Math.abs(f.pathPalms - 80) < 4, String(f.pathPalms));
  assert.ok(f.cycleIntervalCV < 0.15, String(f.cycleIntervalCV));
});

test('kinematika: gerakan bergetar lebih tidak halus dan ritmenya kurang teratur', () => {
  const halus = handFeatures(trackHands(frames({ jitter: 0 })).Right);
  const kasar = handFeatures(trackHands(frames({ jitter: 0.03 })).Right);
  assert.ok(kasar.smoothnessLDLJ < halus.smoothnessLDLJ, `${kasar.smoothnessLDLJ} vs ${halus.smoothnessLDLJ}`);
  assert.ok(kasar.pathPalms > halus.pathPalms);
});

test('segmen tahap memotong rentang waktu; tangan tanpa data = null', () => {
  const k = segmentKinematics(frames({ dur: 10 }), 2, 4);
  assert.ok(Math.abs(k.right.durationSec - 2) < 0.1);
  assert.equal(k.left, null);
});

test('Mann–Whitney: kelompok berbeda jelas → p kecil, effect size besar', () => {
  const a = [10, 11, 12, 13, 14, 15], b = [20, 21, 22, 23, 24, 25];
  const r = mannWhitney(a, b);
  assert.ok(r.p < 0.01, String(r.p));
  assert.ok(r.r > 0.7);
  assert.ok(mannWhitney([1, 2, 3, 4], [1, 2, 3, 4]).p > 0.9);
});
