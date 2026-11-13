import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Sequence } from 'remotion';
import { C, SERIF, SANS, Bg, WordReveal, Card, Chip, Media, fade, useSpring } from './theme';

// Adegan 1 — teks di "layar TV" belakang Andrew. Latar polos supaya bisa ditaruh di TV atau dipakai penuh.
export const A01Tangan: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - fade(f, 95, 110);
  return (
    <Bg>
      <AbsoluteFill style={{ padding: '0 220px', justifyContent: 'center', fontFamily: SERIF, fontSize: 104, color: C.ink, lineHeight: 1.15 }}>
        <div style={{ opacity: out }}><WordReveal text="Menenun dulu diajarkan…" start={8} per={6} /></div>
        <div style={{ opacity: fade(f, 110, 125), position: 'absolute', left: 220, top: '50%', transform: 'translateY(-50%)' }}>
          <WordReveal text="…dari tangan ke tangan." start={112} per={6} style={{ fontStyle: 'italic', color: C.accent }} />
        </div>
      </AbsoluteFill>
    </Bg>
  );
};

// Adegan 2 — masalah: penenun berkurang, akses terbatas, pengetahuan memudar.
const Person: React.FC<{ x: number; y: number; o: number; senior?: boolean }> = ({ x, y, o, senior }) => (
  <g transform={`translate(${x},${y})`} opacity={o}>
    <circle cx="0" cy="-34" r="16" fill={senior ? C.accent : C.soft} />
    <path d="M-24 22 Q-24 -12 0 -12 Q24 -12 24 22 Z" fill={senior ? C.accent : C.soft} />
  </g>
);
export const A02Masalah: React.FC = () => {
  const f = useCurrentFrame();
  const seniors = Array.from({ length: 12 }, (_, i) => i);
  const lines = [
    { t: 'Penenun senior makin sedikit', s: 20 },
    { t: 'Akses ke guru terbatas', s: 85 },
    { t: 'Pengetahuan pelan-pelan hilang', s: 140 },
  ];
  return (
    <Bg motif>
      <svg width="900" height="1080" style={{ position: 'absolute', left: 80, top: 0 }}>
        {seniors.map((i) => {
          const gone = i % 3 !== 0 ? fade(f, 30 + i * 6, 50 + i * 6) : 0;
          return <Person key={i} x={150 + (i % 4) * 190} y={330 + Math.floor(i / 4) * 190} o={1 - gone * 0.88} senior />;
        })}
        {/* benang yang putus */}
        <line x1="60" x2={interpolate(f, [140, 200], [840, 380], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} y1="900" y2="900" stroke={C.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="1 0" />
      </svg>
      <div style={{ position: 'absolute', left: 1020, top: 330, fontFamily: SERIF, fontSize: 60, color: C.ink, lineHeight: 1.6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ opacity: fade(f, l.s, l.s + 14), transform: `translateX(${(1 - fade(f, l.s, l.s + 14)) * 30}px)` }}>
            <span style={{ color: C.accent, marginRight: 18 }}>—</span>{l.t}
          </div>
        ))}
      </div>
    </Bg>
  );
};

// Adegan 4 — logo: benang menenun dirinya sendiri, lalu nama dan unsur budaya.
export const A04Logo: React.FC = () => {
  const f = useCurrentFrame();
  const n = 9;
  const s = useSpring(55);
  const tags = ['Pengetahuan tradisional', 'Teknologi tradisional', 'Bahasa'];
  return (
    <Bg>
      <svg width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', left: 830, top: 170 }}>
        {Array.from({ length: n }, (_, i) => {
          const p = fade(f, i * 3, i * 3 + 20);
          return <line key={'v' + i} x1={30 + i * 25} x2={30 + i * 25} y1={30} y2={30 + 200 * p} stroke={C.ink} strokeWidth="6" strokeLinecap="round" />;
        })}
        {Array.from({ length: n }, (_, i) => {
          const p = fade(f, 25 + i * 3, 45 + i * 3);
          return <line key={'h' + i} y1={30 + i * 25} y2={30 + i * 25} x1={30} x2={30 + 200 * p} stroke={i % 2 ? C.gold : C.accent} strokeWidth="8" strokeLinecap="round" strokeDasharray="18 7" strokeDashoffset={i % 2 ? 0 : 12} />;
        })}
      </svg>
      <div style={{ position: 'absolute', top: 470, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 120, color: C.ink, opacity: s, transform: `translateY(${(1 - s) * 24}px)` }}>
        BelajarTenun
      </div>
      <div style={{ position: 'absolute', top: 640, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 34, color: C.soft, opacity: fade(f, 75, 90) }}>
        Tutor AI di kacamata untuk belajar menenun
      </div>
      <div style={{ position: 'absolute', top: 760, width: '100%', display: 'flex', justifyContent: 'center', gap: 20 }}>
        {tags.map((t, i) => (
          <div key={t} style={{ opacity: fade(f, 110 + i * 10, 125 + i * 10), fontFamily: SANS, fontSize: 24, color: C.ink, border: `1.5px solid ${C.line}`, borderRadius: 999, padding: '10px 22px', background: '#fff' }}>{t}</div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 840, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 20, letterSpacing: 3, color: C.soft, opacity: fade(f, 150, 165) }}>
        OBJEK PEMAJUAN KEBUDAYAAN
      </div>
    </Bg>
  );
};

// Adegan 5 — grid video open source dengan label lisensi. Sisi kiri dikosongkan untuk Andrew.
export type Clip = { src?: string; license: string; credit?: string };
const DEFAULT_CLIPS: Clip[] = [
  { license: 'CC BY' }, { license: 'Domain publik' }, { license: 'CC BY-SA' }, { license: 'CC0' },
  { license: 'CC BY' }, { license: 'Arsip museum' }, { license: 'CC BY' }, { license: 'Dataset riset' },
  { license: 'CC0' }, { license: 'CC BY' }, { license: 'Domain publik' }, { license: 'CC BY' },
];
export const A05Grid: React.FC<{ clips?: Clip[]; leftSpace?: boolean }> = ({ clips = DEFAULT_CLIPS, leftSpace = true }) => {
  const f = useCurrentFrame();
  const x0 = leftSpace ? 820 : 120;
  const w = leftSpace ? 1020 : 1680;
  const cols = 4, gap = 18;
  const cw = (w - gap * (cols - 1)) / cols, ch = cw * 0.62;
  return (
    <Bg>
      {clips.map((c, i) => {
        const p = fade(f, 6 + i * 9, 20 + i * 9);
        const x = x0 + (i % cols) * (cw + gap), y = 170 + Math.floor(i / cols) * (ch + gap + 20);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: cw, opacity: p, transform: `scale(${0.85 + p * 0.15})` }}>
            <Media src={c.src} label={c.credit ?? `video ${i + 1}`} hue={15 + (i * 23) % 60} style={{ width: cw, height: ch, borderRadius: 14 }} />
            <div style={{ position: 'absolute', left: 10, bottom: 10, fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#fff', background: 'rgba(31,27,22,0.75)', borderRadius: 6, padding: '4px 9px' }}>{c.license}</div>
          </div>
        );
      })}
    </Bg>
  );
};

// Adegan 6 — computer vision: kotak deteksi di atas video + garis waktu tahap + kartu istilah & kesalahan.
const STAGES = ['Mengenal alat', 'Membuka mulut lungsi', 'Memasukkan pakan', 'Merapatkan pakan', 'Mengulang baris'];
export const A06Vision: React.FC<{ src?: string }> = ({ src }) => {
  const f = useCurrentFrame();
  const box = (x: number, y: number, w: number, h: number, label: string, color: string, s: number) => {
    const p = fade(f, s, s + 10);
    return (
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: `3px solid ${color}`, borderRadius: 8, opacity: p, transform: `scale(${1.08 - p * 0.08})` }}>
        <div style={{ position: 'absolute', top: -34, left: -3, background: color, color: '#fff', fontFamily: SANS, fontSize: 18, fontWeight: 700, padding: '4px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    );
  };
  const active = Math.min(4, Math.floor(interpolate(f, [40, 260], [0, 5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  // garis pindai
  const scan = (f * 9) % 620;
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 120, top: 110, width: 1100, height: 620, borderRadius: 20, overflow: 'hidden' }}>
        <Media src={src} label="video penenun (open source)" style={{ width: 1100, height: 620 }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: scan, height: 2, background: 'rgba(74,123,208,0.8)', boxShadow: '0 0 20px rgba(74,123,208,0.9)' }} />
        {box(120, 160, 360, 300, 'tangan · 0.94', C.ai, 20)}
        {box(520, 90, 460, 120, 'belida · 0.88', C.gold, 35)}
        {box(540, 260, 420, 260, 'lungsi · 0.91', C.ok, 50)}
        <div style={{ position: 'absolute', left: 20, top: 20, fontFamily: 'JetBrains Mono, monospace', fontSize: 18, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '6px 10px', borderRadius: 6 }}>
          frame {String(1200 + f * 4).padStart(5, '0')} · 00:{String(Math.floor(f / 30) + 12).padStart(2, '0')}
        </div>
      </div>
      {/* garis waktu tahap */}
      <div style={{ position: 'absolute', left: 120, top: 770, width: 1100, display: 'flex', gap: 8 }}>
        {STAGES.map((s, i) => {
          const p = fade(f, 40 + i * 44, 52 + i * 44);
          return (
            <div key={s} style={{ flex: 1, opacity: 0.25 + p * 0.75 }}>
              <div style={{ height: 14, borderRadius: 7, background: i <= active ? C.accent : C.line }} />
              <div style={{ fontFamily: SANS, fontSize: 19, color: C.ink, marginTop: 10 }}><b>{i + 1}</b> {s}</div>
            </div>
          );
        })}
      </div>
      {/* kartu kanan */}
      <div style={{ position: 'absolute', left: 1290, top: 110, width: 510, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {[
          { t: 'Tahap', v: STAGES[active], c: C.accent, s: 60 },
          { t: 'Istilah', v: 'lungsi · pakan · belida', c: C.gold, s: 120 },
          { t: 'Kesalahan umum', v: 'Pakan terlalu kencang → pinggir menyempit', c: C.warn, s: 180 },
          { t: 'Digabung dari', v: '12 video · 4 tradisi', c: C.ai, s: 240 },
        ].map((k) => {
          const p = fade(f, k.s, k.s + 14);
          return (
            <Card key={k.t} style={{ opacity: p, transform: `translateX(${(1 - p) * 40}px)`, borderLeft: `8px solid ${k.c}` }}>
              <div style={{ fontSize: 18, color: C.soft, letterSpacing: 2, textTransform: 'uppercase' }}>{k.t}</div>
              <div style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>{k.v}</div>
            </Card>
          );
        })}
      </div>
    </Bg>
  );
};

// Adegan 7 — validasi penenun: 🤖 Usulan AI → ✏️ Diubah → ✔ Tervalidasi.
export const A07Validasi: React.FC = () => {
  const f = useCurrentFrame();
  const state = f < 90 ? 0 : f < 160 ? 1 : 2;
  const badge = [
    { t: '🤖 Usulan AI', c: C.ai },
    { t: '✏️ Diubah penenun', c: C.gold },
    { t: '✔ Tervalidasi penenun', c: C.ok },
  ][state];
  const text = state === 0 ? 'Angkat belida agar mulut lungsi terbuka lebar.' : 'Angkat belida perlahan agar mulut lungsi terbuka.';
  const pop = useSpring(state === 0 ? 10 : state === 1 ? 90 : 160, 12);
  return (
    <Bg motif>
      <div style={{ position: 'absolute', left: 360, top: 200, width: 1200 }}>
        <Card style={{ padding: '40px 48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, color: C.soft, letterSpacing: 2 }}>TAHAP 2 · MEMBUKA MULUT LUNGSI</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', background: badge.c, borderRadius: 999, padding: '8px 20px', transform: `scale(${0.9 + pop * 0.1})` }}>{badge.t}</div>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 52, marginTop: 30, lineHeight: 1.3 }}>
            {text}
            {state === 1 && <span style={{ borderRight: `3px solid ${C.ink}`, opacity: Math.floor(f / 8) % 2 }} />}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 36, alignItems: 'center' }}>
            <Media label="▶ bukti video · 00:42" style={{ width: 260, height: 150, borderRadius: 12 }} />
            <div style={{ fontSize: 24, color: C.soft, lineHeight: 1.5 }}>
              Sumber: video CC BY · [pembuat]<br />
              {state === 2 && <span style={{ color: C.ok, fontWeight: 600, opacity: fade(f, 165, 175) }}>Divalidasi oleh Ibu [nama], penenun</span>}
            </div>
          </div>
        </Card>
      </div>
      <Chip label="KUALITAS" start={170} />
    </Bg>
  );
};

export { STAGES };
