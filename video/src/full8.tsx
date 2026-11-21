import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mark, LOGO } from './brand';
import { Babak1V7, B1V7_SECONDS, Captions, Sfx, Vignette, Wd, Cue } from './b1v7';
import { S24, S26 } from './full3';
import { Andrew, DotMap, Finger, Kicker, Laptop, lp, Ring, glassCard, S05, S16, S17, S20, S22, S23, S25 } from './full7';
import { Phone3D, Screen, SCREEN_W } from './phone3d';
import DEPAN from '../public/phone3d/ph3d-depan.json';

// Video v8 (docs/RENCANA-V8.md): footage Puta Dino Kayangan, onboarding level (halaman nyata /mulai),
// pindai kain → cerita bergulir (/k/:kode), latihan tiap level dengan POV asli + HP 3D berisi layar Praktik asli,
// validasi oleh owner Rumah Tenun Puta Dino Kayangan, dan animasi 3D baru.

const FPS = 30;
const F = (s: number) => Math.round(s * FPS);
const NAVY = LOGO.navy, GOLD = LOGO.gold, CREAM = LOGO.cream, GOLDD = '#b08f3a';
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });
const io = (t: number, a: number, b: number) => ez(t, a, b, Easing.inOut(Easing.cubic));
const sp = (f: number, at: number, cfg = { damping: 16, stiffness: 160 }) => spring({ frame: f - F(at), fps: FPS, config: cfg });
const useT = () => { const f = useCurrentFrame(); return { f, t: f / FPS }; };
const off = (w: Wd[], d: number): Wd[] => w.map(([a, b]) => [a, b + d]);

// ── bahan bersama ────────────────────────────────────────────────────────────
const Badge: React.FC<{ k: string; title: string; sub?: string; at?: number; dark?: boolean }> = ({ k, title, sub, at = 0, dark = true }) => {
  const { f } = useT(); const p = sp(f, at, { damping: 18, stiffness: 150 });
  return (
    <div style={{ position: 'absolute', left: 80, top: 70, fontFamily: FONT, color: dark ? '#fff' : NAVY, opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 20}px)`, textShadow: dark ? '0 2px 16px rgba(0,0,0,0.5)' : 'none' }}>
      <div style={{ height: 3, width: 56, background: GOLD, marginBottom: 14 }} />
      <div style={{ fontSize: 22, letterSpacing: 5, fontWeight: 800, color: GOLD }}>{k}</div>
      <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1.5, marginTop: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 26, opacity: 0.85, marginTop: 4 }}>{sub}</div>}
    </div>
  );
};
const Full: React.FC<{ src: string; from: number; muted?: boolean; style?: React.CSSProperties; rate?: number }> = ({ src, from, style, rate }) => (
  <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted playbackRate={rate} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
);
const Shot: React.FC<{ src: string; at?: number }> = ({ src, at = 0 }) => {
  const { f } = useT(); const p = sp(f, at, { damping: 20, stiffness: 150 });
  return <Img src={staticFile(`ui/${src}`)} style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, transform: `translateY(${(1 - Math.min(1, p)) * 40}px)`, opacity: Math.min(1, p * 1.5) }} />;
};
// titik di layar HP (koordinat CSS 390×844) → koordinat layar video untuk jari
const tapPos = (_pose: 'depan', x: number, y: number, h: number, sx: number, sy: number): [number, number] => {
  const C = DEPAN as [number, number][]; const k = h / 2000; const u = sx / 390, v = sy / 844;
  const top = [C[0][0] + (C[1][0] - C[0][0]) * u, C[0][1] + (C[1][1] - C[0][1]) * u];
  const bot = [C[3][0] + (C[2][0] - C[3][0]) * u, C[3][1] + (C[2][1] - C[3][1]) * u];
  return [x + (top[0] + (bot[0] - top[0]) * v) * k, y + (top[1] + (bot[1] - top[1]) * v) * k];
};

// ════════════════════════════════════════════════════════════════════════════
// C · ALUR BARU: masuk Google → onboarding level (halaman /mulai asli) → empat level
// ════════════════════════════════════════════════════════════════════════════
const VO1W: Wd[] = [['Masuk', 0.43], ['pakai', 1.31], ['akun', 1.61], ['Google,', 1.85], ['lalu', 2.77], ['jawab', 2.99], ['beberapa', 3.41], ['pertanyaan.', 3.81], ['Dari', 5.01], ['situ,', 5.19], ['BelajarTenun', 6.19], ['menentukan', 6.85], ['Anda', 7.77], ['mulai', 8.15], ['dari', 8.53], ['level', 8.75], ['berapa.', 8.99]];
const VO2W: Wd[] = [['Terdapat', 0.75], ['empat', 1.93], ['level:', 2.41], ['dasar', 3.47], ['dengan', 3.79], ['kardus', 4.03], ['atau', 4.57], ['sumpit,', 4.87], ['pengembangan', 5.99], ['dengan', 6.59], ['inkle', 6.99], ['loom,', 7.39], ['teknik', 8.39], ['lanjutan', 8.63], ['dengan', 9.11], ['alat', 9.43], ['empat', 9.81], ['gun,', 10.23], ['dan', 10.83], ['kreasi', 11.03], ['dengan', 11.61], ['ATBM.', 11.95]];
const LV: [number, string, string, string, number][] = [
  [1, 'Dasar', 'kardus atau sumpit', 'sumpit.jpg', 3.47],
  [2, 'Pengembangan', 'inkle loom & sekoci', 'inkle.jpg', 5.99],
  [3, 'Teknik Lanjutan', 'alat empat gun', 'empatgun.jpg', 8.39],
  [4, 'Kreasi', 'ATBM & rancangan motif', 'atbm.jpg', 10.83],
];
const V2 = 11.3; // VO2 mulai
export const ALUR8_SECONDS = V2 + 13.6;
const PH = { x: 1030, y: 70, h: 940 };
const Alur8: React.FC = () => {
  const { f, t } = useT();
  const screen = t < 3.6 ? 'landing' : t < 5.4 ? 'q1' : t < 5.9 ? 'q1s' : t < 7.4 ? 'q2' : t < 7.9 ? 'q2s' : t < 9.4 ? 'q3' : t < 9.9 ? 'q3s' : 'hasil';
  const shiftL = io(t, V2 - 0.3, V2 + 0.6);
  const step = t < 3.6 ? ['01', 'Masuk dengan Google'] : t < V2 ? ['02', 'Jawab beberapa pertanyaan'] : ['03', 'Mulai dari levelmu'];
  const stP = sp(f, t < 3.6 ? 0 : t < V2 ? 3.6 : V2);
  const [ax, ay] = tapPos('depan', PH.x - 600 * shiftL, PH.y, PH.h, 195, 54 + 434);
  const [bx, by] = tapPos('depan', PH.x - 600 * shiftL, PH.y, PH.h, 200, 54 + 433);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {/* judul langkah (kiri), hilang saat kartu level muncul */}
      <div style={{ position: 'absolute', left: 140, top: 380, width: 760, fontFamily: FONT, color: NAVY, opacity: 1 - shiftL }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: GOLDD, letterSpacing: 2, transform: `translateY(${(1 - stP) * 20}px)`, opacity: stP }}>LANGKAH {step[0]}</div>
        <div style={{ fontSize: 82, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, marginTop: 10, transform: `translateY(${(1 - stP) * 30}px)`, opacity: stP }}>{step[1]}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-600 * shiftL}px)` }}>
        <Phone3D pose="depan" x={PH.x} y={PH.y} h={PH.h}>
          <Screen dark={screen === 'landing'} bar={screen === 'landing' ? '#1b2440' : '#fbf8f1'}>
            {screen === 'landing' && <Shot src="hd-landing.png" />}
            {screen.startsWith('q') && <Img src={staticFile(`ui/ob-${screen}.png`)} style={{ width: SCREEN_W }} />}
            {screen === 'hasil' && <Shot src="ob-hasil.png" at={9.9} />}
          </Screen>
        </Phone3D>
      </div>
      <Finger path={[[1.8, ax + 60, ay + 300], [2.4, ax, ay], [2.9, ax, ay], [3.3, ax + 40, ay + 120],
        [4.6, bx + 40, by + 300], [5.4, bx, by - 70], [5.8, bx, by - 70], [6.9, bx, by - 70], [7.4, bx, by - 70], [7.8, bx, by - 70], [8.9, bx, by - 70], [9.4, bx, by - 70], [9.8, bx + 60, by + 200]]} taps={[2.6, 5.5, 7.5, 9.5]} />
      {/* kartu empat level dengan foto alat asli dari Rumah Tenun Puta Dino Kayangan */}
      {t > V2 - 0.2 && (
        <div style={{ position: 'absolute', left: 860, top: 140, width: 1000, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }}>
          {LV.map(([n, name, alat, foto, at]) => {
            const p = sp(f, V2 + at - 0.2, { damping: 15, stiffness: 170 });
            const on = t >= V2 + at;
            return (
              <div key={n} style={{ height: 380, borderRadius: 28, overflow: 'hidden', position: 'relative', background: '#fff', boxShadow: '0 30px 70px rgba(20,28,58,0.18)', transform: `translateY(${(1 - p) * 60}px) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 1.5), outline: on ? `4px solid ${GOLD}` : 'none' }}>
                <Img src={staticFile(`pdfoto/${foto}`)} style={{ width: '100%', height: 250, objectFit: 'cover', transform: `scale(${1.05 + 0.05 * ez(t, V2 + at, V2 + at + 3)})` }} />
                <div style={{ padding: '18px 24px', fontFamily: FONT, color: NAVY }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: GOLDD }}>LEVEL {n}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{name}</div>
                  <div style={{ fontSize: 20, opacity: 0.65 }}>{alat}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Sequence from={F(0.2)}><Audio src={staticFile('vo/VO1-clean.wav')} /></Sequence>
      <Sequence from={F(V2)}><Audio src={staticFile('vo/VO2-clean.wav')} /></Sequence>
      <Captions words={[...off(VO1W, 0.2), ...off(VO2W, V2)]} keys={['google', 'pertanyaan', 'level', 'dasar', 'pengembangan', 'teknik', 'kreasi']} dark={() => true} />
      <Sfx cues={[[0.1, 'whoosh', 0.3], [2.6, 'click', 0.6], [3.6, 'whoosh', 0.3], [5.5, 'click', 0.55], [7.5, 'click', 0.55], [9.5, 'click', 0.55], [9.9, 'ding', 0.45], [V2 - 0.3, 'whoosh', 0.35], ...LV.map(([, , , , at]) => [V2 + at - 0.2, 'pop', 0.45] as Cue)]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// D · PINDAI KAIN PUTA DINO → cerita bergulir (rekaman /k/PDK-DEMO-0001 asli)
// ════════════════════════════════════════════════════════════════════════════
const VO3W: Wd[] = [['Setiap', 0.59], ['kain', 1.57], ['Puta', 1.99], ['Dino', 2.4], ['punya', 2.91], ['kode.', 3.29], ['Pindai,', 4.53], ['dan', 5.33], ['ceritanya', 5.41], ['terbuka,', 5.75], ['dari', 6.55], ['sejarah', 6.93], ['hingga', 7.67], ['motifnya.', 8.13]];
const SC_RATE = 1.3, SC_LEN = 18 / SC_RATE;
export const SCAN_SECONDS = 6.6 + SC_LEN + 0.6;
const Scan: React.FC = () => {
  const { f, t } = useT();
  const toPhone = t >= 6.6;
  const ring = ez(t, 3.0, 3.6);
  const pin = sp(f, 6.6, { damping: 18, stiffness: 110 });
  const tEnd = 6.6 + SC_LEN;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!toPhone && (
        <AbsoluteFill>
          <Full src="footage/pd7805.mp4" from={0} />
          {/* label QR asli di kain disorot; layar HP di footage tidak dipakai */}
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <rect x={1300 - 30 * ring} y={500 - 30 * ring} width={250 + 60 * ring} height={250 + 60 * ring} rx={26} fill="none" stroke={GOLD} strokeWidth={6} opacity={ring} />
            {t > 4.4 && <line x1={1270} y1={540 + ((t - 4.4) * 400) % 200} x2={1580} y2={540 + ((t - 4.4) * 400) % 200} stroke={GOLD} strokeWidth={4} opacity={0.9} />}
          </svg>
          <Badge k="VERSI LAIN" title="Pindai kain Puta Dino" sub="label QR di setiap lembar kain" at={0.4} />
        </AbsoluteFill>
      )}
      {toPhone && (
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, #1d2650, ${NAVY})` }}>
          <div style={{ position: 'absolute', left: 140, top: 380, width: 640, fontFamily: FONT, color: CREAM, opacity: ez(t, 7.0, 7.4) }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: GOLD, letterSpacing: 3 }}>KAIN BERCERITA</div>
            <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginTop: 10 }}>Gulir, dan kainnya terbentang</div>
            <div style={{ fontSize: 26, opacity: 0.7, marginTop: 16 }}>Sejarah Puta Dino, kapal rempah 1521, foto dari Leiden, hingga motif Jodati.</div>
          </div>
          <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - pin) * 900}px)` }}>
            <Phone3D pose="depan" x={1040} y={70} h={940}>
              <Screen dark bar="#141c3a">
                <Sequence from={F(6.6)}><OffthreadVideo src={staticFile('ui/cerita-scroll.mp4')} muted playbackRate={SC_RATE} style={{ width: SCREEN_W }} /></Sequence>
              </Screen>
            </Phone3D>
          </div>
          {(() => { const [x, y] = tapPos('depan', 1040, 70, 940, 195, 54 + 585); return <Finger path={[[tEnd - 1.4, x + 80, y + 260], [tEnd - 0.9, x, y], [tEnd - 0.4, x, y]]} taps={[tEnd - 0.75]} />; })()}
        </AbsoluteFill>
      )}
      <Sequence from={F(0.3)}><Audio src={staticFile('vo/VO3-clean.wav')} /></Sequence>
      <Captions words={off(VO3W, 0.3)} keys={['kode', 'pindai', 'sejarah', 'motif']} />
      <Sfx cues={[[3.0, 'pop', 0.4], [4.4, 'blip', 0.35], [6.4, 'ding', 0.45], [6.6, 'whoosh', 0.35], [9.0, 'whoosh', 0.18], [tEnd - 0.75, 'click', 0.6]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// E · LATIHAN TIAP LEVEL: POV asli (Drive) + HP 3D berisi layar Praktik asli
// ════════════════════════════════════════════════════════════════════════════
type Seg = { dur: number; src: string; from: number; audio?: string; tutor?: string; words?: Wd[]; me?: boolean; rate?: number };
const PovLevel: React.FC<{ n: number; name: string; alat: string; ui: string; segs: Seg[] }> = ({ n, name, alat, ui, segs }) => {
  const { t } = useT();
  let acc = 0; const starts = segs.map((s) => { const a = acc; acc += s.dur; return a; });
  const i = Math.max(0, starts.findIndex((a, k) => t >= a && t < a + segs[k].dur));
  const cur = segs[i];
  const words: Wd[] = segs.flatMap((s, k) => off(s.words ?? [], starts[k]));
  const tutorOn = !!cur.tutor;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {segs.map((s, k) => (
        <Sequence key={k} from={F(starts[k])} durationInFrames={F(s.dur)}>
          <Full src={s.src} from={s.from} rate={s.rate} />
          {s.audio && <Audio src={staticFile(s.audio)} startFrom={F(s.from)} />}
          {s.tutor && <><Audio src={staticFile('sfx2/blip.wav')} volume={0.35} /><Sequence from={F(0.25)}><Audio src={staticFile(`tutor/${s.tutor}.mp3`)} /></Sequence></>}
          {/* HP 3D di kanan: layar Praktik asli, kamera = POV yang sama */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35))' }} />
          <Phone3D pose="kanan" x={1395} y={150} h={880}>
            <Screen dark bar="#000">
              <OffthreadVideo src={staticFile(s.src)} startFrom={F(s.from)} muted playbackRate={s.rate} style={{ position: 'absolute', left: -507, top: 0, height: 790, width: 1404, objectFit: 'cover' }} />
              <Img src={staticFile(`ui/prak-ui-${ui}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W }} />
            </Screen>
          </Phone3D>
        </Sequence>
      ))}
      <Vignette />
      <Badge k={`LEVEL ${n} · ${name.toUpperCase()}`} title={alat} sub={tutorOn ? 'Tutor menjawab' : 'Andrew bertanya'} at={0.2} />
      {tutorOn && <div style={{ position: 'absolute', left: 80, top: 300, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderRadius: 999, ...glassCard(0.85), fontFamily: FONT, fontSize: 24, fontWeight: 700, color: NAVY }}><Mark size={32} speaking /> Tutor BelajarTenun</div>}
      <Captions words={words} keys={['lungsi', 'pakan', 'sekoci', 'gun', 'pedal', 'sisir', 'rapatkan', 'sambung']} />
    </AbsoluteFill>
  );
};
const W = (l: [string, number][], o = 0): Wd[] => l.map(([w, t]) => [w, t - o]);
const T8W = W([['Tenang,', 0.25], ['nggak', 1.39], ['apa-apa.', 1.57], ['Ikat', 2.73], ['ujung', 3.03], ['benang', 3.31], ['yang', 3.59], ['putus', 3.77], ['dengan', 4.15], ['benang', 4.39], ['baru', 4.71], ['di', 5.23], ['bagian', 5.47], ['belakang.', 5.75], ['Lalu', 6.79], ['lanjutkan', 7.23], ['memasukkan', 7.71], ['pakan', 8.25], ['seperti', 8.47], ['biasa', 8.79], ['ya.', 9.25]]);
const T9W = W([['Oke,', 0.25], ['kita', 1.13], ['mulai!', 1.29], ['Pertama,', 2.37], ['angkat', 3.37], ['atau', 3.69], ['turunkan', 3.95], ['benang', 4.51], ['lungsi', 4.81], ['supaya', 5.59], ['celahnya', 6.05], ['terbuka.', 6.53], ['Lalu', 7.47], ['masukkan', 7.87], ['sekoci', 8.37], ['dari', 8.93], ['kiri', 9.27], ['ke', 9.89], ['kanan.', 10.17]]);
const T10W = W([['Bagus,', 0.25], ['sekocinya', 1.45], ['sudah', 1.87], ['lewat.', 2.11], ['Sekarang', 3.29], ['rapatkan', 3.65], ['pakannya', 4.21], ['ke', 4.63], ['arah', 4.85], ['badanmu', 5.05], ['supaya', 5.75], ['barisnya', 6.35], ['padat.', 6.87]]);
const T11W = W([['Nah,', 0.25], ['di', 1.39], ['alat', 1.75], ['empat', 1.97], ['gun', 2.33], ['ada', 2.55], ['yang', 2.83], ['seru.', 2.99], ['Urutan', 3.95], ['pengangkatan', 4.31], ['gun', 5.01], ['menentukan', 5.49], ['pola.', 6.21], ['Coba', 7.09], ['angkat', 7.31], ['gun', 7.59], ['satu', 7.83], ['dan', 8.17], ['tiga', 8.37], ['dulu', 8.59], ['ya.', 8.87]]);
const T12W = W([['Wah,', 0.25], ['ATBM!', 1.17], ['Injak', 2.53], ['pedal', 2.81], ['untuk', 3.25], ['membuka', 3.61], ['mulut', 4.01], ['lungsi.', 4.33], ['Lalu', 5.33], ['lempar', 5.63], ['teropong', 6.13], ['dan', 6.81], ['tarik', 7.23], ['sisir', 7.59], ['untuk', 8.07], ['merapatkan.', 8.41]]);
const L1: Seg[] = [
  { dur: 6.4, src: 'footage/pd7818A.mp4', from: 2.4, audio: 'audio/pd7818A-clean.wav', words: W([['Kalau', 2.84], ['ini', 3.6], ['misalnya', 3.78], ['putus', 4.18], ['gitu', 4.56], ['gimana?', 4.74], ['Disambung', 7.16], ['ke', 7.9], ['mana?', 8.1]], 2.4) },
  { dur: 9.9, src: 'footage/pd7818A.mp4', from: 9.0, tutor: 'T8', words: T8W },
];
const L2: Seg[] = [
  { dur: 4.9, src: 'footage/pd7824A.mp4', from: 0, audio: 'audio/pd7824A-clean.wav', words: W([['Oke,', 0.11], ['hari', 0.81], ['ini', 0.91], ['aku', 1.03], ['udah', 1.13], ['punya', 1.25], ['inkle', 1.6], ['loom.', 2.35], ['Langkah', 3.43], ['pertama', 3.51], ['aku', 3.85], ['harus', 3.99], ['apa?', 4.17]]) },
  { dur: 10.9, src: 'footage/pd7824A.mp4', from: 5.0, tutor: 'T9', words: T9W },
  { dur: 7.7, src: 'footage/pd7824b.mp4', from: 0.5, tutor: 'T10', words: T10W },
];
const L3: Seg[] = [
  { dur: 3.6, src: 'footage/pd7819.mp4', from: 7.9, audio: 'audio/pd7819-clean.wav', words: W([['Sebelum', 8.16], ['kita', 8.58], ['masuk,', 8.86], ['kita', 9.74], ['tepuk', 9.9], ['dulu,', 10.14], ['rapatkan', 10.48], ['dulu.', 10.9]], 7.9) },
  { dur: 9.6, src: 'footage/pd7798.mp4', from: 0, tutor: 'T11', words: T11W },
];
const L4: Seg[] = [
  { dur: 4.7, src: 'footage/pd7826.mp4', from: 0.2, audio: 'audio/pd7826-clean.wav', words: W([['Baiklah,', 0.37], ['sekarang', 1.27], ['aku', 1.33], ['sudah', 1.51], ['punya', 1.65], ['ATBM,', 1.85], ['yang', 3.41], ['pertama', 3.57], ['harus', 3.85], ['apa?', 4.07]], 0.2) },
  { dur: 9.4, src: 'footage/pd7826.mp4', from: 4.9, tutor: 'T12', words: T12W, rate: 0.66 },
];
const sum = (s: Seg[]) => s.reduce((a, b) => a + b.dur, 0);

// ════════════════════════════════════════════════════════════════════════════
// F · AI memecah gerakan (CSS 3D + balok 3D)
// ════════════════════════════════════════════════════════════════════════════
const S06v8: React.FC = () => {
  const { f, t } = useT();
  const words = W([['AI', 0.14], ['memecah', 0.88], ['setiap', 1.36], ['gerakan', 1.7], ['jadi', 2.12], ['setiap', 2.32], ['tahap,', 2.68], ['istilah,', 3.62], ['dan', 4.12], ['kesalahan', 4.46], ['yang', 5.1], ['sering', 5.2], ['terjadi.', 5.38], ['Lalu', 6.56], ['menggabungkan', 6.9], ['pola', 7.58], ['dari', 8.04], ['banyak', 8.26], ['penenun', 8.46], ['menjadi', 8.96], ['satu.', 9.52]]);
  const merge = io(t, 6.6, 8.6);
  const trail = Array.from({ length: 18 }, (_, i) => { const tt = t - i * 0.05; return [520 + Math.sin(tt * 2.4) * 140 + Math.sin(tt * 5.1) * 30, 420 + Math.cos(tt * 1.9) * 60 + Math.sin(tt * 4) * 18] as [number, number]; });
  const vids: [string, number, string][] = [['ref/lombok.mp4', 4, 'Lombok'], ['ref/ntt.mp4', 6, 'NTT'], ['ref/sumut.mp4', 5, 'Sumatra Utara']];
  return (
    <AbsoluteFill style={{ background: CREAM, perspective: 1800 }}>
      {vids.map(([src, from, lab], i) => {
        const show = i === 0 ? 1 : ez(t, 6.5 + i * 0.15, 6.9 + i * 0.15);
        const x = i === 0 ? 0 : (i === 1 ? -1 : 1) * 520 * (1 - merge);
        const z = i === 0 ? 0 : -260 * (1 - merge);
        return (
          <div key={src} style={{ position: 'absolute', left: 260, top: 90, width: 1000, height: 560, borderRadius: 26, overflow: 'hidden', boxShadow: '0 40px 90px rgba(20,28,58,0.28)', opacity: show * (i === 0 ? 1 : 1 - ez(t, 8.6, 9.0)), transform: `translate3d(${x}px, ${-merge * 20}px, ${z}px) rotateY(${i === 0 ? 14 - merge * 14 : (i === 1 ? 24 : -24) * (1 - merge)}deg) rotateX(6deg)`, zIndex: i === 0 ? 2 : 1 }}>
            <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', left: 18, top: 16, padding: '6px 12px', borderRadius: 12, background: 'rgba(245,239,226,0.92)', fontFamily: FONT, fontSize: 18, fontWeight: 800, color: NAVY }}>{lab}</div>
            {i === 0 && (
              <svg width={1000} height={560} style={{ position: 'absolute', inset: 0, opacity: 1 - merge }}>
                <polyline points={trail.map(([x2, y2]) => `${x2},${y2}`).join(' ')} fill="none" stroke={GOLD} strokeWidth={6} strokeLinecap="round" opacity={ez(t, 0.4, 0.8)} />
                {trail.filter((_, k) => k % 3 === 0).map(([x2, y2], k) => <circle key={k} cx={x2} cy={y2} r={9 - k} fill="#fff" stroke={GOLD} strokeWidth={3} opacity={ez(t, 0.4, 0.8)} />)}
                {t > 3.6 && [['lungsi', 300, 150], ['pakan', 640, 330], ['pedang / belida', 380, 470]].map(([w, x2, y2], k) => (
                  <g key={w as string} opacity={ez(t, 3.6 + k * 0.15, 3.9 + k * 0.15)}><circle cx={x2 as number} cy={y2 as number} r={8} fill={GOLD} /><line x1={x2 as number} y1={y2 as number} x2={(x2 as number) + 60} y2={(y2 as number) - 50} stroke={GOLD} strokeWidth={3} /><text x={(x2 as number) + 66} y={(y2 as number) - 56} fontFamily={FONT} fontSize={28} fontWeight={800} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,30,0.6)', strokeWidth: 6 } as React.CSSProperties}>{w}</text></g>
                ))}
                {t > 4.4 && <g transform="translate(700 200)" opacity={ez(t, 4.4, 4.7) * (1 - ez(t, 6.3, 6.6))}><circle r={70 + Math.sin(t * 6) * 4} fill="none" stroke={GOLD} strokeWidth={6} /><text x={-120} y={-90} fontFamily={FONT} fontSize={28} fontWeight={800} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,30,0.6)', strokeWidth: 6 } as React.CSSProperties}>⚠ pinggir menyempit</text></g>}
              </svg>
            )}
          </div>
        );
      })}
      {/* balok tahap 3D jatuh ke rak saat "tahap" */}
      {t > 1.9 && <Sequence from={F(1.9)}><OffthreadVideo src={staticFile('3d/blok.webm')} muted transparent style={{ position: 'absolute', left: 0, top: 380, width: 1920, height: 1080 * 0.62 }} /></Sequence>}
      {t > 8.6 && <div style={{ position: 'absolute', left: 1310, top: 210, width: 520, padding: 30, borderRadius: 26, ...glassCard(0.9), fontFamily: FONT, color: NAVY, transform: `scale(${sp(f, 8.6, { damping: 12, stiffness: 200 })})` }}><Kicker>HASIL</Kicker><div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, marginTop: 6 }}>Modul Dasar</div><div style={{ fontSize: 22, opacity: 0.7, marginTop: 4 }}>5 tahap · dari banyak penenun</div></div>}
      <Captions words={words} keys={['tahap', 'istilah', 'kesalahan', 'satu']} dark={() => true} />
      <Sfx cues={[[0.4, 'blip', 0.3], [1.9, 'whoosh', 0.3], ...[0, 1, 2, 3, 4].map((i) => [2.15 + i * 0.28, 'impact', 0.22] as Cue), [3.6, 'pop3', 0.3], [4.4, 'snap', 0.45], [6.6, 'whoosh', 0.4], [8.6, 'ding', 0.4]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// G · VALIDASI: "AI bisa salah" → owner Puta Dino Kayangan menunjukkan kesalahan nyata
// ════════════════════════════════════════════════════════════════════════════
const OWNER = 'Rumah Tenun Puta Dino Kayangan';
const W7801: Wd[] = W([['Ini', 0.0], ['masih', 0.16], ['susah', 0.3], ['banget', 0.62], ['ya,', 0.82], ['Bu?', 1.0], ['Kalau', 2.08], ['ngitungnya', 2.3], ['salah,', 3.0], ['…', 3.7], ['Iya,', 4.44], ['benar-benar.', 4.78], ['Gambarnya', 6.06], ['nggak', 6.7], ['pas.', 6.96], ['Kayak', 7.78], ['kita', 8.38], ['waktu', 8.5], ['ke', 8.8], ['…', 9.02], ['bikin', 9.34], ['ayam.', 9.68], ['Ayamnya', 10.64], ['apa?', 11.28], ['Ayamnya', 14.2], ['benar-benar', 14.84], ['aneh,', 15.34], ['aneh', 16.14], ['gara-gara.', 16.58]]);
const W7802: Wd[] = W([['Gara-gara', 0.0], ['pasang', 1.5], ['polanya', 2.76], ['salah,', 3.44], ['pasang', 4.42], ['polanya', 4.78], ['kebalik', 4.96], ['atau', 5.38], ['gimana', 5.5], ['ya?', 5.84], ['Jadi', 6.46], ['peta', 6.46], ['Indonesia', 6.76], ['itu', 7.1], ['harusnya', 7.4], ['Sumatranya', 7.7], ['di', 8.44], ['kiri', 8.68], ['ya.', 8.96], ['Kalau', 9.32], ['bikin', 10.5], ['di', 11.46], ['kain', 11.82], ['itu', 12.1], ['harus', 12.54], ['gambarnya', 12.8], ['kebalik.', 13.16], ['Jadi', 13.88], ['mirror,', 14.3], ['kebalik.', 15.1]]);
const S07a: React.FC = () => {
  const { t } = useT();
  return (
    <AbsoluteFill>
      <Andrew src="footage/7636-full.mp4" from={0} slide={0} push={0.08 * io(t, 0, 2.6)} />
      <Captions words={W([['Tapi', 0.14], ['AI', 0.7], ['bisa', 1.06], ['saja', 2.1], ['salah.', 2.3]])} keys={['salah']} />
      <Sfx cues={[[2.1, 'snap', 0.4]]} />
    </AbsoluteFill>
  );
};
const OwnerClip: React.FC<{ src: string; from: number; words: Wd[]; title: string; note?: [number, React.ReactNode][] }> = ({ src, from, words, title, note = [] }) => {
  const { t } = useT();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Full src={src} from={from} />
      <Vignette />
      <div style={{ position: 'absolute', left: 80, bottom: 190, fontFamily: FONT, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.5)', opacity: ez(t, 0.4, 0.9) * (1 - ez(t, 4.6, 5.0)) }}>
        <div style={{ height: 2, width: 64, background: GOLD, marginBottom: 12 }} />
        <div style={{ fontSize: 32, fontWeight: 700 }}>{OWNER}</div>
        <div style={{ fontSize: 20, opacity: 0.85, marginTop: 4 }}>{title}</div>
      </div>
      {note.map(([at, el], k) => t >= at && <div key={k} style={{ position: 'absolute', right: 80, top: 90, padding: '18px 24px', borderRadius: 22, ...glassCard(0.88), fontFamily: FONT, color: NAVY, opacity: ez(t, at, at + 0.3), transform: `translateY(${(1 - ez(t, at, at + 0.4)) * 20}px)` }}>{el}</div>)}
      <Captions words={words} keys={['salah', 'kebalik', 'aneh', 'mirror', 'sumatra']} />
    </AbsoluteFill>
  );
};
// peta kecil: pola harus dicerminkan (yang dijelaskan owner)
const MirrorNote: React.FC = () => {
  const { t } = useT();
  const flip = io(t, 7.4, 8.4);
  return (
    <div style={{ width: 360 }}>
      <Kicker>KENAPA PENENUN PERLU MEMERIKSA</Kicker>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>Pola peta di kain harus dicerminkan</div>
      <svg width={360} height={150} viewBox="0 0 1920 1080" style={{ marginTop: 10, transform: `scaleX(${1 - 2 * flip})` }}>
        {(DOTS_INDO as [number, number][]).filter((_, i) => i % 2 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} fill={x < 600 ? GOLD : NAVY} />)}
      </svg>
      <div style={{ fontSize: 18, opacity: 0.7 }}>{flip < 0.5 ? 'Sumatra di kiri (dilihat dari depan)' : 'ditenun dari belakang: dibalik'}</div>
    </div>
  );
};
import DOTS from '../public/3d/dots.json';
const DOTS_INDO = (DOTS as unknown as { indo: [number, number][] }).indo;
const S07b: React.FC = () => {
  const { t } = useT();
  const words = W([['Untuk', 2.56], ['menjaga', 3.56], ['kualitas,', 4.04], ['setiap', 4.74], ['tahap', 5.88], ['diperiksa', 6.52], ['penenun', 7.04], ['sebelum', 7.58], ['diajarkan.', 8.34]], 2.6);
  const ed = t >= 2.4;
  const [x1, y1] = lp(355, 428 - 120 / (1216 / 1440)), [x3, y3] = lp(360, 634 - 120 / (1216 / 1440));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!ed && <><Full src="footage/pd7797.mp4" from={3.6} /><Vignette /></>}
      {ed && (
        <AbsoluteFill style={{ opacity: ez(t, 2.4, 2.7) }}>
          <Laptop x={340} y={110} w={1240} h={800} url="belajartenun.com/editor.html">
            <Img src={staticFile('ui/d-editor.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${-io(t, 2.6, 3.3) * 120}px)` }} />
          </Laptop>
          <Ring x={x1} y={y1} w={250} h={28} at={3.4} label="Tahap: 5 · 0 tervalidasi" side="top" />
          <Ring x={x3} y={y3} w={810} h={80} at={4.2} label="Penenun memeriksa instruksi tiap tahap" />
          <div style={{ position: 'absolute', right: 40, bottom: 120, width: 380, height: 214, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(20,28,58,0.3)', border: '4px solid #fff', opacity: ez(t, 4.6, 5.0) }}><Sequence from={F(4.6)}><OffthreadVideo src={staticFile('footage/pd7819.mp4')} startFrom={F(19.5)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence></div>
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['kualitas', 'diperiksa', 'penenun']} dark={(x) => x > 2.4} />
      <Sfx cues={[[2.4, 'whoosh', 0.3], [3.4, 'pop', 0.4], [4.2, 'pop', 0.4], [4.6, 'pop3', 0.3]]} />
    </AbsoluteFill>
  );
};

// MITRA: owner + logo + fakta (VO4)
const VO4W: Wd[] = [['Kami', 0.62], ['bekerja', 1.36], ['sama', 1.78], ['dengan', 2.16], ['Puta', 2.52], ['Dino', 2.98], ['Kayangan', 3.32], ['di', 3.96], ['Tidore.', 4.1], ['Para', 5.48], ['penenunnya', 5.62], ['memeriksa', 6.5], ['materi', 7.0], ['kami,', 7.28], ['dan', 7.7], ['arsip', 8.34], ['mereka', 8.72], ['kami', 9.2], ['olah', 9.5], ['menjadi', 9.96], ['pelajaran.', 10.32]];
export const MITRA8_SECONDS = 12.6;
const Mitra8: React.FC = () => {
  const { f, t } = useT();
  const knot = io(t, 0.8, 1.6);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={F(5.2)}><Full src="footage/pd7796.mp4" from={0.5} /></Sequence>
      <Sequence from={F(5.2)} durationInFrames={F(4.0)}><Full src="footage/pd7819.mp4" from={19.6} /></Sequence>
      <Sequence from={F(9.2)}><Full src="footage/pd7828.mp4" from={6.0} /></Sequence>
      <Vignette />
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(10,14,30,0.75), rgba(10,14,30,0) 55%)' }} />
      <div style={{ position: 'absolute', left: 80, bottom: 170, display: 'flex', alignItems: 'center', gap: 0, opacity: ez(t, 0.4, 0.8) }}>
        <div style={{ height: 120, padding: '0 26px', borderRadius: 24, background: '#fff', display: 'flex', alignItems: 'center', transform: `translateX(${(1 - knot) * -40}px)` }}><Img src={staticFile('brand/partner-puta-dino-kayangan.png')} style={{ height: 82 }} /></div>
        <svg width={120} height={60}><path d={`M0 30 C 30 ${30 - 20 * knot}, 90 ${30 + 20 * knot}, 120 30`} fill="none" stroke={GOLD} strokeWidth={5} strokeDasharray={150} strokeDashoffset={150 * (1 - knot)} />{knot > 0.95 && <circle cx={60} cy={30} r={9 * sp(f, 1.6, { damping: 8, stiffness: 300 })} fill={GOLD} />}</svg>
        <div style={{ height: 120, width: 120, borderRadius: 24, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateX(${(1 - knot) * 40}px)` }}><Mark size={84} /></div>
        <div style={{ marginLeft: 30, fontFamily: FONT, color: '#fff' }}>
          <div style={{ fontSize: 20, letterSpacing: 4, fontWeight: 800, color: GOLD }}>MITRA PENENUN</div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Rumah Tenun Puta Dino Kayangan</div>
          <div style={{ fontSize: 20, opacity: 0.8 }}>Soasio, Tidore · menenun kembali puta dino sejak 2018</div>
        </div>
      </div>
      <Sequence from={F(0.3)}><Audio src={staticFile('vo/VO4-clean.wav')} /></Sequence>
      <Captions words={off(VO4W, 0.3)} keys={['puta', 'dino', 'kayangan', 'memeriksa', 'arsip', 'pelajaran']} />
      <Sfx cues={[[0.4, 'whoosh', 0.3], [1.6, 'snap', 0.45], [1.7, 'ding', 0.35], [5.2, 'whoosh', 0.2], [9.2, 'whoosh', 0.2]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// H · Animasi 3D baru untuk akses, arsip, tutorial vs kelas, dan tiga momen
// ════════════════════════════════════════════════════════════════════════════
const S15v8: React.FC = () => {
  const { t } = useT();
  const words = W([['Penenun', 0.43], ['tidak', 1.19], ['tergantikan.', 1.87], ['Dengan', 2.89], ['BelajarTenun,', 3.33], ['akses', 4.51], ['ke', 4.87], ['mereka', 4.99], ['terbuka', 5.29], ['untuk', 6.17], ['lebih', 6.35], ['banyak', 6.67], ['murid,', 7.03], ['dari', 7.55], ['mana', 7.95], ['saja.', 8.11]], 0.2);
  const full = io(t, 2.3, 2.9);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {t < 2.9 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - full }}><Andrew src="footage/7637a-full.mp4" from={0.2} slide={0} push={0.06 * io(t, 0, 2.3)} /></div>}
      {t > 2.3 && <Sequence from={F(2.4)}><AbsoluteFill style={{ opacity: full }}><OffthreadVideo src={staticFile('3d/akses.webm')} muted transparent /></AbsoluteFill></Sequence>}
      {t > 2.4 && <div style={{ position: 'absolute', left: 90, top: 80, fontFamily: FONT, color: NAVY, opacity: ez(t, 2.8, 3.2) }}><Kicker>AKSES KE PENENUN</Kicker><div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1.5 }}>Dari Tidore ke murid di mana saja</div></div>}
      <Captions words={words} keys={['tergantikan', 'akses', 'murid', 'mana']} dark={(x) => x > 2.6} />
      <Sfx cues={[[2.3, 'whoosh', 0.35], [3.0, 'impact', 0.3], ...Array.from({ length: 15 }, (_, i) => [4.0 + i * 0.22, 'pop3', 0.18] as Cue)]} />
    </AbsoluteFill>
  );
};
const S18v8: React.FC = () => {
  const { t } = useT();
  const words = W([['Pengetahuan', 0.0], ['yang', 0.76], ['sudah', 0.98], ['divalidasi', 1.24], ['kami', 1.88], ['buka', 2.4], ['sebagai', 2.88], ['arsip', 3.2], ['tenun', 3.76], ['publik,', 3.98], ['supaya', 4.88], ['terus', 5.42], ['lestari.', 5.78]]);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence durationInFrames={F(4.7)}><OffthreadVideo src={staticFile('3d/arsip.mp4')} muted /></Sequence>
      {t < 4.7 && <div style={{ position: 'absolute', left: 90, top: 80, fontFamily: FONT, color: NAVY, opacity: ez(t, 2.4, 2.8) }}><Kicker>ARSIP TENUN TERBUKA</Kicker><div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.5 }}>Modul yang sudah divalidasi, untuk semua</div></div>}
      <Sequence from={F(4.6)}><OffthreadVideo src={staticFile('3d/reweave.mp4')} muted /></Sequence>
      {t > 4.6 && <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: NAVY, opacity: ez(t, 5.6, 6.0) }}>LESTARI</div>}
      <Captions words={words} keys={['divalidasi', 'arsip', 'publik', 'lestari']} dark={() => true} />
      <Sfx cues={[...[0, 1, 2, 3, 4, 5].map((i) => [0.2 + i * 0.32, 'pop3', 0.25] as Cue), [2.6, 'whoosh', 0.3], [2.9, 'ding', 0.35], [4.6, 'whoosh', 0.35], [4.8, 'riser', 0.3], [6.0, 'ding', 0.4]]} />
    </AbsoluteFill>
  );
};
const S19v8: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Video', 0.4], ['tutorial', 1.06], ['tidak', 1.48], ['bisa', 2.2], ['melihat', 2.54], ['kesalahan', 2.82], ['kita.', 3.22], ['Kelas', 4.38], ['tatap', 4.9], ['muka', 5.12], ['terbatas', 5.42], ['tempat', 6.1], ['dan', 6.46], ['waktunya.', 6.58], ['BelajarTenun', 7.58], ['menggabungkan', 8.22], ['keduanya:', 8.94], ['melihat', 9.98], ['dari', 10.52], ['mata', 10.86], ['murid,', 11.06], ['mengoreksi', 11.42], ['saat', 12.24], ['itu', 12.46], ['juga,', 12.62], ['dan', 13.04], ['tetap', 13.64], ['setia', 14.14], ['pada', 14.82], ['ilmu', 15.02], ['penenunnya.', 15.34]], 0.2);
  const merged = t >= 8.6;
  const gIn = sp(f, 8.4, { damping: 16, stiffness: 110 });
  // tiga momen nyata dari footage Drive
  const M: [string, string, number, string, number][] = [
    ['Melihat dari mata murid', 'footage/pd7826.mp4', 9.7, 'POV kacamata · ATBM', 4.6],
    ['Mengoreksi saat itu juga', 'footage/pd7824A.mp4', 11.2, 'inkle loom · rapatkan pakan', 10.0],
    ['Setia pada ilmu penenun', 'footage/pd7819.mp4', 13.4, 'dibimbing owner Puta Dino Kayangan', 20.0],
  ];
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Sequence durationInFrames={F(9.4)}><OffthreadVideo src={staticFile('3d/tutorial.mp4')} muted /></Sequence>
      {t < 8.8 && <div style={{ position: 'absolute', left: 90, top: 80, fontFamily: FONT, color: NAVY }}>
        <div style={{ opacity: ez(t, 0.3, 0.6) * (1 - ez(t, 3.7, 4.0)), position: 'absolute', whiteSpace: 'nowrap' }}><Kicker>VIDEO TUTORIAL</Kicker><div style={{ fontSize: 46, fontWeight: 800 }}>Terus berjalan, walau kamu salah</div></div>
        <div style={{ opacity: ez(t, 4.2, 4.5) * (1 - ez(t, 7.2, 7.5)), position: 'absolute', whiteSpace: 'nowrap' }}><Kicker>KELAS TATAP MUKA</Kicker><div style={{ fontSize: 46, fontWeight: 800 }}>Kursi penuh, jam terbatas</div></div>
      </div>}
      {merged && (
        <AbsoluteFill style={{ background: CREAM }}>
          <Img src={staticFile('3d/glasses-still.png')} style={{ position: 'absolute', left: -380, top: 60, width: 1920 * 0.75, height: 1080 * 0.75, transform: `scale(${0.8 + 0.2 * gIn})`, opacity: Math.min(1, gIn * 1.4) }} />
          {M.map(([lab, src, at, sub, from], i) => {
            const p = sp(f, at, { damping: 14, stiffness: 180 });
            return (
              <div key={lab} style={{ position: 'absolute', left: 1020, top: 110 + i * 300, display: 'flex', gap: 24, alignItems: 'center', opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 120}px)` }}>
                <div style={{ width: 400, height: 225, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(20,28,58,0.25)', border: `4px solid ${t >= at ? GOLD : '#fff'}` }}>
                  {t >= at - 0.1 && <Sequence from={F(at - 0.1)}><OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>}
                </div>
                <div style={{ fontFamily: FONT, color: NAVY, width: 380 }}><div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>{lab}</div><div style={{ fontSize: 20, opacity: 0.65, marginTop: 4 }}>{sub}</div></div>
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['tutorial', 'kesalahan', 'kelas', 'terbatas', 'menggabungkan', 'melihat', 'mengoreksi', 'penenun']} dark={() => true} />
      <Sfx cues={[[0.2, 'whoosh', 0.3], [2.6, 'snap', 0.35], [3.8, 'whoosh', 0.35], ...Array.from({ length: 8 }, (_, i) => [4.4 + i * 0.08, 'pop3', 0.14] as Cue), [6.1, 'impact', 0.3], [7.4, 'whoosh', 0.4], [8.4, 'impact', 0.45], ...M.map(([, , at]) => [at, 'pop', 0.45] as Cue)]} />
    </AbsoluteFill>
  );
};
// montase penutup dari footage Drive
const MONT8: [string, number][] = [['footage/pd7826.mp4', 9.5], ['footage/pd7819.mp4', 2.0], ['footage/pd7824A.mp4', 10.0], ['footage/pd7818A.mp4', 12.0], ['footage/pd7802.mp4', 18.0], ['footage/pd7828.mp4', 2.0], ['footage/pd7797.mp4', 8.0]];
const S24v8: React.FC = () => (
  <AbsoluteFill>
    {MONT8.map(([src, from], i) => (
      <Sequence key={i} from={F(i * 0.56)} durationInFrames={F(0.56)}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${1.1})` }}><Full src={src} from={from} /></div>
      </Sequence>
    ))}
  </AbsoluteFill>
);

// ── susunan ──────────────────────────────────────────────────────────────────
type Row = [string, number, React.ReactNode, { src: string; from: number } | null];
const ROWS: Row[] = [
  ['B1', B1V7_SECONDS, <Babak1V7 music={false} />, null],
  ['ALUR', ALUR8_SECONDS, <Alur8 />, null],
  ['SCAN', SCAN_SECONDS, <Scan />, null],
  ['L1', sum(L1), <PovLevel n={1} name="Dasar" alat="Bingkai sumpit" ui="t2" segs={L1} />, null],
  ['L2', sum(L2), <PovLevel n={2} name="Pengembangan" alat="Inkle loom" ui="t3" segs={L2} />, null],
  ['L4', sum(L4), <PovLevel n={4} name="Kreasi" alat="ATBM" ui="j3" segs={L4} />, null],
  ['05', 8.3, <S05 />, { src: 'audio/7635b-clean.wav', from: 0.6 }],
  ['06', 10.1, <S06v8 />, { src: 'audio/7635a-clean.wav', from: 0 }],
  ['07a', 2.6, <S07a />, { src: 'audio/7636-clean.wav', from: 0 }],
  ['O1', 7.5, <OwnerClip src="footage/pd7801.mp4" from={0} words={W7801} title="Owner · menjelaskan kesalahan pola" />, { src: 'audio/pd7801-clean.wav', from: 0 }],
  ['O2', 9.5, <OwnerClip src="footage/pd7802.mp4" from={0} words={W7802} title="Owner · pola harus dicerminkan" note={[[6.4, <MirrorNote />]]} />, { src: 'audio/pd7802-clean.wav', from: 0 }],
  ['07b', 6.8, <S07b />, { src: 'audio/7636-clean.wav', from: 2.4 }],
  ['MITRA', MITRA8_SECONDS, <Mitra8 />, null],
  ['15', 8.4, <S15v8 />, { src: 'audio/7637a-clean.wav', from: 0.2 }],
  ['16', 5.8, <S16 />, { src: 'audio/7637b-clean.wav', from: 0 }],
  ['17', 4.6, <S17 />, { src: 'audio/7637c-clean.wav', from: 0 }],
  ['18', 6.8, <S18v8 />, { src: 'audio/7639-clean.wav', from: 0 }],
  ['19', 16.4, <S19v8 />, { src: 'audio/7639new-clean.wav', from: 0.2 }],
  ['20', 6.6, <S20 />, { src: 'audio/7643c-clean.wav', from: 0 }],
  ['22', 11.8, <S22 />, { src: 'audio/7643a-clean.wav', from: 0.4 }],
  ['23', 7.2, <S23 />, { src: 'audio/7643new-clean.wav', from: 0.4 }],
  ['24', 3.9, <S24v8 />, null],
  ['25', 6.4, <S25 />, { src: 'audio/7643b-clean.wav', from: 0 }],
  ['26', 4.6, <S26 />, null],
];
const STARTS = ROWS.reduce<number[]>((a, r, i) => [...a, i === 0 ? 0 : a[i - 1] + ROWS[i - 1][1]], []);
export const FULL8_SECONDS = Math.ceil(STARTS[STARTS.length - 1] + ROWS[ROWS.length - 1][1]);
const VOICE = new Set(['L1', 'L2', 'L3', 'L4', 'O1', 'O2']);
const QUIET = new Set(['SCAN', '24', '26']);
const B1_SPEECH: [number, number][] = [[0.3, 4.6], [5.0, 13.6], [13.8, 18.4], [18.8, 29.6]];
const musicVol = (s: number) => {
  const i = STARTS.findIndex((st, k) => s >= st && s < st + ROWS[k][1]);
  if (i < 0) return 0.1;
  const id = ROWS[i][0];
  if (id === 'B1') return B1_SPEECH.some(([a, b]) => s > a && s < b) ? 0.05 : 0.12;
  if (QUIET.has(id)) return 0.15;
  if (VOICE.has(id)) return 0.03;
  return 0.05;
};
export const FullVideo8: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    {ROWS.map(([id, dur, el, audio], i) => (
      <Sequence key={id} from={F(STARTS[i])} durationInFrames={F(dur)}>
        {el}
        {audio && <Audio src={staticFile(audio.src)} startFrom={F(audio.from)} endAt={F(audio.from + dur)} />}
      </Sequence>
    ))}
    <Audio src={staticFile('audio/music-bed.wav')} endAt={F(206)} volume={(fr) => musicVol(fr / FPS) * Math.min(1, (206 - fr / FPS) / 2)} />
    <Sequence from={F(204)}><Audio src={staticFile('audio/music-bed.wav')} startFrom={F(30)} volume={(fr) => musicVol(204 + fr / FPS) * Math.min(1, fr / 60)} /></Sequence>
  </AbsoluteFill>
);
