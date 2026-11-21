import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mark, LOGO } from './brand';
import { Babak1V7, B1V7_SECONDS, Captions, Sfx, Vignette, Wd, Cue } from './b1v7';
import { Learn, LEARN_SECONDS, S24, S26 } from './full3';
import DOTS from '../public/3d/dots.json';

// Video utuh v7: gaya Babak 1 v7 untuk seluruh video.
// Andrew bergeser & grafik muncul di sisinya (tanpa figur orang di atas Andrew);
// figur/konsep layar penuh krem; UI aplikasi asli dianimasikan; SFX per kejadian.

const FPS = 30;
const F = (s: number) => Math.round(s * FPS);
const NAVY = LOGO.navy, GOLD = LOGO.gold, CREAM = LOGO.cream, GOLDD = '#b08f3a';
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });
const io = (t: number, a: number, b: number) => ez(t, a, b, Easing.inOut(Easing.cubic));
const sp = (f: number, at: number, cfg = { damping: 16, stiffness: 160 }) => spring({ frame: f - F(at), fps: FPS, config: cfg });
const W = (list: [string, number][], off = 0): Wd[] => list.map(([w, t]) => [w, t - off]);
const useT = () => { const f = useCurrentFrame(); return { f, t: f / FPS }; };
type P2 = [number, number];
const D = DOTS as unknown as { indo: P2[]; world: [number, number, number][]; places: Record<string, P2> };

// ── Bahan bersama ────────────────────────────────────────────────────────────
export const glassCard = (o = 0.78): React.CSSProperties => ({ background: `linear-gradient(160deg, rgba(255,255,255,${o}), rgba(255,255,255,${o - 0.22}))`, border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 30px 80px rgba(20,28,58,0.16)', backdropFilter: 'blur(24px) saturate(160%)' });
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = NAVY, style }) => (
  <div style={{ fontFamily: FONT, fontSize: 20, letterSpacing: 4, fontWeight: 700, color, opacity: 0.7, ...style }}>{children}</div>
);

// Andrew bicara; `slide` (0..1) menggeser ke kiri dan menyisakan ruang di kanan.
export const Andrew: React.FC<{ src: string; from: number; slide: number; push?: number; blur?: number }> = ({ src, from, slide, push = 0, blur = 0 }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 40%', transform: `translateX(${-330 * slide}px) scale(${1.02 + push + 0.4 * slide})`, filter: blur ? `blur(${blur}px)` : undefined }}>
      <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted style={{ width: '100%', height: '100%' }} />
      <Vignette />
    </div>
    <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(10,14,30,0) 32%, rgba(10,14,30,${0.55 * slide}) 68%)` }} />
  </AbsoluteFill>
);

// Jari: lingkaran putih + riak saat menekan
export const Finger: React.FC<{ path: [number, number, number][]; taps: number[] }> = ({ path, taps }) => {
  const { t } = useT();
  if (t < path[0][0] - 0.2 || t > path[path.length - 1][0] + 0.4) return null;
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) { const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i]; if (t >= t0) { const e = Easing.inOut(Easing.cubic)(Math.min(1, (t - t0) / Math.max(0.01, t1 - t0))); x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e; } }
  const press = taps.reduce((a, c) => Math.max(a, 1 - Math.min(1, Math.abs(t - c) / 0.14)), 0);
  const ripple = taps.map((c) => (t > c && t < c + 0.5 ? (t - c) / 0.5 : -1)).find((r) => r >= 0) ?? -1;
  const o = ez(t, path[0][0] - 0.2, path[0][0]) * (1 - ez(t, path[path.length - 1][0] + 0.1, path[path.length - 1][0] + 0.4));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: o, pointerEvents: 'none' }}>
      {ripple >= 0 && <circle cx={x} cy={y} r={20 + ripple * 50} fill="none" stroke={GOLD} strokeWidth={4} opacity={1 - ripple} />}
      <circle cx={x} cy={y} r={26 - press * 5} fill="rgba(255,255,255,0.92)" stroke="rgba(20,28,58,0.25)" strokeWidth={2} style={{ filter: 'drop-shadow(0 8px 16px rgba(20,28,58,0.3))' } as React.CSSProperties} />
    </svg>
  );
};

// HP kaca berisi layar krem
const Phone: React.FC<{ x: number; y: number; w?: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w = 400, h = 820, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 60, padding: 14, ...glassCard(0.55), ...style }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 48, background: CREAM, overflow: 'hidden', position: 'relative', fontFamily: FONT, color: NAVY }}>{children}</div>
  </div>
);
// Laptop kaca (untuk halaman admin)
export const Laptop: React.FC<{ x: number; y: number; w?: number; h?: number; url: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w = 1240, h = 760, url, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 26, padding: 12, ...glassCard(0.6), ...style }}>
    <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: 'rgba(20,28,58,0.18)' }} />)}
      <div style={{ marginLeft: 18, flex: 1, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.7)', fontFamily: FONT, fontSize: 15, color: 'rgba(20,28,58,0.6)', display: 'flex', alignItems: 'center', paddingLeft: 14 }}>{url}</div>
    </div>
    <div style={{ height: h - 68, borderRadius: 16, background: '#fbf8f1', overflow: 'hidden', position: 'relative', fontFamily: FONT, color: NAVY }}>{children}</div>
  </div>
);

// Layar laptop = tangkapan layar halaman admin asli (1440×900 CSS)
const LK = 1216 / 1440;
export const lp = (x: number, y: number, X = 340, Y = 110): [number, number] => [X + 12 + x * LK, Y + 56 + y * LK];
export const Ring: React.FC<{ x: number; y: number; w: number; h: number; at: number; label?: string; side?: 'top' | 'bottom' }> = ({ x, y, w, h, at, label, side = 'bottom' }) => {
  const { f, t } = useT();
  if (t < at) return null;
  const p = spring({ frame: f - F(at), fps: FPS, config: { damping: 14, stiffness: 200 } });
  return (
    <>
      <div style={{ position: 'absolute', left: x - 10, top: y - 10, width: w + 20, height: h + 20, borderRadius: 16, border: `4px solid ${GOLD}`, boxShadow: '0 0 0 9999px rgba(20,28,58,0.08)', opacity: Math.min(1, p * 1.5), transform: `scale(${1.08 - 0.08 * p})` }} />
      {label && <div style={{ position: 'absolute', left: x - 10, top: side === 'bottom' ? y + h + 22 : y - 70, padding: '10px 18px', borderRadius: 14, background: NAVY, color: '#fff', fontFamily: FONT, fontSize: 22, fontWeight: 700, opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>{label}</div>}
    </>
  );
};

// Peta titik Indonesia (dan dunia)
export const DotMap: React.FC<{ lit: number; pins?: [string, number][]; dim?: number; world?: number; scale?: number; cx?: number; cy?: number; color?: string }> = ({ lit, pins = [], world = 0, scale = 1, cx = 960, cy = 570, color = NAVY }) => {
  const { t } = useT();
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
        {world < 1 && (
          <g opacity={1 - world}>
            {D.indo.map(([x, y], i) => {
              const k = (x - 140) / 1640;
              const on = lit > k;
              return <circle key={i} cx={x} cy={y} r={on ? 6.2 : 5} fill={on ? color : 'rgba(20,28,58,0.16)'} />;
            })}
          </g>
        )}
        {pins.map(([name, at]) => {
          const p = D.places[name]; if (!p) return null;
          const s = spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping: 11, stiffness: 200 } });
          if (t < at) return null;
          const r = (t - at) % 1.6;
          return (
            <g key={name}>
              <circle cx={p[0]} cy={p[1]} r={14 + r * 40} fill="none" stroke={GOLD} strokeWidth={3} opacity={Math.max(0, 1 - r / 1.2)} />
              <circle cx={p[0]} cy={p[1]} r={15 * s} fill={GOLD} stroke="#fff" strokeWidth={4} />
            </g>
          );
        })}
      </g>
      {world > 0 && (
        <g opacity={world}>
          {D.world.map(([x, y, id], i) => <circle key={i} cx={x} cy={y} r={id ? 5 : 4} fill={id ? GOLD : 'rgba(20,28,58,0.22)'} />)}
        </g>
      )}
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ALUR PENGGUNA (tanpa narasi; musik + SFX + teks langkah). UI dibangun ulang dari web/src/pages.
// ════════════════════════════════════════════════════════════════════════════
const PX = 1060, PY = 110; // posisi HP
const SC = 372 / 390; // tangkapan layar asli (lebar 390 px CSS) → layar HP
const tp = (x: number, y: number): [number, number] => [PX + 14 + x * SC, PY + 14 + y * SC];
const STEPS: [number, string, string, string][] = [
  [0.0, '01', 'Buka belajartenun.com', 'masuk dengan akun Google'],
  [2.6, '02', 'Pilih kain di dasbor', 'lanjutkan dari terakhir'],
  [5.2, '03', 'Lihat tahap latihan', 'instruksi tiap tahap'],
  [8.4, '04', 'Sambungkan kacamata', 'kamera di kacamata, tutor di HP'],
  [13.4, '05', 'Latihan bersama tutor', 'bilang “sudah”, “ulangi”, atau bertanya'],
];
export const ALUR_SECONDS = 17.2;
// Layar HP = tangkapan layar aplikasi asli (web/src/pages) yang dijalankan lokal.
const Shot: React.FC<{ src: string; at: number; y?: number }> = ({ src, at, y = 0 }) => {
  const { f } = useT();
  const p = spring({ frame: f - F(at), fps: FPS, config: { damping: 20, stiffness: 150 } });
  return <Img src={staticFile(`ui/${src}`)} style={{ position: 'absolute', left: 0, top: -y, width: '100%', transform: `translateY(${(1 - Math.min(1, p)) * 50}px)`, opacity: Math.min(1, p * 1.5) }} />;
};
const Alur: React.FC = () => {
  const { f, t } = useT();
  const st = [...STEPS].reverse().find((s) => t >= s[0])!;
  const stP = sp(f, st[0], { damping: 18, stiffness: 170 });
  const screen = t < 2.6 ? 'landing' : t < 5.2 ? 'belajar' : t < 8.4 ? 'kenal' : t < 9.25 ? 'siapkan' : t < 11.7 ? 'kacamata' : t < 13.4 ? 'tersambung' : 'praktik';
  const glassesIn = sp(f, 9.3, { damping: 18, stiffness: 90 });
  const flow = t > 10.5 && t < 13.5;
  const zoomOut = io(t, 16.1, 17.2);
  const qi = Math.floor(((t - 13.4) * 10) % 30);
  const [bx, by] = tp(195, 366), [mx, my] = tp(194, 358), [lx, ly] = tp(94, 248), [kx, ky] = tp(194, 395), [sx, sy] = tp(111, 469);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + zoomOut * 1.8})`, transformOrigin: `${PX + 200}px ${PY + 410}px`, opacity: 1 - ez(t, 16.7, 17.2) }}>
        <div style={{ position: 'absolute', left: 150, top: 360, fontFamily: FONT, color: NAVY, width: 760 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>{STEPS.map(([a, n]) => <div key={n} style={{ height: 6, width: 54, borderRadius: 3, background: t >= a ? GOLD : 'rgba(20,28,58,0.12)' }} />)}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD, letterSpacing: 2, transform: `translateY(${(1 - stP) * 20}px)`, opacity: stP }}>LANGKAH {st[1]}</div>
          <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, marginTop: 10, transform: `translateY(${(1 - stP) * 30}px)`, opacity: stP }}>{st[2]}</div>
          <div style={{ fontSize: 28, marginTop: 18, opacity: 0.6 * stP }}>{st[3]}</div>
        </div>
        {t > 9.1 && t < 13.8 && (
          <div style={{ position: 'absolute', left: 420, top: 560, width: 760, height: 430, transform: `translateY(${(1 - glassesIn) * 400}px)`, opacity: Math.min(1, glassesIn * 1.5) * (1 - ez(t, 13.4, 13.8)) }}>
            <Img src={staticFile('3d/glasses-still.png')} style={{ position: 'absolute', left: -330, top: -80, width: 1920 * 0.55, height: 1080 * 0.55 }} />
          </div>
        )}
        {flow && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <path d={`M 860 720 C 950 640, 1000 600, ${PX + 30} 560`} fill="none" stroke={GOLD} strokeWidth={5} strokeDasharray="6 18" strokeDashoffset={-t * 120} strokeLinecap="round" opacity={ez(t, 10.5, 10.8) * (1 - ez(t, 13.1, 13.5))} />
            {[0, 1, 2].map((i) => { const r = ((t * 1.4 + i / 3) % 1); return <circle key={i} cx={860} cy={720} r={20 + r * 70} fill="none" stroke={GOLD} strokeWidth={3} opacity={(1 - r) * ez(t, 10.5, 10.8) * (1 - ez(t, 13.1, 13.5))} />; })}
          </svg>
        )}
        <Phone x={PX} y={PY}>
          {screen === 'landing' && <Shot src="w-01-landing.png" at={0.1} />}
          {screen === 'belajar' && <Shot src="w-03-belajar.png" at={2.6} />}
          {screen === 'kenal' && <Shot src="w-04-kenal.png" at={5.2} />}
          {screen === 'siapkan' && <Shot src="w-05-siapkan.png" at={8.4} />}
          {screen === 'kacamata' && <Img src={staticFile('ui/w-05b-kacamata.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%' }} />}
          {screen === 'tersambung' && <Img src={staticFile('ui/w-06-tersambung.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%' }} />}
          {screen === 'praktik' && <Img src={staticFile(`ui/praktik-${String(Math.max(0, qi)).padStart(2, '0')}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: '100%' }} />}
          {screen === 'praktik' && (
            <div style={{ position: 'absolute', left: 16, right: 16, bottom: 150, padding: '14px 18px', borderRadius: 20, background: 'rgba(20,28,58,0.72)', color: '#fff', fontSize: 15, lineHeight: 1.4, ...{ opacity: ez(t, 14.2, 14.6) } }}>
              Tutor memindahkan tahap sendiri. Bilang "sudah", "ulangi", atau tanyakan apa saja.
            </div>
          )}
        </Phone>
        <Finger path={[[1.7, bx + 40, by + 300], [2.1, bx, by], [2.4, bx, by], [4.1, mx + 40, my + 300], [4.6, mx, my], [4.9, mx, my], [7.0, lx + 60, ly + 300], [7.5, lx, ly], [7.8, lx, ly], [8.7, kx + 40, ky + 300], [9.2, kx, ky], [9.9, sx, sy], [10.4, sx, sy], [10.9, sx + 60, sy + 260]]} taps={[2.25, 4.75, 7.65, 9.2, 10.4]} />
      </div>
      <Sfx cues={[[0.1, 'whoosh', 0.3], [2.25, 'click', 0.6], [2.6, 'whoosh', 0.3], [4.75, 'click', 0.6], [5.2, 'whoosh', 0.3], [7.65, 'click', 0.6], [8.4, 'whoosh', 0.3], [9.2, 'toggle', 0.5], [9.3, 'whoosh', 0.35], [10.4, 'click', 0.6], [10.6, 'blip', 0.35], [11.0, 'blip', 0.3], [11.7, 'ding', 0.5], [13.4, 'whoosh', 0.3], [14.2, 'pop3', 0.35], [16.0, 'riser', 0.3]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 05 · "Ilmu tenun sudah ada di mana-mana…" Andrew + peta titik → dinding video
// ════════════════════════════════════════════════════════════════════════════
export const REFS: [string, string][] = [['ref/silungkang.mp4', 'Silungkang'], ['ref/ntt.mp4', 'NTT'], ['ref/sumut.mp4', 'Sumatra Utara'], ['ref/lombok.mp4', 'Lombok'], ['ref/silungkang2.mp4', 'Silungkang'], ['ref/proses.mp4', 'Proses']];
export const S05: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Ilmu', 0.91], ['tenun', 1.55], ['sebenarnya', 1.97], ['sudah', 2.51], ['ada', 2.67], ['di', 3.01], ['mana-mana,', 3.17], ['ribuan', 3.93], ['video', 4.67], ['dan', 4.99], ['arsip', 5.23], ['yang', 6.03], ['dibagikan', 6.29], ['terbuka', 6.67], ['di', 7.09], ['internet,', 7.21], ['dan', 7.47], ['banyak', 7.89], ['tradisi.', 8.17]], 0.6);
  const slide = io(t, 0.3, 1.0);
  const wall = t >= 3.3;
  const wallP = io(t, 3.3, 3.8);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!wall && <Andrew src="footage/7635b-full.mp4" from={0.6} slide={slide} />}
      {!wall && (
        <div style={{ position: 'absolute', left: 700, top: 120, width: 1920, height: 1080, transform: 'scale(0.62)', transformOrigin: '0 0', opacity: ez(t, 0.7, 1.0) }}>
          <DotMap lit={io(t, 0.9, 2.9)} color={GOLD} pins={[]} />
        </div>
      )}
      {!wall && <div style={{ position: 'absolute', right: 110, top: 150, opacity: ez(t, 2.4, 2.7) }}><Kicker color="#fff">DI MANA-MANA</Kicker></div>}
      {wall && (
        <AbsoluteFill style={{ background: CREAM, opacity: wallP, perspective: 1600 }}>
          <div style={{ position: 'absolute', left: -200, top: -200, width: 2400, transform: `rotateX(18deg) rotateZ(-8deg) translateY(${-(t - 3.3) * 60}px) scale(${1.05 - 0.05 * wallP})`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 26 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const [src, lab] = REFS[i % REFS.length];
              const p = sp(f, 3.35 + i * 0.07, { damping: 18, stiffness: 160 });
              const showLab = t > 7.5;
              return (
                <div key={i} style={{ height: 330, borderRadius: 22, overflow: 'hidden', position: 'relative', transform: `scale(${0.7 + 0.3 * p})`, opacity: p, boxShadow: '0 24px 60px rgba(20,28,58,0.25)' }}>
                  <OffthreadVideo src={staticFile(src)} startFrom={F(2 + (i % 5) * 3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {showLab && <div style={{ position: 'absolute', left: 16, bottom: 14, padding: '8px 14px', borderRadius: 14, background: 'rgba(245,239,226,0.92)', color: NAVY, fontFamily: FONT, fontSize: 22, fontWeight: 800, transform: `translateY(${(1 - sp(f, 7.5 + (i % 4) * 0.05)) * 20}px)` }}>{lab}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 120, top: 110, padding: '18px 26px', borderRadius: 22, ...glassCard(0.85) }}>
            <Kicker>VIDEO & ARSIP TERBUKA</Kicker>
            <div style={{ fontFamily: FONT, fontSize: 52, fontWeight: 900, color: NAVY, letterSpacing: -2 }}>Silungkang · NTT · Sumut · Lombok</div>
          </div>
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['mana', 'ribuan', 'terbuka', 'tradisi']} dark={(x) => x > 3.3} />
      <Sfx cues={[[0.3, 'whoosh', 0.3], ...Array.from({ length: 8 }, (_, i) => [1.0 + i * 0.24, 'pop3', 0.2] as Cue), [3.3, 'whoosh', 0.4], ...Array.from({ length: 10 }, (_, i) => [3.4 + i * 0.08, 'tick', 0.18] as Cue), [7.5, 'pop2', 0.4]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 06 · AI memecah gerakan → tahap, istilah, kesalahan → menggabungkan pola
// ════════════════════════════════════════════════════════════════════════════
const STAGE5 = ['Mengenal alat', 'Membuka lungsi', 'Masukkan pakan', 'Rapatkan', 'Ulangi baris'];
const S06: React.FC = () => {
  const { f, t } = useT();
  const words = W([['AI', 0.14], ['memecah', 0.88], ['setiap', 1.36], ['gerakan', 1.7], ['jadi', 2.12], ['setiap', 2.32], ['tahap,', 2.68], ['istilah,', 3.62], ['dan', 4.12], ['kesalahan', 4.46], ['yang', 5.1], ['sering', 5.2], ['terjadi.', 5.38], ['Lalu', 6.56], ['menggabungkan', 6.9], ['pola', 7.58], ['dari', 8.04], ['banyak', 8.26], ['penenun', 8.46], ['menjadi', 8.96], ['satu.', 9.52]]);
  const merge = io(t, 6.7, 8.2);
  const cuts = io(t, 1.6, 2.8);
  const scan = (t * 0.45) % 1;
  // titik "pelacakan" mengikuti area tangan (perkiraan bergerak halus)
  const pts: P2[] = Array.from({ length: 9 }, (_, i) => [760 + Math.sin(t * 2.3 + i) * 60 + (i % 3) * 46, 520 + Math.cos(t * 1.9 + i * 0.7) * 30 + Math.floor(i / 3) * 40]);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {/* video Lombok di panel kiri */}
      <div style={{ position: 'absolute', left: 80, top: 90, width: 1120, height: 640, borderRadius: 30, overflow: 'hidden', boxShadow: '0 30px 80px rgba(20,28,58,0.22)', transform: `scale(${1 - merge * 0.08}) translateY(${-merge * 30}px)`, transformOrigin: '50% 0' }}>
        <OffthreadVideo src={staticFile('ref/lombok.mp4')} startFrom={F(4)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 3, background: `linear-gradient(90deg, rgba(212,184,102,0), ${GOLD}, rgba(212,184,102,0))`, opacity: 0.8 * (1 - merge) }} />
        <svg width={1120} height={640} style={{ position: 'absolute', inset: 0, opacity: ez(t, 0.4, 0.8) * (1 - merge) }}>
          {pts.map(([x, y], i) => i % 3 < 2 && <line key={'l' + i} x1={x - 80} y1={y - 120} x2={pts[i + 1][0] - 80} y2={pts[i + 1][1] - 120} stroke={GOLD} strokeWidth={3} opacity={0.8} />)}
          {pts.map(([x, y], i) => <circle key={i} cx={x - 80} cy={y - 120} r={7} fill="#fff" stroke={GOLD} strokeWidth={3} />)}
          {t > 4.4 && <g transform="translate(620 300)" opacity={ez(t, 4.4, 4.7)}><circle r={70 + Math.sin(t * 6) * 4} fill="none" stroke={GOLD} strokeWidth={5} /><text x={90} y={-40} fontFamily={FONT} fontSize={26} fontWeight={800} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,30,0.5)', strokeWidth: 6 } as React.CSSProperties}>⚠ pakan terlalu kencang</text></g>}
        </svg>
        <div style={{ position: 'absolute', left: 22, top: 20, padding: '8px 14px', borderRadius: 14, background: 'rgba(245,239,226,0.92)', fontFamily: FONT, fontSize: 18, fontWeight: 800, color: NAVY }}>Lombok · video terbuka</div>
      </div>
      {/* panel istilah (sumber.html: "Istilah lokal (dugaan AI)") */}
      <div style={{ position: 'absolute', left: 1250, top: 90, width: 590, padding: 30, borderRadius: 28, ...glassCard(0.82), opacity: ez(t, 3.4, 3.7) * (1 - merge), transform: `translateX(${(1 - ez(t, 3.4, 3.8)) * 60}px)`, fontFamily: FONT, color: NAVY }}>
        <Kicker>ISTILAH & SEBUTAN LAIN</Kicker>
        {[['lungsi', 'lusi'], ['pedang', 'belida'], ['sekoci', 'teropong · torak'], ['sisir', 'suri']].map(([w, c], i) => (
          <div key={w} style={{ marginTop: 18, paddingBottom: 14, borderBottom: '1px solid rgba(20,28,58,0.1)', opacity: ez(t, 3.6 + i * 0.15, 3.9 + i * 0.15), transform: `translateX(${(1 - ez(t, 3.6 + i * 0.15, 4.0 + i * 0.15)) * 30}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{w}</div>
            <div style={{ fontSize: 20, color: GOLDD, fontWeight: 700, marginTop: 2 }}>juga disebut {c}</div>
          </div>
        ))}
      </div>
      {/* garis waktu: dipotong jadi 5 tahap, lalu 3 garis menyatu jadi satu */}
      {[0, 1, 2].map((row) => {
        const y = 790 + (row - 1) * 70 * (1 - merge) + (row === 1 ? 0 : 0);
        const o = row === 1 ? 1 : ez(t, 6.6, 6.9) * (1 - ez(t, 7.9, 8.2));
        return (
          <div key={row} style={{ position: 'absolute', left: 80, top: y + merge * 40, width: 1760, height: 56, display: 'flex', gap: 8 * cuts, opacity: o }}>
            {STAGE5.map((s, i) => (
              <div key={s} style={{ flex: [1.1, 0.9, 1.2, 0.8, 1][(i + row) % 5], borderRadius: 14, background: i % 2 ? NAVY : GOLD, color: i % 2 ? '#fff' : NAVY, fontFamily: FONT, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: row === 1 ? 0.35 + 0.65 * ez(t, 1.8 + i * 0.15, 2.1 + i * 0.15) : 0.85 }}>{row === 1 && cuts > 0.5 ? s : ''}</div>
            ))}
          </div>
        );
      })}
      {t > 8.2 && <div style={{ position: 'absolute', left: 80, top: 880, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: NAVY, opacity: ez(t, 8.2, 8.5) }}>= Modul dasar <span style={{ color: GOLDD }}>· dari banyak penenun</span></div>}
      <Captions words={words} keys={['tahap', 'istilah', 'kesalahan', 'satu']} dark={() => true} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], [0.4, 'blip', 0.3], ...STAGE5.map((_, i) => [1.8 + i * 0.15, 'tick', 0.45] as Cue), [3.6, 'pop', 0.4], ...[0, 1, 2, 3].map((i) => [3.6 + i * 0.15, 'pop3', 0.25] as Cue), [4.4, 'snap', 0.5], [6.6, 'whoosh', 0.35], [8.0, 'impact', 0.45]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 07 · "Tapi AI bisa saja salah" → editor kurikulum: dikoreksi & divalidasi penenun
// ════════════════════════════════════════════════════════════════════════════
const S07: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Tapi', 0.14], ['AI', 0.7], ['bisa', 1.06], ['saja', 2.1], ['salah.', 2.3], ['Untuk', 2.56], ['menjaga', 3.56], ['kualitas,', 4.04], ['setiap', 4.74], ['tahap', 5.88], ['diperiksa', 6.52], ['penenun', 7.04], ['sebelum', 7.58], ['diajarkan.', 8.34]]);
  const slide = io(t, 0.2, 0.8);
  const ed = t >= 2.6;
  const glitch = t > 2.0 && t < 2.6 ? Math.sin(t * 90) * 6 : 0;
  const fixed = 'Angkat lungsi selang-seling'.slice(0, Math.max(0, Math.floor((t - 4.6) * 18)));
  const stamp = sp(f, 6.6, { damping: 9, stiffness: 260 });
  const status = t > 6.6 ? 'Tervalidasi' : 'Draf';
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!ed && <Andrew src="footage/7636-full.mp4" from={0} slide={slide} />}
      {!ed && (
        <div style={{ position: 'absolute', left: 1180, top: 300, width: 600, padding: 30, borderRadius: 28, ...glassCard(0.85), fontFamily: FONT, color: NAVY, transform: `translateX(${(1 - ez(t, 0.5, 0.9)) * 120 + glitch}px)`, opacity: ez(t, 0.5, 0.8) }}>
          <Kicker>DRAF DARI AI · TAHAP 2</Kicker>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 12, lineHeight: 1.2 }}>Angkat <span style={{ color: t > 2.0 ? '#9a7b2c' : NAVY, textDecoration: t > 2.0 ? 'line-through' : 'none', display: 'inline-block', transform: `translate(${glitch * 0.6}px, ${-glitch * 0.3}px)` }}>pakan</span> selang-seling</div>
          {t > 2.1 && <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, color: GOLDD }}>⚠ istilah keliru</div>}
        </div>
      )}
      {ed && (
        <AbsoluteFill style={{ opacity: ez(t, 2.6, 2.9) }}>
          <Laptop x={340} y={110} w={1240} h={800} url="belajartenun.com/editor.html">
            <Img src={staticFile('ui/d-editor.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${-io(t, 3.2, 4.0) * 120}px)` }} />
          </Laptop>
          {(() => { const sh = 120 * io(t, 3.2, 4.0) / LK; const [x1, y1] = lp(355, 428 - sh); const [x2, y2] = lp(1195, 470 - sh); const [x3, y3] = lp(360, 634 - sh); const [x4, y4] = lp(1341, 870); return (
            <>
              <Ring x={x1} y={y1} w={250} h={28} at={4.0} label="Tahap: 5 · 0 tervalidasi" side="top" />
              <Ring x={x2} y={y2} w={100} h={22} at={6.4} />
              <Ring x={x3} y={y3} w={810} h={80} at={7.0} label="Penenun memeriksa instruksi tiap tahap" />
              <Finger path={[[7.6, x4 + 200, y4 + 200], [8.1, x4 + 60, y4 + 14], [8.4, x4 + 60, y4 + 14]]} taps={[8.25]} />
            </>
          ); })()}
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['salah', 'kualitas', 'diperiksa', 'penenun']} dark={(x) => x > 2.6} />
      <Sfx cues={[[0.2, 'whoosh', 0.3], [0.6, 'pop2', 0.4], [2.0, 'snap', 0.5], [2.6, 'whoosh', 0.35], [3.9, 'click', 0.5], ...Array.from({ length: 10 }, (_, i) => [4.6 + i * 0.12, 'tick', 0.15] as Cue), [6.5, 'click', 0.5], [6.62, 'impact', 0.6], [6.85, 'pop3', 0.3], [7.1, 'pop3', 0.3], [8.25, 'click', 0.5], [8.35, 'ding', 0.45]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MITRA · Puta Dino Kayangan, Tidore (tanpa narasi)
// ════════════════════════════════════════════════════════════════════════════
export const MITRA_SECONDS = 12.4;
const ORNAMEN: [string, string][] = [['jodati', 'ketulusan hati'], ['barakati', 'diberkati'], ['marasante', 'keberanian']];
const Mitra: React.FC = () => {
  const { f, t } = useT();
  const td = D.places.Tidore;
  const fly = io(t, 0.6, 2.0);
  const mapOut = 1 - ez(t, 2.3, 2.7);
  const knot = io(t, 3.0, 3.7);
  const part2 = t >= 6.0, part3 = t >= 8.9;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {mapOut > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: mapOut, transform: `translate(${(960 - td[0]) * fly}px, ${(540 - td[1]) * fly}px) scale(${1 + 1.6 * fly})`, transformOrigin: `${td[0]}px ${td[1]}px` }}>
          <DotMap lit={1} pins={[['Tidore', 1.7]]} />
        </div>
      )}
      {t > 2.3 && !part2 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: ez(t, 2.3, 2.6) * (1 - ez(t, 5.7, 6.0)) }}>
          <Kicker style={{ position: 'absolute', top: 210 }}>MITRA PENENUN</Kicker>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 520, height: 260, borderRadius: 36, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', transform: `translateX(${(1 - knot) * -80}px)` }}>
              <Img src={staticFile('brand/partner-puta-dino-kayangan.png')} style={{ width: 430 }} />
            </div>
            <svg width={200} height={120}><path d={`M0 60 C 60 ${60 - 40 * knot}, 140 ${60 + 40 * knot}, 200 60`} fill="none" stroke={GOLD} strokeWidth={6} strokeDasharray={260} strokeDashoffset={260 * (1 - knot)} />{knot > 0.95 && <circle cx={100} cy={60} r={12 * sp(f, 3.7, { damping: 8, stiffness: 300 })} fill={GOLD} />}</svg>
            <div style={{ width: 260, height: 260, borderRadius: 36, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', transform: `translateX(${(1 - knot) * 80}px)` }}><Mark size={170} /></div>
          </div>
          <div style={{ position: 'absolute', top: 760, textAlign: 'center', fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, opacity: ez(t, 3.8, 4.1) }}>UKM Puta Dino Kayangan · Soasio, Tidore</div>
            <div style={{ fontSize: 26, marginTop: 14, opacity: ez(t, 4.4, 4.7) * 0.75 }}>Puta dino, kain warisan Kesultanan Tidore · sempat punah <b style={{ color: GOLDD }}>±{Math.round(100 * ez(t, 4.4, 5.2))} tahun</b> · ditenun kembali sejak <b style={{ color: GOLDD }}>2018</b> oleh Anitawati Gathmir</div>
          </div>
        </AbsoluteFill>
      )}
      {part2 && !part3 && (
        <AbsoluteFill style={{ opacity: ez(t, 6.0, 6.3) * (1 - ez(t, 8.6, 8.9)) }}>
          <div style={{ position: 'absolute', left: 150, top: 330, width: 560, fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD }}>KERJA SAMA 1</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, marginTop: 8 }}>Validasi materi bersama penenun</div>
          </div>
          {['Puta Dino motif Jodati', 'Puta Dino motif Barakati', 'Puta Dino motif Marasante'].map((s, i) => {
            const p = sp(f, 6.2 + i * 0.15);
            const st = sp(f, 6.9 + i * 0.45, { damping: 9, stiffness: 280 });
            return (
              <div key={s} style={{ position: 'absolute', left: 860, top: 230 + i * 200, width: 860, padding: '28px 32px', borderRadius: 26, background: '#fff', boxShadow: '0 24px 60px rgba(20,28,58,0.12)', fontFamily: FONT, color: NAVY, transform: `translateX(${(1 - p) * 200}px)`, opacity: p, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, opacity: 0.5 }}>MODUL · 6 TAHAP</div><div style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}>{s}</div></div>
                {t > 6.9 + i * 0.45 && <div style={{ padding: '10px 16px', borderRadius: 14, border: `3px solid ${GOLD}`, color: GOLDD, fontSize: 16, fontWeight: 900, letterSpacing: 1, transform: `rotate(-6deg) scale(${2 - st})`, opacity: Math.min(1, st * 1.6), textAlign: 'center' }}>DIPERIKSA BERSAMA<br />PENENUN PUTA DINO KAYANGAN</div>}
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      {part3 && (
        <AbsoluteFill style={{ opacity: ez(t, 8.9, 9.2) }}>
          <div style={{ position: 'absolute', left: 150, top: 150, fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD }}>KERJA SAMA 2</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, marginTop: 8 }}>Arsip mitra jadi materi belajar</div>
          </div>
          {ORNAMEN.map(([n, m], i) => {
            const k = io(t, 9.4 + i * 0.25, 10.3 + i * 0.25);
            return (
              <div key={n} style={{ position: 'absolute', left: 150 + i * 560, top: 400, width: 500, height: 430, borderRadius: 30, overflow: 'hidden', background: '#fff', boxShadow: '0 24px 60px rgba(20,28,58,0.14)', transform: `rotate(${(1 - k) * (i - 1) * 8}deg) translateY(${(1 - k) * 60}px)` }}>
                <div style={{ height: 200, position: 'relative', background: k < 0.5 ? '#efe6d3' : NAVY, transition: 'none' }}>
                  {k < 0.5 ? (
                    <div style={{ padding: 26, fontFamily: FONT, color: NAVY }}>
                      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, opacity: 0.55 }}>ARSIP</div>
                      {[0, 1, 2, 3].map((j) => <div key={j} style={{ height: 10, borderRadius: 5, background: 'rgba(20,28,58,0.15)', marginTop: 16, width: `${90 - j * 15}%` }} />)}
                    </div>
                  ) : (
                    <svg width={500} height={200} viewBox="0 0 500 200">{Array.from({ length: 10 }, (_, c) => Array.from({ length: 4 }, (_, r) => { const d = Math.abs(((c * 50 + 25) % 100) - 50) + Math.abs(((r * 50 + 25) % 100) - 50); return <rect key={c + '-' + r} x={c * 50 + 10} y={r * 50 + 10} width={30} height={30} transform={`rotate(45 ${c * 50 + 25} ${r * 50 + 25})`} fill={d < 30 ? GOLD : 'rgba(245,239,226,0.2)'} />; }))}</svg>
                  )}
                </div>
                <div style={{ padding: 26, fontFamily: FONT, color: NAVY, opacity: ez(k, 0.4, 1) }}>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, opacity: 0.5 }}>MODUL · ORNAMEN PUTA DINO</div>
                  <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, marginTop: 4 }}>{n}</div>
                  <div style={{ fontSize: 22, color: GOLDD, fontWeight: 700 }}>makna: {m}</div>
                </div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: NAVY, opacity: ez(t, 11.0, 11.4) }}>Bersama penenun. <span style={{ color: GOLDD }}>Dari arsip mitra.</span></div>
        </AbsoluteFill>
      )}
      <Sfx cues={[[0.4, 'whoosh', 0.45], [1.7, 'impact', 0.5], [2.3, 'whoosh', 0.3], [3.7, 'snap', 0.5], [3.8, 'ding', 0.45], [4.4, 'tick', 0.3], [6.0, 'whoosh', 0.35], ...[0, 1, 2].map((i) => [6.9 + i * 0.45, 'impact', 0.4] as Cue), [8.9, 'whoosh', 0.35], ...[0, 1, 2].map((i) => [9.6 + i * 0.25, 'pop', 0.4] as Cue), [11.0, 'ding', 0.35]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 15 · "Penenun tidak tergantikan… akses dari mana saja" Andrew + jaringan
// ════════════════════════════════════════════════════════════════════════════
const NET: P2[] = [[1500, 300], [1700, 420], [1760, 610], [1640, 800], [1420, 880], [1230, 760], [1180, 520], [1300, 330], [1600, 560], [1390, 620]];
const S15: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Penenun', 0.43], ['tidak', 1.19], ['tergantikan.', 1.87], ['Dengan', 2.89], ['BelajarTenun,', 3.33], ['akses', 4.51], ['ke', 4.87], ['mereka', 4.99], ['terbuka', 5.29], ['untuk', 6.17], ['lebih', 6.35], ['banyak', 6.67], ['murid,', 7.03], ['dari', 7.55], ['mana', 7.95], ['saja.', 8.11]], 0.2);
  const slide = io(t, 2.6, 3.3);
  const C: P2 = [1470, 590];
  return (
    <AbsoluteFill>
      <Andrew src="footage/7637a-full.mp4" from={0.2} slide={slide} push={0.06 * io(t, 0, 2.5)} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: slide }}>
        {NET.map(([x, y], i) => { const a = 4.4 + i * 0.12; const k = ez(t, a, a + 0.4); return <line key={i} x1={C[0]} y1={C[1]} x2={C[0] + (x - C[0]) * k} y2={C[1] + (y - C[1]) * k} stroke={GOLD} strokeWidth={3} opacity={0.9} />; })}
        {NET.map(([x, y], i) => { const s = sp(f, 4.7 + i * 0.12, { damping: 10, stiffness: 240 }); return t > 4.7 + i * 0.12 && <g key={'d' + i}><circle cx={x} cy={y} r={14 * s} fill="#fff" /></g>; })}
        <circle cx={C[0]} cy={C[1]} r={30 * sp(f, 3.3, { damping: 10, stiffness: 200 })} fill={GOLD} stroke="#fff" strokeWidth={5} />
        <text x={C[0]} y={C[1] + 66} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={800} fill="#fff" opacity={ez(t, 3.5, 3.8)}>penenun</text>
      </svg>
      <Captions words={words} keys={['tergantikan', 'akses', 'murid', 'mana']} />
      <Sfx cues={[[2.6, 'whoosh', 0.3], [3.3, 'impact', 0.4], ...NET.map((_, i) => [4.7 + i * 0.12, 'pop3', 0.22] as Cue)]} />
    </AbsoluteFill>
  );
};

// 16 · catatan sesi (Selesai.tsx) di samping Andrew
export const S16: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Setiap', 0.18], ['sesi', 0.86], ['meninggalkan', 1.24], ['catatan:', 2.06], ['apa', 2.7], ['yang', 3.14], ['sudah', 3.28], ['bisa,', 3.46], ['apa', 4.52], ['yang', 4.76], ['membingungkan.', 4.9]]);
  const slide = io(t, 0.0, 0.6);
  const pin = sp(f, 0.3, { damping: 18, stiffness: 120 });
  return (
    <AbsoluteFill>
      <Andrew src="footage/7637b-full.mp4" from={0} slide={slide} />
      <Phone x={1230} y={110} w={420} h={860} style={{ transform: `translateY(${(1 - pin) * 900}px) rotate(${(1 - pin) * 8}deg)` }}>
        <Img src={staticFile('ui/w-08-selesai.png')} style={{ position: 'absolute', left: 0, top: -ez(t, 3.6, 4.4) * 230, width: '100%' }} />
      </Phone>
      <Captions words={words} keys={['catatan', 'bisa', 'membingungkan']} />
      <Sfx cues={[[0.3, 'whoosh', 0.35], [2.9, 'pop3', 0.35], [3.6, 'whoosh', 0.2], [4.6, 'pop', 0.4]]} />
    </AbsoluteFill>
  );
};

// 17 · progres.html: grafik per tahap, tahap tersulit diperbaiki
export const S17: React.FC = () => {
  const { t } = useT();
  const words = W([['Dari', 0.0], ['situ', 0.12], ['kami', 0.42], ['bisa', 0.7], ['mengukur', 0.88], ['efektivitasnya', 1.26], ['dan', 2.14], ['memperbaiki', 2.46], ['tahap', 2.88], ['yang', 3.36], ['paling', 3.52], ['sulit.', 3.76]]);
  const [a1, b1] = lp(355, 245), [a2, b2] = lp(355, 370);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Laptop x={340} y={110} w={1240} h={800} url="belajartenun.com/progres.html" style={{ transform: `scale(${0.97 + 0.03 * ez(t, 0, 0.5)})` }}>
        <Img src={staticFile('ui/d-progres.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%' }} />
      </Laptop>
      <Ring x={a1} y={b1} w={810} h={55} at={0.9} label="Sesi · Selesai · Tingkat selesai" side="top" />
      {t > 2.4 && <Ring x={a2} y={b2} w={810} h={170} at={2.45} label="Tahap tersulit → bahan revisi kurikulum" side="top" />}
      <Captions words={words} keys={['mengukur', 'efektivitas', 'memperbaiki', 'sulit']} dark={() => true} />
      <Sfx cues={[[0.2, 'whoosh', 0.3], [0.9, 'pop', 0.4], [2.45, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// 18 · arsip publik → kain tertenun kembali ("lestari")
const S18: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Pengetahuan', 0.0], ['yang', 0.76], ['sudah', 0.98], ['divalidasi', 1.24], ['kami', 1.88], ['buka', 2.4], ['sebagai', 2.88], ['arsip', 3.2], ['tenun', 3.76], ['publik,', 3.98], ['supaya', 4.88], ['terus', 5.42], ['lestari.', 5.78]]);
  const slide = io(t, 0.0, 0.6);
  const weave = t >= 4.6;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!weave && <Andrew src="footage/7639-full.mp4" from={0} slide={slide} />}
      {!weave && (
        <div style={{ position: 'absolute', left: 1180, top: 190, width: 600, fontFamily: FONT }}>
          {['Tenun Tidore – Modul Dasar', 'Puta Dino motif Jodati', 'Puta Dino motif Barakati', 'Tanya jawab · 22 entri'].map((n, i) => {
            const p = sp(f, 1.3 + i * 0.25, { damping: 16, stiffness: 150 });
            return <div key={n} style={{ marginTop: 14, padding: '20px 24px', borderRadius: 20, ...glassCard(0.85), color: NAVY, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transform: `translateX(${(1 - p) * 300}px)`, opacity: p }}><div><div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: GOLDD }}>SETELAH DIVALIDASI</div><div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div></div><div style={{ fontSize: 26 }}>⤓</div></div>;
          })}
          <div style={{ marginTop: 26, padding: '16px 24px', borderRadius: 30, background: GOLD, color: NAVY, fontSize: 24, fontWeight: 800, textAlign: 'center', transform: `scale(${sp(f, 3.2, { damping: 10, stiffness: 220 })})` }}>Arsip tenun terbuka · unduh bebas</div>
        </div>
      )}
      {weave && <Sequence from={F(4.6)}><OffthreadVideo src={staticFile('3d/reweave.mp4')} muted /></Sequence>}
      {weave && <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: NAVY, opacity: ez(t, 5.6, 6.0) }}>LESTARI</div>}
      <Captions words={words} keys={['divalidasi', 'arsip', 'publik', 'lestari']} dark={(x) => x > 4.6} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], ...[0, 1, 2, 3].map((i) => [1.3 + i * 0.25, 'pop3', 0.3] as Cue), [3.2, 'pop', 0.45], [4.6, 'whoosh', 0.35], [4.8, 'riser', 0.3], [6.0, 'ding', 0.4]]} />
    </AbsoluteFill>
  );
};

// 19 · tutorial vs kelas → BelajarTenun menggabungkan keduanya → mata · koreksi · penenun
const S19: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Video', 0.4], ['tutorial', 1.06], ['tidak', 1.48], ['bisa', 2.2], ['melihat', 2.54], ['kesalahan', 2.82], ['kita.', 3.22], ['Kelas', 4.38], ['tatap', 4.9], ['muka', 5.12], ['terbatas', 5.42], ['tempat', 6.1], ['dan', 6.46], ['waktunya.', 6.58], ['BelajarTenun', 7.58], ['menggabungkan', 8.22], ['keduanya:', 8.94], ['melihat', 9.98], ['dari', 10.52], ['mata', 10.86], ['murid,', 11.06], ['mengoreksi', 11.42], ['saat', 12.24], ['itu', 12.46], ['juga,', 12.62], ['dan', 13.04], ['tetap', 13.64], ['setia', 14.14], ['pada', 14.82], ['ilmu', 15.02], ['penenunnya.', 15.34]], 0.2);
  const merge = io(t, 7.3, 8.4);
  const andrewOn = t >= 9.3;
  const slide = io(t, 9.3, 9.9);
  const left = ez(t, 0.1, 0.5), right = ez(t, 3.9, 4.3);
  const ICONS: [string, number, string][] = [['mata', 9.75, 'Melihat dari mata murid'], ['koreksi', 11.2, 'Mengoreksi saat itu juga'], ['penenun', 13.4, 'Setia pada ilmu penenun']];
  const gIn = sp(f, 8.0, { damping: 16, stiffness: 120 });
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!andrewOn && (
        <>
          {/* kiri: video tutorial */}
          <div style={{ position: 'absolute', left: 110 + merge * 500, top: 200, width: 780, height: 520, borderRadius: 30, background: '#fff', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', opacity: left * (1 - merge), transform: `scale(${1 - merge * 0.4})`, fontFamily: FONT, color: NAVY, overflow: 'hidden' }}>
            <div style={{ height: 380, background: NAVY, position: 'relative' }}>
              <OffthreadVideo src={staticFile('ref/proses.mp4')} startFrom={F(3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,0.3)' }}><div style={{ height: '100%', width: `${30 + t * 6}%`, background: GOLD }} /></div>
            </div>
            <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 30, fontWeight: 800 }}>Video tutorial</div>{t > 2.6 && <div style={{ fontSize: 22, fontWeight: 800, color: GOLDD, opacity: ez(t, 2.6, 2.9) }}>✗ tidak melihat kesalahanmu</div>}</div>
          </div>
          {/* kanan: kelas tatap muka */}
          <div style={{ position: 'absolute', left: 1030 - merge * 500, top: 200, width: 780, height: 520, borderRadius: 30, background: '#fff', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', opacity: right * (1 - merge), transform: `scale(${1 - merge * 0.4}) translateY(${(1 - right) * 40}px)`, fontFamily: FONT, color: NAVY, padding: 34, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 30, fontWeight: 800 }}>Kelas tatap muka</div><div style={{ fontSize: 22, fontWeight: 700, opacity: 0.6 }}>satu tempat · jadwal tetap</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16, marginTop: 36 }}>{Array.from({ length: 32 }, (_, i) => <div key={i} style={{ height: 44, borderRadius: 12, background: t > 5.0 + i * 0.02 ? NAVY : 'rgba(20,28,58,0.1)' }} />)}</div>
            {t > 5.8 && <div style={{ marginTop: 30, fontSize: 22, fontWeight: 800, color: GOLDD, opacity: ez(t, 5.8, 6.1) }}>Penuh · terbatas tempat & waktu</div>}
          </div>
          {/* gabungan: kacamata + HP */}
          {merge > 0 && (
            <div style={{ position: 'absolute', inset: 0, opacity: gIn }}>
              <Img src={staticFile('3d/glasses-still.png')} style={{ position: 'absolute', left: -240, top: 40, width: 1920, height: 1080, transform: `scale(${0.8 + 0.2 * gIn})` }} />
            </div>
          )}
        </>
      )}
      {andrewOn && (
        <>
          <Andrew src="footage/7639new-full.mp4" from={0.2 + 9.3} slide={slide} />
          <div style={{ position: 'absolute', left: 1180, top: 210, fontFamily: FONT }}>
            {ICONS.map(([k, at, lab], i) => {
              const p = sp(f, at, { damping: 12, stiffness: 200 });
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 40, opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * 80}px)` }}>
                  <div style={{ width: 120, height: 120, borderRadius: 60, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      {k === 'mata' && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
                      {k === 'koreksi' && <path d="M4 12l5 5L20 6" />}
                      {k === 'penenun' && <><path d="M6 3v18M12 3v18M18 3v18" /><path d="M3 8h18M3 15h18" stroke={'#fff'} /></>}
                    </svg>
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: -1, textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}>{lab}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <Captions words={words} keys={['tutorial', 'kesalahan', 'kelas', 'terbatas', 'menggabungkan', 'melihat', 'mengoreksi', 'penenun']} dark={(x) => x < 9.3} />
      <Sfx cues={[[0.1, 'whoosh', 0.3], [2.6, 'snap', 0.4], [3.9, 'whoosh', 0.3], ...Array.from({ length: 6 }, (_, i) => [5.0 + i * 0.1, 'tick', 0.2] as Cue), [7.3, 'whoosh', 0.4], [8.1, 'impact', 0.5], [9.3, 'whoosh', 0.3], [9.75, 'pop', 0.45], [11.2, 'pop', 0.45], [13.4, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// 20 · uji deteksi tahap: video berlabel → kotak uji → 87% (mockup)
export const S20: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Kami', 0.0], ['menguji', 0.52], ['deteksi', 1.36], ['tahapnya', 1.62], ['dengan', 2.12], ['berbagai', 2.46], ['video', 2.88], ['tenun', 3.28], ['berlabel', 3.72], ['dari', 4.14], ['berbagai', 4.86], ['tradisi.', 5.22]]);
  const pct = Math.round(87 * ez(t, 3.6, 5.2));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {REFS.slice(0, 5).map(([src, lab], i) => {
        const k = ((t * 0.55 + i / 5) % 1);
        const x = 80 + k * 700, y = 180 + i * 150;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: 260, height: 130, borderRadius: 18, overflow: 'hidden', opacity: Math.min(1, k * 5) * (1 - ez(k, 0.85, 1)), transform: `scale(${1 - k * 0.3})`, boxShadow: '0 16px 40px rgba(20,28,58,0.18)' }}>
            <OffthreadVideo src={staticFile(src)} startFrom={F(4 + i * 2)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', left: 8, bottom: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,239,226,0.92)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: NAVY }}>{lab} · berlabel</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 980, top: 180, width: 820, height: 720, borderRadius: 36, ...glassCard(0.9), fontFamily: FONT, color: NAVY, padding: 44, boxSizing: 'border-box' }}>
        <Kicker>UJI DETEKSI TAHAP</Kicker>
        <div style={{ fontSize: 26, marginTop: 14, lineHeight: 1.45, opacity: ez(t, 0.4, 0.8) }}>Setiap video diberi <b>label waktu selesai tiap tahap oleh penenun</b>, lalu dibandingkan dengan tahap yang dideteksi AI.</div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, marginTop: 34, opacity: 0.5 }}>GERBANG RILIS</div>
        {[['Tahap tepat waktu', '≥ 70%'], ['Maju terlalu cepat', '≤ 5%']].map(([a, v], i) => (
          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '20px 24px', borderRadius: 20, background: '#fff', transform: `translateX(${(1 - sp(f, 2.4 + i * 0.4)) * 80}px)`, opacity: Math.min(1, sp(f, 2.4 + i * 0.4) * 1.3) }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{a}</div><div style={{ fontSize: 48, fontWeight: 900, color: GOLDD }}>{v}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 44, right: 44, bottom: 40, fontSize: 18, opacity: 0.6 }}>Uji berjalan dengan rekaman berlabel dari berbagai tradisi.</div>
      </div>
      <Captions words={words} keys={['menguji', 'deteksi', 'berlabel', 'tradisi']} dark={() => true} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], [2.4, 'pop', 0.4], [2.8, 'pop', 0.4]]} />
    </AbsoluteFill>
  );
};

// 22 · sanggar & sekolah → penghasilan ke penenun → murid baru memperluas ilmu
export const S22: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Kami', 0.62], ['mulai', 1.16], ['dari', 1.56], ['sanggar', 2.0], ['dan', 2.54], ['sekolah.', 2.96], ['Setiap', 3.74], ['modul', 4.54], ['yang', 5.02], ['divalidasi', 5.52], ['memberikan', 6.18], ['penghasilan', 6.76], ['kepada', 7.48], ['para', 7.82], ['penenun,', 8.22], ['dan', 9.04], ['setiap', 9.34], ['murid', 9.72], ['baru', 10.0], ['dapat', 10.32], ['memperluas', 10.6], ['ilmu', 11.26], ['mereka.', 11.54]], 0.4);
  const slide = io(t, 0.3, 0.9);
  const phase = t < 3.3 ? 0 : t < 8.6 ? 1 : 2;
  const W0: P2 = [1520, 560];
  return (
    <AbsoluteFill>
      <Andrew src="footage/7643a-full.mp4" from={0.4} slide={slide} />
      {phase === 0 && (
        <div style={{ position: 'absolute', left: 1160, top: 250, display: 'flex', gap: 30, fontFamily: FONT }}>
          {[['Sanggar', 1.55], ['Sekolah', 2.5]].map(([n, a]) => { const p = sp(f, a as number, { damping: 11, stiffness: 220 }); return <div key={n as string} style={{ width: 300, padding: 30, borderRadius: 30, ...glassCard(0.88), color: NAVY, textAlign: 'center', transform: `scale(${p})` }}><div style={{ fontSize: 70 }}>{n === 'Sanggar' ? '🧵' : '🏫'}</div><div style={{ fontSize: 34, fontWeight: 800, marginTop: 10 }}>{n}</div></div>; })}
          <div style={{ position: 'absolute', top: 330, left: 0, right: 0, padding: 18, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', gap: 16, opacity: ez(t, 2.8, 3.1) }}><Img src={staticFile('brand/partner-puta-dino-kayangan.png')} style={{ height: 60 }} /><span style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>bersama mitra penenun</span></div>
        </div>
      )}
      {phase >= 1 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {phase === 1 && (
            <g opacity={ez(t, 3.3, 3.6)}>
              <rect x={1150} y={250} width={260} height={150} rx={22} fill="#fff" />
              <text x={1280} y={315} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={800} fill={GOLDD}>✓ MODUL</text>
              <text x={1280} y={355} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={NAVY}>divalidasi</text>
              {Array.from({ length: 8 }, (_, i) => { const k = ((t - 6.4 - i * 0.18) / 1.0); if (k < 0 || k > 1) return null; const x = 1410 + (W0[0] + 40 - 1410) * k, y = 330 + (W0[1] - 330) * k - Math.sin(k * Math.PI) * 120; return <g key={i}><circle cx={x} cy={y} r={22} fill={GOLD} stroke="#fff" strokeWidth={3} /><text x={x} y={y + 8} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={900} fill={NAVY}>Rp</text></g>; })}
            </g>
          )}
          <circle cx={W0[0] + 40} cy={W0[1] + 60} r={46 * sp(f, 3.6, { damping: 12, stiffness: 180 })} fill={GOLD} stroke="#fff" strokeWidth={5} />
          <text x={W0[0] + 40} y={W0[1] + 150} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill="#fff" opacity={ez(t, 3.8, 4.1)}>penenun</text>
          {phase === 2 && Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2, r = 170 + (i % 3) * 70; const at = 9.0 + i * 0.12; const k = ez(t, at, at + 0.4);
            const x = W0[0] + 40 + Math.cos(a) * r * k, y = W0[1] + 60 + Math.sin(a) * r * 0.8 * k;
            return <g key={i} opacity={k}><line x1={W0[0] + 40} y1={W0[1] + 60} x2={x} y2={y} stroke={GOLD} strokeWidth={2.5} /><circle cx={x} cy={y} r={12} fill="#fff" /></g>;
          })}
        </svg>
      )}
      {phase >= 1 && t > 6.6 && t < 8.6 && <div style={{ position: 'absolute', left: 1180, top: 840, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff', opacity: ez(t, 6.7, 7.0) }}>penghasilan untuk penenun</div>}
      <Captions words={words} keys={['sanggar', 'sekolah', 'penghasilan', 'penenun', 'murid', 'memperluas']} />
      <Sfx cues={[[0.3, 'whoosh', 0.3], [1.55, 'pop', 0.45], [2.5, 'pop', 0.45], [3.3, 'whoosh', 0.3], [3.6, 'impact', 0.35], ...Array.from({ length: 8 }, (_, i) => [7.3 + i * 0.18, 'pop3', 0.25] as Cue), ...Array.from({ length: 14 }, (_, i) => [9.0 + i * 0.12, 'tick', 0.15] as Cue)]} />
    </AbsoluteFill>
  );
};

// 23 · peta Indonesia → dunia
export const S23: React.FC = () => {
  const { t } = useT();
  const words = W([['Dari', 0.72], ['satu', 1.42], ['tradisi', 1.62], ['ke', 2.18], ['seluruh', 2.8], ['tradisi', 3.32], ['Indonesia,', 3.62], ['dari', 4.4], ['Indonesia', 4.9], ['ke', 5.36], ['dunia.', 6.08]], 0.4);
  const world = io(t, 4.4, 5.4);
  const pins: [string, number][] = [['Tidore', 0.9], ['Lombok', 2.4], ['NTT', 2.55], ['Silungkang', 2.7], ['Sumut', 2.85], ['Jawa', 3.0], ['Kalimantan', 3.15], ['Sulawesi', 3.3], ['Papua', 3.45], ['Bali', 3.6]];
  const ID: P2 = [1495, 600];
  const ARCS: P2[] = [[420, 330], [950, 300], [1000, 560], [620, 640], [1780, 780], [300, 450]];
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 - world * 0.75}) translate(${world * 1050}px, ${world * 120}px)`, transformOrigin: '50% 50%', opacity: 1 - ez(t, 5.0, 5.5) }}>
        <DotMap lit={io(t, 0.2, 1.6)} pins={pins} />
      </div>
      {world > 0 && (
        <AbsoluteFill style={{ opacity: world }}>
          <DotMap lit={0} world={1} />
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            {ARCS.map(([x, y], i) => { const k = ez(t, 5.4 + i * 0.12, 6.2 + i * 0.12); const mx = (ID[0] + x) / 2, my = Math.min(ID[1], y) - 180; return <g key={i}><path d={`M${ID[0]} ${ID[1]} Q ${mx} ${my} ${x} ${y}`} fill="none" stroke={GOLD} strokeWidth={4} strokeDasharray={1600} strokeDashoffset={1600 * (1 - k)} />{k > 0.98 && <circle cx={x} cy={y} r={10} fill={GOLD} />}</g>; })}
          </svg>
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['satu', 'seluruh', 'indonesia', 'dunia']} dark={() => true} />
      <Sfx cues={[...pins.map(([, a]) => [a, 'pop3', 0.25] as Cue), [4.4, 'whoosh', 0.45], [5.6, 'impact', 0.4]]} />
    </AbsoluteFill>
  );
};

// 25 · penutup Andrew
export const S25: React.FC = () => {
  const { t } = useT();
  const words = W([['BelajarTenun.', 0.08], ['Belajar', 1.48], ['menenun,', 1.92], ['dipandu', 2.58], ['ilmu', 3.46], ['Nusantara.', 4.44]]);
  const sweep = ez(t, 4.3, 5.4);
  return (
    <AbsoluteFill>
      <Andrew src="footage/7643b-full.mp4" from={0} slide={0} push={0.07 * io(t, 0, 6.4)} />
      <AbsoluteFill style={{ background: `linear-gradient(105deg, rgba(212,184,102,0) ${sweep * 120 - 30}%, rgba(212,184,102,0.22) ${sweep * 120 - 15}%, rgba(212,184,102,0) ${sweep * 120}%)` }} />
      <Captions words={words} keys={['belajartenun', 'nusantara']} />
      <Sfx cues={[[3.6, 'riser', 0.3]]} />
    </AbsoluteFill>
  );
};

// ── susunan ──────────────────────────────────────────────────────────────────
type Row = [string, number, React.ReactNode, { src: string; from: number } | null];
const ROWS: Row[] = [
  ['B1', B1V7_SECONDS, <Babak1V7 music={false} />, null],
  ['ALUR', ALUR_SECONDS, <Alur />, null],
  ['05', 8.3, <S05 />, { src: 'audio/7635b-clean.wav', from: 0.6 }],
  ['06', 10.1, <S06 />, { src: 'audio/7635a-clean.wav', from: 0 }],
  ['07', 9.2, <S07 />, { src: 'audio/7636-clean.wav', from: 0 }],
  ['MITRA', MITRA_SECONDS, <Mitra />, null],
  ['B3', LEARN_SECONDS, <Learn />, null],
  ['15', 8.4, <S15 />, { src: 'audio/7637a-clean.wav', from: 0.2 }],
  ['16', 5.8, <S16 />, { src: 'audio/7637b-clean.wav', from: 0 }],
  ['17', 4.6, <S17 />, { src: 'audio/7637c-clean.wav', from: 0 }],
  ['18', 6.8, <S18 />, { src: 'audio/7639-clean.wav', from: 0 }],
  ['19', 16.4, <S19 />, { src: 'audio/7639new-clean.wav', from: 0.2 }],
  ['20', 6.6, <S20 />, { src: 'audio/7643c-clean.wav', from: 0 }],
  ['22', 11.8, <S22 />, { src: 'audio/7643a-clean.wav', from: 0.4 }],
  ['23', 7.2, <S23 />, { src: 'audio/7643new-clean.wav', from: 0.4 }],
  ['24', 3.9, <S24 />, null],
  ['25', 6.4, <S25 />, { src: 'audio/7643b-clean.wav', from: 0 }],
  ['26', 4.6, <S26 />, null],
];
const STARTS = ROWS.reduce<number[]>((a, r, i) => [...a, i === 0 ? 0 : a[i - 1] + ROWS[i - 1][1]], []);
export const FULL7_SECONDS = Math.ceil(STARTS[STARTS.length - 1] + ROWS[ROWS.length - 1][1]);
const QUIET = new Set(['ALUR', 'MITRA', '24', '26']); // tanpa suara: musik lebih keras
const B1_SPEECH: [number, number][] = [[0.3, 4.6], [5.0, 13.6], [13.8, 18.4], [18.8, 29.6]];
const musicVol = (s: number) => {
  const i = STARTS.findIndex((st, k) => s >= st && s < st + ROWS[k][1]);
  if (i < 0) return 0.1;
  const id = ROWS[i][0];
  if (id === 'B1') return B1_SPEECH.some(([a, b]) => s > a && s < b) ? 0.05 : 0.12;
  if (QUIET.has(id)) return 0.17;
  if (id === 'B3') return 0.035;
  return 0.05;
};
export const FullVideo7: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    {ROWS.map(([id, dur, el, audio], i) => (
      <Sequence key={id} from={F(STARTS[i])} durationInFrames={F(dur)}>
        {el}
        {audio && <Audio src={staticFile(audio.src)} startFrom={F(audio.from)} endAt={F(audio.from + dur)} />}
      </Sequence>
    ))}
    <Audio src={staticFile('audio/music-bed.wav')} endAt={F(206)} volume={(fr) => musicVol(fr / FPS) * Math.min(1, (206 - fr / FPS) / 2)} />
    <Sequence from={F(205)}><Audio src={staticFile('audio/music-bed.wav')} startFrom={F(40)} volume={(fr) => musicVol(205 + fr / FPS) * Math.min(1, fr / 90)} /></Sequence>
  </AbsoluteFill>
);
