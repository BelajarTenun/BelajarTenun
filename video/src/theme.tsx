import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing, OffthreadVideo, Img, staticFile } from 'remotion';

// Gaya mengikuti video referensi: putih keabu-abuan, teks abu kebiruan, kaca gelap, satu aksen biru untuk AI.
export const C = {
  bg: '#EDEDE9', ink: '#2A323C', soft: '#8C96A2', line: '#D6D8D6',
  accent: '#2A323C', gold: '#8C96A2', ok: '#7FB89A', warn: '#E3A86B', ai: '#6EA8F0',
  card: 'rgba(32,34,38,0.52)', cardInk: '#F4F5F2', cardSoft: 'rgba(244,245,242,0.6)',
};
export const SERIF = "'Instrument Serif', 'Playfair Display', 'DM Serif Display', Georgia, serif";
export const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
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
        const p = fade(f, start + i * per, start + i * per + 18);
        return <span key={i} style={{ opacity: p, display: 'inline-block', filter: `blur(${(1 - p) * 10}px)`, marginRight: '0.26em' }}>{w}</span>;
      })}
    </span>
  );
};

export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; light?: boolean }> = ({ style, children, light }) => (
  <div style={{ background: light ? 'rgba(255,255,255,0.55)' : C.card, borderRadius: 18, border: light ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(24px)', padding: '20px 26px', fontFamily: SANS, fontWeight: 400, color: light ? C.ink : C.cardInk, ...style }}>{children}</div>
);

// Label kecil bergaya [RETURNING SIGNAL].
export const Tag: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: dark ? C.soft : C.cardSoft, ...style }}>[{children}]</div>
);

// Chip kriteria lomba di pojok kanan bawah.
export const Chip: React.FC<{ label: string; start?: number }> = ({ label, start = 0 }) => {
  const f = useCurrentFrame();
  const p = fade(f, start, start + 18);
  return (
    <div style={{ position: 'absolute', left: 72, top: 64, opacity: p * 0.9, fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: C.ink, filter: `blur(${(1 - p) * 4}px)` }}>
      [ {label} ]
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
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 30%, #F3F4F1 0%, ${C.bg} 55%, #E3E7EA 100%)`, overflow: 'hidden' }}>{children}</div>
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
    <div style={{ background: `linear-gradient(135deg, hsl(${hue},12%,58%), hsl(${hue + 20},10%,40%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.9)', fontFamily: MONO, fontSize: 16, letterSpacing: 1, ...style }}>
      <span>[{label ?? 'video tenun'}]</span>
    </div>
  );
};
