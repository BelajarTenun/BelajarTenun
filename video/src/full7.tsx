import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { Mark, LOGO } from './brand';
import { Babak1V7, B1V7_SECONDS, Captions, Sfx, Vignette, Wd, Cue } from './b1v7';
import { Learn, LEARN_SECONDS, S24, S26 } from './full3';
import DOTS from '../public/3d/dots.json';

// Video utuh v7: gaya Babak 1 v7 untuk seluruh video.
// Andrew bergeser & grafik muncul di sisinya (tanpa figur orang di atas Andrew);
// figur/konsep layar penuh krem; UI aplikasi asli dianimasikan; SFX per kejadian.

const FPS = 30;
const F = (s: number) => Math.round(s * FPS);
const NAVY = LOGO.navy, GOLD = LOGO.gold, CREAM = LOGO.cream, GOLDD = '#b08f3a';
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ez = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...cl, easing: e });
const io = (t: number, a: number, b: number) => ez(t, a, b, Easing.inOut(Easing.cubic));
const sp = (f: number, at: number, cfg = { damping: 16, stiffness: 160 }) => spring({ frame: f - F(at), fps: FPS, config: cfg });
const W = (list: [string, number][], off = 0): Wd[] => list.map(([w, t]) => [w, t - off]);
const useT = () => { const f = useCurrentFrame(); return { f, t: f / FPS }; };
type P2 = [number, number];
const D = DOTS as unknown as { indo: P2[]; world: [number, number, number][]; places: Record<string, P2> };

// ── Bahan bersama ────────────────────────────────────────────────────────────
const glassCard = (o = 0.78): React.CSSProperties => ({ background: `linear-gradient(160deg, rgba(255,255,255,${o}), rgba(255,255,255,${o - 0.22}))`, border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 30px 80px rgba(20,28,58,0.16)', backdropFilter: 'blur(24px) saturate(160%)' });
const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = NAVY, style }) => (
  <div style={{ fontFamily: FONT, fontSize: 20, letterSpacing: 4, fontWeight: 700, color, opacity: 0.7, ...style }}>{children}</div>
);

// Andrew bicara; `slide` (0..1) menggeser ke kiri dan menyisakan ruang di kanan.
const Andrew: React.FC<{ src: string; from: number; slide: number; push?: number; blur?: number }> = ({ src, from, slide, push = 0, blur = 0 }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 40%', transform: `translateX(${-330 * slide}px) scale(${1.02 + push + 0.4 * slide})`, filter: blur ? `blur(${blur}px)` : undefined }}>
      <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted style={{ width: '100%', height: '100%' }} />
      <Vignette />
    </div>
    <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(10,14,30,0) 32%, rgba(10,14,30,${0.55 * slide}) 68%)` }} />
  </AbsoluteFill>
);

// Jari: lingkaran putih + riak saat menekan
const Finger: React.FC<{ path: [number, number, number][]; taps: number[] }> = ({ path, taps }) => {
  const { t } = useT();
  if (t < path[0][0] - 0.2 || t > path[path.length - 1][0] + 0.4) return null;
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) { const [t0, x0, y0] = path[i - 1], [t1, x1, y1] = path[i]; if (t >= t0) { const e = Easing.inOut(Easing.cubic)(Math.min(1, (t - t0) / Math.max(0.01, t1 - t0))); x = x0 + (x1 - x0) * e; y = y0 + (y1 - y0) * e; } }
  const press = taps.reduce((a, c) => Math.max(a, 1 - Math.min(1, Math.abs(t - c) / 0.14)), 0);
  const ripple = taps.map((c) => (t > c && t < c + 0.5 ? (t - c) / 0.5 : -1)).find((r) => r >= 0) ?? -1;
  const o = ez(t, path[0][0] - 0.2, path[0][0]) * (1 - ez(t, path[path.length - 1][0] + 0.1, path[path.length - 1][0] + 0.4));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: o, pointerEvents: 'none' }}>
      {ripple >= 0 && <circle cx={x} cy={y} r={20 + ripple * 50} fill="none" stroke={GOLD} strokeWidth={4} opacity={1 - ripple} />}
      <circle cx={x} cy={y} r={26 - press * 5} fill="rgba(255,255,255,0.92)" stroke="rgba(20,28,58,0.25)" strokeWidth={2} style={{ filter: 'drop-shadow(0 8px 16px rgba(20,28,58,0.3))' } as React.CSSProperties} />
    </svg>
  );
};

// HP kaca berisi layar krem
const Phone: React.FC<{ x: number; y: number; w?: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w = 400, h = 820, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 60, padding: 14, ...glassCard(0.55), ...style }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 48, background: CREAM, overflow: 'hidden', position: 'relative', fontFamily: FONT, color: NAVY }}>{children}</div>
  </div>
);
// Laptop kaca (untuk halaman admin)
const Laptop: React.FC<{ x: number; y: number; w?: number; h?: number; url: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w = 1240, h = 760, url, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 26, padding: 12, ...glassCard(0.6), ...style }}>
    <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: 'rgba(20,28,58,0.18)' }} />)}
      <div style={{ marginLeft: 18, flex: 1, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.7)', fontFamily: FONT, fontSize: 15, color: 'rgba(20,28,58,0.6)', display: 'flex', alignItems: 'center', paddingLeft: 14 }}>{url}</div>
    </div>
    <div style={{ height: h - 68, borderRadius: 16, background: '#fbf8f1', overflow: 'hidden', position: 'relative', fontFamily: FONT, color: NAVY }}>{children}</div>
  </div>
);

// Peta titik Indonesia (dan dunia)
const DotMap: React.FC<{ lit: number; pins?: [string, number][]; dim?: number; world?: number; scale?: number; cx?: number; cy?: number; color?: string }> = ({ lit, pins = [], world = 0, scale = 1, cx = 960, cy = 570, color = NAVY }) => {
  const { t } = useT();
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
        {world < 1 && (
          <g opacity={1 - world}>
            {D.indo.map(([x, y], i) => {
              const k = (x - 140) / 1640;
              const on = lit > k;
              return <circle key={i} cx={x} cy={y} r={on ? 6.2 : 5} fill={on ? color : 'rgba(20,28,58,0.16)'} />;
            })}
          </g>
        )}
        {pins.map(([name, at]) => {
          const p = D.places[name]; if (!p) return null;
          const s = spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping: 11, stiffness: 200 } });
          if (t < at) return null;
          const r = (t - at) % 1.6;
          return (
            <g key={name}>
              <circle cx={p[0]} cy={p[1]} r={14 + r * 40} fill="none" stroke={GOLD} strokeWidth={3} opacity={Math.max(0, 1 - r / 1.2)} />
              <circle cx={p[0]} cy={p[1]} r={15 * s} fill={GOLD} stroke="#fff" strokeWidth={4} />
            </g>
          );
        })}
      </g>
      {world > 0 && (
        <g opacity={world}>
          {D.world.map(([x, y, id], i) => <circle key={i} cx={x} cy={y} r={id ? 5 : 4} fill={id ? GOLD : 'rgba(20,28,58,0.22)'} />)}
        </g>
      )}
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ALUR PENGGUNA (tanpa narasi; musik + SFX + teks langkah). UI dibangun ulang dari web/src/pages.
// ════════════════════════════════════════════════════════════════════════════
const PX = 1060, PY = 130; // posisi HP
const STEPS: [number, string, string][] = [
  [0.0, '01', 'Buka belajartenun.com'],
  [3.0, '02', 'Masuk dengan Google'],
  [6.0, '03', 'Pilih modul'],
  [9.6, '04', 'Sambungkan kacamata'],
  [14.2, '05', 'Mulai latihan'],
];
export const ALUR_SECONDS = 18.2;
const Alur: React.FC = () => {
  const { f, t } = useT();
  const st = [...STEPS].reverse().find((s) => t >= s[0])!;
  const stP = sp(f, st[0], { damping: 18, stiffness: 170 });
  const url = 'belajartenun.com'.slice(0, Math.max(0, Math.floor((t - 0.5) * 14)));
  const screen = t < 1.8 ? 'url' : t < 3.0 ? 'landing' : t < 6.0 ? 'masuk' : t < 8.4 ? 'belajar' : t < 9.6 ? 'kenal' : t < 14.2 ? 'siapkan' : 'praktik';
  const slideIn = (at: number) => { const p = sp(f, at, { damping: 20, stiffness: 150 }); return { transform: `translateY(${(1 - p) * 60}px)`, opacity: Math.min(1, p * 1.4) }; };
  const glassesIn = sp(f, 10.4, { damping: 18, stiffness: 90 });
  const paired = t > 12.4;
  const flow = t > 11.6 && t < 14.4;
  const zoomOut = io(t, 17.0, 18.2);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + zoomOut * 1.8})`, transformOrigin: `${PX + 200}px ${PY + 410}px`, opacity: 1 - ez(t, 17.7, 18.2) }}>
        {/* judul langkah */}
        <div style={{ position: 'absolute', left: 150, top: 380, fontFamily: FONT, color: NAVY, width: 760 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>{STEPS.map(([a, n]) => <div key={n} style={{ height: 6, width: 54, borderRadius: 3, background: t >= a ? GOLD : 'rgba(20,28,58,0.12)' }} />)}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD, letterSpacing: 2, ...{ transform: `translateY(${(1 - stP) * 20}px)`, opacity: stP } }}>LANGKAH {st[1]}</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, marginTop: 10, transform: `translateY(${(1 - stP) * 30}px)`, opacity: stP }}>{st[2]}</div>
        </div>
        {/* kacamata 3D (still) + aliran Bluetooth */}
        {t > 10.2 && t < 14.6 && (
          <div style={{ position: 'absolute', left: 420, top: 560, width: 760, height: 430, transform: `translateY(${(1 - glassesIn) * 400}px)`, opacity: Math.min(1, glassesIn * 1.5) * (1 - ez(t, 14.2, 14.6)) }}>
            <Img src={staticFile('3d/glasses-still.png')} style={{ position: 'absolute', left: -330, top: -80, width: 1920 * 0.55, height: 1080 * 0.55 }} />
          </div>
        )}
        {flow && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <path d={`M 860 720 C 950 640, 1000 600, ${PX + 30} 560`} fill="none" stroke={GOLD} strokeWidth={5} strokeDasharray="6 18" strokeDashoffset={-t * 120} strokeLinecap="round" opacity={ez(t, 11.6, 11.9) * (1 - ez(t, 14.0, 14.4))} />
            {[0, 1, 2].map((i) => { const r = ((t * 1.4 + i / 3) % 1); return <circle key={i} cx={860} cy={720} r={20 + r * 70} fill="none" stroke={GOLD} strokeWidth={3} opacity={(1 - r) * ez(t, 11.6, 11.9) * (1 - ez(t, 14.0, 14.4))} />; })}
          </svg>
        )}
        {/* HP */}
        <Phone x={PX} y={PY}>
          {screen === 'url' && (
            <div style={{ padding: 26 }}>
              <div style={{ marginTop: 40, height: 56, borderRadius: 28, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 22px', fontSize: 24, boxShadow: '0 6px 18px rgba(20,28,58,0.08)' }}>{url}<span style={{ width: 2, height: 28, background: NAVY, marginLeft: 2, opacity: Math.floor(t * 3) % 2 }} /></div>
            </div>
          )}
          {screen === 'landing' && (
            <div style={{ padding: 34, ...slideIn(1.8) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700 }}><Mark size={34} /> BelajarTenun</div>
              <div style={{ marginTop: 90, fontFamily: LOGO.serif, fontSize: 48, lineHeight: 1.05 }}>Belajar menenun, dipandu ilmu Nusantara.</div>
              <div style={{ marginTop: 24, fontSize: 20, opacity: 0.65, lineHeight: 1.4 }}>Tutor AI di kacamata yang melihat dari matamu.</div>
              <div style={{ marginTop: 60, height: 70, borderRadius: 35, background: NAVY, color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${t > 2.55 && t < 2.75 ? 0.96 : 1})` }}>Masuk</div>
            </div>
          )}
          {screen === 'masuk' && (
            <div style={{ padding: 34, textAlign: 'center', ...slideIn(3.0) }}>
              <div style={{ marginTop: 120, display: 'flex', justifyContent: 'center' }}><Mark size={90} /></div>
              <div style={{ marginTop: 26, fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Masuk</div>
              <div style={{ marginTop: 12, fontSize: 20, opacity: 0.65, lineHeight: 1.4 }}>Pakai akun Google untuk menyimpan progres latihanmu.</div>
              <div style={{ marginTop: 60, height: 70, borderRadius: 35, background: '#fff', border: '1px solid rgba(20,28,58,0.15)', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transform: `scale(${t > 4.55 && t < 4.75 ? 0.96 : 1})` }}>
                <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke={NAVY} strokeWidth="3" /><path d="M12 12h9" stroke={GOLD} strokeWidth="3" /></svg>Masuk dengan Google
              </div>
              {t > 4.9 && <div style={{ marginTop: 40, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderRadius: 30, background: '#fff', fontSize: 20, fontWeight: 700, ...slideIn(4.9) }}><div style={{ width: 36, height: 36, borderRadius: 18, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>N</div>Tersambung ✓</div>}
            </div>
          )}
          {screen === 'belajar' && (
            <div style={{ padding: 28, ...slideIn(6.0) }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Belajar</div>
              <div style={{ marginTop: 18, padding: 20, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 46, fontWeight: 900, color: GOLDD }}>{Math.round(1 * ez(t, 6.3, 7.0))}</div>
                <div><div style={{ fontSize: 18, fontWeight: 700 }}>hari berturut-turut berlatih</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 8, alignItems: 'flex-end', height: 30 }}>{[0, 0, 0, 0, 0, 0, 1].map((h, i) => <div key={i} style={{ width: 16, height: 4 + 26 * h * ez(t, 6.3 + i * 0.06, 6.8 + i * 0.06), borderRadius: 4, background: h ? GOLD : 'rgba(20,28,58,0.15)' }} />)}</div></div>
              </div>
              {[['Tenun Tidore – Modul Dasar', 'Sedang dipelajari', 'Lanjutkan'], ['Puta Dino motif Jodati', 'Berikutnya', 'Mulai'], ['Puta Dino motif Barakati', 'Berikutnya', '']].map(([n, s, b], i) => (
                <div key={n} style={{ marginTop: 14, padding: 20, borderRadius: 22, background: '#fff', ...slideIn(6.3 + i * 0.15), outline: i === 0 && t > 7.9 ? `3px solid ${GOLD}` : 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: i === 0 ? GOLDD : 'rgba(20,28,58,0.45)' }}>{s.toUpperCase()}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}><div style={{ fontSize: 21, fontWeight: 800 }}>{n}</div>{b && <div style={{ padding: '8px 16px', borderRadius: 20, background: i === 0 ? NAVY : 'rgba(20,28,58,0.08)', color: i === 0 ? '#fff' : NAVY, fontSize: 16, fontWeight: 700 }}>{b}</div>}</div>
                </div>
              ))}
            </div>
          )}
          {screen === 'kenal' && (
            <div style={{ ...slideIn(8.4) }}>
              <div style={{ height: 230, position: 'relative', overflow: 'hidden' }}><OffthreadVideo src={staticFile('footage/7644-full.mp4')} startFrom={F(2)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', left: 16, bottom: 12, padding: '6px 12px', borderRadius: 12, background: 'rgba(20,28,58,0.6)', color: '#fff', fontSize: 14, fontWeight: 700 }}>Video pengenalan</div></div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>Tenun Tidore – Modul Dasar</div>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, marginTop: 14, opacity: 0.5 }}>TAHAP LATIHAN</div>
                {['Mengenal alat tenun', 'Membuka celah (mulut) lungsi', 'Memasukkan benang pakan', 'Merapatkan pakan', 'Mengulang beberapa baris'].map((s, i) => <div key={s} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, fontSize: 17, ...slideIn(8.6 + i * 0.08) }}><div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(212,184,102,0.3)', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>{s}</div>)}
                <div style={{ marginTop: 22, height: 60, borderRadius: 30, background: NAVY, color: '#fff', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Mulai latihan</div>
              </div>
            </div>
          )}
          {screen === 'siapkan' && (
            <div style={{ padding: 26, ...slideIn(9.6) }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>Sambungkan kamera</div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, marginTop: 18, opacity: 0.5 }}>PERANGKAT</div>
              {[['Kamera HP', 'Kamera belakang HP ini'], ['Kacamata BelajarTenun', paired ? 'Tersambung lewat Bluetooth' : 'Butuh Chrome di Android']].map(([a, b], i) => (
                <div key={a} style={{ marginTop: 12, padding: 18, borderRadius: 20, background: '#fff', border: i === 1 && t > 10.3 ? `3px solid ${GOLD}` : '3px solid transparent' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{a}</div><div style={{ fontSize: 15, opacity: 0.6, marginTop: 4, color: i === 1 && paired ? GOLDD : undefined, fontWeight: i === 1 && paired ? 700 : 400 }}>{b}{i === 1 && paired ? ' ✓' : ''}</div>
                </div>
              ))}
              <div style={{ marginTop: 16, height: 250, borderRadius: 20, overflow: 'hidden', background: 'rgba(20,28,58,0.08)', position: 'relative' }}>
                {paired ? <OffthreadVideo src={staticFile('footage/7653-full.mp4')} startFrom={F(23)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: ez(t, 12.4, 12.8) }} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, opacity: 0.5 }}>Belum ada gambar</div>}
              </div>
              {/* dialog Bluetooth */}
              {t > 10.8 && t < 12.3 && (
                <div style={{ position: 'absolute', left: 20, right: 20, top: 220, padding: 22, borderRadius: 24, background: '#fff', boxShadow: '0 20px 60px rgba(20,28,58,0.3)', ...slideIn(10.8) }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>belajartenun.com ingin memasangkan</div>
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'rgba(212,184,102,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>BelajarTenun-Glass <span style={{ color: GOLDD }}>{'▂▄▆'.slice(0, 1 + (Math.floor(t * 4) % 3))}</span></div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}><div style={{ padding: '10px 22px', borderRadius: 20, background: NAVY, color: '#fff', fontSize: 16, fontWeight: 700 }}>Pasangkan</div></div>
                </div>
              )}
            </div>
          )}
          {screen === 'praktik' && (
            <div style={{ position: 'absolute', inset: 0, ...slideIn(14.2) }}>
              <OffthreadVideo src={staticFile('footage/7647-full.mp4')} startFrom={F(9)} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, padding: 20, borderRadius: 24, ...glassCard(0.85) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}><Mark size={26} speaking={t > 15} /> Tutor · Tahap 1/5</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>Mengenal alat tenun</div>
                <div style={{ fontSize: 15, opacity: 0.7, marginTop: 8, lineHeight: 1.4 }}>Tutor memindahkan tahap sendiri. Bilang "sudah", "ulangi", atau tanyakan apa saja.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>{['sudah', 'ulangi', 'tanya'].map((w, i) => <div key={w} style={{ padding: '8px 14px', borderRadius: 16, background: NAVY, color: '#fff', fontSize: 15, fontWeight: 700, ...slideIn(15.2 + i * 0.3) }}>“{w}”</div>)}</div>
              </div>
            </div>
          )}
        </Phone>
        <Finger path={[[2.2, PX + 200, PY + 900], [2.55, PX + 200, PY + 520], [2.8, PX + 200, PY + 520], [4.2, PX + 200, PY + 520], [4.6, PX + 200, PY + 500], [5.0, PX + 260, PY + 900],
          [7.5, PX + 300, PY + 900], [7.9, PX + 330, PY + 395], [8.2, PX + 330, PY + 395], [9.0, PX + 200, PY + 760], [9.3, PX + 200, PY + 760], [9.9, PX + 200, PY + 300], [10.25, PX + 200, PY + 335], [11.0, PX + 300, PY + 600], [11.6, PX + 315, PY + 478], [12.2, PX + 260, PY + 900]]}
          taps={[2.6, 4.6, 8.2, 9.3, 10.3, 11.6]} />
      </div>
      <Sfx cues={[...Array.from({ length: 12 }, (_, i) => [0.5 + i * 0.07, 'tick', 0.15] as Cue), [1.8, 'whoosh', 0.3], [2.6, 'click', 0.6], [3.0, 'whoosh', 0.3], [4.6, 'click', 0.6], [4.9, 'pop', 0.5], [6.0, 'whoosh', 0.3], [6.4, 'pop2', 0.35], [8.2, 'click', 0.6], [8.4, 'whoosh', 0.3], [9.3, 'click', 0.6], [9.6, 'whoosh', 0.3], [10.3, 'toggle', 0.5], [10.4, 'whoosh', 0.35], [10.8, 'pop', 0.45], [11.6, 'click', 0.6], [11.7, 'blip', 0.35], [12.0, 'blip', 0.3], [12.4, 'ding', 0.5], [14.2, 'whoosh', 0.3], [15.2, 'pop3', 0.35], [15.5, 'pop3', 0.35], [15.8, 'pop3', 0.35], [17.0, 'riser', 0.3]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 05 · "Ilmu tenun sudah ada di mana-mana…" Andrew + peta titik → dinding video
// ════════════════════════════════════════════════════════════════════════════
const REFS: [string, string][] = [['ref/silungkang.mp4', 'Silungkang'], ['ref/ntt.mp4', 'NTT'], ['ref/sumut.mp4', 'Sumatra Utara'], ['ref/lombok.mp4', 'Lombok'], ['ref/silungkang2.mp4', 'Silungkang'], ['ref/proses.mp4', 'Proses']];
const S05: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Ilmu', 0.91], ['tenun', 1.55], ['sebenarnya', 1.97], ['sudah', 2.51], ['ada', 2.67], ['di', 3.01], ['mana-mana,', 3.17], ['ribuan', 3.93], ['video', 4.67], ['dan', 4.99], ['arsip', 5.23], ['yang', 6.03], ['dibagikan', 6.29], ['terbuka', 6.67], ['di', 7.09], ['internet,', 7.21], ['dan', 7.47], ['banyak', 7.89], ['tradisi.', 8.17]], 0.6);
  const slide = io(t, 0.3, 1.0);
  const wall = t >= 3.3;
  const wallP = io(t, 3.3, 3.8);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!wall && <Andrew src="footage/7635b-full.mp4" from={0.6} slide={slide} />}
      {!wall && (
        <div style={{ position: 'absolute', left: 700, top: 120, width: 1920, height: 1080, transform: 'scale(0.62)', transformOrigin: '0 0', opacity: ez(t, 0.7, 1.0) }}>
          <DotMap lit={io(t, 0.9, 2.9)} color={GOLD} pins={[]} />
        </div>
      )}
      {!wall && <div style={{ position: 'absolute', right: 110, top: 150, opacity: ez(t, 2.4, 2.7) }}><Kicker color="#fff">DI MANA-MANA</Kicker></div>}
      {wall && (
        <AbsoluteFill style={{ background: CREAM, opacity: wallP, perspective: 1600 }}>
          <div style={{ position: 'absolute', left: -200, top: -200, width: 2400, transform: `rotateX(18deg) rotateZ(-8deg) translateY(${-(t - 3.3) * 60}px) scale(${1.05 - 0.05 * wallP})`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 26 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const [src, lab] = REFS[i % REFS.length];
              const p = sp(f, 3.35 + i * 0.07, { damping: 18, stiffness: 160 });
              const showLab = t > 7.5;
              return (
                <div key={i} style={{ height: 330, borderRadius: 22, overflow: 'hidden', position: 'relative', transform: `scale(${0.7 + 0.3 * p})`, opacity: p, boxShadow: '0 24px 60px rgba(20,28,58,0.25)' }}>
                  <OffthreadVideo src={staticFile(src)} startFrom={F(2 + (i % 5) * 3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {showLab && <div style={{ position: 'absolute', left: 16, bottom: 14, padding: '8px 14px', borderRadius: 14, background: 'rgba(245,239,226,0.92)', color: NAVY, fontFamily: FONT, fontSize: 22, fontWeight: 800, transform: `translateY(${(1 - sp(f, 7.5 + (i % 4) * 0.05)) * 20}px)` }}>{lab}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 120, top: 110, padding: '18px 26px', borderRadius: 22, ...glassCard(0.85) }}>
            <Kicker>VIDEO & ARSIP TERBUKA</Kicker>
            <div style={{ fontFamily: FONT, fontSize: 52, fontWeight: 900, color: NAVY, letterSpacing: -2 }}>Silungkang · NTT · Sumut · Lombok</div>
          </div>
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['mana', 'ribuan', 'terbuka', 'tradisi']} dark={(x) => x > 3.3} />
      <Sfx cues={[[0.3, 'whoosh', 0.3], ...Array.from({ length: 8 }, (_, i) => [1.0 + i * 0.24, 'pop3', 0.2] as Cue), [3.3, 'whoosh', 0.4], ...Array.from({ length: 10 }, (_, i) => [3.4 + i * 0.08, 'tick', 0.18] as Cue), [7.5, 'pop2', 0.4]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 06 · AI memecah gerakan → tahap, istilah, kesalahan → menggabungkan pola
// ════════════════════════════════════════════════════════════════════════════
const STAGE5 = ['Mengenal alat', 'Membuka lungsi', 'Masukkan pakan', 'Rapatkan', 'Ulangi baris'];
const S06: React.FC = () => {
  const { f, t } = useT();
  const words = W([['AI', 0.14], ['memecah', 0.88], ['setiap', 1.36], ['gerakan', 1.7], ['jadi', 2.12], ['setiap', 2.32], ['tahap,', 2.68], ['istilah,', 3.62], ['dan', 4.12], ['kesalahan', 4.46], ['yang', 5.1], ['sering', 5.2], ['terjadi.', 5.38], ['Lalu', 6.56], ['menggabungkan', 6.9], ['pola', 7.58], ['dari', 8.04], ['banyak', 8.26], ['penenun', 8.46], ['menjadi', 8.96], ['satu.', 9.52]]);
  const merge = io(t, 6.7, 8.2);
  const cuts = io(t, 1.6, 2.8);
  const scan = (t * 0.45) % 1;
  // titik "pelacakan" mengikuti area tangan (perkiraan bergerak halus)
  const pts: P2[] = Array.from({ length: 9 }, (_, i) => [760 + Math.sin(t * 2.3 + i) * 60 + (i % 3) * 46, 520 + Math.cos(t * 1.9 + i * 0.7) * 30 + Math.floor(i / 3) * 40]);
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {/* video Lombok di panel kiri */}
      <div style={{ position: 'absolute', left: 80, top: 90, width: 1120, height: 640, borderRadius: 30, overflow: 'hidden', boxShadow: '0 30px 80px rgba(20,28,58,0.22)', transform: `scale(${1 - merge * 0.08}) translateY(${-merge * 30}px)`, transformOrigin: '50% 0' }}>
        <OffthreadVideo src={staticFile('ref/lombok.mp4')} startFrom={F(4)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 3, background: `linear-gradient(90deg, rgba(212,184,102,0), ${GOLD}, rgba(212,184,102,0))`, opacity: 0.8 * (1 - merge) }} />
        <svg width={1120} height={640} style={{ position: 'absolute', inset: 0, opacity: ez(t, 0.4, 0.8) * (1 - merge) }}>
          {pts.map(([x, y], i) => i % 3 < 2 && <line key={'l' + i} x1={x - 80} y1={y - 120} x2={pts[i + 1][0] - 80} y2={pts[i + 1][1] - 120} stroke={GOLD} strokeWidth={3} opacity={0.8} />)}
          {pts.map(([x, y], i) => <circle key={i} cx={x - 80} cy={y - 120} r={7} fill="#fff" stroke={GOLD} strokeWidth={3} />)}
          {t > 4.4 && <g transform="translate(620 300)" opacity={ez(t, 4.4, 4.7)}><circle r={70 + Math.sin(t * 6) * 4} fill="none" stroke={GOLD} strokeWidth={5} /><text x={90} y={-40} fontFamily={FONT} fontSize={26} fontWeight={800} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,30,0.5)', strokeWidth: 6 } as React.CSSProperties}>⚠ pakan terlalu kencang</text></g>}
        </svg>
        <div style={{ position: 'absolute', left: 22, top: 20, padding: '8px 14px', borderRadius: 14, background: 'rgba(245,239,226,0.92)', fontFamily: FONT, fontSize: 18, fontWeight: 800, color: NAVY }}>Lombok · video terbuka</div>
      </div>
      {/* panel istilah (sumber.html: "Istilah lokal (dugaan AI)") */}
      <div style={{ position: 'absolute', left: 1250, top: 90, width: 590, padding: 30, borderRadius: 28, ...glassCard(0.82), opacity: ez(t, 3.4, 3.7) * (1 - merge), transform: `translateX(${(1 - ez(t, 3.4, 3.8)) * 60}px)`, fontFamily: FONT, color: NAVY }}>
        <Kicker>ISTILAH & SEBUTAN LAIN</Kicker>
        {[['lungsi', 'lusi'], ['pedang', 'belida'], ['sekoci', 'teropong · torak'], ['sisir', 'suri']].map(([w, c], i) => (
          <div key={w} style={{ marginTop: 18, paddingBottom: 14, borderBottom: '1px solid rgba(20,28,58,0.1)', opacity: ez(t, 3.6 + i * 0.15, 3.9 + i * 0.15), transform: `translateX(${(1 - ez(t, 3.6 + i * 0.15, 4.0 + i * 0.15)) * 30}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{w}</div>
            <div style={{ fontSize: 20, color: GOLDD, fontWeight: 700, marginTop: 2 }}>juga disebut {c}</div>
          </div>
        ))}
      </div>
      {/* garis waktu: dipotong jadi 5 tahap, lalu 3 garis menyatu jadi satu */}
      {[0, 1, 2].map((row) => {
        const y = 790 + (row - 1) * 70 * (1 - merge) + (row === 1 ? 0 : 0);
        const o = row === 1 ? 1 : ez(t, 6.6, 6.9) * (1 - ez(t, 7.9, 8.2));
        return (
          <div key={row} style={{ position: 'absolute', left: 80, top: y + merge * 40, width: 1760, height: 56, display: 'flex', gap: 8 * cuts, opacity: o }}>
            {STAGE5.map((s, i) => (
              <div key={s} style={{ flex: [1.1, 0.9, 1.2, 0.8, 1][(i + row) % 5], borderRadius: 14, background: i % 2 ? NAVY : GOLD, color: i % 2 ? '#fff' : NAVY, fontFamily: FONT, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: row === 1 ? 0.35 + 0.65 * ez(t, 1.8 + i * 0.15, 2.1 + i * 0.15) : 0.85 }}>{row === 1 && cuts > 0.5 ? s : ''}</div>
            ))}
          </div>
        );
      })}
      {t > 8.2 && <div style={{ position: 'absolute', left: 80, top: 880, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: NAVY, opacity: ez(t, 8.2, 8.5) }}>= Modul dasar <span style={{ color: GOLDD }}>· dari banyak penenun</span></div>}
      <Captions words={words} keys={['tahap', 'istilah', 'kesalahan', 'satu']} dark={() => true} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], [0.4, 'blip', 0.3], ...STAGE5.map((_, i) => [1.8 + i * 0.15, 'tick', 0.45] as Cue), [3.6, 'pop', 0.4], ...[0, 1, 2, 3].map((i) => [3.6 + i * 0.15, 'pop3', 0.25] as Cue), [4.4, 'snap', 0.5], [6.6, 'whoosh', 0.35], [8.0, 'impact', 0.45]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 07 · "Tapi AI bisa saja salah" → editor kurikulum: dikoreksi & divalidasi penenun
// ════════════════════════════════════════════════════════════════════════════
const S07: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Tapi', 0.14], ['AI', 0.7], ['bisa', 1.06], ['saja', 2.1], ['salah.', 2.3], ['Untuk', 2.56], ['menjaga', 3.56], ['kualitas,', 4.04], ['setiap', 4.74], ['tahap', 5.88], ['diperiksa', 6.52], ['penenun', 7.04], ['sebelum', 7.58], ['diajarkan.', 8.34]]);
  const slide = io(t, 0.2, 0.8);
  const ed = t >= 2.6;
  const glitch = t > 2.0 && t < 2.6 ? Math.sin(t * 90) * 6 : 0;
  const fixed = 'Angkat lungsi selang-seling'.slice(0, Math.max(0, Math.floor((t - 4.6) * 18)));
  const stamp = sp(f, 6.6, { damping: 9, stiffness: 260 });
  const status = t > 6.6 ? 'Tervalidasi' : 'Draf';
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!ed && <Andrew src="footage/7636-full.mp4" from={0} slide={slide} />}
      {!ed && (
        <div style={{ position: 'absolute', left: 1180, top: 300, width: 600, padding: 30, borderRadius: 28, ...glassCard(0.85), fontFamily: FONT, color: NAVY, transform: `translateX(${(1 - ez(t, 0.5, 0.9)) * 120 + glitch}px)`, opacity: ez(t, 0.5, 0.8) }}>
          <Kicker>DRAF DARI AI · TAHAP 2</Kicker>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 12, lineHeight: 1.2 }}>Angkat <span style={{ color: t > 2.0 ? '#9a7b2c' : NAVY, textDecoration: t > 2.0 ? 'line-through' : 'none', display: 'inline-block', transform: `translate(${glitch * 0.6}px, ${-glitch * 0.3}px)` }}>pakan</span> selang-seling</div>
          {t > 2.1 && <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, color: GOLDD }}>⚠ istilah keliru</div>}
        </div>
      )}
      {ed && (
        <AbsoluteFill style={{ opacity: ez(t, 2.6, 2.9) }}>
          <Laptop x={340} y={110} w={1240} h={800} url="belajartenun.com/editor.html">
            <div style={{ padding: 34 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Editor Kurikulum</div>
                <div style={{ padding: '10px 22px', borderRadius: 22, background: t > 8.2 ? GOLD : NAVY, color: t > 8.2 ? NAVY : '#fff', fontSize: 18, fontWeight: 700, transform: `scale(${t > 8.15 && t < 8.35 ? 0.95 : 1})` }}>{t > 8.3 ? 'Tersimpan ✓' : 'Simpan semua'}</div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 20, fontSize: 18 }}>
                <div style={{ padding: '8px 16px', borderRadius: 14, background: '#fff' }}>Modul · <b>Tenun Tidore – Modul Dasar</b></div>
                <div style={{ padding: '8px 16px', borderRadius: 14, background: status === 'Tervalidasi' ? 'rgba(212,184,102,0.35)' : '#fff', fontWeight: 700 }}>Status · {status} ▾</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, marginTop: 28, opacity: 0.5 }}>TAHAP</div>
              {['Mengenal alat tenun', 'Membuka celah (mulut) lungsi', 'Memasukkan benang pakan'].map((s, i) => (
                <div key={s} style={{ marginTop: 12, padding: '18px 22px', borderRadius: 18, background: '#fff', display: 'flex', gap: 16, alignItems: 'center', outline: i === 1 && t > 3.8 ? `3px solid ${GOLD}` : 'none', transform: `translateY(${(1 - sp(f, 2.8 + i * 0.12)) * 30}px)` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(212,184,102,0.3)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{s}</div>
                    {i === 1 && <div style={{ fontSize: 18, marginTop: 6 }}><span style={{ textDecoration: 'line-through', opacity: t > 4.3 ? 0.45 : 1 }}>Angkat pakan selang-seling</span>{t > 4.6 && <span style={{ marginLeft: 12, color: GOLDD, fontWeight: 700 }}>{fixed}</span>}</div>}
                  </div>
                  {t > 6.6 && <div style={{ padding: '6px 12px', borderRadius: 12, background: 'rgba(212,184,102,0.3)', fontSize: 14, fontWeight: 800, transform: `scale(${sp(f, 6.6 + i * 0.25, { damping: 10, stiffness: 260 })})` }}>✓ divalidasi</div>}
                </div>
              ))}
              <div style={{ marginTop: 22, padding: 18, borderRadius: 18, background: 'rgba(20,28,58,0.04)', fontSize: 17, opacity: ez(t, 7.4, 7.7) }}>
                <b>Riwayat perubahan modul</b><div style={{ marginTop: 8, opacity: 0.75 }}>Tahap 2 dikoreksi penenun sebelum diajarkan</div>
              </div>
            </div>
            {/* cap emas */}
            {t > 6.5 && (
              <div style={{ position: 'absolute', right: 60, top: 160, width: 230, height: 230, borderRadius: 115, border: `8px solid ${GOLD}`, color: GOLDD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30, transform: `rotate(-14deg) scale(${2 - stamp})`, opacity: Math.min(1, stamp * 1.5), background: 'rgba(255,255,255,0.6)' }}>
                <div style={{ fontSize: 60 }}>✓</div>TERVALIDASI<div style={{ fontSize: 15, letterSpacing: 2 }}>OLEH PENENUN</div>
              </div>
            )}
          </Laptop>
          <Finger path={[[3.6, 900, 1000], [3.9, 760, 470], [4.4, 760, 470], [6.2, 820, 300], [6.5, 820, 300], [7.9, 1450, 210], [8.25, 1450, 210]]} taps={[3.9, 6.5, 8.25]} />
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['salah', 'kualitas', 'diperiksa', 'penenun']} dark={(x) => x > 2.6} />
      <Sfx cues={[[0.2, 'whoosh', 0.3], [0.6, 'pop2', 0.4], [2.0, 'snap', 0.5], [2.6, 'whoosh', 0.35], [3.9, 'click', 0.5], ...Array.from({ length: 10 }, (_, i) => [4.6 + i * 0.12, 'tick', 0.15] as Cue), [6.5, 'click', 0.5], [6.62, 'impact', 0.6], [6.85, 'pop3', 0.3], [7.1, 'pop3', 0.3], [8.25, 'click', 0.5], [8.35, 'ding', 0.45]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MITRA · Puta Dino Kayangan, Tidore (tanpa narasi)
// ════════════════════════════════════════════════════════════════════════════
export const MITRA_SECONDS = 12.4;
const ORNAMEN: [string, string][] = [['jodati', 'ketulusan hati'], ['barakati', 'diberkati'], ['marasante', 'keberanian']];
const Mitra: React.FC = () => {
  const { f, t } = useT();
  const td = D.places.Tidore;
  const fly = io(t, 0.6, 2.0);
  const mapOut = 1 - ez(t, 2.3, 2.7);
  const knot = io(t, 3.0, 3.7);
  const part2 = t >= 6.0, part3 = t >= 8.9;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {mapOut > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: mapOut, transform: `translate(${(960 - td[0]) * fly}px, ${(540 - td[1]) * fly}px) scale(${1 + 1.6 * fly})`, transformOrigin: `${td[0]}px ${td[1]}px` }}>
          <DotMap lit={1} pins={[['Tidore', 1.7]]} />
        </div>
      )}
      {t > 2.3 && !part2 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: ez(t, 2.3, 2.6) * (1 - ez(t, 5.7, 6.0)) }}>
          <Kicker style={{ position: 'absolute', top: 210 }}>MITRA PENENUN</Kicker>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ width: 520, height: 260, borderRadius: 36, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', transform: `translateX(${(1 - knot) * -80}px)` }}>
              <Img src={staticFile('brand/partner-puta-dino-kayangan.png')} style={{ width: 430 }} />
            </div>
            <svg width={200} height={120}><path d={`M0 60 C 60 ${60 - 40 * knot}, 140 ${60 + 40 * knot}, 200 60`} fill="none" stroke={GOLD} strokeWidth={6} strokeDasharray={260} strokeDashoffset={260 * (1 - knot)} />{knot > 0.95 && <circle cx={100} cy={60} r={12 * sp(f, 3.7, { damping: 8, stiffness: 300 })} fill={GOLD} />}</svg>
            <div style={{ width: 260, height: 260, borderRadius: 36, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', transform: `translateX(${(1 - knot) * 80}px)` }}><Mark size={170} /></div>
          </div>
          <div style={{ position: 'absolute', top: 760, textAlign: 'center', fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, opacity: ez(t, 3.8, 4.1) }}>UKM Puta Dino Kayangan · Soasio, Tidore</div>
            <div style={{ fontSize: 26, marginTop: 14, opacity: ez(t, 4.4, 4.7) * 0.75 }}>Puta dino, kain warisan Kesultanan Tidore · sempat punah <b style={{ color: GOLDD }}>±{Math.round(100 * ez(t, 4.4, 5.2))} tahun</b> · ditenun kembali sejak <b style={{ color: GOLDD }}>2018</b> oleh Anitawati Gathmir</div>
          </div>
        </AbsoluteFill>
      )}
      {part2 && !part3 && (
        <AbsoluteFill style={{ opacity: ez(t, 6.0, 6.3) * (1 - ez(t, 8.6, 8.9)) }}>
          <div style={{ position: 'absolute', left: 150, top: 330, width: 560, fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD }}>KERJA SAMA 1</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, marginTop: 8 }}>Validasi materi bersama penenun</div>
          </div>
          {['Puta Dino motif Jodati', 'Puta Dino motif Barakati', 'Puta Dino motif Marasante'].map((s, i) => {
            const p = sp(f, 6.2 + i * 0.15);
            const st = sp(f, 6.9 + i * 0.45, { damping: 9, stiffness: 280 });
            return (
              <div key={s} style={{ position: 'absolute', left: 860, top: 230 + i * 200, width: 860, padding: '28px 32px', borderRadius: 26, background: '#fff', boxShadow: '0 24px 60px rgba(20,28,58,0.12)', fontFamily: FONT, color: NAVY, transform: `translateX(${(1 - p) * 200}px)`, opacity: p, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, opacity: 0.5 }}>MODUL · 6 TAHAP</div><div style={{ fontSize: 34, fontWeight: 800, marginTop: 6 }}>{s}</div></div>
                {t > 6.9 + i * 0.45 && <div style={{ padding: '10px 16px', borderRadius: 14, border: `3px solid ${GOLD}`, color: GOLDD, fontSize: 16, fontWeight: 900, letterSpacing: 1, transform: `rotate(-6deg) scale(${2 - st})`, opacity: Math.min(1, st * 1.6), textAlign: 'center' }}>DIPERIKSA BERSAMA<br />PENENUN PUTA DINO KAYANGAN</div>}
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      {part3 && (
        <AbsoluteFill style={{ opacity: ez(t, 8.9, 9.2) }}>
          <div style={{ position: 'absolute', left: 150, top: 150, fontFamily: FONT, color: NAVY }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: GOLDD }}>KERJA SAMA 2</div>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, marginTop: 8 }}>Arsip mitra jadi materi belajar</div>
          </div>
          {ORNAMEN.map(([n, m], i) => {
            const k = io(t, 9.4 + i * 0.25, 10.3 + i * 0.25);
            return (
              <div key={n} style={{ position: 'absolute', left: 150 + i * 560, top: 400, width: 500, height: 430, borderRadius: 30, overflow: 'hidden', background: '#fff', boxShadow: '0 24px 60px rgba(20,28,58,0.14)', transform: `rotate(${(1 - k) * (i - 1) * 8}deg) translateY(${(1 - k) * 60}px)` }}>
                <div style={{ height: 200, position: 'relative', background: k < 0.5 ? '#efe6d3' : NAVY, transition: 'none' }}>
                  {k < 0.5 ? (
                    <div style={{ padding: 26, fontFamily: FONT, color: NAVY }}>
                      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, opacity: 0.55 }}>ARSIP</div>
                      {[0, 1, 2, 3].map((j) => <div key={j} style={{ height: 10, borderRadius: 5, background: 'rgba(20,28,58,0.15)', marginTop: 16, width: `${90 - j * 15}%` }} />)}
                    </div>
                  ) : (
                    <svg width={500} height={200} viewBox="0 0 500 200">{Array.from({ length: 10 }, (_, c) => Array.from({ length: 4 }, (_, r) => { const d = Math.abs(((c * 50 + 25) % 100) - 50) + Math.abs(((r * 50 + 25) % 100) - 50); return <rect key={c + '-' + r} x={c * 50 + 10} y={r * 50 + 10} width={30} height={30} transform={`rotate(45 ${c * 50 + 25} ${r * 50 + 25})`} fill={d < 30 ? GOLD : 'rgba(245,239,226,0.2)'} />; }))}</svg>
                  )}
                </div>
                <div style={{ padding: 26, fontFamily: FONT, color: NAVY, opacity: ez(k, 0.4, 1) }}>
                  <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, opacity: 0.5 }}>MODUL · ORNAMEN PUTA DINO</div>
                  <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, marginTop: 4 }}>{n}</div>
                  <div style={{ fontSize: 22, color: GOLDD, fontWeight: 700 }}>makna: {m}</div>
                </div>
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, textAlign: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: NAVY, opacity: ez(t, 11.0, 11.4) }}>Bersama penenun. <span style={{ color: GOLDD }}>Dari arsip mitra.</span></div>
        </AbsoluteFill>
      )}
      <Sfx cues={[[0.4, 'whoosh', 0.45], [1.7, 'impact', 0.5], [2.3, 'whoosh', 0.3], [3.7, 'snap', 0.5], [3.8, 'ding', 0.45], [4.4, 'tick', 0.3], [6.0, 'whoosh', 0.35], ...[0, 1, 2].map((i) => [6.9 + i * 0.45, 'impact', 0.4] as Cue), [8.9, 'whoosh', 0.35], ...[0, 1, 2].map((i) => [9.6 + i * 0.25, 'pop', 0.4] as Cue), [11.0, 'ding', 0.35]]} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 15 · "Penenun tidak tergantikan… akses dari mana saja" Andrew + jaringan
// ════════════════════════════════════════════════════════════════════════════
const NET: P2[] = [[1500, 300], [1700, 420], [1760, 610], [1640, 800], [1420, 880], [1230, 760], [1180, 520], [1300, 330], [1600, 560], [1390, 620]];
const S15: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Penenun', 0.43], ['tidak', 1.19], ['tergantikan.', 1.87], ['Dengan', 2.89], ['BelajarTenun,', 3.33], ['akses', 4.51], ['ke', 4.87], ['mereka', 4.99], ['terbuka', 5.29], ['untuk', 6.17], ['lebih', 6.35], ['banyak', 6.67], ['murid,', 7.03], ['dari', 7.55], ['mana', 7.95], ['saja.', 8.11]], 0.2);
  const slide = io(t, 2.6, 3.3);
  const C: P2 = [1470, 590];
  return (
    <AbsoluteFill>
      <Andrew src="footage/7637a-full.mp4" from={0.2} slide={slide} push={0.06 * io(t, 0, 2.5)} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: slide }}>
        {NET.map(([x, y], i) => { const a = 4.4 + i * 0.12; const k = ez(t, a, a + 0.4); return <line key={i} x1={C[0]} y1={C[1]} x2={C[0] + (x - C[0]) * k} y2={C[1] + (y - C[1]) * k} stroke={GOLD} strokeWidth={3} opacity={0.9} />; })}
        {NET.map(([x, y], i) => { const s = sp(f, 4.7 + i * 0.12, { damping: 10, stiffness: 240 }); return t > 4.7 + i * 0.12 && <g key={'d' + i}><circle cx={x} cy={y} r={14 * s} fill="#fff" /></g>; })}
        <circle cx={C[0]} cy={C[1]} r={30 * sp(f, 3.3, { damping: 10, stiffness: 200 })} fill={GOLD} stroke="#fff" strokeWidth={5} />
        <text x={C[0]} y={C[1] + 66} textAnchor="middle" fontFamily={FONT} fontSize={24} fontWeight={800} fill="#fff" opacity={ez(t, 3.5, 3.8)}>penenun</text>
      </svg>
      <Captions words={words} keys={['tergantikan', 'akses', 'murid', 'mana']} />
      <Sfx cues={[[2.6, 'whoosh', 0.3], [3.3, 'impact', 0.4], ...NET.map((_, i) => [4.7 + i * 0.12, 'pop3', 0.22] as Cue)]} />
    </AbsoluteFill>
  );
};

// 16 · catatan sesi (Selesai.tsx) di samping Andrew
const S16: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Setiap', 0.18], ['sesi', 0.86], ['meninggalkan', 1.24], ['catatan:', 2.06], ['apa', 2.7], ['yang', 3.14], ['sudah', 3.28], ['bisa,', 3.46], ['apa', 4.52], ['yang', 4.76], ['membingungkan.', 4.9]]);
  const slide = io(t, 0.0, 0.6);
  const pin = sp(f, 0.3, { damping: 18, stiffness: 120 });
  return (
    <AbsoluteFill>
      <Andrew src="footage/7637b-full.mp4" from={0} slide={slide} />
      <Phone x={1230} y={120} w={420} h={840} style={{ transform: `translateY(${(1 - pin) * 900}px) rotate(${(1 - pin) * 8}deg)` }}>
        <div style={{ padding: 30 }}>
          <Kicker>SESI SELESAI</Kicker>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>{[['Tahap dicapai', 4, '/5'], ['Pertanyaan', 4, ''], ['Dicatat', 1, '']].map(([l, v, u]) => <div key={l as string} style={{ flex: 1, padding: 12, borderRadius: 16, background: '#fff' }}><div style={{ fontSize: 30, fontWeight: 900 }}>{Math.round((v as number) * ez(t, 0.9, 1.8))}<span style={{ fontSize: 14 }}>{u}</span></div><div style={{ fontSize: 12, opacity: 0.6 }}>{l}</div></div>)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, marginTop: 26, opacity: 0.5 }}>SUDAH BISA</div>
          {['Mengenal alat tenun', 'Membuka celah lungsi', 'Memasukkan benang pakan'].map((s, i) => <div key={s} style={{ marginTop: 10, padding: 14, borderRadius: 14, background: '#fff', display: 'flex', gap: 10, alignItems: 'center', fontSize: 18, fontWeight: 700, transform: `translateX(${(1 - sp(f, 2.9 + i * 0.18)) * 200}px)` }}><span style={{ color: GOLDD, fontSize: 22 }}>✓</span>{s}</div>)}
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, marginTop: 22, opacity: 0.5 }}>MEMBINGUNGKAN</div>
          <div style={{ marginTop: 10, padding: 14, borderRadius: 14, background: 'rgba(212,184,102,0.3)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 18, fontWeight: 700, transform: `translateX(${(1 - sp(f, 4.6)) * 200}px)` }}><span style={{ fontSize: 22 }}>?</span>Kalau benang putus</div>
        </div>
      </Phone>
      <Captions words={words} keys={['catatan', 'bisa', 'membingungkan']} />
      <Sfx cues={[[0.3, 'whoosh', 0.35], ...[0, 1, 2].map((i) => [2.9 + i * 0.18, 'tick', 0.4] as Cue), [4.6, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// 17 · progres.html: grafik per tahap, tahap tersulit diperbaiki
const S17: React.FC = () => {
  const { t } = useT();
  const words = W([['Dari', 0.0], ['situ', 0.12], ['kami', 0.42], ['bisa', 0.7], ['mengukur', 0.88], ['efektivitasnya', 1.26], ['dan', 2.14], ['memperbaiki', 2.46], ['tahap', 2.88], ['yang', 3.36], ['paling', 3.52], ['sulit.', 3.76]]);
  // Hasil `npm run eval:qa` (data/eval/qa.json, 70 soal pemula): tingkat retrieval benar per jenis soal
  const rows: [string, number, number][] = [['Parafrase', 0.774, 31], ['Di luar cakupan', 0.75, 12], ['Butuh validasi', 0.933, 15], ['Jebakan budaya', 0.083, 12]];
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Laptop x={300} y={100} w={1320} h={820} url="belajartenun.com · npm run eval:qa" style={{ transform: `scale(${0.96 + 0.04 * ez(t, 0, 0.5)})` }}>
        <div style={{ padding: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>Evaluasi tanya jawab</div>
            <div style={{ fontSize: 18, opacity: 0.6 }}>70 soal pemula · Recall@3 <b>82,6%</b></div>
          </div>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', height: 440, marginTop: 40 }}>
            {rows.map(([n, v, c], i) => {
              const h = v * ez(t, 0.3 + i * 0.12, 1.0 + i * 0.12);
              const hard = i === 3 && t > 2.4;
              return (
                <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: hard ? GOLDD : NAVY }}>{(h * 100).toFixed(1).replace('.', ',')}%</div>
                  <div style={{ width: '100%', height: Math.max(8, 400 * h), borderRadius: 14, background: hard ? GOLD : NAVY, outline: hard ? `4px solid ${GOLD}` : 'none', outlineOffset: 6 }} />
                  <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.75, textAlign: 'center' }}>{n}<div style={{ fontSize: 14, opacity: 0.6 }}>{c} soal</div></div>
                </div>
              );
            })}
          </div>
          {t > 2.4 && <div style={{ position: 'absolute', right: 40, top: 110, padding: '14px 20px', borderRadius: 16, background: 'rgba(212,184,102,0.3)', fontSize: 18, fontWeight: 800, opacity: ez(t, 2.4, 2.7) }}>Paling sulit → diperbaiki berikutnya</div>}
        </div>
      </Laptop>
      <Captions words={words} keys={['mengukur', 'efektivitas', 'memperbaiki', 'sulit']} dark={() => true} />
      <Sfx cues={[...rows.map((_, i) => [0.3 + i * 0.12, 'tick', 0.35] as Cue), [2.45, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// 18 · arsip publik → kain tertenun kembali ("lestari")
const S18: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Pengetahuan', 0.0], ['yang', 0.76], ['sudah', 0.98], ['divalidasi', 1.24], ['kami', 1.88], ['buka', 2.4], ['sebagai', 2.88], ['arsip', 3.2], ['tenun', 3.76], ['publik,', 3.98], ['supaya', 4.88], ['terus', 5.42], ['lestari.', 5.78]]);
  const slide = io(t, 0.0, 0.6);
  const weave = t >= 4.6;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!weave && <Andrew src="footage/7639-full.mp4" from={0} slide={slide} />}
      {!weave && (
        <div style={{ position: 'absolute', left: 1180, top: 190, width: 600, fontFamily: FONT }}>
          {['Tenun Tidore – Modul Dasar', 'Puta Dino motif Jodati', 'Puta Dino motif Barakati', 'Tanya jawab · 22 entri'].map((n, i) => {
            const p = sp(f, 1.3 + i * 0.25, { damping: 16, stiffness: 150 });
            return <div key={n} style={{ marginTop: 14, padding: '20px 24px', borderRadius: 20, ...glassCard(0.85), color: NAVY, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transform: `translateX(${(1 - p) * 300}px)`, opacity: p }}><div><div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: GOLDD }}>SETELAH DIVALIDASI</div><div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div></div><div style={{ fontSize: 26 }}>⤓</div></div>;
          })}
          <div style={{ marginTop: 26, padding: '16px 24px', borderRadius: 30, background: GOLD, color: NAVY, fontSize: 24, fontWeight: 800, textAlign: 'center', transform: `scale(${sp(f, 3.2, { damping: 10, stiffness: 220 })})` }}>Arsip tenun terbuka · unduh bebas</div>
        </div>
      )}
      {weave && <Sequence from={F(4.6)}><OffthreadVideo src={staticFile('3d/reweave.mp4')} muted /></Sequence>}
      {weave && <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: NAVY, opacity: ez(t, 5.6, 6.0) }}>LESTARI</div>}
      <Captions words={words} keys={['divalidasi', 'arsip', 'publik', 'lestari']} dark={(x) => x > 4.6} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], ...[0, 1, 2, 3].map((i) => [1.3 + i * 0.25, 'pop3', 0.3] as Cue), [3.2, 'pop', 0.45], [4.6, 'whoosh', 0.35], [4.8, 'riser', 0.3], [6.0, 'ding', 0.4]]} />
    </AbsoluteFill>
  );
};

// 19 · tutorial vs kelas → BelajarTenun menggabungkan keduanya → mata · koreksi · penenun
const S19: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Video', 0.4], ['tutorial', 1.06], ['tidak', 1.48], ['bisa', 2.2], ['melihat', 2.54], ['kesalahan', 2.82], ['kita.', 3.22], ['Kelas', 4.38], ['tatap', 4.9], ['muka', 5.12], ['terbatas', 5.42], ['tempat', 6.1], ['dan', 6.46], ['waktunya.', 6.58], ['BelajarTenun', 7.58], ['menggabungkan', 8.22], ['keduanya:', 8.94], ['melihat', 9.98], ['dari', 10.52], ['mata', 10.86], ['murid,', 11.06], ['mengoreksi', 11.42], ['saat', 12.24], ['itu', 12.46], ['juga,', 12.62], ['dan', 13.04], ['tetap', 13.64], ['setia', 14.14], ['pada', 14.82], ['ilmu', 15.02], ['penenunnya.', 15.34]], 0.2);
  const merge = io(t, 7.3, 8.4);
  const andrewOn = t >= 9.3;
  const slide = io(t, 9.3, 9.9);
  const left = ez(t, 0.1, 0.5), right = ez(t, 3.9, 4.3);
  const ICONS: [string, number, string][] = [['mata', 9.75, 'Melihat dari mata murid'], ['koreksi', 11.2, 'Mengoreksi saat itu juga'], ['penenun', 13.4, 'Setia pada ilmu penenun']];
  const gIn = sp(f, 8.0, { damping: 16, stiffness: 120 });
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {!andrewOn && (
        <>
          {/* kiri: video tutorial */}
          <div style={{ position: 'absolute', left: 110 + merge * 500, top: 200, width: 780, height: 520, borderRadius: 30, background: '#fff', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', opacity: left * (1 - merge), transform: `scale(${1 - merge * 0.4})`, fontFamily: FONT, color: NAVY, overflow: 'hidden' }}>
            <div style={{ height: 380, background: NAVY, position: 'relative' }}>
              <OffthreadVideo src={staticFile('ref/proses.mp4')} startFrom={F(3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,0.3)' }}><div style={{ height: '100%', width: `${30 + t * 6}%`, background: GOLD }} /></div>
            </div>
            <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 30, fontWeight: 800 }}>Video tutorial</div>{t > 2.6 && <div style={{ fontSize: 22, fontWeight: 800, color: GOLDD, opacity: ez(t, 2.6, 2.9) }}>✗ tidak melihat kesalahanmu</div>}</div>
          </div>
          {/* kanan: kelas tatap muka */}
          <div style={{ position: 'absolute', left: 1030 - merge * 500, top: 200, width: 780, height: 520, borderRadius: 30, background: '#fff', boxShadow: '0 30px 80px rgba(20,28,58,0.14)', opacity: right * (1 - merge), transform: `scale(${1 - merge * 0.4}) translateY(${(1 - right) * 40}px)`, fontFamily: FONT, color: NAVY, padding: 34, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 30, fontWeight: 800 }}>Kelas tatap muka</div><div style={{ fontSize: 22, fontWeight: 700, opacity: 0.6 }}>satu tempat · jadwal tetap</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16, marginTop: 36 }}>{Array.from({ length: 32 }, (_, i) => <div key={i} style={{ height: 44, borderRadius: 12, background: t > 5.0 + i * 0.02 ? NAVY : 'rgba(20,28,58,0.1)' }} />)}</div>
            {t > 5.8 && <div style={{ marginTop: 30, fontSize: 22, fontWeight: 800, color: GOLDD, opacity: ez(t, 5.8, 6.1) }}>Penuh · terbatas tempat & waktu</div>}
          </div>
          {/* gabungan: kacamata + HP */}
          {merge > 0 && (
            <div style={{ position: 'absolute', inset: 0, opacity: gIn }}>
              <Img src={staticFile('3d/glasses-still.png')} style={{ position: 'absolute', left: -240, top: 40, width: 1920, height: 1080, transform: `scale(${0.8 + 0.2 * gIn})` }} />
            </div>
          )}
        </>
      )}
      {andrewOn && (
        <>
          <Andrew src="footage/7639new-full.mp4" from={0.2 + 9.3} slide={slide} />
          <div style={{ position: 'absolute', left: 1180, top: 210, fontFamily: FONT }}>
            {ICONS.map(([k, at, lab], i) => {
              const p = sp(f, at, { damping: 12, stiffness: 200 });
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 40, opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * 80}px)` }}>
                  <div style={{ width: 120, height: 120, borderRadius: 60, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      {k === 'mata' && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
                      {k === 'koreksi' && <path d="M4 12l5 5L20 6" />}
                      {k === 'penenun' && <><path d="M6 3v18M12 3v18M18 3v18" /><path d="M3 8h18M3 15h18" stroke={'#fff'} /></>}
                    </svg>
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: -1, textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}>{lab}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <Captions words={words} keys={['tutorial', 'kesalahan', 'kelas', 'terbatas', 'menggabungkan', 'melihat', 'mengoreksi', 'penenun']} dark={(x) => x < 9.3} />
      <Sfx cues={[[0.1, 'whoosh', 0.3], [2.6, 'snap', 0.4], [3.9, 'whoosh', 0.3], ...Array.from({ length: 6 }, (_, i) => [5.0 + i * 0.1, 'tick', 0.2] as Cue), [7.3, 'whoosh', 0.4], [8.1, 'impact', 0.5], [9.3, 'whoosh', 0.3], [9.75, 'pop', 0.45], [11.2, 'pop', 0.45], [13.4, 'pop', 0.45]]} />
    </AbsoluteFill>
  );
};

// 20 · uji deteksi tahap: video berlabel → kotak uji → 87% (mockup)
const S20: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Kami', 0.0], ['menguji', 0.52], ['deteksi', 1.36], ['tahapnya', 1.62], ['dengan', 2.12], ['berbagai', 2.46], ['video', 2.88], ['tenun', 3.28], ['berlabel', 3.72], ['dari', 4.14], ['berbagai', 4.86], ['tradisi.', 5.22]]);
  const pct = Math.round(87 * ez(t, 3.6, 5.2));
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      {REFS.slice(0, 5).map(([src, lab], i) => {
        const k = ((t * 0.55 + i / 5) % 1);
        const x = 80 + k * 700, y = 180 + i * 150;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: 260, height: 130, borderRadius: 18, overflow: 'hidden', opacity: Math.min(1, k * 5) * (1 - ez(k, 0.85, 1)), transform: `scale(${1 - k * 0.3})`, boxShadow: '0 16px 40px rgba(20,28,58,0.18)' }}>
            <OffthreadVideo src={staticFile(src)} startFrom={F(4 + i * 2)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', left: 8, bottom: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,239,226,0.92)', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: NAVY }}>{lab} · berlabel</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 980, top: 180, width: 820, height: 720, borderRadius: 36, ...glassCard(0.9), fontFamily: FONT, color: NAVY, padding: 44, boxSizing: 'border-box' }}>
        <Kicker>UJI DETEKSI TAHAP</Kicker>
        <div style={{ fontSize: 26, marginTop: 14, lineHeight: 1.45, opacity: ez(t, 0.4, 0.8) }}>Setiap video diberi <b>label waktu selesai tiap tahap oleh penenun</b>, lalu dibandingkan dengan tahap yang dideteksi AI.</div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, marginTop: 34, opacity: 0.5 }}>GERBANG RILIS</div>
        {[['Tahap tepat waktu', '≥ 70%'], ['Maju terlalu cepat', '≤ 5%']].map(([a, v], i) => (
          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '20px 24px', borderRadius: 20, background: '#fff', transform: `translateX(${(1 - sp(f, 2.4 + i * 0.4)) * 80}px)`, opacity: Math.min(1, sp(f, 2.4 + i * 0.4) * 1.3) }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{a}</div><div style={{ fontSize: 48, fontWeight: 900, color: GOLDD }}>{v}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 44, right: 44, bottom: 40, fontSize: 18, opacity: 0.6 }}>Uji berjalan dengan rekaman berlabel dari berbagai tradisi.</div>
      </div>
      <Captions words={words} keys={['menguji', 'deteksi', 'berlabel', 'tradisi']} dark={() => true} />
      <Sfx cues={[[0.0, 'whoosh', 0.3], [2.4, 'pop', 0.4], [2.8, 'pop', 0.4]]} />
    </AbsoluteFill>
  );
};

// 22 · sanggar & sekolah → penghasilan ke penenun → murid baru memperluas ilmu
const S22: React.FC = () => {
  const { f, t } = useT();
  const words = W([['Kami', 0.62], ['mulai', 1.16], ['dari', 1.56], ['sanggar', 2.0], ['dan', 2.54], ['sekolah.', 2.96], ['Setiap', 3.74], ['modul', 4.54], ['yang', 5.02], ['divalidasi', 5.52], ['memberikan', 6.18], ['penghasilan', 6.76], ['kepada', 7.48], ['para', 7.82], ['penenun,', 8.22], ['dan', 9.04], ['setiap', 9.34], ['murid', 9.72], ['baru', 10.0], ['dapat', 10.32], ['memperluas', 10.6], ['ilmu', 11.26], ['mereka.', 11.54]], 0.4);
  const slide = io(t, 0.3, 0.9);
  const phase = t < 3.3 ? 0 : t < 8.6 ? 1 : 2;
  const W0: P2 = [1520, 560];
  return (
    <AbsoluteFill>
      <Andrew src="footage/7643a-full.mp4" from={0.4} slide={slide} />
      {phase === 0 && (
        <div style={{ position: 'absolute', left: 1160, top: 250, display: 'flex', gap: 30, fontFamily: FONT }}>
          {[['Sanggar', 1.55], ['Sekolah', 2.5]].map(([n, a]) => { const p = sp(f, a as number, { damping: 11, stiffness: 220 }); return <div key={n as string} style={{ width: 300, padding: 30, borderRadius: 30, ...glassCard(0.88), color: NAVY, textAlign: 'center', transform: `scale(${p})` }}><div style={{ fontSize: 70 }}>{n === 'Sanggar' ? '🧵' : '🏫'}</div><div style={{ fontSize: 34, fontWeight: 800, marginTop: 10 }}>{n}</div></div>; })}
          <div style={{ position: 'absolute', top: 330, left: 0, right: 0, padding: 18, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', gap: 16, opacity: ez(t, 2.8, 3.1) }}><Img src={staticFile('brand/partner-puta-dino-kayangan.png')} style={{ height: 60 }} /><span style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>bersama mitra penenun</span></div>
        </div>
      )}
      {phase >= 1 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {phase === 1 && (
            <g opacity={ez(t, 3.3, 3.6)}>
              <rect x={1150} y={250} width={260} height={150} rx={22} fill="#fff" />
              <text x={1280} y={315} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={800} fill={GOLDD}>✓ MODUL</text>
              <text x={1280} y={355} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill={NAVY}>divalidasi</text>
              {Array.from({ length: 8 }, (_, i) => { const k = ((t - 6.4 - i * 0.18) / 1.0); if (k < 0 || k > 1) return null; const x = 1410 + (W0[0] + 40 - 1410) * k, y = 330 + (W0[1] - 330) * k - Math.sin(k * Math.PI) * 120; return <g key={i}><circle cx={x} cy={y} r={22} fill={GOLD} stroke="#fff" strokeWidth={3} /><text x={x} y={y + 8} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={900} fill={NAVY}>Rp</text></g>; })}
            </g>
          )}
          <circle cx={W0[0] + 40} cy={W0[1] + 60} r={46 * sp(f, 3.6, { damping: 12, stiffness: 180 })} fill={GOLD} stroke="#fff" strokeWidth={5} />
          <text x={W0[0] + 40} y={W0[1] + 150} textAnchor="middle" fontFamily={FONT} fontSize={26} fontWeight={800} fill="#fff" opacity={ez(t, 3.8, 4.1)}>penenun</text>
          {phase === 2 && Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2, r = 170 + (i % 3) * 70; const at = 9.0 + i * 0.12; const k = ez(t, at, at + 0.4);
            const x = W0[0] + 40 + Math.cos(a) * r * k, y = W0[1] + 60 + Math.sin(a) * r * 0.8 * k;
            return <g key={i} opacity={k}><line x1={W0[0] + 40} y1={W0[1] + 60} x2={x} y2={y} stroke={GOLD} strokeWidth={2.5} /><circle cx={x} cy={y} r={12} fill="#fff" /></g>;
          })}
        </svg>
      )}
      {phase >= 1 && t > 6.6 && t < 8.6 && <div style={{ position: 'absolute', left: 1180, top: 840, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff', opacity: ez(t, 6.7, 7.0) }}>penghasilan untuk penenun</div>}
      <Captions words={words} keys={['sanggar', 'sekolah', 'penghasilan', 'penenun', 'murid', 'memperluas']} />
      <Sfx cues={[[0.3, 'whoosh', 0.3], [1.55, 'pop', 0.45], [2.5, 'pop', 0.45], [3.3, 'whoosh', 0.3], [3.6, 'impact', 0.35], ...Array.from({ length: 8 }, (_, i) => [7.3 + i * 0.18, 'pop3', 0.25] as Cue), ...Array.from({ length: 14 }, (_, i) => [9.0 + i * 0.12, 'tick', 0.15] as Cue)]} />
    </AbsoluteFill>
  );
};

// 23 · peta Indonesia → dunia
const S23: React.FC = () => {
  const { t } = useT();
  const words = W([['Dari', 0.72], ['satu', 1.42], ['tradisi', 1.62], ['ke', 2.18], ['seluruh', 2.8], ['tradisi', 3.32], ['Indonesia,', 3.62], ['dari', 4.4], ['Indonesia', 4.9], ['ke', 5.36], ['dunia.', 6.08]], 0.4);
  const world = io(t, 4.4, 5.4);
  const pins: [string, number][] = [['Tidore', 0.9], ['Lombok', 2.4], ['NTT', 2.55], ['Silungkang', 2.7], ['Sumut', 2.85], ['Jawa', 3.0], ['Kalimantan', 3.15], ['Sulawesi', 3.3], ['Papua', 3.45], ['Bali', 3.6]];
  const ID: P2 = [1495, 600];
  const ARCS: P2[] = [[420, 330], [950, 300], [1000, 560], [620, 640], [1780, 780], [300, 450]];
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 - world * 0.75}) translate(${world * 1050}px, ${world * 120}px)`, transformOrigin: '50% 50%', opacity: 1 - ez(t, 5.0, 5.5) }}>
        <DotMap lit={io(t, 0.2, 1.6)} pins={pins} />
      </div>
      {world > 0 && (
        <AbsoluteFill style={{ opacity: world }}>
          <DotMap lit={0} world={1} />
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            {ARCS.map(([x, y], i) => { const k = ez(t, 5.4 + i * 0.12, 6.2 + i * 0.12); const mx = (ID[0] + x) / 2, my = Math.min(ID[1], y) - 180; return <g key={i}><path d={`M${ID[0]} ${ID[1]} Q ${mx} ${my} ${x} ${y}`} fill="none" stroke={GOLD} strokeWidth={4} strokeDasharray={1600} strokeDashoffset={1600 * (1 - k)} />{k > 0.98 && <circle cx={x} cy={y} r={10} fill={GOLD} />}</g>; })}
          </svg>
        </AbsoluteFill>
      )}
      <Captions words={words} keys={['satu', 'seluruh', 'indonesia', 'dunia']} dark={() => true} />
      <Sfx cues={[...pins.map(([, a]) => [a, 'pop3', 0.25] as Cue), [4.4, 'whoosh', 0.45], [5.6, 'impact', 0.4]]} />
    </AbsoluteFill>
  );
};

// 25 · penutup Andrew
const S25: React.FC = () => {
  const { t } = useT();
  const words = W([['BelajarTenun.', 0.08], ['Belajar', 1.48], ['menenun,', 1.92], ['dipandu', 2.58], ['ilmu', 3.46], ['Nusantara.', 4.44]]);
  const sweep = ez(t, 4.3, 5.4);
  return (
    <AbsoluteFill>
      <Andrew src="footage/7643b-full.mp4" from={0} slide={0} push={0.07 * io(t, 0, 6.4)} />
      <AbsoluteFill style={{ background: `linear-gradient(105deg, rgba(212,184,102,0) ${sweep * 120 - 30}%, rgba(212,184,102,0.22) ${sweep * 120 - 15}%, rgba(212,184,102,0) ${sweep * 120}%)` }} />
      <Captions words={words} keys={['belajartenun', 'nusantara']} />
      <Sfx cues={[[3.6, 'riser', 0.3]]} />
    </AbsoluteFill>
  );
};

// ── susunan ──────────────────────────────────────────────────────────────────
type Row = [string, number, React.ReactNode, { src: string; from: number } | null];
const ROWS: Row[] = [
  ['B1', B1V7_SECONDS, <Babak1V7 music={false} />, null],
  ['ALUR', ALUR_SECONDS, <Alur />, null],
  ['05', 8.3, <S05 />, { src: 'audio/7635b-clean.wav', from: 0.6 }],
  ['06', 10.1, <S06 />, { src: 'audio/7635a-clean.wav', from: 0 }],
  ['07', 9.2, <S07 />, { src: 'audio/7636-clean.wav', from: 0 }],
  ['MITRA', MITRA_SECONDS, <Mitra />, null],
  ['B3', LEARN_SECONDS, <Learn />, null],
  ['15', 8.4, <S15 />, { src: 'audio/7637a-clean.wav', from: 0.2 }],
  ['16', 5.8, <S16 />, { src: 'audio/7637b-clean.wav', from: 0 }],
  ['17', 4.6, <S17 />, { src: 'audio/7637c-clean.wav', from: 0 }],
  ['18', 6.8, <S18 />, { src: 'audio/7639-clean.wav', from: 0 }],
  ['19', 16.4, <S19 />, { src: 'audio/7639new-clean.wav', from: 0.2 }],
  ['20', 6.6, <S20 />, { src: 'audio/7643c-clean.wav', from: 0 }],
  ['22', 11.8, <S22 />, { src: 'audio/7643a-clean.wav', from: 0.4 }],
  ['23', 7.2, <S23 />, { src: 'audio/7643new-clean.wav', from: 0.4 }],
  ['24', 3.9, <S24 />, null],
  ['25', 6.4, <S25 />, { src: 'audio/7643b-clean.wav', from: 0 }],
  ['26', 4.6, <S26 />, null],
];
const STARTS = ROWS.reduce<number[]>((a, r, i) => [...a, i === 0 ? 0 : a[i - 1] + ROWS[i - 1][1]], []);
export const FULL7_SECONDS = Math.ceil(STARTS[STARTS.length - 1] + ROWS[ROWS.length - 1][1]);
const QUIET = new Set(['ALUR', 'MITRA', '24', '26']); // tanpa suara: musik lebih keras
const B1_SPEECH: [number, number][] = [[0.3, 4.6], [5.0, 13.6], [13.8, 18.4], [18.8, 29.6]];
const musicVol = (s: number) => {
  const i = STARTS.findIndex((st, k) => s >= st && s < st + ROWS[k][1]);
  if (i < 0) return 0.1;
  const id = ROWS[i][0];
  if (id === 'B1') return B1_SPEECH.some(([a, b]) => s > a && s < b) ? 0.05 : 0.12;
  if (QUIET.has(id)) return 0.17;
  if (id === 'B3') return 0.035;
  return 0.05;
};
export const FullVideo7: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    {ROWS.map(([id, dur, el, audio], i) => (
      <Sequence key={id} from={F(STARTS[i])} durationInFrames={F(dur)}>
        {el}
        {audio && <Audio src={staticFile(audio.src)} startFrom={F(audio.from)} endAt={F(audio.from + dur)} />}
      </Sequence>
    ))}
    <Audio src={staticFile('audio/music-bed.wav')} endAt={F(206)} volume={(fr) => musicVol(fr / FPS) * Math.min(1, (206 - fr / FPS) / 2)} />
    <Sequence from={F(205)}><Audio src={staticFile('audio/music-bed.wav')} startFrom={F(40)} volume={(fr) => musicVol(205 + fr / FPS) * Math.min(1, fr / 90)} /></Sequence>
  </AbsoluteFill>
);
