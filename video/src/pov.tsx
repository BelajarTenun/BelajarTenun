import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SERIF, SANS, Card, Chip, Media, fade, useSpring } from './theme';
import { STAGES } from './opening';

// Bingkai lensa kacamata: video sumber di dalam, vignette, sudut membulat.
// overlay=true → hanya HUD (latar transparan) untuk ditaruh di atas footage sendiri.
type PovProps = { src?: string; overlay?: boolean; credit?: string };
const Lens: React.FC<PovProps & { children: React.ReactNode }> = ({ src, overlay, credit = 'Input: video tenun CC BY · [pembuat]', children }) => (
  <AbsoluteFill style={{ background: overlay ? 'transparent' : '#000' }}>
    {!overlay && (
      <>
        <Media src={src} label="POV video tenun (open source)" style={{ position: 'absolute', inset: 0, width: 1920, height: 1080 }} />
        <AbsoluteFill style={{ boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.75)', borderRadius: 120, border: '26px solid #111' }} />
      </>
    )}
    {children}
    <div style={{ position: 'absolute', left: 70, bottom: 54, fontFamily: SANS, fontSize: 18, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px #000' }}>{credit}</div>
  </AbsoluteFill>
);

// Kartu tahap di kanan atas dengan bilah keyakinan.
const StageCard: React.FC<{ n: number; conf: number; o?: number }> = ({ n, conf, o = 1 }) => (
  <Card style={{ position: 'absolute', right: 80, top: 70, width: 470, opacity: o }}>
    <div style={{ fontSize: 18, letterSpacing: 2, color: C.soft }}>TAHAP {n}/5</div>
    <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>{STAGES[n - 1]}</div>
    <div style={{ height: 8, background: C.line, borderRadius: 4, marginTop: 16 }}>
      <div style={{ height: 8, width: `${conf * 100}%`, background: C.ok, borderRadius: 4 }} />
    </div>
    <div style={{ fontSize: 16, color: C.soft, marginTop: 6 }}>keyakinan {Math.round(conf * 100)}%</div>
  </Card>
);

// Subtitle suara tutor di bawah tengah.
const Say: React.FC<{ text: string; start: number; end: number; who?: string }> = ({ text, start, end, who = 'Tutor' }) => {
  const f = useCurrentFrame();
  const o = fade(f, start, start + 8) * (1 - fade(f, end, end + 8));
  return (
    <div style={{ position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', opacity: o }}>
      <span style={{ fontFamily: SANS, fontSize: 32, color: '#fff', background: 'rgba(20,18,15,0.62)', padding: '12px 26px', borderRadius: 14 }}>
        <b style={{ color: who === 'Tutor' ? '#9FC0F5' : '#F5D49F' }}>{who}:</b> {text}
      </span>
    </div>
  );
};

// Bola "AI mendengar".
export const Orb: React.FC<{ start: number; end: number; x?: number; y?: number }> = ({ start, end, x = 960, y = 470 }) => {
  const f = useCurrentFrame();
  const o = fade(f, start, start + 8) * (1 - fade(f, end, end + 8));
  const pulse = 1 + Math.sin(f / 4) * 0.08;
  return (
    <div style={{ position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, opacity: o }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${C.ai}`, transform: `scale(${1 + ((f / 30 + i / 3) % 1) * 0.9})`, opacity: 1 - ((f / 30 + i / 3) % 1) }} />
      ))}
      <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, #BFD3F7, ${C.ai})`, transform: `scale(${pulse})`, boxShadow: `0 0 40px ${C.ai}` }} />
    </div>
  );
};

// Adegan 8 — "Mulai belajar": tombol Start di HP + AI mendengar.
export const A08Mulai: React.FC<PovProps> = (p) => {
  const f = useCurrentFrame();
  const press = interpolate(f, [20, 26, 32], [1, 0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const started = f > 26;
  return (
    <AbsoluteFill style={{ background: p.overlay ? 'transparent' : C.bg }}>
      {!p.overlay && (
        <div style={{ position: 'absolute', left: 240, top: 140, width: 400, height: 800, borderRadius: 56, background: '#111', padding: 18 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 40, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, fontFamily: SANS }}>
            <div style={{ fontFamily: SERIF, fontSize: 40 }}>BelajarTenun</div>
            <div style={{ fontSize: 20, color: C.soft }}>👓 Kacamata tersambung</div>
            <div style={{ transform: `scale(${press})`, background: started ? C.ok : C.accent, color: '#fff', fontSize: 30, fontWeight: 700, padding: '18px 60px', borderRadius: 999 }}>{started ? '● Belajar' : 'Mulai'}</div>
          </div>
        </div>
      )}
      <Orb start={40} end={200} x={p.overlay ? 960 : 1200} y={470} />
      <Say who="Murid" text="Mulai belajar." start={35} end={75} />
      <Say text="Halo. Kita mulai dari mengenal alat. Lihat ke arah belida." start={85} end={200} />
      <Chip label="ADAPTIF" start={90} />
    </AbsoluteFill>
  );
};

// Adegan 9 — Tahap 2/5, keyakinan naik, lalu naik ke tahap 3.
export const A09Tahap: React.FC<PovProps> = (p) => {
  const f = useCurrentFrame();
  const conf = interpolate(f, [10, 120], [0.4, 0.93], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const next = f > 200;
  const flash = fade(f, 200, 206) * (1 - fade(f, 210, 230));
  return (
    <Lens {...p}>
      <StageCard n={next ? 3 : 2} conf={next ? 0.55 : conf} o={fade(f, 0, 10)} />
      <AbsoluteFill style={{ background: C.ok, opacity: flash * 0.18 }} />
      <Say text="Bagus. Mulut lungsinya sudah terbuka. Sekarang masukkan benang pakan." start={130} end={290} />
    </Lens>
  );
};

// Adegan 10 — kartu kosakata bahasa daerah.
export const A10Kosakata: React.FC<PovProps & { istilah?: string; arti?: string; bahasa?: string }> = ({ istilah = '[istilah daerah]', arti = 'benang pakan', bahasa = 'Tidore', ...p }) => {
  const s = useSpring(30, 14);
  const f = useCurrentFrame();
  return (
    <Lens {...p}>
      <StageCard n={3} conf={0.86} />
      <div style={{ position: 'absolute', left: 1080, top: 430, transform: `scale(${s})`, transformOrigin: 'left center' }}>
        <svg width="120" height="4" style={{ position: 'absolute', left: -120, top: 60 }}><line x1="0" y1="2" x2="120" y2="2" stroke="#fff" strokeWidth="3" strokeDasharray="6 6" /></svg>
        <Card style={{ width: 520 }}>
          <div style={{ fontSize: 18, letterSpacing: 2, color: C.soft }}>BAHASA {bahasa.toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
            <div style={{ fontFamily: SERIF, fontSize: 54, fontWeight: 600 }}>{istilah}</div>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transform: `scale(${1 + Math.max(0, Math.sin((f - 60) / 3)) * 0.12 * (f > 60 && f < 110 ? 1 : 0)})` }}>🔊</div>
          </div>
          <div style={{ fontSize: 28, color: C.soft, marginTop: 4 }}>= {arti}</div>
        </Card>
      </div>
      <Say text={`Dalam bahasa ${bahasa}, ${arti} disebut ${istilah}.`} start={20} end={220} />
      <Chip label="BAHASA DAERAH" start={30} />
    </Lens>
  );
};

// Adegan 11 — koreksi: sorot oranye → petunjuk tambahan → hijau.
export const A11Koreksi: React.FC<PovProps> = (p) => {
  const f = useCurrentFrame();
  const fixed = f > 210;
  const col = fixed ? C.ok : C.warn;
  const ring = 1 + Math.sin(f / 5) * 0.04;
  const s = useSpring(fixed ? 210 : 15, 12);
  return (
    <Lens {...p}>
      <StageCard n={4} conf={0.9} />
      <div style={{ position: 'absolute', left: 300, top: 380, width: 300, height: 300, borderRadius: '50%', border: `6px solid ${col}`, transform: `scale(${ring})`, boxShadow: `0 0 40px ${col}`, opacity: fade(f, 10, 20) }} />
      <Card style={{ position: 'absolute', left: 640, top: 470, borderLeft: `8px solid ${col}`, transform: `scale(${s})`, transformOrigin: 'left center' }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: col }}>{fixed ? '✔ Pinggir sudah lurus' : '⚠ Pinggir kain menyempit'}</div>
      </Card>
      <Say text="Pinggirnya mulai menyempit. Longgarkan sedikit benang pakannya." start={20} end={110} />
      <Say text="Tarik pelan sampai pinggirnya lurus dengan baris sebelumnya." start={125} end={205} />
      <Say text="Nah, sudah rapi." start={220} end={290} />
      <Chip label="ADAPTIF" start={125} />
    </Lens>
  );
};

// Adegan 12 & 13 — pertanyaan melayang di samping wajah (overlay di atas shot muka).
export const A12Tanya: React.FC<{ q?: string; a?: string; source?: string; chip?: string }> = ({
  q = 'Kenapa harus dirapatkan setiap baris?',
  a = 'Supaya kain padat dan motifnya tidak bergeser.',
  source = 'Sumber: modul tervalidasi',
  chip = 'INTERAKTIF',
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 1080, top: 330, width: 680, fontFamily: SERIF, fontSize: 58, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 18px rgba(0,0,0,0.5)', opacity: 1 - fade(f, 120, 135) }}>
        {q.split(' ').map((w, i) => <span key={i} style={{ opacity: fade(f, 8 + i * 4, 16 + i * 4), marginRight: '0.25em' }}>{w}</span>)}
      </div>
      <Orb start={60} end={130} x={1400} y={720} />
      <Card style={{ position: 'absolute', left: 1060, top: 380, width: 700, opacity: fade(f, 135, 148) }}>
        <div style={{ fontSize: 34, lineHeight: 1.35 }}>{a}</div>
        <div style={{ fontSize: 20, color: C.soft, marginTop: 12 }}>{source}</div>
      </Card>
      <Chip label={chip} start={10} />
    </AbsoluteFill>
  );
};

export const A13LuarModul: React.FC = () => {
  const f = useCurrentFrame();
  const fly = interpolate(f, [150, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 1080 + fly * 420, top: 330 + fly * 330, width: 640, fontFamily: SERIF, fontSize: 56 * (1 - fly * 0.7), color: '#fff', lineHeight: 1.2, textShadow: '0 2px 18px rgba(0,0,0,0.5)', opacity: fade(f, 8, 20) * (1 - fade(f, 185, 195)) }}>
        Kalau benangnya putus gimana?
      </div>
      <Card style={{ position: 'absolute', left: 1080, top: 560, width: 640, opacity: fade(f, 50, 62) * (1 - fade(f, 140, 150)) }}>
        <div style={{ fontSize: 28, lineHeight: 1.35 }}>Itu belum ada di modul yang divalidasi. Pertanyaanmu kucatat untuk penenun.</div>
      </Card>
      <Card style={{ position: 'absolute', left: 1440, top: 760, width: 360, display: 'flex', alignItems: 'center', gap: 14, opacity: fade(f, 140, 150), transform: `scale(${1 + fade(f, 188, 194) * 0.08 - fade(f, 194, 204) * 0.08})` }}>
        <div style={{ fontSize: 36 }}>📥</div>
        <div style={{ fontSize: 22 }}>Pertanyaan untuk penenun <b style={{ color: C.accent }}>+1</b></div>
      </Card>
      <div style={{ position: 'absolute', left: 70, top: 60, fontFamily: SANS, fontSize: 24, color: '#fff', background: 'rgba(20,18,15,0.6)', padding: '8px 18px', borderRadius: 10, opacity: fade(f, 60, 75) }}>
        Tidak mengarang jawaban
      </div>
    </AbsoluteFill>
  );
};
