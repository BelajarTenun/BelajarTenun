import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO, SANS, SERIF } from './theme';

// Uji gaya (±21 dtk) memakai footage & suara asli:
// A. Andrew bertanya (IMG_7648) + penanda kamera kacamata + pertanyaan melayang
// B. Whip ke HP: web app, kacamata tersambung, transkrip, tutor menjawab (T1)
// C. Feed kamera di HP membesar jadi POV (IMG_7653) + label LUNGSI

const FPS = 30;
const s = (x: number) => Math.round(x * FPS);
const cl = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const ease = (f: number, a: number, b: number, e = Easing.out(Easing.exp)) => interpolate(f, [a, b], [0, 1], { ...cl, easing: e });
const INK = '#20262E', SOFT = '#7C858F', PAPER = '#EEEEEA', BLUE = '#5B9BF0';

// Kata muncul: blur 6→0, tanpa geser, lalu diam.
const Words: React.FC<{ text: string; at: number; gap?: number; style?: React.CSSProperties }> = ({ text, at, gap = 2, style }) => {
  const f = useCurrentFrame();
  return (
    <span style={style}>
      {text.split(' ').map((w, i) => {
        const p = ease(f, at + i * gap, at + i * gap + 5);
        return <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: p, filter: `blur(${(1 - p) * 6}px)` }}>{w}</span>;
      })}
    </span>
  );
};

// ── A · Andrew bertanya ──────────────────────────────────────────────────────
const ShotA: React.FC = () => {
  const f = useCurrentFrame();
  const tag = ease(f, s(0.4), s(0.9));
  const ring = interpolate(f % 45, [0, 44], [0, 1]);
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('footage/7648.mp4')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* titik kamera di gagang kacamata */}
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <circle cx={1052} cy={318} r={10 + ring * 26} fill="none" stroke="#fff" strokeWidth={1.5} opacity={(1 - ring) * 0.8 * tag} />
        <circle cx={1052} cy={318} r={5} fill={BLUE} opacity={tag} />
        <path d={`M1060 312 L${1060 + 110 * tag} 210 L${1060 + 260 * tag} 210`} stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} fill="none" />
      </svg>
      <div style={{ position: 'absolute', left: 1180, top: 172, opacity: tag, fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>[ KAMERA KACAMATA · AKTIF ]</div>
      {/* pertanyaan melayang (tinta di atas latar terang) */}
      <div style={{ position: 'absolute', left: 1240, top: 420, width: 640, fontFamily: SERIF, fontSize: 64, lineHeight: 1.12, color: INK }}>
        <Words text="Langkah pertama," at={s(2.9)} gap={3} />
        <br />
        <Words text="aku harus apa?" at={s(4.3)} gap={3} />
      </div>
    </AbsoluteFill>
  );
};

// ── B · HP: web app + transkrip + tutor menjawab ─────────────────────────────
const T1 = 'Halo, kita mulai dari mengenal alat dulu ya. Benang yang tegak ini namanya lungsi. Angkat selang-seling supaya celahnya terbuka.';
const Phone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: 'absolute', width: 430, height: 900, borderRadius: 64, background: '#0E0F10', padding: 12, boxShadow: '0 40px 90px rgba(20,24,30,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset', ...style }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 52, overflow: 'hidden', background: '#F6F6F3' }}>
      <div style={{ position: 'absolute', left: '50%', top: 12, width: 110, height: 30, marginLeft: -55, borderRadius: 20, background: '#0E0F10', zIndex: 5 }} />
      {children}
    </div>
  </div>
);
const Bubble: React.FC<{ me?: boolean; at: number; children: React.ReactNode }> = ({ me, at, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - at, fps, config: { damping: 18, stiffness: 160, mass: 0.7 } });
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '84%', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 14}px) scale(${0.96 + p * 0.04})`, transformOrigin: me ? 'right bottom' : 'left bottom', background: me ? INK : '#fff', color: me ? '#fff' : INK, borderRadius: 18, borderBottomRightRadius: me ? 4 : 18, borderBottomLeftRadius: me ? 18 : 4, padding: '10px 14px', fontFamily: SANS, fontSize: 16, lineHeight: 1.4, boxShadow: me ? 'none' : '0 2px 10px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  );
};
const ShotB: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 20, stiffness: 90, mass: 1 } });
  const connected = f > s(0.7);
  const tutorAt = s(1.1);
  // kata tutor muncul mengikuti suara T1 (±9,6 dtk)
  const words = T1.split(' ');
  const shown = Math.floor(interpolate(f, [tutorAt + 6, tutorAt + s(9.2)], [0, words.length], cl));
  const thinking = f > s(0.85) && f < tutorAt + 6;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 40%, #F7F7F4, ${PAPER} 60%, #E2E5E8)` }}>
      <Phone style={{ left: 330, top: 22, transformOrigin: 'top left', transform: `translateY(${(1 - enter) * 120}px) rotate(${(1 - enter) * -4}deg) scale(1.15)`, opacity: enter }}>
        <div style={{ padding: '56px 20px 0', fontFamily: SANS }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 26, color: INK }}>BelajarTenun</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? '#2E7D5B' : SOFT }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: connected ? '#3FAF7E' : '#C8CDD2' }} />
              {connected ? 'Kacamata tersambung' : 'Menghubungkan…'}
            </div>
          </div>
          {/* feed kamera kacamata */}
          <div style={{ position: 'relative', marginTop: 16, height: 230, borderRadius: 18, overflow: 'hidden', background: '#ccc' }}>
            <OffthreadVideo src={staticFile('footage/7653.mp4')} startFrom={s(3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', left: 10, top: 10, fontFamily: MONO, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '3px 7px', borderRadius: 5 }}>● KAMERA KACAMATA</div>
            <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, background: 'rgba(20,22,26,0.62)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '8px 12px', color: '#fff', opacity: ease(f, tutorAt, tutorAt + 10) }}>
              <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.65 }}>TAHAP 1/5</div>
              <div style={{ fontSize: 16 }}>Mengenal alat</div>
            </div>
          </div>
          {/* transkrip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <Bubble me at={s(0.3)}>Halo BelajarTenun, langkah pertama aku harus apa?</Bubble>
            {thinking && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 5, padding: '12px 14px', background: '#fff', borderRadius: 18 }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: SOFT, opacity: 0.4 + 0.6 * Math.abs(Math.sin((f - i * 4) / 6)) }} />)}
              </div>
            )}
            {f >= tutorAt + 6 && <Bubble at={tutorAt + 6}>{words.slice(0, Math.max(1, shown)).join(' ')}</Bubble>}
          </div>
        </div>
        {/* bola AI di bawah */}
        <div style={{ position: 'absolute', left: '50%', bottom: 30, width: 54, height: 54, marginLeft: -27, borderRadius: 27, background: `radial-gradient(circle at 35% 30%, #DCEBFF, ${BLUE} 70%)`, boxShadow: `0 0 ${f > tutorAt && f < tutorAt + s(9.6) ? 30 : 0}px rgba(91,155,240,0.6)`, transform: `scale(${f > tutorAt && f < tutorAt + s(9.6) ? 1 + Math.abs(Math.sin(f / 3.2)) * 0.08 : 1})` }} />
      </Phone>
      {/* sisi kanan: penjelasan singkat, diam setelah mendarat */}
      <div style={{ position: 'absolute', left: 1020, top: 360, width: 820 }}>
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: SOFT, opacity: ease(f, s(0.6), s(1.1)) }}>[ SUARA & PERCAKAPAN DI HP ]</div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 60, lineHeight: 1.12, letterSpacing: -1.2, color: INK, marginTop: 22 }}>
          <Words text="Kacamata melihat." at={s(1.2)} gap={3} />
          <br />
          <Words text="HP menjelaskan." at={s(2.2)} gap={3} style={{ color: '#9AA2AB' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── C · feed kamera membesar menjadi POV + label LUNGSI ──────────────────────
const ShotC: React.FC = () => {
  const f = useCurrentFrame();
  const lab = ease(f, s(0.9), s(1.4));
    return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('footage/7653.mp4')} startFrom={s(3) + s(10.3)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 220px rgba(0,0,0,0.35)' }} />
      {/* sorot satu benang lungsi */}
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <circle cx={1020} cy={430} r={14 + (f % 40) / 40 * 22} fill="none" stroke="#fff" strokeWidth={1.5} opacity={lab * (1 - (f % 40) / 40)} />
        <circle cx={1020} cy={430} r={6} fill="#fff" opacity={lab} />
        <path d={`M1028 424 L${1028 + 180 * lab} 300 L${1028 + 420 * lab} 300`} stroke="#fff" strokeWidth={1.5} fill="none" opacity={lab} />
      </svg>
      <div style={{ position: 'absolute', left: 1460, top: 220, opacity: lab, filter: `blur(${(1 - lab) * 6}px)`, background: 'rgba(20,22,26,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: '14px 20px', color: '#fff', fontFamily: SANS }}>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 2, opacity: 0.65 }}>[ ISTILAH ]</div>
        <div style={{ fontFamily: SERIF, fontSize: 44, marginTop: 4 }}>Lungsi</div>
        <div style={{ fontSize: 17, opacity: 0.7 }}>benang tegak pada alat tenun</div>
      </div>
      <div style={{ position: 'absolute', left: 60, top: 50, fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: '#fff', opacity: lab * 0.9 }}>[ ADAPTIF ]</div>
    </AbsoluteFill>
  );
};

// Transisi whip: horizontal blur + geser cepat di sambungan A→B.
const Whip: React.FC<{ children: React.ReactNode; dir: number; inFrames?: number }> = ({ children, dir, inFrames = 8 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, inFrames], [1, 0], { ...cl, easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ transform: `translateX(${dir * t * 260}px)`, filter: `blur(${t * 18}px)` }}>{children}</AbsoluteFill>;
};

// "Object becomes the world": feed kamera di HP membesar ke layar penuh.
const Grow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, s(0.65)], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
  // posisi feed kamera di HP (dalam frame 1920×1080)
  const x0 = 366.8, y0 = 155.4, w0 = 420.9, h0 = 264.5;
  const x = x0 * (1 - t), y = y0 * (1 - t), w = w0 + (1920 - w0) * t, h = h0 + (1080 - h0) * t, r = 18 * (1 - t);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 40%, #F7F7F4, ${PAPER} 60%, #E2E5E8)` }}>
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, overflow: 'hidden' }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${w / 1920}, ${h / 1080})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

export const STYLE_SECONDS = 21;
export const StyleTest: React.FC = () => {
  const A = 6.7, B = 10.6; // durasi shot A dan B
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={s(A) + 4}>
        <ShotA />
        <Audio src={staticFile('footage/7648.mp4')} endAt={s(A)} />
      </Sequence>
      <Sequence from={s(A)} durationInFrames={s(B)}>
        <Whip dir={1}><ShotB /></Whip>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.8} />
        <Sequence from={s(0.7)}><Audio src={staticFile('sfx/tap.wav')} /></Sequence>
        <Sequence from={s(1.0)}><Audio src={staticFile('sfx/earcon.wav')} /></Sequence>
      </Sequence>
      <Sequence from={s(A + 1.1)}><Audio src={staticFile('tutor/T1.mp3')} /></Sequence>
      <Sequence from={s(A + B)}>
        <Grow><ShotC /></Grow>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
        <Sequence from={s(0.9)}><Audio src={staticFile('sfx/success.wav')} volume={0.6} /></Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};
