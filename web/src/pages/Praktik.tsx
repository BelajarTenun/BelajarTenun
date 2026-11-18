import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { PhoneCamera } from '@legacy/sources.js';
// @ts-ignore
import { TutorClient } from '@legacy/tutor.js';

type Reply = { intent?: string; speak?: string; display?: string; observation?: string; step?: { index: number; total: number } };
type Line = { role: 'user' | 'tutor'; text: string };

// Sesi latihan, pola asisten suara (Gemini Live / Omi): kamera + tahap + transkrip.
// Live: tutor mendengar & berbicara sendiri, kontrol hanya Bisukan mic & Akhiri.
// Tanpa Live: "Tandai selesai" dan kolom tanya.
export default function Praktik() {
  const { id } = useParams();
  const nav = useNavigate();
  const { config, camera, setCamera } = useApp();
  const { module } = useModule(id);
  const [stepIdx, setStepIdx] = useState(0);
  const [note, setNote] = useState<{ text: string; kind: '' | 'ok' | 'warn' }>({ text: '', kind: '' });
  const [lines, setLines] = useState<Line[]>([]);
  const [live, setLive] = useState<'mati' | 'menyambung' | 'aktif'>('mati');
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState<'tutor' | 'user' | ''>('');
  const [demo, setDemo] = useState(false);
  const [q, setQ] = useState('');
  const tutor = useRef<any>(null);
  const video = useRef<HTMLVideoElement>(null), img = useRef<HTMLImageElement>(null), feed = useRef<HTMLDivElement>(null);
  const stats = useRef({ questions: 0, startedAt: Date.now() });

  useEffect(() => {
    if (!module || !config) return;
    if (camera instanceof PhoneCamera && video.current) { video.current.srcObject = camera.stream; camera.element = video.current; }
    else if (camera && img.current) camera.element = img.current;
    const say = (role: Line['role'], text: string) => text && setLines((l) => [...l.slice(-30), { role, text }]);
    const t = new TutorClient({
      moduleId: module.id, source: camera, serverTts: config.tts,
      ui: {
        show: (r: Reply) => {
          if (r.step) { setStepIdx(r.step.index); setDemo(false); }
          if (r.intent === 'koreksi') setNote({ text: r.display || '', kind: 'warn' });
          else if (r.intent === 'jawaban') { say('tutor', r.speak || ''); stats.current.questions++; }
          else if (r.intent === 'petunjuk' || r.intent === 'tawar_bantuan') setNote({ text: r.speak || '', kind: '' });
          else if (r.observation) setNote({ text: r.observation, kind: '' });
          else if (r.intent === 'instruksi') setNote({ text: '', kind: '' });
        },
        card: () => {},
        demo: () => {},
        status: (text: string) => setNote((n) => (n.text ? n : { text, kind: '' })),
        speaking: (d: { tutor: boolean; user: boolean }) => setSpeaking(d.tutor ? 'tutor' : d.user ? 'user' : ''),
        transcript: (role: Line['role'], text: string) => say(role, text),
        finish: () => {
          const mins = Math.max(1, Math.round((Date.now() - stats.current.startedAt) / 60000));
          nav(`/belajar/${module.id}/selesai`, { state: { mins, questions: stats.current.questions, sessionId: t.sessionId } });
        },
      },
    });
    tutor.current = t;
    log('practice_start', { module: module.id, camera: camera?.kind ?? 'tanpa kamera' });
    (async () => {
      await t.start();
      if (config.live) {
        setLive('menyambung');
        try { await t.startLive(); setLive('aktif'); } catch { setLive('mati'); setNote({ text: 'Mode suara langsung belum tersedia. Pakai tombol di bawah.', kind: 'warn' }); }
      }
    })();
    return () => { t.stop(); tutor.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, config]);

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [lines]);

  if (!module) return <div className="s-wrap"><p className="a-muted" style={{ padding: 24 }}>Memuat…</p></div>;
  const step = module.steps[stepIdx];
  const total = module.steps.length;
  const akhiri = () => { if (confirm('Akhiri sesi latihan?')) { tutor.current?.stop(); setCamera(null); nav(`/belajar/${module.id}`); } };
  const toggleMic = () => { const m = !muted; setMuted(m); tutor.current?.setMuted(m); };
  const tanya = (e: React.FormEvent) => { e.preventDefault(); if (!q.trim()) return; setLines((l) => [...l, { role: 'user', text: q }]); tutor.current?.say(q); setQ(''); };
  const voice = live === 'aktif' ? (muted ? { cls: '', text: 'Mikrofon dibisukan' } : speaking === 'tutor' ? { cls: 'speak', text: 'Tutor berbicara…' } : { cls: 'listen', text: 'Tutor mendengarkan' })
    : live === 'menyambung' ? { cls: '', text: 'Menyambungkan tutor suara…' } : null;

  return (
    <div className="s-wrap">
      <header className="s-top">
        <div className="ttl">
          <b>{module.title}</b>
          <span>Tahap {stepIdx + 1} dari {total}</span>
          <div className="s-bar"><i style={{ width: `${(stepIdx / total) * 100}%` }} /></div>
        </div>
        {live === 'aktif' && <span className="a-badge ok"><span className="a-dot" />Live</span>}
        <button className="a-btn danger sm" onClick={akhiri}><Icon name="x" />Akhiri</button>
      </header>

      <div className="s-body">
        <div>
          <div className="s-cam">
            <video ref={video} autoPlay playsInline muted hidden={!(camera instanceof PhoneCamera)} />
            <img ref={img} alt="" hidden={!camera || camera instanceof PhoneCamera} />
            {!camera && <div className="none">Tanpa kamera: tandai sendiri setiap tahap</div>}
            {camera && <span className="chip a-badge ok"><span className="a-dot" />{camera instanceof PhoneCamera ? 'Kamera HP' : 'Kacamata'}</span>}
          </div>
        </div>

        <div className="s-panel">
          <div className="s-step">
            <div className="k">Tahap {stepIdx + 1}</div>
            <h2>{step.title}</h2>
            <p>{step.instruction}</p>
            {step.demo_video && (demo
              ? <video src={step.demo_video} controls autoPlay muted playsInline style={{ width: '100%', borderRadius: 6, marginTop: 12 }} />
              : <button className="a-btn sm" style={{ marginTop: 12 }} onClick={() => setDemo(true)}><Icon name="play" />Lihat contoh</button>)}
            {note.text && <div className={`s-note ${note.kind}`} aria-live="polite">{note.text}</div>}
          </div>

          <section>
            <div className="a-section" style={{ marginBottom: 0 }}><h2>Percakapan</h2></div>
            <div className="s-feed" ref={feed}>
              {lines.length === 0
                ? <p className="a-small a-muted">{live === 'aktif' ? 'Bicara langsung dengan tutor, misalnya "sudah" atau "kenapa benangnya lewat sini?"' : 'Pertanyaanmu dan jawaban tutor muncul di sini.'}</p>
                : lines.map((l, i) => <div key={i} className={`s-msg ${l.role}`}>{l.text}</div>)}
            </div>
          </section>

          <section>
            <div className="a-section" style={{ marginBottom: 0 }}><h2>Semua tahap</h2></div>
            <ul className="s-list">
              {module.steps.map((s, i) => <li key={s.id} className={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''}><i>{i < stepIdx ? '✓' : i + 1}</i>{s.title}</li>)}
            </ul>
          </section>
        </div>
      </div>

      <footer className="s-dock">
        {live !== 'mati' ? <>
          <span className="s-voice"><span className={`s-orb ${voice?.cls ?? ''}`} />{voice?.text}</span>
          <button className={`a-btn s-mic${muted ? ' off' : ''}`} onClick={toggleMic} aria-pressed={muted} title={muted ? 'Nyalakan mikrofon' : 'Bisukan mikrofon'} disabled={live !== 'aktif'}>
            <Icon name={muted ? 'micOff' : 'mic'} />
          </button>
        </> : <>
          <form className="s-ask" onSubmit={tanya} style={{ flex: 1, maxWidth: 520 }}>
            <input className="a-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tanya tutor…" aria-label="Tanya tutor" />
            <button className="a-btn" aria-label="Kirim"><Icon name="send" /></button>
          </form>
          <button className="a-btn primary lg" onClick={() => tutor.current?.button('next')}><Icon name="check" />Tandai selesai</button>
        </>}
      </footer>
    </div>
  );
}
