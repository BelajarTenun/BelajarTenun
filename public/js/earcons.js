// Nada pendek penanda status, disintesis di memori. Urutan nada sama dengan VisionClaw (Earcons.kt):
// pengguna yang tangannya sibuk menenun tahu status tanpa melihat layar.
const CUES = {
  connected: [[660, 0.09], [0, 0.03], [990, 0.12]],
  ended: [[990, 0.09], [0, 0.03], [660, 0.12]],
  lost: [[520, 0.15], [0, 0.06], [390, 0.25]],
  reconnected: [[660, 0.07], [0, 0.02], [830, 0.07], [0, 0.02], [990, 0.1]],
  captured: [[1800, 0.04]],
  success: [[784, 0.08], [0, 0.02], [1047, 0.14]],
  warning: [[440, 0.12], [0, 0.04], [440, 0.12]],
};
let ctx;
export function earcon(name, volume = 0.25) {
  const notes = CUES[name]; if (!notes) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of notes) {
      if (freq) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = freq; o.type = 'sine';
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + 0.01); g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
      }
      t += dur;
    }
  } catch { /* audio tidak tersedia */ }
}
