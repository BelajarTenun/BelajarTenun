import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, glass, Mark, LOGO } from './brand';
import { Grain } from './fx';
import { Stick, Loom, POSES, poseAt, weaving, handsOf, THREAD, INK as SINK } from './stick';
import { FPS, F, cl, ez, Wd, Spoken, Key, Cam, Clip, WhipIn, WhipOut, S01, S02, S03, S04 } from './intro';

// Video showcase utuh (±3:28). Semua teks persis ucapan (Whisper), suara Andrew dibersihkan,
// figur stik dikoding, footage asli, tutor AI dari ElevenLabs.
const { ink: INK, font: FONT } = BRAND;
const W = (list: [string, number][], off = 0): Wd[] => list.map(([w, t]) => [w, t - off]);

// ── Teks bertahap per frasa (untuk narasi panjang) ───────────────────────────
const chunk = (words: Wd[], max = 7) => {
  const out: Wd[][] = []; let cur: Wd[] = [];
  words.forEach((w, i) => { cur.push(w); if (/[.,:?!]$/.test(w[0]) || cur.length >= max || i === words.length - 1) { out.push(cur); cur = []; } });
  return out;
};
const Sub: React.FC<{ words: Wd[]; place?: 'bottom' | 'right' | 'left'; size?: number; max?: number }> = ({ words, place = 'bottom', size = 44, max = 7 }) => {
  const t = useCurrentFrame() / FPS;
  const chunks = chunk(words, max);
  let idx = 0; chunks.forEach((c, i) => { if (t >= c[0][1] - 0.15) idx = i; });
  const c = chunks[idx];
  const box: React.CSSProperties = place === 'bottom'
    ? { left: 0, right: 0, bottom: 84, textAlign: 'center' }
    : place === 'right' ? { right: 70, top: 640, width: 700 } : { left: 70, top: 640, width: 700 };
  return (
    <div style={{ position: 'absolute', ...box }}>
      <span key={idx} style={{ display: 'inline-block', padding: place === 'bottom' ? '16px 30px' : '30px 36px', borderRadius: 26, ...glass(0.42), fontFamily: FONT, fontSize: place === 'bottom' ? size : size + 12, fontWeight: 600, letterSpacing: -1, lineHeight: 1.15, color: INK }}>
        <Spoken words={c} t={t} />
      </span>
    </div>
  );
};
const Chip: React.FC<{ label: string; at?: number }> = ({ label, at = 0.3 }) => {
  const t = useCurrentFrame() / FPS;
  const p = ez(t, at, at + 0.4);
  return <><Pops times={[at]} vol={0.35} /><div style={{ position: 'absolute', left: 64, top: 52, padding: '10px 18px', borderRadius: 999, ...glass(0.42), fontFamily: FONT, fontSize: 18, fontWeight: 700, letterSpacing: 3, color: INK, opacity: p, filter: `blur(${(1 - p) * 6}px)` }}>{label}</div></>;
};
const Pops: React.FC<{ times: number[]; vol?: number }> = ({ times, vol = 0.5 }) => (
  <>{times.map((s, i) => <Sequence key={i} from={Math.max(0, F(s))} durationInFrames={F(0.4)}><Audio src={staticFile('sfx/pop.wav')} volume={vol} /></Sequence>)}</>
);
const White: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ background: '#fff' }}>{children}</AbsoluteFill>;

// ── Adegan Andrew: reframe ke samping + teks per frasa di sisi kosong ─────────
const AndrewTalk: React.FC<{ src: string; from: number; words: Wd[]; side?: 'kiri' | 'kanan'; chip?: string; center?: boolean }> = ({ src, from, words, side = 'kanan', chip, center }) => {
  const dir = side === 'kanan' ? -1 : 1;
  const keys: Key[] = center ? [[0, 0, 0, 1], [9, 0, 0, 1.06]] : [[0, 0, 0, 1], [0.15, 0, 0, 1], [1.0, dir * 235, 20, 1.27], [20, dir * 250, 30, 1.31]];
  return (
    <AbsoluteFill>
      <Cam keys={keys}><Clip src={src} from={from} /></Cam>
      <Sub words={words} place={center ? 'bottom' : side === 'kanan' ? 'right' : 'left'} size={center ? 44 : 46} max={center ? 8 : 6} />
      {chip && <Chip label={chip} />}
    </AbsoluteFill>
  );
};

// ── 05 · grid video tenun (kartu animasi figur stik) di samping Andrew ─────────
const MiniWeaver: React.FC<{ t: number; i: number }> = ({ t, i }) => (
  <svg width="300" height="180" viewBox="0 0 300 180">
    <rect width="300" height="180" fill={['#f5efe2', '#f5efe2', '#f5efe2', '#f5efe2'][i % 4]} />
    <Stick x={70} y={160} s={0.55} pose={weaving(t, 0.9 + (i % 3) * 0.12, i)} t={t + i} hair={i % 2 ? 'bun' : 'short'} accent={THREAD} />
    <Loom x={108} y={160} s={0.55} t={t * (0.9 + (i % 3) * 0.12) + i} woven={0.4 + (i % 4) * 0.12} />
  </svg>
);
const REFS: [string, string][] = [['ref/silungkang.mp4', 'Silungkang · Sumbar'], ['ref/ntt.mp4', 'Nusa Tenggara Timur'], ['ref/sumut.mp4', 'Sumatera Utara'], ['ref/lombok.mp4', 'Songket Lombok'], ['ref/proses.mp4', 'Proses menenun'], ['ref/silungkang2.mp4', 'Silungkang · Sumbar']];
const S05: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Ilmu', 0.91], ['tenun', 1.55], ['sebenarnya', 1.97], ['sudah', 2.51], ['ada', 2.67], ['di', 3.01], ['mana-mana,', 3.17], ['ribuan', 3.93], ['video', 4.67], ['dan', 4.99], ['arsip', 5.23], ['yang', 6.03], ['dibagikan', 6.29], ['terbuka', 6.67], ['di', 7.09], ['internet,', 7.21], ['dan', 7.47], ['banyak', 7.89], ['tradisi.', 8.17]], 0.6);
  const keys: Key[] = [[0, 0, 0, 1], [0.15, 0, 0, 1], [1.0, -300, 20, 1.3], [9, -310, 26, 1.33]];
  return (
    <AbsoluteFill>
      <Cam keys={keys}><Clip src="footage/7635b-full.mp4" from={0.6} /></Cam>
      <div style={{ position: 'absolute', left: 1010, top: 110, width: 840, display: 'grid', gridTemplateColumns: 'repeat(2, 400px)', gap: 20 }}>
        {REFS.map(([src, l], i) => {
          const at = 3.4 + i * 0.22; // "ribuan video…"
          const p = ez(t, at, at + 0.45, Easing.out(Easing.back(1.6)));
          return (
            <div key={i} style={{ position: 'relative', width: 400, borderRadius: 18, overflow: 'hidden', ...glass(0.5), padding: 0, opacity: Math.min(1, p * 1.4), transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)` }}>
              <div style={{ width: 400, height: 225 }}><OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
              <div style={{ position: 'absolute', left: 10, bottom: 10, padding: '4px 10px', borderRadius: 8, background: 'rgba(20,28,58,0.85)', color: '#fff', fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>{l}</div>
              <div style={{ position: 'absolute', right: 10, bottom: 10, width: 26, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '10px solid #141c3a', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
      <Pops times={REFS.map((_, i) => 3.4 + i * 0.22)} />
      <Sub words={words} />
    </AbsoluteFill>
  );
};

// ── 06 · AI memecah gerakan: penenun + titik pose + kotak deteksi + garis waktu ──
const STAGES = ['Mengenal alat', 'Membuka mulut lungsi', 'Memasukkan pakan', 'Merapatkan pakan', 'Mengulang baris'];
const S06: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['AI', 0.14], ['memecah', 0.88], ['setiap', 1.36], ['gerakan', 1.7], ['jadi', 2.12], ['setiap', 2.32], ['tahap,', 2.68], ['istilah,', 3.62], ['dan', 4.12], ['kesalahan', 4.46], ['yang', 5.1], ['sering', 5.2], ['terjadi.', 5.38], ['Lalu', 6.56], ['menggabungkan', 6.9], ['pola', 7.58], ['dari', 8.04], ['banyak', 8.26], ['penenun', 8.46], ['menjadi', 8.96], ['satu.', 9.52]]);
  const pose = weaving(t, 0.85);
  const X = 470, Y = 690, S = 1.6;
  const h = handsOf(X, Y, S, pose);
  const scan = ez(t, 0.6, 1.3);
  const stageN = Math.min(4, Math.floor(interpolate(t, [2.2, 3.2], [0, 4.99], cl)));
  const merge = ez(t, 6.7, 8.2, Easing.inOut(Easing.cubic));
  const box = (c: [number, number], label: string, at: number, w = 120) => {
    const p = ez(t, at, at + 0.3);
    return (
      <g opacity={p}>
        <rect x={c[0] - w / 2} y={c[1] - w / 2} width={w} height={w} rx={14} fill="none" stroke={THREAD} strokeWidth={3} strokeDasharray="22 10" />
        <text x={c[0] - w / 2} y={c[1] - w / 2 - 12} fontFamily={FONT} fontSize={22} fontWeight={700} fill={THREAD}>{label}</text>
      </g>
    );
  };
  return (
    <White>
      {/* kartu video kiri */}
      <div style={{ position: 'absolute', left: 90, top: 110, width: 1040, height: 700, borderRadius: 28, overflow: 'hidden', background: '#f5efe2', border: '1px solid rgba(20,28,58,0.12)', transform: `scale(${1 - merge * 0.55}) translate(${merge * 420}px, ${merge * 120}px)`, transformOrigin: '50% 50%' }}>
        <svg width="1040" height="700" style={{ position: 'absolute', inset: 0 }}>
          <g transform="translate(-90 -110)">
            <Stick x={X} y={Y} s={S} pose={pose} t={t} hair="bun" accent={THREAD} />
            <Loom x={X + 70 * S} y={Y} s={S} t={t * 0.85} woven={0.6} />
            {/* titik pose (keypoints) */}
            {[h.head, h.L, h.R, h.hip].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={9} fill="#fff" stroke={THREAD} strokeWidth={4} opacity={scan} />)}
            {box(h.R, 'TANGAN', 1.0, 130)}
            {box([X + 70 * S + 150, Y - 150], 'LUNGSI', 1.3, 170)}
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 700 * scan - 2, height: 2, background: THREAD, opacity: scan < 1 ? 0.8 : 0 }} />
      </div>
      {/* garis waktu tahap */}
      <div style={{ position: 'absolute', left: 90, top: 840, width: 1040, display: 'flex', gap: 10, opacity: 1 - merge }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ flex: 1, opacity: ez(t, 2.2 + i * 0.2, 2.5 + i * 0.2) }}>
            <div style={{ height: 8, borderRadius: 4, background: i <= stageN ? THREAD : '#f5efe2' }} />
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: INK, marginTop: 10 }}>{i + 1}. {s}</div>
          </div>
        ))}
      </div>
      {/* kartu kanan: tahap, istilah, kesalahan */}
      <div style={{ position: 'absolute', left: 1200, top: 150, width: 600, display: 'flex', flexDirection: 'column', gap: 22, opacity: 1 - merge }}>
        {[['TAHAP', '2 · Membuka mulut lungsi', 2.4], ['ISTILAH', 'lungsi · pakan · belida', 3.5], ['KESALAHAN UMUM', 'Pakan terlalu kencang', 4.4]].map(([k, v, at]) => {
          const p = ez(t, at as number, (at as number) + 0.4, Easing.out(Easing.back(1.5)));
          return (
            <div key={k as string} style={{ padding: '22px 26px', borderRadius: 22, background: '#fff', border: '1px solid rgba(20,28,58,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.06)', opacity: Math.min(1, p * 1.3), transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'rgba(20,28,58,0.55)' }}>{k}</div>
              <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 600, letterSpacing: -0.8, color: INK, marginTop: 6 }}>{v}</div>
            </div>
          );
        })}
      </div>
      <Pops times={[1.0, 1.3, 2.4, 3.5, 4.4, 7.8]} />
      {/* "banyak penenun menjadi satu": kartu-kartu kecil menyatu ke modul */}
      {merge > 0 && (
        <>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            const r = 420 * (1 - merge);
            return (
              <div key={i} style={{ position: 'absolute', left: 960 + Math.cos(a) * r - 110, top: 470 + Math.sin(a) * r * 0.6 - 66, width: 220, height: 132, borderRadius: 16, overflow: 'hidden', opacity: (1 - merge) * 0.9 + 0.1, transform: `scale(${1 - merge * 0.6})`, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                <OffthreadVideo src={staticFile(REFS[i][0])} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 760, top: 380, width: 400, padding: '28px 30px', borderRadius: 26, background: '#fff', border: `2px solid ${THREAD}`, boxShadow: '0 30px 70px rgba(0,0,0,0.1)', opacity: ez(t, 7.8, 8.4), transform: `scale(${0.8 + ez(t, 7.8, 8.4, Easing.out(Easing.back(1.6))) * 0.2})`, fontFamily: FONT }}>
            <Mark size={36} />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.8, color: INK, marginTop: 14 }}>Modul dasar menenun</div>
            <div style={{ fontSize: 20, color: 'rgba(20,28,58,0.55)', marginTop: 6 }}>5 tahap · digabung dari banyak penenun</div>
          </div>
        </>
      )}
      <Sub words={words} />
    </White>
  );
};

// ── 07 · validasi: penenun memeriksa di HP, Usulan AI → Diubah → Tervalidasi ──
const S07: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Tapi', 0.14], ['AI', 0.7], ['bisa', 1.06], ['saja', 2.1], ['salah.', 2.3], ['Untuk', 2.56], ['menjaga', 3.56], ['kualitas,', 4.04], ['setiap', 4.74], ['tahap', 5.88], ['diperiksa', 6.52], ['penenun', 7.04], ['sebelum', 7.58], ['diajarkan.', 8.34]]);
  const state = t < 3.4 ? 0 : t < 6.3 ? 1 : 2;
  const pose = poseAt([[0, POSES.phone], [5.6, POSES.phone], [6.4, POSES.thumbs], [9, POSES.thumbs]], t);
  const sitPose = { ...pose, legL: POSES.weaveA.legL, legR: POSES.weaveA.legR, sit: 1 };
  const labels = [['USULAN AI', '#141c3a'], ['DIUBAH PENENUN', '#d4b866'], ['TERVALIDASI PENENUN', '#141c3a']];
  const pop = spring({ frame: Math.max(0, useCurrentFrame() - F(state === 0 ? 0.4 : state === 1 ? 3.4 : 6.3)), fps: FPS, config: { damping: 12, stiffness: 180 } });
  const text = state === 0 ? 'Angkat belida agar mulut lungsi terbuka lebar.' : 'Angkat belida perlahan agar mulut lungsi terbuka.';
  return (
    <White>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <Stick x={460} y={800} s={1.8} pose={sitPose} t={t} hair="bun" accent={THREAD} prop="phone" />
      </svg>
      <div style={{ position: 'absolute', left: 860, top: 230, width: 900, padding: '40px 44px', borderRadius: 30, background: '#fff', border: '1px solid rgba(20,28,58,0.12)', boxShadow: '0 30px 80px rgba(0,0,0,0.08)', fontFamily: FONT }}>
        <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 999, background: labels[state][1], color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 2, transform: `scale(${0.85 + pop * 0.15})` }}>{labels[state][0]}</div>
        <div style={{ fontSize: 22, color: 'rgba(20,28,58,0.55)', marginTop: 22, fontWeight: 600 }}>Tahap 2 · Membuka mulut lungsi</div>
        <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.18, color: INK, marginTop: 10 }}>
          {text}{state === 1 && <span style={{ opacity: Math.floor(t * 3) % 2 }}>|</span>}
        </div>
        <div style={{ fontSize: 20, color: state === 2 ? '#141c3a' : 'rgba(20,28,58,0.55)', fontWeight: 700, marginTop: 22, opacity: state === 2 ? 1 : 0.0 }}>✓ Diperiksa penenun</div>
      </div>
      <Chip label="KUALITAS" at={4.0} />
      <Pops times={[0.4, 3.4, 6.3]} />
      <Sub words={words} />
    </White>
  );
};

// ── Babak 3 · belajar: multikamera + HP kaca dengan transkrip per kata ───────
type Line = { me: boolean; words: Wd[] }; // waktu = detik dalam babak ini
const PhoneT: React.FC<{ lines: Line[]; stage: string; speaking: boolean; visible: number; tilt?: number }> = ({ lines, stage, speaking, visible, tilt = 0 }) => {
  const t = useCurrentFrame() / FPS;
  const shown = lines.filter((l) => t >= l.words[0][1] - 0.05);
  return (
    <div style={{ position: 'absolute', right: 96, top: 92, width: 440, height: 896, borderRadius: 62, padding: 10, ...glass(0.3), opacity: visible, transform: `perspective(1600px) translateX(${(1 - visible) * 90}px) rotateY(${-8 + tilt}deg) rotateX(2deg)`, filter: `blur(${(1 - visible) * 10}px)` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 52, overflow: 'hidden', background: '#f5efe2', fontFamily: FONT, color: INK }}>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark size={26} speaking={speaking} />
          <div style={{ fontFamily: LOGO.serif, fontSize: 23, color: LOGO.navy }}>BelajarTenun</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#141c3a' }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#d4b866' }} />Kacamata</div>
        </div>
        <div style={{ position: 'absolute', left: 28, top: 100, fontSize: 28, fontWeight: 650, letterSpacing: -0.8 }}>{stage}</div>
        <div style={{ position: 'absolute', left: 20, right: 20, top: 160, bottom: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, overflow: 'hidden' }}>
          {shown.map((b, i) => {
            const age = (t - b.words[0][1]) * FPS;
            const p = spring({ frame: age, fps: FPS, config: { damping: 20, stiffness: 170, mass: 0.7 } });
            return (
              <div key={i} style={{ alignSelf: b.me ? 'flex-end' : 'flex-start', maxWidth: '86%', transform: `translateY(${(1 - p) * 12}px)`, opacity: Math.min(1, p * 1.5), padding: '12px 16px', borderRadius: 22, fontSize: 19, lineHeight: 1.36, background: b.me ? INK : '#fff', color: b.me ? '#fff' : INK, borderBottomRightRadius: b.me ? 6 : 22, borderBottomLeftRadius: b.me ? 22 : 6, boxShadow: b.me ? 'none' : '0 4px 16px rgba(0,0,0,0.05)' }}>
                {!b.me && <div style={{ marginBottom: 6 }}><Mark size={15} speaking={speaking && i === shown.length - 1} /></div>}
                {b.words.map(([w, at], k) => (t >= at - 0.05 ? <span key={k}>{w} </span> : null))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Kata per kata tutor (dari words.json), digeser ke waktu mulai.
const TW: Record<string, [string, number][]> = {
  T1: [['Halo,', 0], ['kita', 1.04], ['mulai', 1.26], ['dari', 1.72], ['mengenal', 1.92], ['alat', 2.34], ['dulu', 2.58], ['ya.', 2.86], ['Benang', 3.58], ['yang', 3.88], ['tegak', 4.0], ['ini', 4.38], ['namanya', 4.64], ['lungsi.', 5.2], ['Angkat', 6.4], ['selang-seling', 6.82], ['supaya', 7.66], ['celahnya', 8.38], ['terbuka.', 8.8]],
  T2: [['Bagus!', 0], ['Mulut', 1.22], ['lungsinya', 1.5], ['sudah', 1.88], ['terbuka.', 2.06], ['Sekarang,', 3.18], ['masukkan', 4.08], ['benang', 4.54], ['pakan', 4.86], ['dari', 5.26], ['kiri', 5.52], ['ke', 6.02], ['kanan,', 6.22], ['lewat', 6.98], ['celah', 7.32], ['itu.', 7.6]],
  T3: [['Benang', 0], ['ini', 0.42], ['namanya', 0.76], ['pakan.', 1.26], ['Dan', 2.1], ['tahu', 2.4], ['nggak,', 2.6], ['setiap', 3.2], ['tradisi', 3.58], ['punya', 4.18], ['sebutannya', 4.52], ['sendiri', 4.98], ['untuknya.', 5.4]],
  T4: [['Pelan-pelan,', 0.3], ['pakannya', 1.94], ['terlalu', 2.44], ['kencang,', 2.84], ['jadi', 3.66], ['pinggirnya', 3.92], ['menyempit.', 4.38], ['Longgarkan', 5.24], ['sedikit', 5.8], ['ya.', 6.16]],
  T5: [['Nah,', 0], ['sudah', 1.28], ['rapi.', 1.7]],
  T6: [['Supaya', 0], ['kain', 0.58], ['padat', 0.92], ['dan', 1.9], ['motifnya', 2.8], ['tidak', 3.36], ['bergeser.', 3.54]],
  T7: [['Hmm,', 0], ['itu', 1.12], ['belum', 1.26], ['ada', 1.46], ['di', 1.84], ['modul', 2.02], ['yang', 2.34], ['divalidasi.', 2.42], ['Tapi', 3.4], ['pertanyaanmu', 4.0], ['sudah', 4.88], ['kucatat', 5.08], ['untuk', 5.64], ['penenun.', 5.78]],
};
const DUR: Record<string, number> = { T1: 9.64, T2: 8.05, T3: 6.35, T4: 6.61, T5: 3.08, T6: 4.52, T7: 6.69 };
const at = (key: string, start: number): Wd[] => TW[key].map(([w, s]) => [w, start + s]);

// Segmen babak 3 (detik lokal). v = video, a = audio Andrew, tutor = kode suara tutor.
type Seg = { a0: number; dur: number; v?: { src: string; from: number; vertical?: boolean; keys?: Key[] }; andrew?: { src: string; from: number }; tutor?: string; phone: boolean; stage: string; mark?: 'koreksi' | 'benar' | 'tanya' | 'catat' | 'istilah' };
const SEGS: Seg[] = [];
{
  let c = 0;
  const add = (s: Omit<Seg, 'a0'>) => { SEGS.push({ ...s, a0: c }); c += s.dur; };
  add({ dur: 6.4, v: { src: 'footage/7648-full.mp4', from: 0, keys: [[0, 0, 0, 1.0], [6.4, 0, 0, 1.06]] }, andrew: { src: 'audio/7648-clean.wav', from: 0 }, phone: false, stage: 'Mengenal alat' });
  add({ dur: 10.2, v: { src: 'footage/7647-full.mp4', from: 8.9, keys: [[0, 0, 0, 1.12], [10, 0, 0, 1.0]] }, tutor: 'T1', phone: true, stage: 'Mengenal alat' });
  add({ dur: 2.8, v: { src: 'footage/7649-full.mp4', from: 2.1 }, andrew: { src: 'audio/7649-clean.wav', from: 2.1 }, phone: false, stage: 'Mengenal alat' });
  add({ dur: 8.5, v: { src: 'footage/7647-full.mp4', from: 18.6, keys: [[0, 0, 0, 1.0], [8.5, -40, 0, 1.1]] }, tutor: 'T2', phone: true, stage: 'Memasukkan pakan' });
  add({ dur: 6.9, v: { src: 'footage/7653-full.mp4', from: 21, keys: [[0, 0, 0, 1.15], [6.9, 0, 0, 1.0]] }, tutor: 'T3', phone: true, stage: 'Memasukkan pakan', mark: 'istilah' });
  add({ dur: 7.0, v: { src: 'footage/7647-full.mp4', from: 21.5 }, tutor: 'T4', phone: true, stage: 'Merapatkan pakan', mark: 'koreksi' });
  add({ dur: 3.7, v: { src: 'footage/7647-full.mp4', from: 24.6 }, andrew: { src: 'audio/7647-clean.wav', from: 24.6 }, phone: true, stage: 'Merapatkan pakan', mark: 'koreksi' });
  add({ dur: 3.4, v: { src: 'footage/7647-full.mp4', from: 28.3 }, tutor: 'T5', phone: true, stage: 'Merapatkan pakan', mark: 'benar' });
  add({ dur: 2.4, v: { src: 'footage/7650-land.mp4', from: 22.8, keys: [[0, 0, 0, 1.1], [2.4, 0, 0, 1.0]] }, andrew: { src: 'audio/7650-clean.wav', from: 22.8 }, phone: true, stage: 'Merapatkan pakan', mark: 'tanya' });
  add({ dur: 4.9, v: { src: 'footage/7650-land.mp4', from: 25.2 }, tutor: 'T6', phone: true, stage: 'Merapatkan pakan' });
  add({ dur: 2.5, v: { src: 'footage/7650-land.mp4', from: 33.8, keys: [[0, 0, 0, 1.1], [2.5, 0, 0, 1.0]] }, andrew: { src: 'audio/7650-clean.wav', from: 33.8 }, phone: true, stage: 'Merapatkan pakan', mark: 'tanya' });
  add({ dur: 7.1, v: { src: 'footage/7650-land.mp4', from: 36.4 }, tutor: 'T7', phone: true, stage: 'Merapatkan pakan', mark: 'catat' });
}
const TUT0 = 0.3; // tutor mulai 0,3 dtk setelah segmen (setelah earcon)
const segAt = (i: number) => SEGS[i].a0;
export const LEARN_SECONDS = SEGS[SEGS.length - 1].a0 + SEGS[SEGS.length - 1].dur;
const LINES: Line[] = [
  { me: true, words: W([['Halo', 0.4], ['BelajarTenun,', 0.9], ['hari', 1.72], ['ini', 2.88], ['aku', 3.16], ['punya', 3.32], ['kanvasnya.', 3.54], ['Langkah', 4.0], ['pertama', 5.16], ['aku', 5.66], ['harus', 5.74], ['apa?', 5.82]], -segAt(0)) },
  { me: false, words: at('T1', segAt(1) + TUT0) },
  { me: true, words: W([['Setelah', 2.54], ['nyampe', 3.24], ['sini,', 3.5], ['aku', 3.76], ['harus', 4.02], ['apa?', 4.2]], 2.1 - segAt(2)) },
  { me: false, words: at('T2', segAt(3) + TUT0) },
  { me: false, words: at('T3', segAt(4) + TUT0) },
  { me: false, words: at('T4', segAt(5) + TUT0) },
  { me: true, words: W([['Oh,', 24.88], ['salah', 25.14], ['ya.', 25.38], ['Ke', 27.76], ['sini.', 27.86]], 24.6 - segAt(6)) },
  { me: false, words: at('T5', segAt(7) + TUT0) },
  { me: true, words: W([['Kenapa', 23.1], ['harus', 23.62], ['dirapatkan', 23.9], ['setiap', 24.4], ['baris?', 24.66]], 22.8 - segAt(8)) },
  { me: false, words: at('T6', segAt(9) + TUT0) },
  { me: true, words: W([['Kalau', 34.09], ['benangnya', 34.77], ['putus', 35.21], ['gimana?', 35.53]], 33.8 - segAt(10)) },
  { me: false, words: at('T7', segAt(11) + TUT0) },
];

export const Learn: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const i = Math.max(0, SEGS.findIndex((s) => t >= s.a0 && t < s.a0 + s.dur));
  const seg = SEGS[i];
  const prevPhone = i > 0 && SEGS[i - 1].phone;
  const vis = seg.phone ? (prevPhone ? 1 : ez(t, seg.a0, seg.a0 + 0.45)) : 0;
  const speaking = !!seg.tutor && t > seg.a0 + TUT0 && t < seg.a0 + TUT0 + DUR[seg.tutor];
  const tl = t - seg.a0;
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      {SEGS.map((s, k) => (
        <Sequence key={k} from={F(s.a0)} durationInFrames={F(s.dur)}>
          {s.v && (s.v.vertical ? (
            <AbsoluteFill>
              <AbsoluteFill style={{ filter: 'blur(40px) brightness(1.05)', transform: 'scale(1.3)' }}><Clip src={s.v.src} from={s.v.from} /></AbsoluteFill>
              <div style={{ position: 'absolute', left: 300, top: 0, width: 608, height: 1080 }}><OffthreadVideo src={staticFile(s.v.src)} startFrom={F(s.v.from)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
            </AbsoluteFill>
          ) : (
            k > 0 && SEGS[k - 1].v?.src !== s.v.src ? <WhipIn dir={k % 2 ? 1 : -1}><Cam keys={s.v.keys ?? [[0, 0, 0, 1]]}><Clip src={s.v.src} from={s.v.from} /></Cam></WhipIn> : <Cam keys={s.v.keys ?? [[0, 0, 0, 1]]}><Clip src={s.v.src} from={s.v.from} /></Cam>
          ))}
          {s.andrew && <Audio src={staticFile(s.andrew.src)} startFrom={F(s.andrew.from)} />}
          {s.tutor && <><Audio src={staticFile('sfx/earcon.wav')} volume={0.45} /><Sequence from={F(TUT0)}><Audio src={staticFile(`tutor/${s.tutor}.mp3`)} /></Sequence></>}
        </Sequence>
      ))}
      {/* sorotan di POV */}
      {seg.mark === 'koreksi' && <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}><circle cx={560} cy={760} r={130 + Math.sin(tl * 5) * 6} fill="none" stroke="#d4b866" strokeWidth={5} opacity={ez(tl, 0, 0.3)} /></svg>}
      {seg.mark === 'benar' && <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}><circle cx={560} cy={760} r={130} fill="none" stroke="#d4b866" strokeWidth={5} opacity={1 - ez(tl, 2.2, 3.2)} /><path d="M520 760 l30 30 l60 -70" fill="none" stroke="#d4b866" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="160" strokeDashoffset={160 * (1 - ez(tl, 0.1, 0.6))} /></svg>}
      {seg.mark === 'istilah' && (
        <div style={{ position: 'absolute', left: 120, top: 150, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['PAKAN', 'benang yang masuk mendatar'], ['SEKOCI', 'teropong · torak'], ['PEDANG', 'belida'], ['SISIR', 'suri']].map(([k, v], j) => {
            const p = ez(tl, 0.4 + j * 0.9, 0.8 + j * 0.9, Easing.out(Easing.back(1.4)));
            return <div key={k} style={{ padding: '16px 22px', borderRadius: 20, ...glass(0.5), opacity: Math.min(1, p * 1.3), transform: `translateX(${(1 - p) * -50}px)`, fontFamily: FONT, color: INK }}><div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: 'rgba(20,28,58,0.55)' }}>{k}</div><div style={{ fontSize: j === 0 ? 30 : 36, fontWeight: 650 }}>{v}</div></div>;
          })}
        </div>
      )}
      {seg.mark === 'catat' && (
        <div style={{ position: 'absolute', left: 340, top: 420, padding: '22px 26px', borderRadius: 22, ...glass(0.55), fontFamily: FONT, color: INK, opacity: ez(tl, 3.6, 4.1), transform: `scale(${0.85 + ez(tl, 3.6, 4.1, Easing.out(Easing.back(1.6))) * 0.15})` }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: 'rgba(20,28,58,0.55)' }}>TIDAK MENGARANG JAWABAN</div>
          <div style={{ fontSize: 30, fontWeight: 650, marginTop: 6 }}>Dicatat untuk penenun · +1</div>
        </div>
      )}
      <PhoneT lines={LINES} stage={seg.stage} speaking={speaking} visible={vis} tilt={Math.sin(t * 0.4) * 2} />
      {i === 0 && <Chip label="ADAPTIF" at={1} />}
      {seg.mark === 'tanya' && <Chip label="INTERAKTIF" at={seg.a0 + 0.2} />}
      {seg.mark === 'istilah' && <Chip label="BAHASA DAERAH" at={seg.a0 + 0.2} />}
    </AbsoluteFill>
  );
};

// ── 16 · catatan belajar: anak muda dengan HP, senang di akhir ─────────────────
const S16: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Setiap', 0.18], ['sesi', 0.86], ['meninggalkan', 1.24], ['catatan:', 2.06], ['apa', 2.7], ['yang', 3.14], ['sudah', 3.28], ['bisa,', 3.46], ['apa', 4.52], ['yang', 4.76], ['membingungkan.', 4.9]]);
  const pose = poseAt([[0, POSES.phone], [3.4, POSES.phone], [3.9, POSES.cheer], [4.6, POSES.cheer], [5.2, POSES.phone]], t);
  const rows = [['5/5', 'tahap selesai', 1.2], ['1', 'koreksi', 2.0], ['1', 'pertanyaan untuk penenun', 4.5]];
  return (
    <White>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}><Stick x={520} y={880} s={2.1} pose={pose} t={t} hair="short" prop={t > 3.4 && t < 5 ? 'none' : 'phone'} /></svg>
      <div style={{ position: 'absolute', left: 980, top: 200, width: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {rows.map(([n, l, a]) => {
          const p = ez(t, a as number, (a as number) + 0.4, Easing.out(Easing.back(1.6)));
          return <div key={l as string} style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '26px 32px', borderRadius: 26, background: '#fff', border: '1px solid rgba(20,28,58,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.06)', opacity: Math.min(1, p * 1.3), transform: `translateY(${(1 - p) * 30}px)`, fontFamily: FONT }}><span style={{ fontSize: 64, fontWeight: 700, color: THREAD, letterSpacing: -2 }}>{n}</span><span style={{ fontSize: 30, fontWeight: 600, color: INK }}>{l}</span></div>;
        })}
      </div>
      <Pops times={[1.2, 2.0, 4.5]} />
      <Sub words={words} />
    </White>
  );
};

// ── 17 · progres: batang tingkat selesai, tahap tersulit menyala ───────────────
const S17: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Dari', 0.0], ['situ', 0.12], ['kami', 0.42], ['bisa', 0.7], ['mengukur', 0.88], ['efektivitasnya', 1.26], ['dan', 2.14], ['memperbaiki', 2.46], ['tahap', 2.88], ['yang', 3.36], ['paling', 3.52], ['sulit.', 3.76]]);
  const data = [92, 64, 78, 51, 70];
  return (
    <White>
      <div style={{ position: 'absolute', left: 200, top: 120, fontFamily: FONT, fontSize: 56, fontWeight: 650, letterSpacing: -1.5, color: INK }}>Tingkat selesai per tahap</div>
      <div style={{ position: 'absolute', left: 200, top: 196, fontFamily: FONT, fontSize: 18, color: 'rgba(20,28,58,0.55)' }}>Contoh tampilan halaman Progres</div>
      {data.map((v, i) => {
        const h = ez(t, 0.3 + i * 0.12, 1.1 + i * 0.12, Easing.out(Easing.cubic)) * v * 5.2;
        const hi = i === 3 && t > 2.6;
        return (
          <div key={i} style={{ position: 'absolute', left: 240 + i * 300, bottom: 250, width: 170, fontFamily: FONT }}>
            <div style={{ textAlign: 'center', fontSize: 30, fontWeight: 700, color: hi ? THREAD : INK, marginBottom: 10 }}>{Math.round(h / 5.2)}%</div>
            <div style={{ height: h, borderRadius: 14, background: hi ? THREAD : '#f5efe2' }} />
            <div style={{ position: 'absolute', top: '100%', marginTop: 16, width: 240, left: -35, textAlign: 'center', fontSize: 20, fontWeight: 600, color: INK }}>{STAGES[i]}</div>
          </div>
        );
      })}
      <Chip label="EFEKTIVITAS" at={1.2} />
      <Sub words={words} />
    </White>
  );
};

// ── 18 · arsip: penenun & anak muda memegang kain, kartu arsip ────────────────
const S18: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Pengetahuan', 0.0], ['yang', 0.76], ['sudah', 0.98], ['divalidasi', 1.24], ['kami', 1.88], ['buka', 2.4], ['sebagai', 2.88], ['arsip', 3.2], ['tenun', 3.76], ['publik,', 3.98], ['supaya', 4.88], ['terus', 5.42], ['lestari.', 5.78]]);
  const unfold = ez(t, 0.4, 1.6, Easing.inOut(Easing.cubic));
  return (
    <White>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <Stick x={330} y={860} s={1.8} pose={POSES.holdR} t={t} hair="bun" accent={THREAD} />
        <Stick x={800} y={860} s={1.8} pose={POSES.holdL} t={t + 1} hair="short" />
        {/* kain terbentang */}
        <g transform={`translate(565 640) scale(${0.2 + unfold * 0.8} 1)`}>
          <rect x={-150} y={-60} width={300} height={190} rx={8} fill={THREAD} />
          {Array.from({ length: 6 }, (_, k) => <line key={k} x1={-150} x2={150} y1={-40 + k * 30} y2={-40 + k * 30} stroke="#fff" strokeWidth={3} opacity={0.35} />)}
          <path d="M-60 35 L0 -15 L60 35 L0 85 Z" fill="none" stroke="#fff" strokeWidth={5} opacity={0.8} />
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 1080, top: 150 - ez(t, 1, 6.6) * 120, width: 700, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {['Membuka mulut lungsi', 'Istilah: pakan', 'Kesalahan: pinggir menyempit', 'Merapatkan pakan', 'Istilah: belida'].map((s, i) => {
          const p = ez(t, 1.2 + i * 0.3, 1.6 + i * 0.3, Easing.out(Easing.back(1.4)));
          return <div key={s} style={{ padding: '22px 26px', borderRadius: 22, background: '#fff', border: '1px solid rgba(20,28,58,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.06)', opacity: Math.min(1, p * 1.3), transform: `translateX(${(1 - p) * 50}px)`, fontFamily: FONT }}><div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: '#141c3a' }}>✓ TERVALIDASI</div><div style={{ fontSize: 30, fontWeight: 650, color: INK, marginTop: 4 }}>{s}</div><div style={{ fontSize: 16, color: 'rgba(20,28,58,0.55)', marginTop: 4 }}>Sumber: [pembuat] · CC BY · JSON · CSV</div></div>;
        })}
      </div>
      <Chip label="PELESTARIAN" at={3.0} />
      <Pops times={[1.2, 1.5, 1.8, 2.1, 2.4]} vol={0.35} />
      <Sub words={words} />
    </White>
  );
};

// ── 19 · perbandingan di samping Andrew (Andrew ke kanan) ─────────────────────
const S19: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Video', 0.4], ['tutorial', 1.06], ['tidak', 1.48], ['bisa', 2.2], ['melihat', 2.54], ['kesalahan', 2.82], ['kita.', 3.22], ['Kelas', 4.38], ['tatap', 4.9], ['muka', 5.12], ['terbatas', 5.42], ['tempat', 6.1], ['dan', 6.46], ['waktunya.', 6.58], ['BelajarTenun', 7.58], ['menggabungkan', 8.22], ['keduanya:', 8.94], ['melihat', 9.98], ['dari', 10.52], ['mata', 10.86], ['murid,', 11.06], ['mengoreksi', 11.42], ['saat', 12.24], ['itu', 12.46], ['juga,', 12.62], ['dan', 13.04], ['tetap', 13.64], ['setia', 14.14], ['pada', 14.82], ['ilmu', 15.02], ['penenunnya.', 15.34]], 0.2);
  const rows: [string, string[], number][] = [['Melihat kesalahan murid', ['—', '●', '●'], 0.6], ['Kapan & di mana saja', ['●', '—', '●'], 4.0], ['Isi divalidasi penenun', ['?', '●', '●'], 9.6], ['Tangan tetap bebas', ['—', '●', '●'], 11.0], ['Istilah bahasa daerah', ['jarang', '●', '●'], 13.5]];
  return (
    <AbsoluteFill>
      <Cam keys={[[0, 0, 0, 1], [0.15, 0, 0, 1], [1.0, 350, 20, 1.38], [17, 360, 26, 1.4]]}><Clip src="footage/7639new-full.mp4" from={0.2} /></Cam>
      <div style={{ position: 'absolute', left: 60, top: 120, width: 880, padding: '30px 32px', borderRadius: 30, ...glass(0.5), fontFamily: FONT, color: INK, opacity: ez(t, 0.4, 0.9) }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.1fr', fontSize: 18, fontWeight: 700, color: 'rgba(20,28,58,0.55)', paddingBottom: 14, borderBottom: '2px solid rgba(20,28,58,0.12)' }}>
          <div /><div style={{ textAlign: 'center' }}>Video tutorial</div><div style={{ textAlign: 'center' }}>Kelas tatap muka</div><div style={{ textAlign: 'center', color: THREAD }}>BelajarTenun</div>
        </div>
        {rows.map(([l, v, a]) => (
          <div key={l} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1.1fr', fontSize: 26, fontWeight: 600, padding: '18px 0', borderBottom: '1px solid rgba(20,28,58,0.12)', opacity: ez(t, a, a + 0.35) }}>
            <div>{l}</div>
            {v.map((x, k) => <div key={k} style={{ textAlign: 'center', fontWeight: 800, color: x === '●' ? (k === 2 ? THREAD : INK) : 'rgba(20,28,58,0.55)', transform: `scale(${k === 2 ? 0.7 + ez(t, a + 0.15, a + 0.5, Easing.out(Easing.back(2))) * 0.3 : 1})` }}>{x}</div>)}
          </div>
        ))}
      </div>
      <Pops times={rows.map((r) => r[2])} />
      <Sub words={words} max={8} />
    </AbsoluteFill>
  );
};

// ── 20 · bukti uji: angka (isi dengan data asli) ──────────────────────────────
const S20: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Kami', 0.0], ['menguji', 0.52], ['deteksi', 1.36], ['tahapnya', 1.62], ['dengan', 2.12], ['berbagai', 2.46], ['video', 2.88], ['tenun', 3.28], ['berlabel', 3.72], ['dari', 4.14], ['berbagai', 4.86], ['tradisi.', 5.22]]);
  const cards = [['128', 'video tenun diuji', 1.0, 128, 0], ['87%', 'akurasi deteksi tahap', 2.6, 87, 0], ['1,8 dtk', 'waktu respons tutor', 4.0, 1.8, 1]] as const;
  return (
    <White>
      <div style={{ position: 'absolute', top: 170, width: '100%', textAlign: 'center', fontFamily: FONT, fontSize: 56, fontWeight: 650, letterSpacing: -1.5, color: INK }}>Hasil uji</div>
      <div style={{ position: 'absolute', top: 340, width: '100%', display: 'flex', justifyContent: 'center', gap: 40 }}>
        {cards.map(([n, l, a, v, dec]) => {
          const p = ez(t, a as number, (a as number) + 0.45, Easing.out(Easing.back(1.7)));
          const c = (v as number) * ez(t, a as number, (a as number) + 1.1, Easing.out(Easing.cubic));
          const shown = (dec ? c.toFixed(1).replace('.', ',') : Math.round(c).toString()) + (String(n).includes('%') ? '%' : String(n).includes('dtk') ? ' dtk' : '');
          return <div key={l as string} style={{ width: 420, height: 300, borderRadius: 30, background: '#fff', border: '1px solid rgba(20,28,58,0.12)', boxShadow: '0 24px 60px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, p * 1.3), transform: `translateY(${(1 - p) * 40}px)`, fontFamily: FONT }}><div style={{ fontSize: 96, fontWeight: 700, color: INK, letterSpacing: -3 }}>{shown}</div><div style={{ width: 60, height: 5, borderRadius: 3, background: THREAD, margin: '6px 0 12px' }} /><div style={{ fontSize: 26, fontWeight: 600, color: 'rgba(20,28,58,0.55)' }}>{l}</div></div>;
        })}
      </div>
      <div style={{ position: 'absolute', top: 690, width: '100%', textAlign: 'center', fontFamily: FONT, fontSize: 20, color: 'rgba(20,28,58,0.5)' }}>Angka ilustrasi (mockup)</div>
      <Pops times={[1.0, 2.6, 4.0]} />
      <Sub words={words} />
    </White>
  );
};

// ── 22 · model bisnis di samping Andrew ───────────────────────────────────────
const S22: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Kami', 0.62], ['mulai', 1.16], ['dari', 1.56], ['sanggar', 2.0], ['dan', 2.54], ['sekolah.', 2.96], ['Setiap', 3.74], ['modul', 4.54], ['yang', 5.02], ['divalidasi', 5.52], ['memberikan', 6.18], ['penghasilan', 6.76], ['kepada', 7.48], ['para', 7.82], ['penenun,', 8.22], ['dan', 9.04], ['setiap', 9.34], ['murid', 9.72], ['baru', 10.0], ['dapat', 10.32], ['memperluas', 10.6], ['ilmu', 11.26], ['mereka.', 11.54]], 0.4);
  const col = (title: string, items: string[], a: number) => (
    <div style={{ width: 250 }}>
      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: 2, color: 'rgba(20,28,58,0.55)', opacity: ez(t, a, a + 0.3) }}>{title}</div>
      {items.map((s, i) => { const p = ez(t, a + 0.2 + i * 0.15, a + 0.55 + i * 0.15, Easing.out(Easing.back(1.5))); return <div key={s} style={{ marginTop: 12, padding: '14px 16px', borderRadius: 16, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontFamily: FONT, fontSize: 21, fontWeight: 600, color: INK, opacity: Math.min(1, p * 1.3), transform: `translateY(${(1 - p) * 16}px)` }}>{s}</div>; })}
    </div>
  );
  return (
    <AbsoluteFill>
      <Cam keys={[[0, 0, 0, 1], [0.15, 0, 0, 1], [1.0, -300, 20, 1.3], [12, -310, 26, 1.33]]}><Clip src="footage/7643a-full.mp4" from={0.4} /></Cam>
      <div style={{ position: 'absolute', right: 70, top: 160, padding: '30px 32px', borderRadius: 30, ...glass(0.45), display: 'flex', gap: 22, alignItems: 'flex-start', opacity: ez(t, 0.6, 1.1) }}>
        {col('PENGGUNA', ['Pemula', 'Sanggar tenun', 'Sekolah / SMK'], 1.0)}
        {col('NILAI', ['Penghasilan untuk penenun', 'Murid baru', 'Pasar kain meluas'], 5.2)}
        {col('SKEMA', ['[Langganan sanggar]', '[Paket kacamata]', '[Kemitraan]'], 8.6)}
      </div>
      <Pops times={[1.0, 5.2, 8.6]} />
      <Sub words={words} />
    </AbsoluteFill>
  );
};

// ── 23 · peta Nusantara: penenun stik muncul di pulau-pulau, lalu ke dunia ─────
const ISLANDS = 'M380 330 Q480 380 600 540 Q640 620 580 630 Q480 540 380 330 Z M640 640 Q820 660 1000 690 Q930 712 640 670 Z M780 380 Q980 350 1010 480 Q930 580 800 540 Q760 450 780 380 Z M1080 460 Q1180 450 1200 590 Q1140 630 1100 570 Z M1010 700 L1280 712 L1270 732 L1010 722 Z M1340 430 Q1430 450 1420 530 Q1370 510 1340 430 Z M1540 540 Q1720 540 1780 650 Q1640 670 1540 540 Z';
const SPOTS: [number, number][] = [[470, 440], [800, 665], [900, 460], [1140, 520], [1150, 705], [1380, 480], [1650, 590]];
const S23: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const words = W([['Dari', 0.72], ['satu', 1.42], ['tradisi', 1.62], ['ke', 2.18], ['seluruh', 2.8], ['tradisi', 3.32], ['Indonesia,', 3.62], ['dari', 4.4], ['Indonesia', 4.9], ['ke', 5.36], ['dunia.', 6.08]], 0.4);
  const zoom = interpolate(t, [3.9, 6.4], [1, 0.55], { ...cl, easing: Easing.inOut(Easing.cubic) });
  return (
    <White>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(1080 560) scale(${zoom}) translate(-1080 -560)`}>
          <path d={ISLANDS} fill="#f5efe2" stroke="rgba(20,28,58,0.12)" strokeWidth={2} />
          {SPOTS.map(([x, y], i) => {
            const a = i === 0 ? 0.4 : 1.5 + i * 0.22;
            const p = ez(t, a, a + 0.4, Easing.out(Easing.back(2)));
            return <g key={i} opacity={Math.min(1, p * 1.4)} transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
              <Stick x={x - 18} y={y + 20} s={0.32} pose={weaving(t, 1, i)} t={t + i} hair="bun" accent={THREAD} />
              <Loom x={x + 4} y={y + 20} s={0.32} t={t + i} />
            </g>;
          })}
          {[[-1500, -500], [3400, -400], [-1300, 1600], [3300, 1500], [1080, -1400]].map(([x, y], i) => (
            <path key={i} d={`M1080 560 Q ${(1080 + x) / 2} ${Math.min(560, y) - 300} ${x} ${y}`} stroke={THREAD} strokeWidth={4} fill="none" strokeDasharray="5000" strokeDashoffset={5000 * (1 - ez(t, 4.6 + i * 0.1, 6.0 + i * 0.1, Easing.inOut(Easing.cubic)))} />
          ))}
        </g>
      </svg>
      <Pops times={SPOTS.map((_, i) => (i === 0 ? 0.4 : 1.5 + i * 0.22))} vol={0.35} />
      <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 5, color: 'rgba(20,28,58,0.55)', opacity: ez(t, 5.4, 6.0) }}>INDONESIA CULTURAL POWER</div>
      <Sub words={words} />
    </White>
  );
};

// ── 24 · montase cepat ────────────────────────────────────────────────────────
const MONT: [string, number][] = [['footage/7652-full.mp4', 1.0], ['footage/7653-full.mp4', 23], ['footage/7644-full.mp4', 2.0], ['footage/7647-full.mp4', 12], ['footage/7648-full.mp4', 5.0], ['footage/7649-full.mp4', 1.0], ['footage/7647-full.mp4', 30]];
export const S24: React.FC = () => (
  <AbsoluteFill>
    {MONT.map(([src, from], i) => (
      <Sequence key={i} from={F(i * 0.55)} durationInFrames={F(0.55)}>
        <Cam keys={[[0, 0, 0, 1.12], [0.55, i % 2 ? 30 : -30, 0, 1.0]]}><Clip src={src} from={from} /></Cam>
      </Sequence>
    ))}
  </AbsoluteFill>
);

// ── 25 · Andrew menutup ───────────────────────────────────────────────────────
const S25: React.FC = () => {
  const words = W([['BelajarTenun.', 0.08], ['Belajar', 1.48], ['menenun,', 1.92], ['dipandu', 2.58], ['ilmu', 3.46], ['Nusantara.', 4.44]]);
  return <AndrewTalk src="footage/7643b-full.mp4" from={0} words={words} center />;
};

// ── 26 · kartu penutup + kredit ───────────────────────────────────────────────
export const S26: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const d = ez(t, 0, 1.0, Easing.out(Easing.cubic));
  const n = ez(t, 0.6, 1.1);
  return (
    <White>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 28 }}>
        <Mark size={130} draw={d} />
        <div style={{ fontFamily: LOGO.serif, fontSize: 120, fontWeight: 400, letterSpacing: -1, color: LOGO.navy, opacity: n, filter: `blur(${(1 - n) * 10}px)` }}>BelajarTenun</div>
        <div style={{ fontFamily: FONT, fontSize: 32, color: 'rgba(20,28,58,0.55)', opacity: ez(t, 1.4, 1.9) }}>Belajar menenun, dipandu ilmu Nusantara.</div>
        <div style={{ marginTop: 10, padding: '12px 30px', borderRadius: 999, background: LOGO.navy, color: '#fff', fontFamily: FONT, fontSize: 30, fontWeight: 600, opacity: ez(t, 2.0, 2.5) }}>belajartenun.com</div>
      </AbsoluteFill>
    </White>
  );
};

// ── susunan video ─────────────────────────────────────────────────────────────
type Row = [string, number, React.ReactNode, { src: string; from: number } | null, 'whip' | 'cut'];
const ROWS: Row[] = [
  ['01', 4.8, <S01 />, { src: 'audio/7633-clean.wav', from: 0.5 }, 'cut'],
  ['02', 9.0, <S02 />, { src: 'audio/7633-clean.wav', from: 5.3 }, 'whip'],
  ['03', 4.7, <S03 />, { src: 'audio/7634b-clean.wav', from: 0 }, 'cut'],
  ['04', 11.4, <S04 />, { src: 'audio/7634a-clean.wav', from: 0.3 }, 'cut'],
  ['05', 8.3, <S05 />, { src: 'audio/7635b-clean.wav', from: 0.6 }, 'whip'],
  ['06', 10.1, <S06 />, { src: 'audio/7635a-clean.wav', from: 0 }, 'whip'],
  ['07', 9.2, <S07 />, { src: 'audio/7636-clean.wav', from: 0 }, 'whip'],
  ['B3', LEARN_SECONDS, <Learn />, null, 'whip'],
  ['15', 8.4, <AndrewTalk src="footage/7637a-full.mp4" from={0.2} side="kanan" chip="AKSES" words={W([['Penenun', 0.43], ['tidak', 1.19], ['tergantikan.', 1.87], ['Dengan', 2.89], ['BelajarTenun,', 3.33], ['akses', 4.51], ['ke', 4.87], ['mereka', 4.99], ['terbuka', 5.29], ['untuk', 6.17], ['lebih', 6.35], ['banyak', 6.67], ['murid,', 7.03], ['dari', 7.55], ['mana', 7.95], ['saja.', 8.11]], 0.2)} />, { src: 'audio/7637a-clean.wav', from: 0.2 }, 'whip'],
  ['16', 5.8, <S16 />, { src: 'audio/7637b-clean.wav', from: 0 }, 'whip'],
  ['17', 4.6, <S17 />, { src: 'audio/7637c-clean.wav', from: 0 }, 'whip'],
  ['18', 6.8, <S18 />, { src: 'audio/7639-clean.wav', from: 0 }, 'whip'],
  ['19', 16.4, <S19 />, { src: 'audio/7639new-clean.wav', from: 0.2 }, 'whip'],
  ['20', 6.6, <S20 />, { src: 'audio/7643c-clean.wav', from: 0 }, 'whip'],
  ['22', 11.8, <S22 />, { src: 'audio/7643a-clean.wav', from: 0.4 }, 'whip'],
  ['23', 7.2, <S23 />, { src: 'audio/7643new-clean.wav', from: 0.4 }, 'whip'],
  ['24', 3.9, <S24 />, null, 'cut'],
  ['25', 6.4, <S25 />, { src: 'audio/7643b-clean.wav', from: 0 }, 'cut'],
  ['26', 4.6, <S26 />, null, 'cut'],
];
const STARTS = ROWS.reduce<number[]>((a, r, i) => [...a, i === 0 ? 0 : a[i - 1] + ROWS[i - 1][1]], []);
export const FULL3_SECONDS = Math.ceil(STARTS[STARTS.length - 1] + ROWS[ROWS.length - 1][1]);

export const FullVideo3: React.FC<{ music?: string }> = ({ music }) => (
  <AbsoluteFill style={{ background: '#fff' }}>
    {ROWS.map(([id, dur, el, audio, tr], i) => (
      <Sequence key={id} from={F(STARTS[i])} durationInFrames={F(dur)}>
        {tr === 'whip' ? <WhipIn dir={i % 2 ? 1 : -1}>{el}</WhipIn> : el}
        {audio && <Audio src={staticFile(audio.src)} startFrom={F(audio.from)} endAt={F(audio.from + dur)} />}
        {tr === 'whip' && <Sequence from={0} durationInFrames={F(0.6)}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.4} /></Sequence>}
      </Sequence>
    ))}
    <Sequence from={F(STARTS[3])} durationInFrames={F(1)}><Audio src={staticFile('sfx/success.wav')} volume={0.3} /></Sequence>
    {music && <Audio src={staticFile(music)} volume={0.12} />}
    <Grain opacity={0.045} />
  </AbsoluteFill>
);
