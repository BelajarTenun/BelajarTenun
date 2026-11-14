import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, glass, Mark, SpokenText, W } from './brand';

// Uji gaya v2 (±29 dtk). Multikamera tersinkron (audio 7648/7649 cocok dengan 7647):
//   7648 = wajah samping, 7647 = POV tangan (master), 7649 = badan samping.
// Waktu global t (detik). Untuk segmen 7648/7647: t = m − 2,46 (m = waktu di 7647).
const FPS = 30;
const f_ = (x: number) => Math.round(x * FPS);
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const SEG = { s1: [0, 3.9], s2: [3.9, 6.24], s3: [6.24, 16.15], s4: [16.15, 19.55], s5: [19.55, 28.0], end: [28.0, 30.0] };
const T1_AT = 6.5, T2_AT = 19.8;

// Ucapan Andrew (teks dirapikan, waktu dari Whisper; m − 2,46 → t).
const Q1: W[] = [['Halo', 2.9], ['BelajarTenun,', 3.46], ['hari', 4.56], ['ini', 5.1], ['aku', 5.4], ['mau', 5.54], ['nyobain', 5.62], ['tenun.', 5.84], ['Langkah', 7.06], ['pertama', 7.4], ['aku', 7.7], ['harus', 7.94], ['apa?', 8.22]].map(([w, m]) => ({ w: w as string, t: (m as number) - 2.46 }));
// Pertanyaan kedua dari 7649: t = m + 0,87
const Q2: W[] = [['Setelah', 16.19], ['nyampe', 16.71], ['sini,', 17.01], ['aku', 17.29], ['harus', 17.45], ['apa?', 17.61]].map(([w, m]) => ({ w: w as string, t: (m as number) + 0.87 }));
const T1: W[] = [['Halo,', 0], ['kita', 1.04], ['mulai', 1.26], ['dari', 1.72], ['mengenal', 1.92], ['alat', 2.34], ['dulu', 2.58], ['ya.', 2.86], ['Benang', 3.58], ['yang', 3.88], ['tegak', 4.0], ['ini', 4.38], ['namanya', 4.64], ['lungsi.', 5.2], ['Angkat', 6.4], ['selang-seling', 6.82], ['supaya', 7.66], ['celahnya', 8.38], ['terbuka.', 8.8]].map(([w, s]) => ({ w: w as string, t: T1_AT + (s as number) }));
const T2: W[] = [['Bagus!', 0], ['Mulut', 1.22], ['lungsinya', 1.5], ['sudah', 1.88], ['terbuka.', 2.06], ['Sekarang,', 3.18], ['masukkan', 4.08], ['benang', 4.54], ['pakan', 4.86], ['dari', 5.26], ['kiri', 5.52], ['ke', 6.02], ['kanan,', 6.22], ['lewat', 6.98], ['celah', 7.32], ['itu.', 7.6]].map(([w, s]) => ({ w: w as string, t: T2_AT + (s as number) }));

const BUBBLES: { me: boolean; words: W[] }[] = [
  { me: true, words: Q1 }, { me: false, words: T1 }, { me: true, words: Q2 }, { me: false, words: T2 },
];

const Clip: React.FC<{ src: string; from: number }> = ({ src, from }) => (
  <OffthreadVideo src={staticFile(src)} startFrom={f_(from)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
);

// HP kaca di samping POV. Berisi: tanda + nama, tahap, transkrip yang tumbuh per kata.
const GlassPhone: React.FC<{ t: number; visible: number }> = ({ t, visible }) => {
  const { fps } = useVideoConfig();
  const speaking = (t > T1_AT && t < T1_AT + 9.6) || (t > T2_AT && t < T2_AT + 8.0);
  const stage = t < T2_AT + 2.06 ? { n: '1/5', name: 'Mengenal alat' } : { n: '3/5', name: 'Memasukkan pakan' };
  const shown = BUBBLES.filter((b) => t >= b.words[0].t - 0.05);
  return (
    <div style={{ position: 'absolute', right: 96, top: 92, width: 440, height: 896, borderRadius: 62, padding: 10, ...glass(0.32), opacity: visible, transform: `translateX(${(1 - visible) * 80}px)`, filter: `blur(${(1 - visible) * 10}px)` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 52, overflow: 'hidden', background: 'rgba(246,245,241,0.86)', fontFamily: BRAND.font, color: BRAND.ink }}>
        {/* kepala */}
        <div style={{ position: 'absolute', left: 28, right: 28, top: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mark size={26} speaking={speaking} />
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>BelajarTenun</div>
          </div>
          <div style={{ fontSize: 14, color: BRAND.mute }}>{stage.n}</div>
        </div>
        <div style={{ position: 'absolute', left: 28, top: 104, fontSize: 30, fontWeight: 600, letterSpacing: -0.8 }}>{stage.name}</div>
        {/* transkrip: gelembung baru mendorong yang lama ke atas */}
        <div style={{ position: 'absolute', left: 20, right: 20, top: 170, bottom: 34, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, overflow: 'hidden' }}>
          {shown.map((b, i) => {
            const age = (t - b.words[0].t) * fps;
            const p = spring({ frame: age, fps, config: { damping: 20, stiffness: 170, mass: 0.7 } });
            return (
              <div key={i} style={{ alignSelf: b.me ? 'flex-end' : 'flex-start', maxWidth: '86%', transform: `translateY(${(1 - p) * 12}px)`, opacity: Math.min(1, p * 1.5), padding: '12px 16px', borderRadius: 22, fontSize: 20, lineHeight: 1.38, letterSpacing: -0.2, background: b.me ? BRAND.ink : '#fff', color: b.me ? '#fff' : BRAND.ink, borderBottomRightRadius: b.me ? 6 : 22, borderBottomLeftRadius: b.me ? 22 : 6, boxShadow: b.me ? 'none' : '0 4px 16px rgba(0,0,0,0.05)' }}>
                {!b.me && <div style={{ marginBottom: 6 }}><Mark size={16} speaking={speaking && i === shown.length - 1} /></div>}
                <SpokenText words={b.words} fps={fps} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Penutup: POV memudar & buram, tanda tenunan ditenun di tengah, lalu nama.
const EndMark: React.FC = () => {
  const f = useCurrentFrame();
  const d = interpolate(f, [0, f_(0.9)], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const n = interpolate(f, [f_(0.7), f_(1.1)], [0, 1], cl);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 26, flexDirection: 'column' }}>
      <Mark size={110} draw={d} />
      <div style={{ fontFamily: BRAND.font, fontSize: 54, fontWeight: 600, letterSpacing: -1.4, color: BRAND.ink, opacity: n, filter: `blur(${(1 - n) * 8}px)` }}>BelajarTenun</div>
    </AbsoluteFill>
  );
};

export const STYLE2_SECONDS = 30;
export const StyleTest2: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const inPhoneSeg = (t >= SEG.s2[0] && t < SEG.s4[0]) || (t >= SEG.s5[0] && t < SEG.end[0]);
  const enterAt = t >= SEG.s5[0] ? SEG.s5[0] : SEG.s2[0];
  const vis = inPhoneSeg ? interpolate(t, [enterAt, enterAt + 0.45], [0, 1], { ...cl, easing: Easing.out(Easing.exp) }) : 0;
  const endT = interpolate(t, [SEG.end[0], SEG.end[0] + 0.6], [0, 1], cl);
  const seq = (a: number, b: number) => ({ from: f_(a), durationInFrames: f_(b - a) });
  return (
    <AbsoluteFill style={{ background: BRAND.paper }}>
      {/* gambar */}
      <Sequence {...seq(...(SEG.s1 as [number, number]))}><Clip src="footage/7648-full.mp4" from={0} /></Sequence>
      <Sequence {...seq(SEG.s2[0], SEG.s3[1])}><Clip src="footage/7647-full.mp4" from={6.36} /></Sequence>
      <Sequence {...seq(...(SEG.s4 as [number, number]))}><Clip src="footage/7649-full.mp4" from={1.8} /></Sequence>
      <Sequence {...seq(SEG.s5[0], SEG.end[1])}>
        <AbsoluteFill style={{ filter: `blur(${endT * 24}px)`, opacity: 1 - endT * 0.75 }}><Clip src="footage/7647-full.mp4" from={18.7} /></AbsoluteFill>
      </Sequence>
      <GlassPhone t={t} visible={vis} />
      <Sequence {...seq(...(SEG.end as [number, number]))}><EndMark /></Sequence>

      {/* suara: Andrew (sudah dibersihkan), earcon, tutor */}
      <Sequence {...seq(SEG.s1[0], SEG.s2[1])}><Audio src={staticFile('audio/7648-clean.wav')} endAt={f_(3.9)} /></Sequence>
      <Sequence {...seq(SEG.s2[0], SEG.s2[1])}><Audio src={staticFile('audio/7647-clean.wav')} startFrom={f_(6.36)} /></Sequence>
      <Sequence from={f_(T1_AT - 0.3)}><Audio src={staticFile('sfx/earcon.wav')} volume={0.5} /></Sequence>
      <Sequence from={f_(T1_AT)}><Audio src={staticFile('tutor/T1.mp3')} /></Sequence>
      <Sequence {...seq(...(SEG.s4 as [number, number]))}><Audio src={staticFile('audio/7649-clean.wav')} startFrom={f_(1.8)} /></Sequence>
      <Sequence from={f_(T2_AT - 0.3)}><Audio src={staticFile('sfx/earcon.wav')} volume={0.5} /></Sequence>
      <Sequence from={f_(T2_AT)}><Audio src={staticFile('tutor/T2.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
