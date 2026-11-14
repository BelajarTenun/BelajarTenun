import React from 'react';
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO, SANS, SERIF } from './theme';

// Babak 1 (0:00–0:30) — adegan 01–04, dibangun ulang dengan aturan gerak launch video:
// - judul per kata: blur 6→0 + abu→tinta, tanpa geser, lalu diam total
// - kedatangan ease-out panjang, keluar 40–50% lebih cepat
// - transisi punya sebab: lensa kacamata membesar menjadi dunia logo
// Footage Andrew: taruh di video/public/ lalu isi prop footage01 / footage03.

const FPS = 30;
const s = (x: number) => Math.round(x * FPS);
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ease = (f: number, a: number, b: number, e = Easing.out(Easing.exp)) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

const INK = '#232A33', GREY = '#B9BFC6', PAPER = '#EDEDE9';

// Kalimat yang muncul per kata (blur + abu → tinta), lalu diam. Keluar: blur-out cepat.
const Words: React.FC<{ text: string; at: number; out?: number; color?: string; from?: string; gap?: number; style?: React.CSSProperties }> = ({ text, at, out, color = INK, from = GREY, gap = 2, style }) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const o = out ? 1 - ease(f, out, out + 6, Easing.in(Easing.cubic)) : 1;
  const bo = out ? ease(f, out, out + 6) * 8 : 0;
  return (
    <span style={{ opacity: o, filter: `blur(${bo}px)`, ...style }}>
      {words.map((w, i) => {
        const p = ease(f, at + i * gap, at + i * gap + 5);
        const c = ease(f, at + i * gap + 3, at + i * gap + 12, Easing.inOut(Easing.cubic));
        return <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: p, filter: `blur(${(1 - p) * 6}px)`, color: c >= 1 ? color : mix(from, color, c) }}>{w}</span>;
      })}
    </span>
  );
};
const mix = (a: string, b: string, t: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [A, B] = [h(a), h(b)];
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

// Footage Andrew (atau siluet penanda). shift: 0 → 1 menggeser ke kiri (dir -1) atau kanan (+1).
const Andrew: React.FC<{ src?: string; shift?: number; dir?: number; push?: number; label?: string }> = ({ src, shift = 0, dir = -1, push = 0, label = 'footage Andrew' }) => {
  const tx = dir * 360 * shift, sc = 1 + 0.3 * shift + push;
  const style: React.CSSProperties = { position: 'absolute', inset: 0, transform: `translateX(${tx}px) scale(${sc})`, transformOrigin: '50% 45%' };
  if (src) return <div style={style}><OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 35%, #5f5c57 0%, #2b2a28 75%)' }}>
      <div style={style}>
        <svg width="1920" height="1080" viewBox="0 0 1920 1080">
          <circle cx="960" cy="420" r="120" fill="#1c1b19" />
          <path d="M700 1080 Q700 600 960 585 Q1220 600 1220 1080 Z" fill="#1c1b19" />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: 40, bottom: 36, fontFamily: MONO, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>[ {label} ]</div>
    </AbsoluteFill>
  );
};

// ── 01 · 0:00–0:07 · Andrew masuk, frame bergeser, teks di kanan ─────────────
const S01: React.FC<{ footage?: string }> = ({ footage }) => {
  const f = useCurrentFrame();
  const shift = ease(f, s(1.6), s(2.4), Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill>
      <Andrew src={footage} shift={shift} label="A1 · Andrew masuk dari kiri, berhenti di tengah" />
      <div style={{ position: 'absolute', left: 990, top: 410, width: 900, fontFamily: SANS, fontWeight: 500, fontSize: 70, lineHeight: 1.12, letterSpacing: -1.6, color: '#fff', textShadow: '0 2px 30px rgba(0,0,0,0.35)' }}>
        <div><Words text="Menenun dulu diajarkan" at={s(2.3)} gap={3} color="#FFFFFF" from="#8E9296" out={s(6.6)} /></div>
        <div><Words text="dari tangan ke tangan." at={s(4.1)} gap={3} color="#FFFFFF" from="#8E9296" out={s(6.65)} /></div>
      </div>
    </AbsoluteFill>
  );
};

// ── 02 · 0:07–0:15 · lungsi (benang tegak) putus satu per satu + tiga kalimat ──
const S02: React.FC = () => {
  const f = useCurrentFrame();
  const n = 26;
  const lines = [
    { t: 'Penenun senior makin sedikit.', at: s(0.4) },
    { t: 'Akses ke guru terbatas.', at: s(2.9) },
    { t: 'Pengetahuannya pelan-pelan hilang.', at: s(5.0) },
  ];
  // urutan putus yang tampak acak tapi deterministik
  const order = (i: number) => (i * 11) % n;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <svg width="760" height="1080" style={{ position: 'absolute', left: 120, top: 0 }}>
        {Array.from({ length: n }, (_, i) => {
          const k = order(i);
          const keep = k % 6 === 0; // sebagian kecil tetap
          const start = s(0.6) + k * 5;
          const cut = keep ? 0 : ease(f, start, start + 22, Easing.out(Easing.cubic));
          const x = 60 + i * 26;
          const top = 180, bot = 900, mid = 540 + ((i * 37) % 120) - 60;
          return (
            <g key={i} opacity={keep ? 1 : 1 - cut * 0.82}>
              <line x1={x} x2={x} y1={top} y2={mid - cut * 40} stroke={INK} strokeWidth={2} />
              <line x1={x} x2={x} y1={mid + cut * 40} y2={bot} stroke={INK} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', left: 1000, top: 360, width: 780, fontFamily: SANS, fontWeight: 500, fontSize: 56, lineHeight: 1.25, letterSpacing: -1 }}>
        {lines.map((l, i) => {
          const next = lines[i + 1]?.at;
          const dim = next ? interpolate(f, [next, next + 10], [1, 0.3], clamp) : 1;
          return <div key={i} style={{ opacity: dim, marginBottom: 22 }}><Words text={l.t} at={l.at} /></div>;
        })}
      </div>
      <div style={{ position: 'absolute', left: 180, bottom: 90, fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: '#9AA1A9', opacity: ease(f, s(1), s(1.6)) }}>[ LUNGSI · SETIAP BENANG ADALAH SATU PENENUN ]</div>
    </AbsoluteFill>
  );
};

// ── 03 · 0:15–0:21 · Andrew memakai kacamata, push-in pelan ─────────────────
const S03: React.FC<{ footage?: string }> = ({ footage }) => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, s(6)], [0, 0.07], { ...clamp, easing: Easing.inOut(Easing.sin) });
  return <Andrew src={footage} push={push} label="A2 · Andrew di tengah, memakai kacamata saat “di mata kita”" />;
};

// ── 04 · 0:21–0:30 · lensa membesar → benang menenun logo → nama → tagline ─────
const Glasses: React.FC<{ stroke: string; w?: number }> = ({ stroke, w = 3 }) => (
  <svg width="900" height="320" viewBox="0 0 900 320">
    <path d="M70 90 Q70 40 130 40 L370 40 Q420 40 420 90 L420 220 Q420 280 360 280 L140 280 Q70 280 70 220 Z M480 90 Q480 40 530 40 L770 40 Q830 40 830 90 L830 220 Q830 280 760 280 L540 280 Q480 280 480 220 Z M420 110 Q450 80 480 110 M70 110 L10 90 M830 110 L890 90" fill="none" stroke={stroke} strokeWidth={w} strokeLinejoin="round" />
  </svg>
);
const S04: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 0–0.9 s: kacamata (garis) muncul di atas gelap, lensa kanan membesar melewati frame (ease-in kuat)
  const draw = ease(f, 0, s(0.5));
  const grow = interpolate(f, [s(0.5), s(1.2)], [1, 9], { ...clamp, easing: Easing.in(Easing.cubic) });
  const blurG = interpolate(f, [s(0.7), s(1.0), s(1.2)], [0, 10, 0], clamp);
  const paper = ease(f, s(0.95), s(1.2), Easing.inOut(Easing.cubic));
  // 1.2 s+: tenunan logo
  const n = 9;
  const name = spring({ frame: f - s(2.6), fps, config: { damping: 22, stiffness: 120, mass: 0.9 } });
  return (
    <AbsoluteFill style={{ background: '#151617' }}>
      {/* kacamata yang membesar */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: 1 - paper }}>
        <div style={{ transform: `scale(${grow})`, transformOrigin: '72% 50%', filter: `blur(${blurG}px)`, opacity: draw }}>
          <Glasses stroke="#EDEDE9" />
        </div>
      </AbsoluteFill>
      {/* isi lensa = dunia kertas */}
      <AbsoluteFill style={{ background: PAPER, clipPath: `circle(${paper * 120}% at 66% 50%)` }}>
        <Sequence from={s(1.2)}>
          <Weave n={n} />
        </Sequence>
        <div style={{ position: 'absolute', top: 470, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 150, letterSpacing: -3, color: INK }}>
          {'BelajarTenun'.split('').map((ch, i) => {
            const p = ease(f, s(2.5) + i * 2, s(2.5) + i * 2 + 8);
            return <span key={i} style={{ display: 'inline-block', opacity: 0.0 + p, filter: `blur(${(1 - p) * 5}px)`, transform: `translateY(${(1 - name) * 6}px)` }}>{ch}</span>;
          })}
        </div>
        <div style={{ position: 'absolute', top: 680, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 34, letterSpacing: -0.3 }}>
          <Words text="Tutor AI di kacamata untuk belajar menenun." at={s(4.0)} gap={2} />
        </div>
        <div style={{ position: 'absolute', top: 800, width: '100%', display: 'flex', justifyContent: 'center', gap: 44, fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: '#7E868F' }}>
          {['PENGETAHUAN TRADISIONAL', 'TEKNOLOGI TRADISIONAL', 'BAHASA'].map((t, i) => {
            const p = ease(f, s(5.6) + i * 3, s(5.6) + i * 3 + 8);
            return <span key={t} style={{ opacity: p, filter: `blur(${(1 - p) * 4}px)` }}>[ {t} ]</span>;
          })}
        </div>
        <div style={{ position: 'absolute', top: 852, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 15, letterSpacing: 1, color: '#A3AAB2', opacity: ease(f, s(6.4), s(6.9)) }}>
          Objek Pemajuan Kebudayaan · UU No. 5/2017
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Lungsi turun, lalu pakan menyelip selang-seling: tenunan kecil = ikon.
const Weave: React.FC<{ n: number }> = ({ n }) => {
  const f = useCurrentFrame();
  const size = 170, step = size / (n - 1), x0 = 960 - size / 2, y0 = 230;
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: n }, (_, i) => {
        const p = ease(f, i * 1.5, i * 1.5 + 14, Easing.out(Easing.cubic));
        return <line key={'v' + i} x1={x0 + i * step} x2={x0 + i * step} y1={y0} y2={y0 + size * p} stroke={INK} strokeWidth={3} strokeLinecap="round" />;
      })}
      {Array.from({ length: n }, (_, j) => {
        const p = ease(f, 14 + j * 2, 14 + j * 2 + 12, Easing.out(Easing.cubic));
        const y = y0 + j * step;
        // pakan lewat atas/bawah lungsi bergantian: gambar segmen di atas lungsi saja
        return (
          <g key={'h' + j}>
            {Array.from({ length: n - 1 }, (_, i) => {
              const over = (i + j) % 2 === 0;
              const xa = x0 + i * step, xb = x0 + (i + 1) * step;
              const visible = x0 + size * p;
              if (xa > visible) return null;
              return <line key={i} x1={xa - (over ? 2 : -5)} x2={Math.min(xb + (over ? 2 : -5), visible)} y1={y} y2={y} stroke={over ? '#A0412C' : '#C9A24E'} strokeWidth={over ? 7 : 4} strokeLinecap="round" opacity={over ? 1 : 0.55} />;
            })}
          </g>
        );
      })}
    </svg>
  );
};

// Subtitle sementara (pengganti VO) + penanda adegan untuk QC.
const Sub: React.FC<{ n: string; text: string; kind: string }> = ({ n, text, kind }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: 'absolute', right: 36, top: 28, fontFamily: MONO, fontSize: 15, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '5px 10px', borderRadius: 5 }}>{n} · {kind}</div>
      <div style={{ position: 'absolute', left: 200, right: 200, bottom: 26, textAlign: 'center', opacity: ease(f, 3, 9) }}>
        <span style={{ fontFamily: SANS, fontSize: 22, lineHeight: 1.5, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '3px 10px', borderRadius: 5, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{text}</span>
      </div>
    </>
  );
};

export const BABAK1_SECONDS = 30;
export const Babak1: React.FC<{ footage01?: string; footage03?: string; qc?: boolean }> = ({ footage01, footage03, qc = true }) => {
  const rows: [string, number, number, React.ReactNode, string, string][] = [
    ['01', 0, 7, <S01 footage={footage01} />, 'Andrew: Selama ratusan tahun, menenun diajarkan dari tangan ke tangan.', 'ANDREW + ANIMASI'],
    ['02', 7, 8, <S02 />, 'VO: Tapi penenun senior makin sedikit. Anak muda yang ingin belajar sering tidak punya akses ke guru, dan pengetahuannya pelan-pelan hilang.', 'ANIMASI'],
    ['03', 15, 6, <S03 footage={footage03} />, 'Andrew: Bagaimana kalau ilmunya bisa ikut… di mata kita?', 'ANDREW'],
    ['04', 21, 9, <S04 />, 'VO: BelajarTenun adalah tutor AI di kacamata yang mengajarkan pengetahuan dan teknologi tradisional menenun, termasuk istilahnya dalam bahasa daerah, langsung saat kita mencoba.', 'ANIMASI'],
  ];
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {rows.map(([n, t, d, el, sub, kind]) => (
        <Sequence key={n} from={s(t)} durationInFrames={s(d)}>
          {el}
          {qc && <Sub n={n} text={sub} kind={kind} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
