import React from 'react';
import { Img, staticFile } from 'remotion';
import KANAN from '../public/phone3d/ph3d-kanan.json';
import KIRI from '../public/phone3d/ph3d-kiri.json';
import DEPAN from '../public/phone3d/ph3d-depan.json';

// HP 3D (three.js, dirender sekali dengan layar berlubang) + isi layar sebagai elemen DOM biasa yang
// dipetakan ke empat sudut layar lewat transformasi proyektif (matrix3d). Jadi rekaman layar asli
// bisa diputar di HP 3D tanpa merender 3D per frame.
export type Pose = 'kanan' | 'kiri' | 'depan';
type Q = [number, number][];
const CORNERS: Record<Pose, Q> = { kanan: KANAN as Q, kiri: KIRI as Q, depan: DEPAN as Q };
const PNG_W = 1200, PNG_H = 2000;
export const SCREEN_W = 390, SCREEN_H = 844; // ukuran CSS layar iPhone (isi dirancang di ruang ini)

// Matriks proyektif dari persegi (0,0)-(w,h) ke empat titik (searah jarum jam dari kiri atas).
function solve(A: number[][], b: number[]) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function quadMatrix(w: number, h: number, q: Q) {
  const src: Q = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const [a, bb, c, d, e, f, g, hh] = solve(A, b);
  // matrix3d kolom-utama
  return `matrix3d(${a},${d},0,${g},${bb},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}

// Status bar iPhone di atas isi layar (54 px), warna mengikuti halaman.
export const StatusBar: React.FC<{ dark?: boolean; bg?: string }> = ({ dark, bg = 'transparent' }) => {
  const c = dark ? '#fff' : '#111';
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 54, background: bg, fontFamily: "-apple-system, Inter, Arial", color: c, zIndex: 5 }}>
      <div style={{ position: 'absolute', left: 34, top: 18, fontSize: 16, fontWeight: 600 }}>9:41</div>
      <svg style={{ position: 'absolute', right: 26, top: 20 }} width="66" height="14" viewBox="0 0 66 14">
        {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={10 - (i + 1) * 2.4} width="3.2" height={(i + 1) * 2.4} fill={c} />)}
        <rect x="34" y="1.5" width="25" height="11" rx="3" fill="none" stroke={c} strokeWidth="1.2" /><rect x="36" y="3.5" width="19" height="7" rx="1.5" fill={c} /><rect x="60" y="5" width="1.8" height="4" fill={c} />
      </svg>
    </div>
  );
};

// Isi layar: status bar + area 390×790 (tangkapan/rekaman aplikasi asli, viewport 390×790).
export const Screen: React.FC<{ children: React.ReactNode; dark?: boolean; bar?: string }> = ({ children, dark, bar }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: SCREEN_H, overflow: 'hidden', background: bar ?? '#fbf8f1' }}>
    <StatusBar dark={dark} bg={bar} />
    <div style={{ position: 'absolute', left: 0, top: 54, width: SCREEN_W, height: SCREEN_H - 54, overflow: 'hidden' }}>{children}</div>
  </div>
);

export const Phone3D: React.FC<{ pose: Pose; x: number; y: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ pose, x, y, h, children, style }) => {
  const k = h / PNG_H;
  const q = CORNERS[pose].map(([u, v]) => [u * k, v * k]) as Q;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: PNG_W * k, height: h, ...style }}>
      <Img src={staticFile(`phone3d/ph3d-${pose}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: PNG_W * k, height: h }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: SCREEN_H, transformOrigin: '0 0', transform: quadMatrix(SCREEN_W, SCREEN_H, q), borderRadius: 50, overflow: 'hidden' }}>
        {children}
        <div style={{ position: 'absolute', left: (SCREEN_W - 112) / 2, top: 14, width: 112, height: 33, borderRadius: 17, background: '#000', zIndex: 9 }} />
      </div>
    </div>
  );
};
