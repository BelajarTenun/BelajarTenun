import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing, OffthreadVideo, Img, staticFile } from 'remotion';

export const C = {
  bg: '#F2EDE3', ink: '#1F1B16', soft: '#6B6257', line: '#D9D0C1',
  accent: '#A3412B', gold: '#C08A2E', ok: '#3E7D4F', warn: '#D9822B', ai: '#4A7BD0', card: 'rgba(255,255,255,0.86)',
};
export const SERIF = "Fraunces, 'Playfair Display', Charter, 'Bitstream Charter', Georgia, serif";
export const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";

export const useSpring = (delay = 0, damping = 200) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping } });
};
export const fade = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

// Teks muncul kata per kata.
export const WordReveal: React.FC<{ text: string; start?: number; per?: number; style?: React.CSSProperties }> = ({ text, start = 0, per = 4, style }) => {
  const f = useCurrentFrame();
  return (
    <span style={style}>
      {text.split(' ').map((w, i) => {
        const p = fade(f, start + i * per, start + i * per + 10);
        return <span key={i} style={{ opacity: p, display: 'inline-block', transform: `translateY(${(1 - p) * 14}px)`, filter: `blur(${(1 - p) * 6}px)`, marginRight: '0.28em' }}>{w}</span>;
      })}
    </span>
  );
};

export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: C.card, borderRadius: 22, boxShadow: '0 12px 40px rgba(31,27,22,0.12)', backdropFilter: 'blur(14px)', padding: '22px 28px', fontFamily: SANS, color: C.ink, ...style }}>{children}</div>
);

// Chip kriteria lomba di pojok kanan bawah.
export const Chip: React.FC<{ label: string; start?: number }> = ({ label, start = 0 }) => {
  const s = useSpring(start);
  return (
    <div style={{ position: 'absolute', right: 64, bottom: 56, opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: 4, fontSize: 22, color: C.ink, background: 'rgba(242,237,227,0.92)', border: `2px solid ${C.ink}`, borderRadius: 999, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: C.accent }} />{label}
      </div>
    </div>
  );
};

// Pola motif tenun tipis untuk latar.
export const Motif: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => (
  <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }}>
    <defs>
      <pattern id="m" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M40 4 L76 40 L40 76 L4 40 Z M40 20 L60 40 L40 60 L20 40 Z" fill="none" stroke={C.ink} strokeWidth="2" />
        <circle cx="40" cy="40" r="4" fill={C.ink} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#m)" />
  </svg>
);

export const Bg: React.FC<{ children?: React.ReactNode; motif?: boolean }> = ({ children, motif }) => (
  <div style={{ position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden' }}>{motif && <Motif />}{children}</div>
);

// Placeholder video/gambar: ganti `src` dengan file di folder public/.
export const Media: React.FC<{ src?: string; label?: string; style?: React.CSSProperties; hue?: number }> = ({ src, label, style, hue = 25 }) => {
  if (src) {
    const s = staticFile(src);
    return /\.(mp4|webm|mov)$/i.test(src)
      ? <OffthreadVideo src={s} muted style={{ objectFit: 'cover', ...style }} />
      : <Img src={s} style={{ objectFit: 'cover', ...style }} />;
  }
  return (
    <div style={{ background: `repeating-linear-gradient(90deg, hsl(${hue},35%,62%) 0 14px, hsl(${hue},40%,55%) 14px 18px), hsl(${hue},30%,60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.9)', fontFamily: SANS, fontSize: 22, fontWeight: 600, ...style }}>
      <span style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 14px', borderRadius: 8 }}>{label ?? 'video tenun'}</span>
    </div>
  );
};
