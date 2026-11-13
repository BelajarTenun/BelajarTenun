import React from 'react';
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { MONO, setFloating } from './theme';

// Andrew direkam di TENGAH frame. Di sini footage digeser pelan ke kiri/kanan sambil
// sedikit diperbesar, lalu animasi muncul melayang di sisi yang jadi kosong.
//   side="kanan" → animasi di kanan, Andrew bergeser ke kiri (dan sebaliknya)
//   footage      → file di video/public/ (rekam 4K agar perbesaran 130% tetap tajam)
//   preview      → siluet penanda jika footage belum ada
//   area         → lebar area animasi (1 = penuh, untuk overlay di atas wajah)
export type Side = 'kanan' | 'kiri';
export const SHIFT = { px: 360, scale: 1.3, frames: 24 };

export const AndrewFootage: React.FC<{ side?: Side | 'tengah'; footage?: string; preview?: boolean }> = ({ side = 'tengah', footage, preview }) => {
  const f = useCurrentFrame();
  const t = side === 'tengah' ? 0 : interpolate(f, [0, SHIFT.frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const dir = side === 'kanan' ? -1 : 1;
  const transform = `translateX(${dir * SHIFT.px * t}px) scale(${1 + (SHIFT.scale - 1) * t})`;
  if (footage) return <AbsoluteFill style={{ transform }}><OffthreadVideo src={staticFile(footage)} muted style={{ width: 1920, height: 1080, objectFit: 'cover' }} /></AbsoluteFill>;
  if (!preview) return null;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #6d6a64, #2f2e2c)' }}>
      <AbsoluteFill style={{ transform, transformOrigin: '50% 60%' }}>
        <svg width="700" height="900" style={{ position: 'absolute', left: 610, bottom: 0 }}>
          <circle cx="350" cy="260" r="130" fill="#1f1e1c" />
          <path d="M80 900 Q80 470 350 450 Q620 470 620 900 Z" fill="#1f1e1c" />
        </svg>
        <div style={{ position: 'absolute', left: 860, bottom: 40, fontFamily: MONO, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>[ footage Andrew ]</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const OnAndrew: React.FC<{ Scene: React.FC<any>; sceneProps?: any; side?: Side; preview?: boolean; area?: number; footage?: string }> = ({ Scene, sceneProps = {}, side = 'kanan', preview, area = 0.6, footage }) => {
  setFloating(true);
  const W = 1920 * area;
  const left = area >= 1 ? 0 : side === 'kanan' ? 1920 - W - 40 : 40;
  return (
    <AbsoluteFill>
      <AndrewFootage side={area >= 1 ? 'tengah' : side} footage={footage} preview={preview} />
      <Sequence from={area >= 1 ? 0 : Math.round(SHIFT.frames * 0.6)}>
        <div style={{ position: 'absolute', left, top: (1080 - 1080 * area) / 2, width: 1920, height: 1080, transform: `scale(${area})`, transformOrigin: 'top left' }}>
          <Scene {...sceneProps} />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
