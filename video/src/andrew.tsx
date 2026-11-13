import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, MONO, fade } from './theme';

// Membungkus adegan mana pun menjadi panel kaca di samping Andrew.
// Dirender dengan latar transparan (.mov) untuk ditaruh di atas footage Andrew.
//   side="kanan" → panel di kanan, Andrew di kiri frame (dan sebaliknya)
//   preview=true → tampilkan siluet penanda Andrew (hanya untuk cek komposisi)
export type Side = 'kanan' | 'kiri';
export const OnAndrew: React.FC<{ Scene: React.FC<any>; sceneProps?: any; side?: Side; preview?: boolean }> = ({ Scene, sceneProps = {}, side = 'kanan', preview }) => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 14);
  const W = 1080, H = W * 9 / 16, scale = W / 1920;
  const left = side === 'kanan' ? 1920 - W - 70 : 70;
  return (
    <AbsoluteFill>
      {preview && (
        <AbsoluteFill style={{ background: 'linear-gradient(180deg,#5d5a55,#3b3a37)' }}>
          <svg width="700" height="900" style={{ position: 'absolute', left: side === 'kanan' ? 120 : 1100, bottom: 0 }}>
            <circle cx="350" cy="260" r="130" fill="#2a2927" />
            <path d="M80 900 Q80 470 350 450 Q620 470 620 900 Z" fill="#2a2927" />
          </svg>
          <div style={{ position: 'absolute', left: side === 'kanan' ? 300 : 1280, bottom: 40, fontFamily: MONO, fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>[ footage Andrew ]</div>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left, top: (1080 - H) / 2, width: W, height: H, borderRadius: 28, overflow: 'hidden', opacity: p, filter: `blur(${(1 - p) * 8}px)`, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.5)' }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <Scene {...sceneProps} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
