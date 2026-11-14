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

export const Mark: React.FC<{ size?: number; speaking?: boolean; draw?: number; ink?: string }> = ({ size = 28, speaking = false, draw = 1, ink = BRAND.ink }) => {
  const f = useCurrentFrame();
  const g = size / 3;
  const sw = Math.max(1.5, size / 11);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {[0, 1, 2].map((i) => {
        const x = g * i + g / 2;
        const p = Math.min(1, Math.max(0, draw * 3 - i * 0.4));
        return <line key={'v' + i} x1={x} x2={x} y1={sw} y2={sw + (size - 2 * sw) * p} stroke={ink} strokeWidth={sw} strokeLinecap="round" />;
      })}
      {[0, 1, 2].map((j) => {
        const y = g * j + g / 2;
        const base = Math.min(1, Math.max(0, draw * 3 - 1.2 - j * 0.4));
        const pulse = speaking ? 0.55 + 0.45 * Math.abs(Math.sin(f / 4.2 + j * 1.3)) : 1;
        const len = (size - 2 * sw) * base * pulse;
        const x0 = j % 2 ? size - sw - len : sw;
        return <line key={'h' + j} x1={x0} x2={x0 + len} y1={y} y2={y} stroke={BRAND.thread} strokeWidth={sw * 1.15} strokeLinecap="round" />;
      })}
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
