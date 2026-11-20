import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mark, LOGO } from './brand';

// Babak 1 v7 (0:00–0:30). 3D (three.js, dirender per frame) dipadukan dengan footage Andrew:
// Andrew bergeser ke kiri, adegan 3D naik dari kanan. Adegan konsep (penenun memudar, kota–desa,
// kain terurai) layar penuh. Kacamata 3D naik sambil berputar, terurai berlabel, lalu kamera masuk ke lensa → POV.

const FPS = 30;
const F = (s: number) => Math.round(s * FPS);
const NAVY = LOGO.navy, GOLD = LOGO.gold, CREAM = LOGO.cream;
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });
const io = (t: number, a: number, b: number) => ez(t, a, b, Easing.inOut(Easing.cubic));
const sp = (f: number, at: number, cfg = { damping: 16, stiffness: 160 }) => spring({ frame: f - F(at), fps: FPS, config: cfg });

type Cue = [number, string, number?];
const Sfx: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>{cues.map(([t, s, v = 0.6], i) => <Sequence key={i} from={Math.max(0, F(t))} durationInFrames={F(3)}><Audio src={staticFile(`sfx2/${s}.wav`)} volume={v} /></Sequence>)}</>
);

// Caption per frasa; kata kunci emas. Spasi antar-kata dijaga (marginRight tidak ditimpa).
type Wd = [string, number];
const Captions: React.FC<{ words: Wd[]; keys?: string[]; dark?: (t: number) => boolean }> = ({ words, keys = [], dark }) => {
  const t = useCurrentFrame() / FPS;
  const chunks: Wd[][] = []; let cur: Wd[] = [];
  words.forEach((w, i) => { cur.push(w); if (/[.,?!:…]$/.test(w[0]) || cur.length >= 6 || i === words.length - 1) { chunks.push(cur); cur = []; } });
  let idx = -1; chunks.forEach((c, i) => { if (t >= c[0][1] - 0.1) idx = i; });
  if (idx < 0) return null;
  const c = chunks[idx];
  if (t > c[c.length - 1][1] + 0.9 && idx === chunks.length - 1) return null;
  const d = dark ? dark(t) : false;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 700, letterSpacing: -0.6, color: d ? NAVY : '#fff', textShadow: d ? 'none' : '0 2px 16px rgba(0,0,0,0.55)' }}>
      {c.map(([w, at], i) => {
        const on = t >= at - 0.05;
        const isKey = keys.some((k) => w.toLowerCase().startsWith(k));
        const pop = isKey ? spring({ frame: F(t - at), fps: FPS, config: { damping: 14, stiffness: 220 } }) : 1;
        return <span key={i} style={{ display: 'inline-block', marginRight: '0.28em', opacity: on ? 1 : 0.35, color: on && isKey ? (d ? '#b08f3a' : GOLD) : undefined, transformOrigin: '50% 70%', transform: `scale(${isKey && on ? 1 + (1 - pop) * 0.12 + 0.03 : 1})` }}>{w}</span>;
      })}
    </div>
  );
};

// Video 3D berlapis transparan (webm VP9 alfa)
const Layer: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <OffthreadVideo src={staticFile(src)} muted transparent style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} />
);
import WALKMAP from '../public/3d/walkmap-anchors.json';
import GLASS from '../public/3d/glass-anchors.json';
type Anch = Record<string, [number, number]>[];
const ANCH: Record<string, Anch> = { walkmap: WALKMAP as unknown as Anch, glass: GLASS as unknown as Anch };
const anchorsOf = (name: string): Anch => ANCH[name] || [];

// Vinyet halus untuk footage yang belum di-grade
const Vignette: React.FC = () => <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 42%, rgba(0,0,0,0) 55%, rgba(8,10,20,0.42) 100%)', pointerEvents: 'none' }} />;

// ── 01 · RATUSAN TAHUN di belakang Andrew → Andrew geser kiri, serah-terima 3D naik di kanan ──
const W01: Wd[] = [['Selama', 0.35], ['ratusan', 1.13], ['tahun,', 1.53], ['menenun', 2.33], ['diajarkan', 2.87], ['dari', 3.33], ['tangan', 3.55], ['ke', 3.97], ['tangan.', 4.1]];
const S01: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const slide = 0;
  const cam: React.CSSProperties = { position: 'absolute', inset: 0, transformOrigin: '50% 45%', transform: `translateX(${-330 * slide}px) scale(${1.0 + 0.04 * (t / 4.8) + 0.16 * slide})` };
  const rev = ez(t, 1.05, 1.6, Easing.out(Easing.exp));
  const txtOut = 1 - ez(t, 2.3, 2.6);
  const lt = ez(t, 0.6, 1.1) * (1 - ez(t, 2.1, 2.45));
    const yr = t < 3.55 ? 1825 : t < 4.1 ? 1925 : 2025;
  const yrP = sp(f, t < 3.55 ? 2.8 : t < 4.1 ? 3.55 : 4.1, { damping: 14, stiffness: 200 });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={cam}><OffthreadVideo src={staticFile('matte/7633-grade.mp4')} muted style={{ width: '100%', height: '100%' }} /></div>
      <div style={{ ...cam, opacity: txtOut }}>
        <div style={{ position: 'absolute', top: 150, width: '100%', textAlign: 'center', whiteSpace: 'pre-line', fontFamily: FONT, fontWeight: 900, fontSize: 270, letterSpacing: -12, lineHeight: 0.9, color: '#fff', opacity: 0.95, clipPath: `inset(${(1 - rev) * 100}% 0 0 0)`, transform: `translateY(${(1 - rev) * 60}px)` }}>{'RATUSAN\nTAHUN'}</div>
      </div>
      <div style={cam}><OffthreadVideo src={staticFile('matte/7633-person.mov')} muted transparent style={{ width: '100%', height: '100%' }} /></div>
      {/* adegan figur: layar penuh krem (tanpa Andrew), masuk dengan sapuan dari kanan */}
      {t > 2.55 && (
        <Sequence from={F(2.6)}>
          <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${(1 - io(t, 2.55, 2.85)) * 100}%)`, background: CREAM }}>
            <OffthreadVideo src={staticFile('3d/hand.mp4')} muted />
            <div style={{ position: 'absolute', left: 120, top: 110, fontFamily: FONT, color: NAVY, textAlign: 'left', opacity: ez(t, 2.8, 3.05) }}>
              <div style={{ fontSize: 20, letterSpacing: 4, opacity: 0.6, fontWeight: 700 }}>DARI TANGAN KE TANGAN</div>
              <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: -3, fontVariantNumeric: 'tabular-nums', transform: `translateY(${(1 - yrP) * 24}px)`, opacity: 0.4 + 0.6 * yrP }}>{yr}</div>
              <div style={{ height: 3, width: 280, background: `linear-gradient(90deg, ${GOLD}, rgba(212,184,102,0))`, transform: `scaleX(${io(t, 2.8, 4.6)})`, transformOrigin: 'left' }} />
            </div>
          </AbsoluteFill>
        </Sequence>
      )}
      {/* nama tanpa kotak: teks putih + garis emas tipis */}
      <div style={{ position: 'absolute', left: 90, bottom: 190, fontFamily: FONT, color: '#fff', opacity: lt, textShadow: '0 2px 14px rgba(0,0,0,0.45)' }}>
        <div style={{ height: 2, width: 64, background: GOLD, transform: `scaleX(${ez(t, 0.6, 1.2)})`, transformOrigin: 'left', marginBottom: 14 }} />
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, transform: `translateY(${(1 - lt) * 12}px)` }}>Noe Andrew JM Silalahi</div>
        <div style={{ fontSize: 20, opacity: 0.85, marginTop: 4, letterSpacing: 0.3 }}>Ketua Tim BelajarTenun</div>
      </div>
      <Captions words={W01} keys={['ratusan', 'tangan']} dark={(x) => x > 2.7} />
      <Sfx cues={[[1.05, 'whoosh', 0.35], [2.4, 'whoosh', 0.3], [2.75, 'pop3', 0.35], [3.55, 'tick', 0.5], [4.1, 'tick', 0.5], [3.95, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// ── 02 · konsep layar penuh (3D): penenun memudar → anak muda & kota–desa → kain terurai ──
const W02: Wd[] = [['Tapi', 0.15], ['penenun', 0.71], ['senior', 1.09], ['semakin', 1.41], ['sedikit.', 1.83], ['Anak', 2.57], ['muda', 2.75], ['yang', 3.21], ['ingin', 3.37], ['belajar', 3.57], ['sering', 3.95], ['tidak', 4.65], ['punya', 4.79], ['akses', 5.03], ['ke', 5.43], ['guru.', 5.65], ['Dan', 6.59], ['pengetahuannya', 6.73], ['perlahan-lahan', 7.41], ['hilang.', 8.33]];
const WM = anchorsOf('walkmap');
const S02: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const wmT = t - 2.5, wi = Math.max(0, Math.min(WM.length - 1, Math.round(wmT * FPS)));
  const a = WM[wi] || {};
  const line = io(t, 4.9, 5.6);
  const ph = a.phone || [960, 540];
  const zero = sp(f, 5.65, { damping: 13, stiffness: 200 });
  const phoneO = ez(t, 3.6, 3.9) * (1 - ez(t, 6.3, 6.5));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence durationInFrames={F(2.5)}><OffthreadVideo src={staticFile('3d/fade.mp4')} muted /></Sequence>
      <Sequence from={F(2.5)} durationInFrames={F(3.9)}><OffthreadVideo src={staticFile('3d/walkmap.mp4')} muted /></Sequence>
      <Sequence from={F(6.4)}><OffthreadVideo src={staticFile('3d/unravel.mp4')} muted /></Sequence>
      {/* garis putus-putus kota ↔ desa */}
      {a.youth && a.elder && t > 4.8 && t < 6.5 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: 1 - ez(t, 6.2, 6.45) }}>
          <line x1={a.youth[0]} y1={a.youth[1] - 20} x2={a.youth[0] + (a.elder[0] - a.youth[0]) * line} y2={a.youth[1] - 20 + (a.elder[1] - a.youth[1]) * line} stroke={NAVY} strokeWidth={4} strokeDasharray="4 16" strokeLinecap="round" />
          <circle cx={a.elder[0]} cy={a.elder[1] - 20} r={10 * ez(t, 5.5, 5.7)} fill={GOLD} />
          <text x={a.elder[0]} y={a.elder[1] - 52} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={700} fill={NAVY} opacity={ez(t, 5.5, 5.8)}>penenun · desa</text>
          <text x={a.youth[0]} y={a.youth[1] - 52} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={700} fill={NAVY} opacity={ez(t, 5.0, 5.3)}>murid · kota</text>
        </svg>
      )}
      {/* kartu HP: cari guru → 0 guru ditemukan */}
      {phoneO > 0 && (
        <div style={{ position: 'absolute', left: 1180, top: 200, width: 560, padding: 28, borderRadius: 34, background: 'linear-gradient(160deg, rgba(255,255,255,0.86), rgba(255,255,255,0.62))', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 30px 80px rgba(20,28,58,0.18)', fontFamily: FONT, color: NAVY, opacity: phoneO, transform: `translateY(${(1 - phoneO) * 30}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 18, background: '#fff', fontSize: 22 }}>
            <svg width="22" height="22" viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" stroke={NAVY} strokeWidth="2.5" fill="none" /><path d="M15 15l6 6" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" /></svg>
            <span>{'guru tenun di dekatku'.slice(0, Math.max(0, Math.floor((t - 3.9) * 22)))}</span>
          </div>
          <div style={{ marginTop: 22, height: 90, position: 'relative' }}>
            {t < 5.6 ? (
              <div style={{ position: 'absolute', left: '50%', top: 20, width: 40, height: 40, marginLeft: -20, borderRadius: 99, border: `4px solid rgba(20,28,58,0.15)`, borderTopColor: GOLD, transform: `rotate(${t * 540}deg)`, opacity: ez(t, 4.8, 5.0) }} />
            ) : (
              <div style={{ textAlign: 'center', transform: `scale(${0.8 + 0.2 * zero})`, opacity: zero }}>
                <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: -1.5, whiteSpace: 'nowrap' }}><span style={{ color: '#b08f3a' }}>0</span> guru ditemukan</div>
              </div>
            )}
          </div>
        </div>
      )}
      {ph && null}
      <Captions words={W02} keys={['sedikit', 'akses', 'guru', 'hilang']} dark={() => true} />
      <Sfx cues={[[0.0, 'whoosh', 0.35], [0.35, 'tick', 0.45], [0.77, 'tick', 0.42], [1.19, 'tick', 0.4], [1.61, 'tick', 0.38], [2.1, 'ding', 0.25],
        [2.5, 'whoosh', 0.3], ...Array.from({ length: 4 }, (_, i) => [2.6 + i * 0.25, 'tick', 0.18] as Cue), [3.6, 'pop2', 0.4], ...Array.from({ length: 10 }, (_, i) => [3.95 + i * 0.07, 'tick', 0.12] as Cue),
        [3.85, 'whoosh', 0.3], [4.9, 'blip', 0.3], [5.65, 'pop', 0.55], [6.4, 'whoosh', 0.3], ...Array.from({ length: 6 }, (_, i) => [6.6 + i * 0.28, 'snap', 0.22] as Cue), [7.6, 'riser', 0.25]]} />
    </AbsoluteFill>
  );
};

// ── 03 · "di mata kita?" Andrew, dorongan pelan lalu punch-in ke kacamata ─────
const W03: Wd[] = [['Bagaimana', 0.05], ['kalau', 0.83], ['ilmunya', 1.09], ['bisa', 1.51], ['ikut…', 1.67], ['di', 2.05], ['mata', 4.03], ['kita?', 4.19]];
const S03: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = 1.0 + 0.05 * io(t, 0, 3.9) + 0.22 * io(t, 3.95, 4.35);
  const blur = Math.max(0, (t - 4.45) / 0.25) * 10;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '52% 37%', transform: `scale(${s})`, filter: `blur(${blur}px)` }}>
        <OffthreadVideo src={staticFile('matte/7634b-grade.mp4')} muted style={{ width: '100%', height: '100%' }} />
      </div>
      <Captions words={W03} keys={['mata', 'kita']} />
      <Sfx cues={[[2.7, 'riser', 0.35], [3.97, 'whoosh', 0.35]]} />
    </AbsoluteFill>
  );
};

// ── 04 · Andrew geser kiri, kacamata 3D naik & berputar di kanan → terurai berlabel → masuk lensa → POV ──
const o4 = 0.3;
const W04: Wd[] = ([['BelajarTenun', 0.5], ['adalah', 1.4], ['tutor', 1.88], ['AI', 2.2], ['di', 2.4], ['kacamata', 2.78], ['yang', 3.28], ['mengajarkan', 3.56], ['pengetahuan', 4.08], ['dan', 4.76], ['teknologi', 5.02], ['tradisional', 5.88], ['menenun,', 6.26], ['termasuk', 7.2], ['istilahnya', 7.82], ['dalam', 8.52], ['bahasa', 8.76], ['daerah,', 9.14], ['langsung', 9.86], ['saat', 10.38], ['kita', 10.64], ['mencoba.', 10.86]] as Wd[]).map(([w, s]) => [w, s - o4] as Wd);
const GA = anchorsOf('glass');
const G0 = 0.9; // kacamata mulai naik (detik lokal)
const LABELS: [string, string, number, number, number][] = [
  // [kunci anchor, teks, waktu muncul, dx, dy]
  ['kamera', 'Kamera', 3.3, 40, -150],
  ['mikrofon', 'Mikrofon', 3.75, -230, -120],
  ['bluetooth', 'Bluetooth', 4.2, -60, -150],
  ['speaker', 'Speaker', 4.65, -200, 110],
  ['baterai', 'Baterai', 5.1, 120, 130],
];
const TERMS = ['lungsi', 'Tradisi A', 'Tradisi B', 'Tradisi C'];
const S04: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const gT = t - G0, gi = Math.max(0, Math.min(GA.length - 1, Math.round(gT * FPS)));
  const dolly = io(t, G0 + 4.5, G0 + 5.9);
  const slide = io(t, 0.8, 1.6) * (1 - dolly);
  // lapisan kacamata: di kanan (skala 0.72), lalu ke tengah penuh saat masuk lensa
  const ls = 0.58 + 0.42 * dolly, lx = 330 * (1 - dolly), ly = 40 * (1 - dolly);
  const toScreen = ([x, y]: [number, number]) => [(x - 960) * ls + 960 + lx, (y - 540) * ls + 540 + ly];
  const a = GA[gi] || {};
  const labelOut = 1 - ez(t, G0 + 4.3, G0 + 4.6);
  const pov = t >= G0 + 5.85;
  const iris = ez(t, G0 + 5.85, G0 + 6.5, Easing.inOut(Easing.cubic));
  const logoP = ez(t, 0.15, 1.0);
  const logoOut = 1 - ez(t, 1.35, 1.6);
  const termI = t < 7.6 ? 0 : Math.min(3, 1 + Math.floor((t - 7.6) / 0.45));
  const termP = sp(f, t < 7.6 ? 7.0 : 7.6 + (termI - 1) * 0.45, { damping: 14, stiffness: 240 });
  const phoneP = sp(f, 9.6, { damping: 18, stiffness: 120 });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Andrew (7634a) bergeser ke kiri, kabur saat kamera masuk lensa */}
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 40%', transform: `translateX(${-330 * slide - 330 * dolly}px) scale(${1.02 + 0.4 * slide + 0.4 * dolly})`, filter: `blur(${dolly * 14}px)`, opacity: 1 - dolly * 0.6 }}>
        <OffthreadVideo src={staticFile('footage/7634a-full.mp4')} startFrom={F(o4)} muted style={{ width: '100%', height: '100%' }} />
        <Vignette />
      </div>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(10,14,30,0) 35%, rgba(10,14,30,${0.5 * slide}) 70%)` }} />
      {/* logo ditenun di kanan pada "BelajarTenun" */}
      {logoOut > 0 && <div style={{ position: 'absolute', left: 1290, top: 300, opacity: logoOut, transform: `scale(${0.85 + 0.15 * logoP}) translateY(${(1 - logoOut) * -40}px)` }}><Mark size={300} draw={logoP} /></div>}
      {/* kacamata 3D */}
      {!pov && t > G0 && (
        <Sequence from={F(G0)}>
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${lx}px, ${ly}px) scale(${ls})` }}>
            <Layer src="3d/glass.webm" />
          </div>
        </Sequence>
      )}
      {/* label terurai */}
      {!pov && labelOut > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: labelOut }}>
          {LABELS.map(([k, txt, at, dx, dy]) => {
            if (!a[k] || t < G0 + at - 1.1) return null;
            const p = sp(f, G0 + at - 1.1, { damping: 18, stiffness: 170 });
            const [x, y] = toScreen(a[k]);
            const lx2 = x + dx * p, ly2 = y + dy * p;
            return (
              <g key={k} opacity={Math.min(1, p * 1.5)}>
                <circle cx={x} cy={y} r={7} fill={GOLD} stroke="#fff" strokeWidth={2} />
                <line x1={x} y1={y} x2={lx2} y2={ly2} stroke={GOLD} strokeWidth={2.5} />
                <text x={lx2 + (dx < 0 ? -10 : 10)} y={ly2 + 9} textAnchor={dx < 0 ? 'end' : 'start'} fontFamily={FONT} fontSize={30} fontWeight={700} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,30,0.35)', strokeWidth: 6 } as React.CSSProperties}>{txt}</text>
              </g>
            );
          })}
        </svg>
      )}
      {/* POV dibuka dari lensa (iris) */}
      {pov && (
        <Sequence from={F(G0 + 5.85)}>
          <AbsoluteFill style={{ background: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${iris * 1150 + 40}px at 960px 540px)`, transform: `scale(${1.25 - 0.25 * iris})` }}>
              <OffthreadVideo src={staticFile('footage/7653-full.mp4')} startFrom={F(22.5)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </AbsoluteFill>
        </Sequence>
      )}
      {/* label istilah berputar seperti slot di POV */}
      {pov && t > 6.9 && t < 9.6 && (
        <div style={{ position: 'absolute', left: 140, top: 200, fontFamily: FONT, color: '#fff', opacity: ez(t, 6.9, 7.1) * (1 - ez(t, 9.4, 9.6)), textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
          <div style={{ height: 2, width: 56, background: GOLD, marginBottom: 12 }} />
          <div style={{ fontSize: 20, letterSpacing: 4, opacity: 0.8, fontWeight: 600 }}>BENANG TEGAK</div>
          <div style={{ height: 96, overflow: 'hidden' }}>
            <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2.5, transform: `translateY(${(1 - termP) * 70}px)`, opacity: termP, color: termI > 0 ? GOLD : '#fff' }}>{TERMS[termI]}</div>
          </div>
        </div>
      )}
      {/* HP: kartu tahap muncul saat "langsung saat kita mencoba" */}
      {pov && t > 9.5 && (
        <div style={{ position: 'absolute', right: 110, top: 170, width: 380, height: 700, borderRadius: 56, padding: 14, background: 'linear-gradient(160deg, rgba(255,255,255,0.5), rgba(255,255,255,0.22))', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(28px) saturate(170%)', boxShadow: '0 30px 80px rgba(20,28,58,0.35)', transform: `translateX(${(1 - phoneP) * 520}px)` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 44, background: CREAM, padding: 30, fontFamily: FONT, color: NAVY, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700 }}><Mark size={30} speaking={t > 10.1} /> Tutor</div>
            <div style={{ marginTop: 34, fontSize: 18, letterSpacing: 3, fontWeight: 700, opacity: 0.55 }}>TAHAP 1 / 5</div>
            <div style={{ marginTop: 6, fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>Kenali lungsi</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i === 0 ? GOLD : 'rgba(20,28,58,0.12)' }} />)}</div>
            <div style={{ marginTop: 30, fontSize: 22, lineHeight: 1.45, opacity: ez(t, 10.2, 10.5) }}>Benang yang tegak ini namanya <b style={{ color: '#b08f3a' }}>lungsi</b>.</div>
          </div>
        </div>
      )}
      <Captions words={W04} keys={['belajartenun', 'kacamata', 'bahasa', 'mencoba']} />
      <Sfx cues={[[0.2, 'impact', 0.7], [0.85, 'whoosh', 0.35], [G0 + 0.1, 'riser', 0.3], [G0 + 1.3, 'whoosh', 0.3],
        ...LABELS.map(([, , at]) => [G0 + at - 1.05, 'pop', 0.45] as Cue), [G0 + 4.5, 'whoosh', 0.45], [G0 + 5.85, 'impact', 0.5],
        [7.6, 'tick', 0.5], [8.05, 'tick', 0.5], [8.5, 'tick', 0.5], [9.6, 'whoosh', 0.3], [10.0, 'ding', 0.4]]} />
    </AbsoluteFill>
  );
};

const SC = { s01: [0, 4.8], s02: [4.8, 13.8], s03: [13.8, 18.5], s04: [18.5, 29.9] };
const SPEECH: [number, number][] = [[0.3, 4.6], [5.0, 13.6], [13.8, 18.4], [18.8, 29.6]];
export const B1V7_SECONDS = 30;
export const Babak1V7: React.FC = () => {
  const seq = ([a, b]: number[]) => ({ from: F(a), durationInFrames: F(b - a) });
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence {...seq(SC.s01)}><S01 /></Sequence>
      <Sequence {...seq(SC.s02)}><S02 /></Sequence>
      <Sequence {...seq(SC.s03)}><S03 /></Sequence>
      <Sequence {...seq(SC.s04)}><S04 /></Sequence>
      <Sequence {...seq([0, 13.8])}><Audio src={staticFile('audio/7633-clean.wav')} startFrom={F(0.5)} /></Sequence>
      <Sequence {...seq(SC.s03)}><Audio src={staticFile('audio/7634b-clean.wav')} /></Sequence>
      <Sequence {...seq(SC.s04)}><Audio src={staticFile('audio/7634a-clean.wav')} startFrom={F(o4)} /></Sequence>
      <Audio src={staticFile('audio/music-bed.wav')} volume={(fr) => { const s = fr / FPS; return SPEECH.some(([a, b]) => s > a && s < b) ? 0.05 : 0.12; }} />
    </AbsoluteFill>
  );
};
