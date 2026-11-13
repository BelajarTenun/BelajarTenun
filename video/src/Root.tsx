import React from 'react';
import { Composition, AbsoluteFill } from 'remotion';
import { A01Tangan, A02Masalah, A04Logo, A05Grid, A06Vision, A07Validasi } from './opening';
import { A08Mulai, A09Tahap, A10Kosakata, A11Koreksi, A12Tanya, A13LuarModul } from './pov';
import { A14Pendamping, A16Catatan, A17Progres, A19Arsip, A20Banding, A21Angka, A24Bisnis, A25Peta, A28Penutup } from './closing';
import { Chip, setFloating } from './theme';
import { OnAndrew } from './andrew';
import { FullVideo, FULL_SECONDS } from './full';

// Semua 1920×1080, 30 fps. Nama dengan akhiran "-overlay" dirender transparan untuk ditumpuk di atas footage.
const S = (sec: number) => Math.round(sec * 30);
const ChipOnly: React.FC<{ label: string }> = ({ label }) => <AbsoluteFill><Chip label={label} start={5} /></AbsoluteFill>;

const list: [string, React.FC<any>, number, any?][] = [
  ['A01-teks-tangan', A01Tangan, 7],
  ['A02-masalah', A02Masalah, 7.5],
  ['A04-logo', A04Logo, 8],
  ['A05-grid-open-source', A05Grid, 8],
  ['A06-computer-vision', A06Vision, 10],
  ['A07-validasi', A07Validasi, 9],
  ['A08-mulai', A08Mulai, 7],
  ['A08-mulai-overlay', A08Mulai, 7, { overlay: true }],
  ['A09-tahap', A09Tahap, 10],
  ['A09-tahap-overlay', A09Tahap, 10, { overlay: true }],
  ['A10-kosakata', A10Kosakata, 8],
  ['A10-kosakata-overlay', A10Kosakata, 8, { overlay: true }],
  ['A11-koreksi', A11Koreksi, 10],
  ['A11-koreksi-overlay', A11Koreksi, 10, { overlay: true }],
  ['A12-tanya-overlay', A12Tanya, 9],
  ['A13-luar-modul-overlay', A13LuarModul, 9],
  ['A14-pendamping', A14Pendamping, 10],
  ['A16-catatan', A16Catatan, 8],
  ['A17-progres', A17Progres, 7],
  ['A19-arsip', A19Arsip, 8],
  ['A20-perbandingan', A20Banding, 20],
  ['A21-angka-uji', A21Angka, 12],
  ['A24-bisnis', A24Bisnis, 15],
  ['A25-peta', A25Peta, 10],
  ['A28-penutup', A28Penutup, 8],
  ...['KUALITAS', 'ADAPTIF', 'BAHASA DAERAH', 'INTERAKTIF', 'AKSES', 'EFEKTIVITAS', 'PELESTARIAN'].map(
    (l) => [`chip-${l.toLowerCase().replace(' ', '-')}-overlay`, ChipOnly, 6, { label: l }] as [string, React.FC<any>, number, any],
  ),
];

// Versi panel di samping Andrew (transparan). [id, adegan, detik, sisi panel, props adegan]
const andrew: [string, React.FC<any>, number, 'kanan' | 'kiri', any?][] = [
  ['A01-teks-tangan', A01Tangan, 7, 'kanan'],
  ['A02-masalah', A02Masalah, 7.5, 'kanan'],
  ['A04-logo', A04Logo, 8, 'kanan'],
  ['A05-grid-open-source', A05Grid, 8, 'kanan', { leftSpace: false }],
  ['A06-computer-vision', A06Vision, 10, 'kanan'],
  ['A07-validasi', A07Validasi, 9, 'kanan'],
  ['A14-pendamping', A14Pendamping, 10, 'kanan'],
  ['A16-catatan', A16Catatan, 8, 'kanan'],
  ['A17-progres', A17Progres, 7, 'kanan'],
  ['A19-arsip', A19Arsip, 8, 'kanan'],
  ['A20-perbandingan', A20Banding, 20, 'kiri', { rightSpace: false }],
  ['A21-angka-uji', A21Angka, 12, 'kanan'],
  ['A24-bisnis', A24Bisnis, 15, 'kanan', { x0: 320 }],
  ['A25-peta', A25Peta, 10, 'kanan'],
];
const SCENES: Record<string, React.FC<any>> = {};
const OnAndrewById: React.FC<any> = ({ scene, ...rest }) => <OnAndrew Scene={SCENES[scene]} {...rest} />;
for (const [id, Scene, sec, side, sp] of andrew) {
  SCENES[id] = Scene;
  list.push([`${id}-andrew-overlay`, OnAndrewById, sec, { scene: id, sceneProps: sp ?? {}, side }]);
  list.push([`${id}-andrew-preview`, OnAndrewById, sec, { scene: id, sceneProps: sp ?? {}, side, preview: true }]);
}

// Bingkai storyboard untuk shot wajah/Andrew yang tidak punya animasi besar.
SCENES['A12-tanya'] = A12Tanya; SCENES['A13-luar-modul'] = A13LuarModul;
SCENES['kosong'] = () => null; SCENES['chip-akses'] = () => <AbsoluteFill><Chip label="AKSES" start={0} /></AbsoluteFill>;
for (const [id, scene, side] of [['SB03-andrew-kacamata', 'kosong', 'kiri'], ['SB12-wajah-tanya', 'A12-tanya', 'kanan'], ['SB13-wajah-luar-modul', 'A13-luar-modul', 'kanan'], ['SB15-andrew-akses', 'chip-akses', 'kiri']] as const) {
  list.push([`${id}-andrew-preview`, OnAndrewById, 9, { scene, side, preview: true, area: 1 }]);
}

list.push(['FULL-animatic', FullVideo, FULL_SECONDS]);

const cache = new Map<any, any>();
const withLight = (Comp: React.FC<any>) => {
  if (!cache.has(Comp)) cache.set(Comp, (p: any) => { setFloating(false); return <Comp {...p} />; });
  return cache.get(Comp);
};

export const Root: React.FC = () => (
  <>
    {list.map(([id, C, sec, props]) => (
      <Composition key={id} id={id} component={id.includes('-andrew-') || id.startsWith('FULL') ? C : withLight(C)} durationInFrames={S(sec)} fps={30} width={1920} height={1080} defaultProps={props ?? {}} />
    ))}
  </>
);
