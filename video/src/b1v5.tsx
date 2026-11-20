import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mark, LOGO } from './brand';

// Babak 1 v5 (0:00–0:30) dengan prinsip skill motion-broll:
// satu bentuk yang terus berubah (tidak cut), kursor yang klik/ketik, setiap perubahan
// jatuh di kata yang diucapkan, efek suara asli (CC0) per kejadian, teks di belakang orang.

const FPS = 30;
const F = (s: number) => Math.round(s * FPS);
const NAVY = LOGO.navy, GOLD = LOGO.gold, CREAM = LOGO.cream;
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });

// Nilai yang berpindah target berkali-kali: jumlah spring per perubahan (seperti M.track).
type K = [number, number];
const track = (v0: number, keys: K[], f: number, cfg = { damping: 26, stiffness: 140, mass: 1 }) => {
  let v = v0, prev = v0;
  for (const [t, val] of keys) {
    v += (val - prev) * spring({ frame: f - F(t), fps: FPS, config: cfg });
    prev = val;
  }
  return v;
};

// ── Lapisan suara: satu efek per kejadian ────────────────────────────────────
type Cue = [number, string, number?];
const Sfx: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>{cues.map(([t, s, v = 0.6], i) => <Sequence key={i} from={Math.max(0, F(t))} durationInFrames={F(3)}><Audio src={staticFile(`sfx2/${s}.wav`)} volume={v} /></Sequence>)}</>
);

// ── Caption kinetik: per frasa, kata kunci emas & sedikit membesar saat diucapkan ──
type Wd = [string, number];
const Captions: React.FC<{ words: Wd[]; keys?: string[]; light?: boolean }> = ({ words, keys = [], light = true }) => {
  const t = useCurrentFrame() / FPS;
  const chunks: Wd[][] = []; let cur: Wd[] = [];
  words.forEach((w, i) => { cur.push(w); if (/[.,?!:]$/.test(w[0]) || cur.length >= 6 || i === words.length - 1) { chunks.push(cur); cur = []; } });
  let idx = -1; chunks.forEach((c, i) => { if (t >= c[0][1] - 0.1) idx = i; });
  if (idx < 0) return null;
  const c = chunks[idx];
  const end = c[c.length - 1][1] + 0.9;
  if (t > end && idx === chunks.length - 1) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 700, letterSpacing: -0.6, color: light ? '#fff' : NAVY, textShadow: light ? '0 2px 14px rgba(0,0,0,0.55)' : 'none' }}>
      {c.map(([w, at], i) => {
        const on = t >= at - 0.05;
        const isKey = keys.some((k) => w.toLowerCase().startsWith(k));
        const pop = isKey ? spring({ frame: F(t - at), fps: FPS, config: { damping: 14, stiffness: 220 } }) : 1;
        return <span key={i} style={{ display: 'inline-block', marginRight: '0.26em', opacity: on ? 1 : 0.35, color: on && isKey ? GOLD : undefined, margin: isKey ? '0 0.12em' : undefined, transformOrigin: '50% 70%', transform: `scale(${isKey && on ? 1 + (1 - pop) * 0.12 + 0.03 : 1})` }}>{w}</span>;
      })}
    </div>
  );
};

// ── Teks di belakang orang: latar (grade) → teks raksasa → orang (alpha) ─────
const DepthShot: React.FC<{ name: string; text: string; at: number; push?: [number, number][]; size?: number; y?: number }> = ({ name, text, at, push = [[0, 1]], size = 250, y = 330 }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const sc = push.length > 1 ? interpolate(t, push.map((p) => p[0]), push.map((p) => p[1]), { ...cl, easing: Easing.inOut(Easing.cubic) }) : push[0][1];
  const rev = ez(t, at, at + 0.55, Easing.out(Easing.exp));
  const cam: React.CSSProperties = { position: 'absolute', inset: 0, transform: `scale(${sc})`, transformOrigin: '50% 40%' };
  return (
    <AbsoluteFill>
      <div style={cam}><OffthreadVideo src={staticFile(`matte/${name}-grade.mp4`)} muted style={{ width: '100%', height: '100%' }} /></div>
      <div style={{ ...cam, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: y, width: '100%', textAlign: 'center', whiteSpace: 'pre-line', fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -size * 0.045, lineHeight: 0.9, color: '#fff', opacity: 0.95, clipPath: `inset(${(1 - rev) * 100}% 0 0 0)`, transform: `translateY(${(1 - rev) * 60}px)` }}>{text}</div>
      </div>
      <div style={cam}><OffthreadVideo src={staticFile(`matte/${name}-person.mov`)} muted transparent style={{ width: '100%', height: '100%' }} /></div>
    </AbsoluteFill>
  );
};

// ── Kursor ───────────────────────────────────────────────────────────────────
const Cursor: React.FC<{ path: [number, number, number][]; clicks: number[]; show: [number, number] }> = ({ path, clicks, show }) => {
  const t = useCurrentFrame() / FPS;
  if (t < show[0] || t > show[1]) return null;
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i];
    if (t >= t0) { const e = Easing.inOut(Easing.cubic)(Math.min(1, (t - t0) / (t1 - t0))); x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e - Math.sin(e * Math.PI) * 30; }
  }
  const press = clicks.reduce((a, c) => Math.max(a, 1 - Math.min(1, Math.abs(t - c) / 0.12)), 0);
  const o = ez(t, show[0], show[0] + 0.25) * (1 - ez(t, show[1] - 0.25, show[1]));
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: o }}>
      <g transform={`translate(${x} ${y}) scale(${1.9 - press * 0.25})`}>
        <path d="M0 0 L0 24 L6.5 18 L11 28 L15 26 L10.5 16.5 L19 16 Z" fill={NAVY} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

// ── 01 · teks raksasa di belakang Andrew + lower-third ─────────────────────────
const W01: Wd[] = [['Selama', 0.35], ['ratusan', 1.13], ['tahun,', 1.53], ['menenun', 2.33], ['diajarkan', 2.87], ['dari', 3.33], ['tangan', 3.55], ['ke', 3.97], ['tangan.', 4.1]];
const S01: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const lt = ez(t, 0.9, 1.4) * (1 - ez(t, 4.1, 4.5));
  return (
    <AbsoluteFill>
      <DepthShot name="7633" text={'RATUSAN\nTAHUN'} at={1.1} push={[[0, 1.0], [4.8, 1.06]]} size={270} y={150} />
      <div style={{ position: 'absolute', left: 64, bottom: 170, padding: '16px 22px', borderRadius: 18, background: 'rgba(20,28,58,0.55)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(18px)', opacity: lt, transform: `translateX(${(1 - lt) * -30}px)`, fontFamily: FONT, color: '#fff' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>Noe Andrew JM Silalahi</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 18, opacity: 0.85 }}><Mark size={18} />Ketua Tim BelajarTenun</div>
      </div>
      <Captions words={W01} keys={['ratusan', 'tangan']} />
      <Sfx cues={[[1.05, 'whoosh', 0.35], [0.95, 'pop3', 0.3]]} />
    </AbsoluteFill>
  );
};

// ── 02 · satu kartu yang terus berubah: grafik turun → pencarian kosong → benang putus ──
const W02: Wd[] = [['Tapi', 0.15], ['penenun', 0.71], ['senior', 1.09], ['semakin', 1.41], ['sedikit.', 1.83], ['Anak', 2.57], ['muda', 2.75], ['yang', 3.21], ['ingin', 3.37], ['belajar', 3.57], ['sering', 3.95], ['tidak', 4.65], ['punya', 4.79], ['akses', 5.03], ['ke', 5.43], ['guru.', 5.65], ['Dan', 6.59], ['pengetahuannya', 6.73], ['perlahan-lahan', 7.41], ['hilang.', 8.33]];
const QUERY = 'guru menenun di dekatku';
const S02: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  // bentuk: grafik (A) → kolom cari (B) → benang (C)
  const w = track(860, [[2.45, 980], [6.55, 1500]], f);
  const h = track(520, [[2.45, 120], [4.75, 380], [6.55, 10]], f);
  const r = track(36, [[2.45, 60], [4.75, 36], [6.55, 5]], f);
  const bg = t < 6.55 ? '#fff' : GOLD;
  const cy = track(540, [[2.45, 470], [4.75, 540]], f);
  const camS = track(1.0, [[0.6, 1.08], [2.45, 1.0], [6.55, 1.04]], f, { damping: 30, stiffness: 60, mass: 1 });
  const bars = [100, 86, 74, 60, 48, 35];
  const shrink = ez(t, 1.35, 2.2, Easing.inOut(Easing.cubic));
  const typed = QUERY.slice(0, Math.max(0, Math.min(QUERY.length, Math.floor((t - 3.15) * 16))));
  const snap = ez(t, 8.3, 8.75, Easing.out(Easing.cubic));
  const aOut = 1 - ez(t, 2.35, 2.55), bIn = ez(t, 2.6, 2.85) * (1 - ez(t, 6.45, 6.6));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <AbsoluteFill style={{ transform: `scale(${camS})` }}>
        <div style={{ position: 'absolute', left: 960 - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: r, background: bg, boxShadow: t < 6.55 ? '0 30px 80px rgba(20,28,58,0.12)' : 'none', overflow: 'hidden', fontFamily: FONT, color: NAVY, opacity: t > 6.55 ? 1 - snap * 0.0 : 1 }}>
          {/* A: grafik relatif penenun senior */}
          <div style={{ position: 'absolute', inset: '44px 54px', opacity: aOut, filter: `blur(${(1 - aOut) * 8}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Penenun senior</div>
            <div style={{ fontSize: 18, opacity: 0.55, marginTop: 4 }}>ilustrasi tren · bukan data</div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, display: 'flex', alignItems: 'flex-end', gap: 22 }}>
              {bars.map((b, i) => <div key={i} style={{ flex: 1, height: `${b * (1 - shrink * (i / bars.length) * 0.75)}%`, borderRadius: 12, background: i === bars.length - 1 ? GOLD : NAVY, opacity: 0.25 + 0.75 * (1 - i / bars.length) }} />)}
            </div>
          </div>
          {/* B: kolom pencarian guru, hasil kosong */}
          <div style={{ position: 'absolute', inset: 0, opacity: bIn, filter: `blur(${(1 - bIn) * 8}px)` }}>
            <div style={{ position: 'absolute', left: 40, right: 40, top: 30, height: 60, display: 'flex', alignItems: 'center', gap: 18, fontSize: 32, fontWeight: 600 }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span>{typed}<span style={{ opacity: t < 4.6 && Math.floor(t * 3) % 2 ? 1 : 0 }}>|</span></span>
            </div>
            <div style={{ position: 'absolute', left: 40, right: 40, top: 130, opacity: ez(t, 4.75, 5.05) }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ height: 54, borderRadius: 14, background: CREAM, marginBottom: 16, opacity: 0.6 - i * 0.15 }} />)}
              <div style={{ position: 'absolute', top: 70, width: '100%', textAlign: 'center', fontSize: 40, fontWeight: 800 }}>0 guru ditemukan</div>
            </div>
          </div>
        </div>
        {/* C: benang emas putus */}
        {t > 8.3 && (
          <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
            <line x1={210} y1={540 + snap * 40} x2={940 - snap * 60} y2={540 + snap * 160} stroke={GOLD} strokeWidth={10} strokeLinecap="round" opacity={1 - snap * 0.6} />
            <line x1={980 + snap * 60} y1={540 + snap * 160} x2={1710} y2={540 + snap * 40} stroke={GOLD} strokeWidth={10} strokeLinecap="round" opacity={1 - snap * 0.6} />
          </svg>
        )}
      </AbsoluteFill>
      <Cursor path={[[2.6, 1500, 900], [3.0, 600, 485], [4.7, 620, 500], [5.3, 1500, 950]]} clicks={[3.05]} show={[2.6, 5.3]} />
      <Captions words={W02} keys={['sedikit', 'akses', 'guru', 'hilang']} light={false} />
      <Sfx cues={[[0.05, 'pop2', 0.4], [1.4, 'tick', 0.5], [1.6, 'tick', 0.45], [1.8, 'tick', 0.4], [2.45, 'whoosh', 0.3], [3.05, 'click', 0.6], ...Array.from({ length: 12 }, (_, i) => [3.15 + i * 0.12, 'tick', 0.18] as Cue), [4.75, 'pop', 0.5], [6.5, 'whoosh', 0.3], [8.3, 'snap', 0.7]]} />
    </AbsoluteFill>
  );
};

// ── 03 · "di mata kita?" di belakang Andrew, punch-in ringan ──────────────────
const W03: Wd[] = [['Bagaimana', 0.05], ['kalau', 0.83], ['ilmunya', 1.09], ['bisa', 1.51], ['ikut…', 1.67], ['di', 2.05], ['mata', 4.03], ['kita?', 4.19]];
const S03: React.FC = () => (
  <AbsoluteFill>
    <DepthShot name="7634b" text="DI MATA KITA?" at={4.0} push={[[0, 1.0], [3.95, 1.04], [4.2, 1.14], [4.7, 1.16]]} size={210} y={170} />
    <Captions words={W03} keys={['mata', 'kita']} />
    <Sfx cues={[[3.97, 'whoosh', 0.35], [2.7, 'riser', 0.35]]} />
  </AbsoluteFill>
);

// ── 04 · logo dari lensa → jendela yang terus berubah → tombol Mulai → POV ─────
const o4 = 0.3;
const W04: Wd[] = ([['BelajarTenun', 0.5], ['adalah', 1.4], ['tutor', 1.88], ['AI', 2.2], ['di', 2.4], ['kacamata', 2.78], ['yang', 3.28], ['mengajarkan', 3.56], ['pengetahuan', 4.08], ['dan', 4.76], ['teknologi', 5.02], ['tradisional', 5.88], ['menenun,', 6.26], ['termasuk', 7.2], ['istilahnya', 7.82], ['dalam', 8.52], ['bahasa', 8.76], ['daerah,', 9.14], ['langsung', 9.86], ['saat', 10.38], ['kita', 10.64], ['mencoba.', 10.86]] as Wd[]).map(([w, s]) => [w, s - o4] as Wd);
const TRAD = ['Tradisi A', 'Tradisi B', 'Tradisi C'];
const S04: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  // kotak: logo (A) → jendela video (B,C) → tab istilah (D) → tombol (E) → layar penuh (F)
  const w = track(40, [[0.0, 200], [1.3, 1100], [3.75, 1240], [6.6, 900], [9.3, 520], [10.75, 1920]], f);
  const h = track(40, [[0.0, 200], [1.3, 620], [3.75, 700], [6.6, 300], [9.3, 130], [10.75, 1080]], f);
  const r = track(20, [[0.0, 44], [1.3, 34], [6.6, 34], [9.3, 65], [10.75, 0]], f);
  const fill = t < 1.25 ? NAVY : t < 6.55 ? '#000' : t < 10.7 ? '#fff' : '#000';
  const logo = 1 - ez(t, 1.15, 1.35);
  const tabI = t < 7.55 ? 0 : t < 8.2 ? 1 : 2;
  const pressed = ez(t, 10.55, 10.7);
  const shake = t > 0.02 && t < 0.2 ? Math.sin(t * 160) * 6 * (1 - t / 0.2) : 0;
  const chips = [['Pengetahuan', 3.85], ['Teknologi tradisional', 4.75]] as const;
  return (
    <AbsoluteFill style={{ background: CREAM, transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <div style={{ position: 'absolute', left: 960 - w / 2, top: 520 - h / 2, width: w, height: h, borderRadius: r, background: fill, overflow: 'hidden', boxShadow: '0 40px 90px rgba(20,28,58,0.18)', fontFamily: FONT }}>
        {/* A: logo resmi ditenun */}
        {logo > 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: logo }}><Mark size={Math.min(w, h) * 0.95} draw={ez(t, 0.05, 1.0)} /></div>}
        {/* B: kacamata & benang (7644) */}
        {t > 1.25 && t < 3.85 && <Sequence from={F(1.25)}><OffthreadVideo src={staticFile('footage/7644-full.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: ez(t, 1.25, 1.5) }} /></Sequence>}
        {/* C: kamera mengitari Andrew (7652) */}
        {t >= 3.75 && t < 6.65 && <Sequence from={F(3.75)}><OffthreadVideo src={staticFile('footage/7652-full.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: ez(t, 3.75, 3.95) }} /></Sequence>}
        {/* D: tab istilah bahasa daerah */}
        {t >= 6.6 && t < 9.35 && (
          <div style={{ position: 'absolute', inset: 0, padding: 34, opacity: ez(t, 6.65, 6.9) * (1 - ez(t, 9.2, 9.35)), color: NAVY }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {TRAD.map((x, i) => <div key={x} style={{ padding: '12px 22px', borderRadius: 999, fontSize: 24, fontWeight: 700, background: i === tabI ? NAVY : CREAM, color: i === tabI ? '#fff' : NAVY }}>{x}</div>)}
            </div>
            <div style={{ marginTop: 34, fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>[istilah {tabI + 1}]</div>
            <div style={{ fontSize: 26, opacity: 0.6, marginTop: 4 }}>benang pakan</div>
          </div>
        )}
        {/* E: tombol Mulai belajar */}
        {t >= 9.3 && t < 10.75 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 40, fontWeight: 800, color: pressed > 0.5 ? NAVY : NAVY, background: pressed > 0 ? `rgba(212,184,102,${pressed})` : 'transparent', opacity: ez(t, 9.35, 9.55) }}>
            <Mark size={42} /> Mulai belajar
          </div>
        )}
        {/* F: tombol meluas jadi POV menenun */}
        {t >= 10.7 && <Sequence from={F(10.7)}><OffthreadVideo src={staticFile('footage/7653-full.mp4')} startFrom={F(20.5)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>}
      </div>
      {/* chip melayang di samping jendela video */}
      {chips.map(([c, a], i) => {
        const p = spring({ frame: f - F(a), fps: FPS, config: { damping: 18, stiffness: 180 } });
        const o = t < 6.55 ? Math.min(1, p) : 1 - ez(t, 6.55, 6.75);
        return <div key={c} style={{ position: 'absolute', left: 1450, top: 260 + i * 90, padding: '14px 24px', borderRadius: 999, background: '#fff', boxShadow: '0 16px 40px rgba(20,28,58,0.12)', fontFamily: FONT, fontSize: 26, fontWeight: 700, color: NAVY, opacity: o, transform: `translateY(${(1 - p) * 20}px) scale(${0.9 + p * 0.1})` }}>{c}</div>;
      })}
      {t > 1.5 && t < 3.85 && <div style={{ position: 'absolute', left: 1450, top: 200, padding: '14px 24px', borderRadius: 999, background: NAVY, color: '#fff', fontFamily: FONT, fontSize: 26, fontWeight: 700, opacity: ez(t, 1.6, 1.8) }}>Tutor AI · di kacamata</div>}
      <Cursor path={[[6.9, 1400, 900], [7.4, 760, 320], [8.1, 900, 320], [9.6, 1010, 520], [10.4, 990, 530]]} clicks={[7.5, 8.15, 10.55]} show={[6.9, 10.75]} />
      <Captions words={W04} keys={['belajartenun', 'kacamata', 'bahasa', 'mencoba']} light={t > 10.7} />
      <Sfx cues={[[0.0, 'impact', 0.8], [1.25, 'whoosh', 0.35], [1.6, 'pop2', 0.4], [3.75, 'whoosh', 0.3], [3.85, 'pop', 0.45], [4.75, 'pop3', 0.45], [6.55, 'whoosh', 0.3], [7.5, 'toggle', 0.55], [8.15, 'toggle', 0.55], [9.3, 'pop2', 0.4], [10.55, 'click', 0.7], [10.62, 'ding', 0.45], [10.7, 'whoosh', 0.4]]} />
    </AbsoluteFill>
  );
};

// ── susunan babak + suara Andrew + musik (pelan saat bicara) ──────────────────
const SC = { s01: [0, 4.8], s02: [4.8, 13.8], s03: [13.8, 18.5], s04: [18.5, 29.9] };
const SPEECH: [number, number][] = [[0.3, 4.6], [5.0, 13.6], [13.8, 18.4], [18.8, 29.6]];
export const B1V5_SECONDS = 30;
export const Babak1V5: React.FC = () => {
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
      <Audio src={staticFile('audio/music-bed.wav')} volume={(fr) => { const s = fr / FPS; return SPEECH.some(([a, b]) => s > a && s < b) ? 0.055 : 0.14; }} />
    </AbsoluteFill>
  );
};
