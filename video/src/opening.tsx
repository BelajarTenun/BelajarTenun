import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SERIF, SANS, MONO, Bg, WordReveal, Card, Tag, Chip, Media, fade, useSpring } from './theme';

// Kalimat besar seperti layar presentasi di video referensi: kata baru tajam, kata lama memudar ke abu.
const Statement: React.FC<{ lines: { text: string; start: number }[]; size?: number; left?: number }> = ({ lines, size = 92, left = 200 }) => (
  <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: left, paddingRight: 200, fontFamily: SANS, fontWeight: 500, fontSize: size, lineHeight: 1.18, letterSpacing: -1.5, color: C.ink }}>
    {lines.map((l, i) => <div key={i}><WordReveal text={l.text} start={l.start} per={5} /></div>)}
  </AbsoluteFill>
);

// Adegan 1
export const A01Tangan: React.FC = () => {
  const f = useCurrentFrame();
  const dim = interpolate(f, [100, 130], [1, 0.32], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 200, fontFamily: SANS, fontWeight: 500, fontSize: 100, lineHeight: 1.15, letterSpacing: -2, color: C.ink }}>
        <div style={{ opacity: dim }}><WordReveal text="Menenun dulu diajarkan" start={10} per={7} /></div>
        <div><WordReveal text="dari tangan ke tangan." start={110} per={7} /></div>
      </AbsoluteFill>
    </Bg>
  );
};

// Adegan 2 — titik-titik penenun memudar satu per satu, lalu tiga kalimat.
export const A02Masalah: React.FC = () => {
  const f = useCurrentFrame();
  const dots = Array.from({ length: 60 }, (_, i) => i);
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 200, top: 300, width: 620, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 26 }}>
        {dots.map((i) => {
          const goes = (i * 37) % 60 > 9;
          const o = goes ? 1 - fade(f, 20 + ((i * 13) % 60) * 1.6, 40 + ((i * 13) % 60) * 1.6) * 0.9 : 1;
          return <div key={i} style={{ width: 22, height: 22, borderRadius: 11, background: C.ink, opacity: o }} />;
        })}
      </div>
      <div style={{ position: 'absolute', left: 200, top: 700, fontFamily: MONO, fontSize: 18, color: C.soft, opacity: fade(f, 120, 140) }}>[ penenun senior · ilustrasi ]</div>
      <div style={{ position: 'absolute', left: 1000, top: 330, width: 760, fontFamily: SANS, fontWeight: 500, fontSize: 54, lineHeight: 1.3, letterSpacing: -0.8, color: C.ink }}>
        {[['Penenun senior makin sedikit.', 15], ['Akses ke guru terbatas.', 80], ['Pengetahuannya pelan-pelan hilang.', 145]].map(([t, s], i, arr) => {
          const next = arr[i + 1]?.[1] as number | undefined;
          const dim = next ? interpolate(f, [next, next + 15], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
          return <div key={i} style={{ opacity: dim, marginBottom: 18 }}><WordReveal text={t as string} start={s as number} per={4} /></div>;
        })}
      </div>
    </Bg>
  );
};

// Adegan 4 — nama produk. Garis benang tipis tersusun jadi tenunan kecil, lalu nama serif.
export const A04Logo: React.FC = () => {
  const f = useCurrentFrame();
  const s = useSpring(50);
  const n = 7;
  return (
    <Bg>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute', left: 890, top: 250 }}>
        {Array.from({ length: n }, (_, i) => <line key={'v' + i} x1={10 + i * 20} x2={10 + i * 20} y1={10} y2={10 + 120 * fade(f, i * 3, i * 3 + 22)} stroke={C.ink} strokeWidth="2" />)}
        {Array.from({ length: n }, (_, i) => <line key={'h' + i} y1={10 + i * 20} y2={10 + i * 20} x1={10} x2={10 + 120 * fade(f, 24 + i * 3, 46 + i * 3)} stroke={C.ink} strokeWidth="2" opacity={0.45} />)}
      </svg>
      <div style={{ position: 'absolute', top: 430, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 140, letterSpacing: -2, color: C.ink, opacity: s, filter: `blur(${(1 - s) * 10}px)` }}>BelajarTenun</div>
      <div style={{ position: 'absolute', top: 620, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 32, color: C.soft }}>
        <WordReveal text="Tutor AI di kacamata untuk belajar menenun." start={80} per={4} />
      </div>
      <div style={{ position: 'absolute', top: 760, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: C.soft, opacity: fade(f, 140, 160) }}>
        [ PENGETAHUAN TRADISIONAL · TEKNOLOGI TRADISIONAL · BAHASA ]
      </div>
    </Bg>
  );
};

// Adegan 5 — grid video open source. Sisi kiri kosong untuk Andrew.
export type Clip = { src?: string; license: string; credit?: string };
const DEFAULT_CLIPS: Clip[] = ['CC BY', 'Domain publik', 'CC BY-SA', 'CC0', 'CC BY', 'Arsip museum', 'CC BY', 'Dataset riset', 'CC0', 'CC BY', 'Domain publik', 'CC BY'].map((license) => ({ license }));
export const A05Grid: React.FC<{ clips?: Clip[]; leftSpace?: boolean }> = ({ clips = DEFAULT_CLIPS, leftSpace = true }) => {
  const f = useCurrentFrame();
  const x0 = leftSpace ? 860 : 140, w = leftSpace ? 960 : 1640, cols = 4, gap = 14;
  const cw = (w - gap * (cols - 1)) / cols, ch = cw * 0.6;
  return (
    <Bg>
      {clips.map((c, i) => {
        const p = fade(f, 6 + i * 8, 28 + i * 8);
        const x = x0 + (i % cols) * (cw + gap), y = 230 + Math.floor(i / cols) * (ch + gap + 34);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: cw, opacity: p, filter: `blur(${(1 - p) * 8}px)` }}>
            <Media src={c.src} label={c.credit ?? `klip ${i + 1}`} hue={200 + (i * 17) % 60} style={{ width: cw, height: ch, borderRadius: 12 }} />
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: C.soft, marginTop: 8 }}>[{c.license}]</div>
          </div>
        );
      })}
    </Bg>
  );
};

// Adegan 6 — computer vision, dengan garis tipis dan label mono.
const STAGES = ['Mengenal alat', 'Membuka mulut lungsi', 'Memasukkan pakan', 'Merapatkan pakan', 'Mengulang baris'];
export const A06Vision: React.FC<{ src?: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const box = (x: number, y: number, w: number, h: number, label: string, s: number) => {
    const p = fade(f, s, s + 14);
    const L = 22;
    const corner = (st: React.CSSProperties) => <div style={{ position: 'absolute', width: L, height: L, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0, ...st }} />;
    return (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: p }}>
        {corner({ left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2 })}{corner({ right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2 })}
        {corner({ left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2 })}{corner({ right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2 })}
        <div style={{ position: 'absolute', top: -28, left: 0, fontFamily: MONO, fontSize: 15, color: '#fff', letterSpacing: 1 }}>{label}</div>
      </div>
    );
  };
  const active = Math.min(4, Math.floor(interpolate(f, [40, 260], [0, 5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 140, top: 150, width: 1080, height: 640, borderRadius: 24, overflow: 'hidden' }}>
        <Media src={src} label="video penenun · open source" style={{ width: 1080, height: 640 }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25), transparent 30%, transparent 70%, rgba(0,0,0,0.35))' }} />
        {box(110, 170, 360, 300, 'TANGAN 0.94', 20)}
        {box(520, 100, 440, 120, 'BELIDA 0.88', 35)}
        {box(540, 270, 420, 260, 'LUNGSI 0.91', 50)}
        <div style={{ position: 'absolute', left: 28, bottom: 24, fontFamily: MONO, fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>
          FRAME {String(1200 + f * 4).padStart(5, '0')}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 140, top: 840, width: 1080, display: 'flex', gap: 10 }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 2, background: i <= active ? C.ink : C.line }} />
            <div style={{ fontFamily: SANS, fontSize: 17, color: i <= active ? C.ink : C.soft, marginTop: 12 }}>{String(i + 1).padStart(2, '0')} {s}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 1290, top: 150, width: 490, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { t: 'Tahap', v: STAGES[active], s: 60 },
          { t: 'Istilah', v: 'lungsi · pakan · belida', s: 120 },
          { t: 'Kesalahan umum', v: 'Pakan terlalu kencang, pinggir menyempit', s: 180 },
          { t: 'Digabung dari', v: '12 video · 4 tradisi', s: 240 },
        ].map((k) => {
          const p = fade(f, k.s, k.s + 18);
          return (
            <Card key={k.t} style={{ opacity: p, filter: `blur(${(1 - p) * 6}px)` }}>
              <Tag>{k.t}</Tag>
              <div style={{ fontSize: 26, marginTop: 8 }}>{k.v}</div>
            </Card>
          );
        })}
      </div>
    </Bg>
  );
};

// Adegan 7 — validasi penenun.
export const A07Validasi: React.FC = () => {
  const f = useCurrentFrame();
  const state = f < 90 ? 0 : f < 160 ? 1 : 2;
  const label = ['Usulan AI', 'Diubah penenun', 'Tervalidasi penenun'][state];
  const text = state === 0 ? 'Angkat belida agar mulut lungsi terbuka lebar.' : 'Angkat belida perlahan agar mulut lungsi terbuka.';
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 200, top: 250, width: 1520 }}>
        <div style={{ display: 'flex', gap: 28, fontFamily: MONO, fontSize: 18, letterSpacing: 2 }}>
          {['Usulan AI', 'Diubah penenun', 'Tervalidasi penenun'].map((l, i) => (
            <div key={l} style={{ color: i === state ? C.ink : C.line, transition: 'none' }}>[ {l.toUpperCase()} ]</div>
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 72, lineHeight: 1.2, letterSpacing: -1.2, color: C.ink, marginTop: 50 }}>
          {text}{state === 1 && <span style={{ opacity: Math.floor(f / 10) % 2, fontWeight: 300 }}>|</span>}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 60, alignItems: 'center' }}>
          <Media label="bukti 00:42" style={{ width: 240, height: 140, borderRadius: 12 }} />
          <div style={{ fontFamily: SANS, fontSize: 22, color: C.soft, lineHeight: 1.6 }}>
            Tahap 2 · Membuka mulut lungsi<br />Sumber: video CC BY · [pembuat]
            <div style={{ color: C.ink, opacity: fade(f, 165, 185) }}>{state === 2 ? 'Divalidasi oleh Ibu [nama], penenun' : ' '}</div>
          </div>
        </div>
      </div>
      <Chip label="KUALITAS" start={170} />
    </Bg>
  );
};

export { STAGES };
