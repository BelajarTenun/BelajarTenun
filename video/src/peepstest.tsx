import React from 'react';
import { AbsoluteFill } from 'remotion';
import Peep from 'react-peeps';
export const PeepsTest: React.FC = () => (
  <AbsoluteFill style={{ background: '#f5efe2', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 80, paddingBottom: 60 }}>
    <Peep style={{ width: 480, height: 760 }} body="CrossedLegs" face="OldAged" hair="GrayBun" viewBox={{ x: '-100', y: '-50', width: '1600', height: '1900' }} strokeColor="#141c3a" backgroundColor="#f5efe2" />
    <Peep style={{ width: 480, height: 760 }} body="WalkingWB" face="Concerned" hair="MediumShort" viewBox={{ x: '-100', y: '-50', width: '1600', height: '1900' }} strokeColor="#141c3a" backgroundColor="#f5efe2" />
    <Peep style={{ width: 480, height: 760 }} body="PointingFingerBW" face="SmileBig" hair="Hijab" viewBox={{ x: '-100', y: '-50', width: '1600', height: '1900' }} strokeColor="#141c3a" backgroundColor="#f5efe2" />
  </AbsoluteFill>
);
