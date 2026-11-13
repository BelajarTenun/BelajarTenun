import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SERIF, SANS, MONO, Card, Tag, Chip, Media, fade, useSpring } from './theme';
import { STAGES } from './opening';

// Bingkai lensa kacamata: video sumber di dalam, vignette, sudut membulat.
// overlay=true → hanya HUD (latar transparan) untuk ditaruh di atas footage sendiri.
type PovProps = { src?: string; overlay?: boolean; credit?: string };
const Lens: React.FC<PovProps & { children: React.ReactNode }> = ({ src, overlay, credit = 'Input: video tenun CC BY · [pembuat]', children }) => (
  <AbsoluteFill style={{ background: overlay ? 'transparent' : '#000' }}>
    {!overlay && (
      <>
        <Media src={src} label="POV video tenun (open source)" style={{ position: 'absolute', inset: 0, width: 1920, height: 1080 }} />
        <AbsoluteFill style={{ boxShadow: 'inset 0 0 260px 40px rgba(0,0,0,0.55)' }} />
      </>
    )}
    {children}
    <div style={{ position: 'absolute', left: 64, bottom: 40, fontFamily: SANS, fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>{credit}</div>
  </AbsoluteFill>
);

// Kartu tahap di kanan atas dengan bilah keyakinan.
const StageCard: React.FC<{ n: number; conf: number; o?: number }> = ({ n, conf, o = 1 }) => {
  const f = useCurrentFrame();
  return (
    <Card style={{ position: 'absolute', right: 72, top: 64, width: 400, opacity: o }}>
      <Tag>Tahap {n}/5</Tag>
      <div style={{ fontSize: 30, marginTop: 8 }}>{STAGES[n - 1]}</div>
      <svg width="350" height="34" style={{ marginTop: 14 }}>
        {Array.from({ length: 70 }, (_, i) => {
          const h = 4 + Math.abs(Math.sin(i * 0.7 + f / 5)) * 14 * (i / 70 < conf ? 1 : 0.25);
          return <rect key={i} x={i * 5} y={17 - h / 2} width={2} height={h} rx={1} fill={i / 70 < conf ? '#F4F5F2' : 'rgba(244,245,242,0.25)'} />;
        })}
      </svg>
      <div style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(244,245,242,0.55)', marginTop: 6 }}>KEYAKINAN {Math.round(conf * 100)}%</div>
    </Card>
  );
};

// Subtitle suara tutor di bawah tengah.
const Say: React.FC<{ text: string; start: number; end: number; who?: string }> = ({ text, start, end, who = 'Tutor' }) => {
  const f = useCurrentFrame();
  const o = fade(f, start, start + 8) * (1 - fade(f, end, end + 8));
  return (
    <div style={{ position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', opacity: o, fontFamily: SANS, fontSize: 28, color: '#fff', textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}>
      {who === 'Tutor' ? '' : `${who}: `}{text}
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
      <div style={{ position: 'absolute', inset: -60, borderRadius: '50%', background: `radial-gradient(circle, rgba(110,168,240,0.35), transparent 65%)` }} />
      <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #DCEBFF, ${C.ai} 70%)`, transform: `scale(${pulse})` }} />
    </div>
  );
};

// Adegan 8 — "Mulai belajar": tombol Start di HP + AI mendengar.
export const A08Mulai: React.FC<PovProps> = (p) => {
  const f = useCurrentFrame();
  const press = interpolate(f, [20, 26, 32], [1, 0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const started = f > 26;
  return (
    <AbsoluteFill style={{ background: p.overlay ? 'transparent' : `radial-gradient(ellipse at 30% 30%, #F3F4F1 0%, ${C.bg} 55%, #E3E7EA 100%)` }}>
      {!p.overlay && (
        <div style={{ position: 'absolute', left: 300, top: 150, width: 380, height: 780, borderRadius: 60, background: '#1C1E21', padding: 12 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 50, background: '#F4F4F1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, fontFamily: SANS }}>
            <div style={{ fontFamily: SERIF, fontSize: 44, color: C.ink }}>BelajarTenun</div>
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: C.soft }}>[ KACAMATA TERSAMBUNG ]</div>
            <div style={{ transform: `scale(${press})`, background: C.ink, color: '#fff', fontSize: 26, padding: '16px 56px', borderRadius: 999 }}>{started ? 'Mendengarkan…' : 'Mulai belajar'}</div>
          </div>
        </div>
      )}
      <Orb start={40} end={200} x={p.overlay ? 960 : 1200} y={470} />
      <Say who="Murid" text="Mulai belajar." start={35} end={75} />
      {!p.overlay && <div style={{ position: 'absolute', left: 1000, top: 380, width: 760, fontFamily: SERIF, fontSize: 64, lineHeight: 1.15, color: C.ink, opacity: fade(f, 90, 110) }}>“Halo. Kita mulai dari mengenal alat.”</div>}
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
      <AbsoluteFill style={{ background: '#fff', opacity: flash * 0.12 }} />
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
        <svg width="140" height="20" style={{ position: 'absolute', left: -140, top: 52 }}><line x1="8" y1="10" x2="140" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" /><circle cx="8" cy="10" r="6" fill="none" stroke="#fff" strokeWidth="1.5" /></svg>
        <Card style={{ width: 520 }}>
          <Tag>Bahasa {bahasa}</Tag>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
            <div style={{ fontFamily: SERIF, fontSize: 60 }}>{istilah}</div>
            <svg width="40" height="28" viewBox="0 0 40 28">{[0, 1, 2, 3, 4].map((i) => { const h = 6 + Math.abs(Math.sin(f / 4 + i)) * 16 * (f > 60 && f < 110 ? 1 : 0.3); return <rect key={i} x={i * 8} y={14 - h / 2} width={3} height={h} rx={1.5} fill="#F4F5F2" />; })}</svg>
          </div>
          <div style={{ fontSize: 24, color: 'rgba(244,245,242,0.65)', marginTop: 2 }}>{arti}</div>
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
      <div style={{ position: 'absolute', left: 300, top: 380, width: 300, height: 300, borderRadius: '50%', border: `2px solid ${col}`, transform: `scale(${ring})`, boxShadow: `0 0 60px ${col}55, inset 0 0 40px ${col}33`, opacity: fade(f, 10, 20) }} />
      <Card style={{ position: 'absolute', left: 640, top: 470, opacity: s }}>
        <Tag>{fixed ? 'Sudah benar' : 'Koreksi'}</Tag>
        <div style={{ fontSize: 30, marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: col }} />{fixed ? 'Pinggir sudah lurus' : 'Pinggir kain menyempit'}</div>
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
      <div style={{ position: 'absolute', left: 1080, top: 330, width: 680, fontFamily: SERIF, fontSize: 62, color: '#fff', lineHeight: 1.15, textShadow: '0 0 30px rgba(255,255,255,0.35)', opacity: 1 - fade(f, 120, 135) }}>
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
        <div><Tag>Untuk penenun</Tag><div style={{ fontSize: 22, marginTop: 4 }}>1 pertanyaan baru</div></div>
      </Card>
      <div style={{ position: 'absolute', left: 72, top: 64, fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: '#fff', opacity: fade(f, 60, 75) * 0.9 }}>[ TIDAK MENGARANG JAWABAN ]</div>
    </AbsoluteFill>
  );
};
