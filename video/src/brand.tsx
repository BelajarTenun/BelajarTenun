import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

// Identitas BelajarTenun: tanda tenunan 3×3. Lungsi = tinta (tegak), pakan = oranye benang (mendatar).
// Saat tutor bicara, pakan "ditenun" bergantian mengikuti suara: inilah indikator AI, bukan bola generik.
export const BRAND = {
  ink: '#15181C',
  paper: '#F3F1EC',
  thread: '#E5652E', // oranye benang di footage
  mute: 'rgba(21,24,28,0.45)',
  font: "Inter, 'Helvetica Neue', Arial, sans-serif",
};

// Kaca: putih buram tipis, tepi terang, bayangan lembut.
export const glass = (o = 0.42): React.CSSProperties => ({
  background: `linear-gradient(160deg, rgba(255,255,255,${o + 0.12}), rgba(255,255,255,${o - 0.08}))`,
  backdropFilter: 'blur(28px) saturate(170%)',
  WebkitBackdropFilter: 'blur(28px) saturate(170%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 30px 80px rgba(10,12,16,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
});

// Logo resmi BelajarTenun (docs/brand/logo-mark.svg): anyaman polos di kotak navy,
// tiga lungsi krem (tegak) dan dua pakan emas (mendatar), bergantian atas-bawah.
// draw: 0→1 lungsi ditarik, lalu pakan menyelip, lalu titik silang muncul.
// speaking: pakan emas "berdenyut" seperti sedang ditenun (indikator tutor bicara).
export const LOGO = { navy: '#141c3a', cream: '#f5efe2', gold: '#d4b866', serif: "'Times New Roman', Times, serif" };
export const Mark: React.FC<{ size?: number; speaking?: boolean; draw?: number; ink?: string }> = ({ size = 28, speaking = false, draw = 1 }) => {
  const f = useCurrentFrame();
  const c = (a: number, b: number) => Math.min(1, Math.max(0, (draw - a) / (b - a)));
  const box = c(0, 0.25), warp = c(0.15, 0.55), weft = c(0.5, 0.85), over = c(0.85, 1);
  const pulse = (k: number) => (speaking ? 0.55 + 0.45 * Math.abs(Math.sin(f / 4.5 + k * 1.4)) : 1);
  const L = 40;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      <rect width="64" height="64" rx="14" fill={LOGO.navy} opacity={box} transform={`translate(32 32) scale(${0.85 + box * 0.15}) translate(-32 -32)`} />
      <g fill="none" strokeLinecap="round">
        {[20, 32, 44].map((x, i) => <path key={x} d={`M${x} 12v40`} stroke={LOGO.cream} strokeWidth={5} strokeDasharray={L} strokeDashoffset={L * (1 - Math.min(1, warp * 1.4 - i * 0.2))} />)}
        {[25, 39].map((y, j) => {
          const len = 44 * Math.min(1, weft * 1.3 - j * 0.3) * pulse(j);
          const x0 = j % 2 ? 54 - len : 10;
          return (
            <g key={y}>
              <path d={`M${x0} ${y}h${len}`} stroke={LOGO.navy} strokeWidth={8} />
              <path d={`M${x0} ${y}h${len}`} stroke={LOGO.gold} strokeWidth={5} />
            </g>
          );
        })}
      </g>
      <g opacity={over}>
        <rect x="28.2" y="20.6" width="7.6" height="8.8" fill={LOGO.navy} /><rect x="29.5" y="20" width="5" height="10" fill={LOGO.cream} />
        <rect x="16.2" y="34.6" width="7.6" height="8.8" fill={LOGO.navy} /><rect x="17.5" y="34" width="5" height="10" fill={LOGO.cream} />
        <rect x="40.2" y="34.6" width="7.6" height="8.8" fill={LOGO.navy} /><rect x="41.5" y="34" width="5" height="10" fill={LOGO.cream} />
      </g>
    </svg>
  );
};

// Kata-kata yang muncul tepat saat diucapkan (timestamps dalam detik global).
export type W = { w: string; t: number };
export const SpokenText: React.FC<{ words: W[]; fps: number }> = ({ words, fps }) => {
  const f = useCurrentFrame();
  return (
    <>
      {words.map((x, i) => {
        const p = interpolate(f, [x.t * fps - 2, x.t * fps + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (p <= 0) return null;
        return <span key={i} style={{ opacity: 0.25 + p * 0.75 }}>{x.w} </span>;
      })}
    </>
  );
};
