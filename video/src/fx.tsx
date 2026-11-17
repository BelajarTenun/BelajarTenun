import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

// Efek gaya animasi 2D, diadaptasi dari pola registry HyperFrames (Apache-2.0):
// hw-boil (garis bergetar tiap 2 frame), stop-motion cadence, grain overlay, aksen kartun.

const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// Boil: distorsi halus yang berganti pose tiap `every` frame → ilustrasi terasa digambar tangan.
export const Boil: React.FC<{ children: React.ReactNode; strength?: number; every?: number; id: string }> = ({ children, strength = 2.2, every = 3, id }) => {
  const f = useCurrentFrame();
  const step = Math.floor(f / every);
  const seed = Math.floor(hash(step) * 1000);
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={strength} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Grain halus seluruh layar (berganti tiap 2 frame).
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 97;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity }}>
      <svg width="1920" height="1080">
        <filter id={`grain${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="1920" height="1080" filter={`url(#grain${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

const INK = '#2A2421';

// Uap teh: tiga garis bergelombang naik dan memudar, loop.
export const Steam: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const f = Math.floor(useCurrentFrame() / 2) * 2; // cadence 15 fps
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {[0, 1, 2].map((i) => {
        const p = ((f / 30 + i / 3) % 1);
        const yy = y - p * 70 * s;
        const o = Math.sin(p * Math.PI) * 0.6;
        const xx = x + (i - 1) * 14 * s;
        return <path key={i} d={`M${xx} ${yy} q ${6 * s} ${-10 * s} 0 ${-20 * s} q ${-6 * s} ${-10 * s} 0 ${-20 * s}`} fill="none" stroke="#9A8F86" strokeWidth={3 * s} strokeLinecap="round" opacity={o} />;
      })}
    </svg>
  );
};

// Tetes keringat yang meluncur turun, loop.
export const Sweat: React.FC<{ x: number; y: number; s?: number; start?: number }> = ({ x, y, s = 1, start = 0 }) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  const p = (Math.floor(f / 2) * 2 / 40) % 1;
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
      <path transform={`translate(${x} ${y + p * 26 * s}) scale(${s})`} d="M0 -14 C 7 -2 9 4 0 8 C -9 4 -7 -2 0 -14 Z" fill="#BFE3F5" stroke={INK} strokeWidth={2.2} opacity={Math.min(1, (1 - p) * 2)} />
    </svg>
  );
};

// Tanda tanya yang "pop" dengan sedikit overshoot, lalu diam (boil kecil).
export const Question: React.FC<{ x: number; y: number; at: number; s?: number; rot?: number }> = ({ x, y, at, s = 1, rot = 0 }) => {
  const f = useCurrentFrame() - at;
  if (f < 0) return null;
  const k = f < 4 ? f / 4 * 1.2 : f < 7 ? 1.2 - (f - 4) / 3 * 0.2 : 1;
  const j = (hash(Math.floor(f / 3) + at) - 0.5) * 2;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${k * s}) rotate(${rot + j * 3}deg)`, fontFamily: "'Comic Neue', 'Patrick Hand', 'Inter', sans-serif", fontWeight: 800, fontSize: 64, color: '#E5652E', WebkitTextStroke: `2px ${INK}` }}>?</div>
  );
};
