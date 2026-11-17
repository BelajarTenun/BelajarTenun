import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { BRAND, glass, Mark } from './brand';

// Babak 1 · Intro (±30 dtk) — footage & suara asli, teks sinkron per kata (Whisper).
//   01 Andrew (7633) · 02 animasi penenun + VO 7633 · 03 Andrew memakai kacamata (7634b)
//   04 identitas produk + B-roll (7644, 7652, 7653, 7647) + VO 7634a
const FPS = 30;
const F = (x: number) => Math.round(x * FPS);
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.exp)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });
const { ink: INK, thread: THREAD, paper: PAPER, font: FONT } = BRAND;

type Wd = [string, number];
// Kata muncul saat diucapkan: blur → tajam, abu → tinta. Waktu dalam detik lokal adegan.
const Spoken: React.FC<{ words: Wd[]; t: number; color?: string; dim?: string }> = ({ words, t, color = INK, dim = 'rgba(21,24,28,0.18)' }) => (
  <>
    {words.map(([w, at], i) => {
      const p = ez(t, at - 0.08, at + 0.22);
      return (
        <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', color: p > 0.98 ? color : dim, opacity: 0.0 + p, filter: `blur(${(1 - p) * 6}px)`, transition: 'none' }}>{w}</span>
      );
    })}
  </>
);

// ── Kamera virtual ─────────────────────────────────────────────────────────
// keys: [detik, geserX, geserY, skala]. Antar-keyframe: ease in-out. Motion blur otomatis
// mengikuti kecepatan (gerak cepat = blur, diam = tajam).
type Key = [number, number, number, number];
const camAt = (keys: Key[], t: number) => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1, s1] = keys[i], [t0, x0, y0, s0] = keys[i - 1];
    if (t <= t1) {
      const e = Easing.inOut(Easing.cubic)((t - t0) / (t1 - t0 || 1));
      return [t, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, s0 + (s1 - s0) * e] as Key;
    }
  }
  return keys[keys.length - 1];
};
const Cam: React.FC<{ keys: Key[]; children: React.ReactNode; blurGain?: number }> = ({ keys, children, blurGain = 1 }) => {
  const t = useCurrentFrame() / FPS;
  const [, x, y, s] = camAt(keys, t);
  const [, xp, yp, sp] = camAt(keys, t - 1 / FPS);
  const v = Math.hypot(x - xp, y - yp) + Math.abs(s - sp) * 900;
  const blur = Math.min(14, v * 0.35 * blurGain);
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
};
const Clip: React.FC<{ src: string; from?: number }> = ({ src, from = 0 }) => (
  <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
);
// Whip pan: masuk dari samping dengan blur kuat, mendarat tajam dalam ±0,23 dtk.
const WhipIn: React.FC<{ dir?: number; children: React.ReactNode }> = ({ dir = 1, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 7], [1, 0], { ...cl, easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ transform: `translateX(${dir * p * 520}px)`, filter: p > 0.02 ? `blur(${p * 36}px)` : undefined }}>{children}</AbsoluteFill>;
};
const WhipOut: React.FC<{ dir?: number; dur: number; children: React.ReactNode }> = ({ dir = -1, dur, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [dur - 6, dur], [0, 1], { ...cl, easing: Easing.in(Easing.cubic) });
  return <AbsoluteFill style={{ transform: `translateX(${dir * p * 520}px)`, filter: p > 0.02 ? `blur(${p * 36}px)` : undefined }}>{children}</AbsoluteFill>;
};

// ── 01 · "Selama ratusan tahun, menenun diajarkan dari tangan ke tangan." ─────
const W01_1: Wd[] = [['Selama', 0.35], ['ratusan', 1.13], ['tahun,', 1.53]];
const W01_2: Wd[] = [['menenun', 2.33], ['diajarkan', 2.87]];
const W01_3: Wd[] = [['dari', 3.33], ['tangan', 3.55], ['ke', 3.97], ['tangan.', 4.1]];
const S01: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const out = 1 - ez(t, 4.55, 4.8, Easing.in(Easing.cubic));
  const keys: Key[] = [[0, 0, 0, 1], [0.15, 0, 0, 1], [1.05, -235, 20, 1.27], [2.2, -235, 20, 1.27], [2.5, -262, 40, 1.37], [4.8, -268, 44, 1.39]];
  return (
    <AbsoluteFill>
      <Cam keys={keys}><Clip src="footage/7633-full.mp4" from={0.5} /></Cam>
      {/* kaca lembut di belakang teks agar terbaca di latar terang */}
      <div style={{ position: 'absolute', left: 1040, top: 330, width: 800, padding: '40px 46px', borderRadius: 32, ...glass(0.38), opacity: ez(t, 0.25, 0.7) * out }}>
        <div style={{ fontFamily: FONT, fontSize: 64, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1.8, color: INK }}>
          <Spoken words={W01_1} t={t} /><br />
          <Spoken words={W01_2} t={t} /><br />
          <Spoken words={W01_3} t={t} color={THREAD} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const W02_A: Wd[] = [['Tapi', 0.15], ['penenun', 0.71], ['senior', 1.09], ['semakin', 1.41], ['sedikit.', 1.83]];
const W02_B: Wd[] = [['Anak', 2.57], ['muda', 2.75], ['yang', 3.21], ['ingin', 3.37], ['belajar', 3.57], ['sering', 3.95], ['tidak', 4.65], ['punya', 4.79], ['akses', 5.03], ['ke', 5.43], ['guru.', 5.65]];
const W02_C: Wd[] = [['Dan', 6.59], ['pengetahuannya', 6.73], ['perlahan-lahan', 7.41], ['hilang.', 8.33]];
// ── 02 · ilustrasi kartun 2D (latar putih), kamera virtual + parallax ──────
// IL1 penenun dekat → IL2 penenun sendirian (kamera mundur) → IL3 anak muda bingung
// masuk, benang oranye terulur lalu putus → semuanya memudar ke putih.
const Ill: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', width: 1920, height: 1073, top: 3, left: 0, mixBlendMode: 'multiply', ...style }} />
);
const S02: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // A: IL1 push-in pelan, lalu potong ke IL2 dengan kamera mundur dari wajah penenun
  const pushA = interpolate(t, [0, 1.5], [1.0, 1.06], cl);
  const outB = interpolate(t, [1.5, 2.7], [1.9, 1.0], { ...cl, easing: Easing.out(Easing.cubic) });
  const blurB = interpolate(t, [1.5, 1.7], [10, 0], cl);
  // B: anak muda masuk (whip dari kiri), benang terulur lalu putus
  const youthIn = interpolate(t, [2.5, 2.8], [1, 0], { ...cl, easing: Easing.out(Easing.cubic) });
  const link = ez(t, 3.2, 4.1, Easing.inOut(Easing.cubic));
  const broken = ez(t, 4.55, 5.0, Easing.out(Easing.cubic));
  // C: memudar ke putih
  const fadeAll = ez(t, 6.9, 8.6, Easing.inOut(Easing.cubic));
  const lines = [W02_A, W02_B, W02_C];
  const active = t < 2.45 ? 0 : t < 6.6 ? 1 : 2;
  return (
    <AbsoluteFill style={{ background: '#FFFFFF', overflow: 'hidden' }}>
      {t < 1.5 ? (
        <AbsoluteFill style={{ transform: `scale(${pushA})`, transformOrigin: '42% 45%' }}><Ill src="illust/IL1.png" /></AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ transform: `scale(${outB})`, transformOrigin: '63% 52%', filter: `blur(${blurB}px) saturate(${1 - fadeAll})`, opacity: 1 - fadeAll * 0.9 }}>
          <Ill src="illust/IL2.png" />
        </AbsoluteFill>
      )}
      {t >= 2.5 && (
        <AbsoluteFill style={{ transform: `translateX(${-youthIn * 700 - 520}px)`, filter: `blur(${youthIn * 30 + fadeAll * 6}px)`, opacity: 1 - fadeAll }}>
          <Ill src="illust/IL3.png" />
        </AbsoluteFill>
      )}
      {/* benang oranye dari HP anak muda ke alat tenun, lalu putus */}
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: 1 - fadeAll }}>
        {broken < 0.02 ? (
          <path d="M440 420 C 760 300, 1150 380, 1480 600" fill="none" stroke={THREAD} strokeWidth={4} strokeLinecap="round" strokeDasharray="1400" strokeDashoffset={1400 * (1 - link)} />
        ) : (
          <>
            <path d="M440 420 C 600 360, 760 340, 900 345" fill="none" stroke={THREAD} strokeWidth={4} strokeLinecap="round" opacity={1 - broken * 0.7} transform={`translate(0 ${broken * 40}) rotate(${broken * 8} 900 345)`} />
            <path d="M1010 352 C 1200 380, 1350 470, 1480 600" fill="none" stroke={THREAD} strokeWidth={4} strokeLinecap="round" opacity={1 - broken * 0.7} transform={`translate(0 ${broken * 40}) rotate(${-broken * 8} 1010 352)`} />
          </>
        )}
      </svg>
      {/* teks: kalimat aktif tinta, sebelumnya memudar */}
      <div style={{ position: 'absolute', left: 120, top: 90, width: 1680, fontFamily: FONT, fontSize: 54, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.14, color: INK }}>
        {lines.map((w, i) => (
          <div key={i} style={{ opacity: i === active ? 1 : i < active ? 0.22 : 1, display: i <= active ? 'block' : 'none' }}>
            <Spoken words={w} t={t} color={i === 2 ? THREAD : INK} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── 03 · "Bagaimana kalau ilmunya bisa ikut… di mata kita?" ──────────────────
const W03_1: Wd[] = [['Bagaimana', 0.05], ['kalau', 0.83], ['ilmunya', 1.09], ['bisa', 1.51], ['ikut…', 1.67]];
const W03_2: Wd[] = [['di', 2.05], ['mata', 4.03], ['kita?', 4.19]];
const S03: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // kacamata ±(1020, 390): titik p di tengah layar saat skala k → geser (−60k, 150k)
  const k1 = 2.1, k2 = 7;
  const keys: Key[] = [[0, 0, 0, 1], [3.9, 0, 0, 1.06], [4.2, -60 * k1, 150 * k1, k1], [4.45, -60 * k1, 150 * k1, k1 * 1.03], [4.7, -60 * k2, 150 * k2, k2]];
  const flash = ez(t, 4.55, 4.7, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill>
      <Cam keys={keys} blurGain={0.6}><Clip src="footage/7634b-full.mp4" /></Cam>
      <AbsoluteFill style={{ background: PAPER, opacity: flash }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, textAlign: 'center', fontFamily: FONT, fontSize: 54, fontWeight: 600, letterSpacing: -1.4, opacity: 1 - ez(t, 4.4, 4.55) }}>
        <span style={{ display: 'inline-block', padding: '18px 34px', borderRadius: 26, ...glass(0.36), opacity: ez(t, 0, 0.3) }}>
          <Spoken words={W03_1} t={t} /> <Spoken words={W03_2} t={t} color={THREAD} />
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── 04 · identitas produk + B-roll, teks sinkron VO 7634a ───────────────────
// Waktu lokal = waktu di 7634a − 0,3.
const o4 = 0.3;
const Caption: React.FC<{ words: Wd[]; t: number }> = ({ words, t }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96, textAlign: 'center' }}>
    <span style={{ display: 'inline-block', padding: '16px 30px', borderRadius: 24, ...glass(0.36), fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
      <Spoken words={words} t={t} />
    </span>
  </div>
);
const W04_B: Wd[] = [['adalah', 1.4], ['tutor', 1.88], ['AI', 2.2], ['di', 2.4], ['kacamata', 2.78], ['yang', 3.28], ['mengajarkan', 3.56]].map(([w, s]) => [w, (s as number) - o4]) as Wd[];
const W04_C: Wd[] = [['pengetahuan', 4.08], ['dan', 4.76], ['teknologi', 5.02], ['tradisional', 5.88], ['menenun,', 6.26]].map(([w, s]) => [w, (s as number) - o4]) as Wd[];
const W04_D: Wd[] = [['termasuk', 7.2], ['istilahnya', 7.82], ['dalam', 8.52], ['bahasa', 8.76], ['daerah,', 9.14]].map(([w, s]) => [w, (s as number) - o4]) as Wd[];
const W04_E: Wd[] = [['langsung', 9.86], ['saat', 10.38], ['kita', 10.64], ['mencoba.', 10.86]].map(([w, s]) => [w, (s as number) - o4]) as Wd[];
const S04: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const mark = ez(t, 0, 1.0, Easing.out(Easing.cubic));
  const name = ez(t, 0.2, 0.7);
  // potongan B-roll (lokal, detik)
  const cut = [1.6, 4.0, 6.6, 9.2, 11.4];
  const shot = (a: number, b: number) => ({ from: F(a), durationInFrames: F(b - a) });
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {/* A: tanda tenunan ditenun + nama, saat "BelajarTenun" diucapkan */}
      <Sequence {...shot(0, cut[0])}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 30, background: `radial-gradient(ellipse at 50% 45%, #FAF9F6, ${PAPER} 70%)` }}>
          <Mark size={120} draw={mark} />
          <div style={{ fontFamily: FONT, fontSize: 84, fontWeight: 600, letterSpacing: -2.6, color: INK, opacity: name, filter: `blur(${(1 - name) * 10}px)` }}>BelajarTenun</div>
        </AbsoluteFill>
      </Sequence>
      {/* B: kacamata & benang (7644) */}
      <Sequence {...shot(cut[0], cut[1])}><WhipIn dir={1}><Cam keys={[[0, 0, 0, 1.04], [2.4, -30, 0, 1.12]]}><Clip src="footage/7644-full.mp4" /></Cam></WhipIn><Caption words={W04_B} t={t} /></Sequence>
      {/* C: kamera mengitari Andrew berkacamata (7652) */}
      <Sequence {...shot(cut[1], cut[2])}><WhipIn dir={-1}><Cam keys={[[0, 0, 0, 1.08], [2.6, 0, 0, 1.0]]}><Clip src="footage/7652-full.mp4" /></Cam></WhipIn><Caption words={W04_C} t={t} /></Sequence>
      {/* D: POV menenun (7653) */}
      <Sequence {...shot(cut[2], cut[3])}><WhipIn dir={1}><Cam keys={[[0, 0, 0, 1.0], [2.6, 0, -20, 1.1]]}><Clip src="footage/7653-full.mp4" from={20.5} /></Cam></WhipIn><Caption words={W04_D} t={t} /></Sequence>
      {/* E: tangan menenun dari atas (7647) + tanda di pojok */}
      <Sequence {...shot(cut[3], cut[4])}>
        <WhipIn dir={-1}><Cam keys={[[0, 0, 0, 1.1], [2.2, 0, 0, 1.0]]}><Clip src="footage/7647-full.mp4" from={9} /></Cam></WhipIn>
        <Caption words={W04_E} t={t} />
        <div style={{ position: 'absolute', left: 64, top: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 18, ...glass(0.36), opacity: ez(t, cut[3] + 0.3, cut[3] + 0.8) }}>
          <Mark size={26} speaking />
          <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, color: INK, letterSpacing: -0.4 }}>BelajarTenun</span>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// ── susunan babak ───────────────────────────────────────────────────────────
const SC = { s01: [0, 4.8], s02: [4.8, 13.8], s03: [13.8, 18.5], s04: [18.5, 29.9] };
export const INTRO_SECONDS = 30;
export const Intro: React.FC = () => {
  const seq = ([a, b]: number[]) => ({ from: F(a), durationInFrames: F(b - a) });
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence {...seq(SC.s01)}><WhipOut dir={-1} dur={F(4.8)}><S01 /></WhipOut></Sequence>
      <Sequence {...seq(SC.s02)}><WhipIn dir={1}><S02 /></WhipIn></Sequence>
      <Sequence {...seq(SC.s03)}><S03 /></Sequence>
      <Sequence {...seq(SC.s04)}><S04 /></Sequence>
      {/* suara Andrew (dibersihkan): 01+02 satu rekaman, 03, lalu VO 04 */}
      <Sequence {...seq([0, 13.8])}><Audio src={staticFile('audio/7633-clean.wav')} startFrom={F(0.5)} /></Sequence>
      <Sequence {...seq(SC.s03)}><Audio src={staticFile('audio/7634b-clean.wav')} /></Sequence>
      <Sequence {...seq(SC.s04)}><Audio src={staticFile('audio/7634a-clean.wav')} startFrom={F(o4)} /></Sequence>
      <Sequence from={F(SC.s04[0])}><Audio src={staticFile('sfx/success.wav')} volume={0.35} /></Sequence>
      {[SC.s02[0] - 0.12, SC.s03[1] - 0.3, ...[1.6, 4.0, 6.6, 9.2].map((c) => SC.s04[0] + c - 0.08)].map((at, i) => (
        <Sequence key={'w' + i} from={F(at)}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
