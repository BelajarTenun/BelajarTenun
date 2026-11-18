import React from 'react';
import { Easing } from 'remotion';

// Figur stik dengan kerangka sendi (forward kinematics) dan pose ber-keyframe.
// Gerak luwes: antar-pose di-ease, ditambah napas, sedikit goyang kepala, dan follow-through.

export const INK = '#1C1F24';
export const THREAD = '#E5652E';

// Sudut dalam derajat. 0 = lurus ke bawah, positif = berputar ke kanan (searah jarum jam dari bawah ke kanan).
export type Pose = {
  torso: number;       // kemiringan badan dari tegak (positif condong ke kanan)
  head: number;        // kemiringan kepala relatif badan
  armL: [number, number]; // [bahu, siku relatif]
  armR: [number, number];
  legL: [number, number]; // [pinggul, lutut relatif]
  legR: [number, number];
  sit?: number;        // 0 berdiri, 1 duduk (pinggul turun)
};

export const POSES: Record<string, Pose> = {
  stand: { torso: 0, head: 0, armL: [-12, 8], armR: [12, -8], legL: [-7, 2], legR: [7, -2] },
  // duduk, kaki lurus ke depan (kanan), tangan di alat tenun
  weaveA: { torso: 10, head: 12, armL: [58, 32], armR: [68, 26], legL: [84, 6], legR: [92, 4], sit: 1 },
  weaveB: { torso: 16, head: 16, armL: [74, 14], armR: [84, 8], legL: [84, 6], legR: [92, 4], sit: 1 },
  // bingung: satu tangan di kepala, satu memegang HP di depan dada
  confused: { torso: -2, head: -12, armL: [150, 105], armR: [28, 122], legL: [-8, 3], legR: [9, -3] },
  // memegang HP di depan dada, menunduk
  phone: { torso: 3, head: 16, armL: [22, 128], armR: [34, 118], legL: [-7, 2], legR: [7, -2] },
  cheer: { torso: 0, head: -8, armL: [-150, -15], armR: [150, 15], legL: [-9, 2], legR: [9, -2] },
  // duduk, memegang HP, jempol ke atas
  thumbs: { torso: 6, head: 10, armL: [30, 118], armR: [120, 70], legL: [84, 6], legR: [92, 4], sit: 1 },
  // memegang kain ke arah kanan / kiri
  holdR: { torso: 4, head: 6, armL: [78, 6], armR: [70, 12], legL: [-6, 2], legR: [8, -2] },
  holdL: { torso: -4, head: -6, armL: [-78, -6], armR: [-70, -12], legL: [-8, 2], legR: [6, -2] },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  torso: lerp(a.torso, b.torso, t), head: lerp(a.head, b.head, t),
  armL: [lerp(a.armL[0], b.armL[0], t), lerp(a.armL[1], b.armL[1], t)],
  armR: [lerp(a.armR[0], b.armR[0], t), lerp(a.armR[1], b.armR[1], t)],
  legL: [lerp(a.legL[0], b.legL[0], t), lerp(a.legL[1], b.legL[1], t)],
  legR: [lerp(a.legR[0], b.legR[0], t), lerp(a.legR[1], b.legR[1], t)],
  sit: lerp(a.sit ?? 0, b.sit ?? 0, t),
});

// Keyframe pose: [detik, pose]. Ease in-out antar keyframe.
export const poseAt = (keys: [number, Pose][], t: number): Pose => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
      return mixPose(p0, p1, Easing.inOut(Easing.cubic)((t - t0) / (t1 - t0 || 1)));
    }
  }
  return keys[keys.length - 1][1];
};

// Siklus menenun: bolak-balik weaveA ↔ weaveB, halus (sinus).
export const weaving = (t: number, speed = 1, phase = 0): Pose => mixPose(POSES.weaveA, POSES.weaveB, 0.5 - 0.5 * Math.cos((t * speed * 2.2 + phase) * Math.PI));

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (x: number, y: number, ang: number, len: number) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len] as [number, number];

export type Joints = { hip: [number, number]; neck: [number, number]; head: [number, number]; handL: [number, number]; handR: [number, number]; elbowL: [number, number]; elbowR: [number, number] };

// Gambar figur. (x, y) = posisi kaki (berdiri) atau dudukan (duduk). t untuk napas.
export const Stick: React.FC<{
  x: number; y: number; s?: number; pose: Pose; t: number; color?: string; hair?: 'bun' | 'short' | 'none';
  accent?: string; opacity?: number; prop?: 'phone' | 'none'; flip?: boolean; onJoints?: (j: Joints) => void;
}> = ({ x, y, s = 1, pose, t, color = INK, hair = 'none', accent, opacity = 1, prop = 'none', flip = false }) => {
  const sit = pose.sit ?? 0;
  const L = { torso: 92, upper: 50, fore: 46, thigh: 56, shin: 54 };
  const breathe = Math.sin(t * 2.1) * 1.6;
  const hip: [number, number] = [0, -lerp(110, 30, sit)];
  const torsoAng = 180 - pose.torso + Math.sin(t * 1.3) * 0.8;
  const neck = pt(hip[0], hip[1], torsoAng, L.torso + breathe * 0.4);
  const headAng = torsoAng - pose.head + Math.sin(t * 0.9) * 2;
  const headC = pt(neck[0], neck[1], headAng, 26);
  const shoulder = pt(hip[0], hip[1], torsoAng, L.torso - 6);
  const arm = (a: [number, number]) => { const e = pt(shoulder[0], shoulder[1], a[0], L.upper); const h = pt(e[0], e[1], a[0] + a[1], L.fore); return [e, h] as const; };
  const leg = (a: [number, number]) => { const k = pt(hip[0], hip[1], a[0], L.thigh); const f = pt(k[0], k[1], a[0] + a[1], L.shin); return [k, f] as const; };
  const [eL, hL] = arm(pose.armL), [eR, hR] = arm(pose.armR);
  const [kL, fL] = leg(pose.legL), [kR, fR] = leg(pose.legR);
  const sw = 7;
  const line = (pts: [number, number][], c = color, w = sw) => <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={opacity}>
      {line([hip, kL, fL])}
      {line([hip, kR, fR])}
      {line([hip, neck])}
      {line([shoulder, eL, hL])}
      {line([shoulder, eR, hR])}
      {accent && line([pt(hip[0], hip[1], torsoAng, L.torso * 0.55), pt(hip[0], hip[1], torsoAng, L.torso * 0.8)], accent, sw + 5)}
      <circle cx={headC[0]} cy={headC[1]} r={22} fill="#fff" stroke={color} strokeWidth={sw} />
      {hair === 'bun' && <circle cx={headC[0] - 20} cy={headC[1] - 14} r={10} fill={color} />}
      {hair === 'short' && <path d={`M${headC[0] - 22} ${headC[1] - 4} Q ${headC[0]} ${headC[1] - 36} ${headC[0] + 22} ${headC[1] - 6}`} fill="none" stroke={color} strokeWidth={sw + 2} strokeLinecap="round" />}
      {prop === 'phone' && <rect x={hR[0] - 12} y={hR[1] - 22} width={24} height={40} rx={5} fill={THREAD} stroke={color} strokeWidth={4} transform={`rotate(${-10} ${hR[0]} ${hR[1]})`} />}
    </g>
  );
};

// Posisi tangan (untuk efek deteksi / benang) dihitung ulang dengan rumus yang sama.
export const handsOf = (x: number, y: number, s: number, pose: Pose) => {
  const sit = pose.sit ?? 0;
  const hip: [number, number] = [0, -lerp(110, 30, sit)];
  const torsoAng = 180 - pose.torso;
  const shoulder = pt(hip[0], hip[1], torsoAng, 86);
  const arm = (a: [number, number]) => { const e = pt(shoulder[0], shoulder[1], a[0], 50); return pt(e[0], e[1], a[0] + a[1], 46); };
  const head = pt(...pt(hip[0], hip[1], torsoAng, 92), torsoAng - pose.head, 26);
  const map = (p: [number, number]) => [x + p[0] * s, y + p[1] * s] as [number, number];
  return { L: map(arm(pose.armL)), R: map(arm(pose.armR)), head: map(head as [number, number]), hip: map(hip) };
};

// Alat tenun gedogan sederhana di depan penenun duduk (menghadap kanan).
export const Loom: React.FC<{ x: number; y: number; s?: number; woven?: number; t: number; color?: string }> = ({ x, y, s = 1, woven = 0.6, t, color = INK }) => {
  const rows = 9;
  const shuttle = Math.sin(t * 2.2 * Math.PI) * 0.5 + 0.5;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* tiang */}
      <line x1={210} y1={-150} x2={210} y2={0} stroke={color} strokeWidth={8} strokeLinecap="round" />
      <line x1={180} y1={0} x2={240} y2={0} stroke={color} strokeWidth={8} strokeLinecap="round" />
      {/* lungsi: dari pangkuan (0,-60) ke tiang (210,-140) */}
      {Array.from({ length: 7 }, (_, i) => <line key={i} x1={0} y1={-70 + i * 4} x2={210} y2={-146 + i * 4} stroke={color} strokeWidth={2} opacity={0.8} />)}
      <line x1={-4} y1={-74} x2={-4} y2={-38} stroke={color} strokeWidth={8} strokeLinecap="round" />
      {/* kain yang sudah ditenun (oranye) */}
      {Array.from({ length: rows }, (_, j) => {
        const vis = j / rows < woven ? 1 : 0;
        const px = 6 + j * 9;
        return <line key={j} x1={px} y1={-72 - j * 3.1} x2={px} y2={-44 - j * 3.1} stroke={THREAD} strokeWidth={6} strokeLinecap="round" opacity={vis} />;
      })}
      {/* teropong bergerak */}
      <rect x={70 + shuttle * 14} y={-108 + shuttle * 2} width={10} height={44} rx={5} fill={color} transform={`rotate(-20 ${75 + shuttle * 14} -86)`} />
    </g>
  );
};
