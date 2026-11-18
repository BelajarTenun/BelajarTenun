import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Stick, POSES, weaving, Loom, THREAD } from './stick';
export const StickTest: React.FC = () => {
  const t = useCurrentFrame() / 30;
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <svg width="1920" height="1080">
        <Stick x={260} y={700} pose={weaving(t)} t={t} hair="bun" accent={THREAD} />
        <Loom x={330} y={700} t={t} />
        <Stick x={760} y={700} pose={POSES.confused} t={t} hair="short" prop="phone" />
        <Stick x={1010} y={700} pose={POSES.phone} t={t} hair="short" prop="phone" />
        <Stick x={1260} y={700} pose={POSES.cheer} t={t} hair="short" />
        <Stick x={1510} y={700} pose={POSES.thumbs} t={t} hair="bun" prop="phone" />
        <Stick x={1760} y={700} pose={POSES.holdL} t={t} hair="short" />
      </svg>
    </AbsoluteFill>
  );
};
