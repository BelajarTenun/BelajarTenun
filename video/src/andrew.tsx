import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MONO, fade, setFloating } from './theme';

// Animasi melayang langsung di atas footage Andrew: tanpa kotak, tanpa latar.
// Isi adegan ditaruh di sisi yang berlawanan dengan Andrew.
//   side="kanan" → animasi di kanan, Andrew di kiri frame (dan sebaliknya)
//   preview=true → latar & siluet penanda Andrew, hanya untuk cek komposisi
export type Side = 'kanan' | 'kiri';
export const OnAndrew: React.FC<{ Scene: React.FC<any>; sceneProps?: any; side?: Side; preview?: boolean; area?: number }> = ({ Scene, sceneProps = {}, side = 'kanan', preview, area = 0.62 }) => {
  setFloating(true);
  const f = useCurrentFrame();
  const W = 1920 * area, scale = area;
  const left = side === 'kanan' ? 1920 - W - 40 : 40;
  return (
    <AbsoluteFill>
      {preview && (
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #6d6a64, #2f2e2c)' }}>
          <svg width="700" height="900" style={{ position: 'absolute', left: side === 'kanan' ? 80 : 1140, bottom: 0 }}>
            <circle cx="350" cy="260" r="130" fill="#1f1e1c" />
            <path d="M80 900 Q80 470 350 450 Q620 470 620 900 Z" fill="#1f1e1c" />
          </svg>
          <div style={{ position: 'absolute', left: side === 'kanan' ? 260 : 1320, bottom: 40, fontFamily: MONO, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>[ footage Andrew ]</div>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left, top: (1080 - 1080 * scale) / 2, width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left', opacity: fade(f, 0, 6) }}>
        <Scene {...sceneProps} />
      </div>
    </AbsoluteFill>
  );
};
