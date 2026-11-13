import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { PhoneCamera } from '@legacy/sources.js';
// @ts-ignore
import { TutorClient } from '@legacy/tutor.js';
// @ts-ignore
import { renderCard } from '@legacy/cards.js';

type Reply = { intent?: string; speak?: string; display?: string; observation?: string; step?: { index: number; total: number } };
type Line = { role: string; text: string };

export default function Praktik() {
  const { id } = useParams();
  const nav = useNavigate();
  const { config, camera, setCamera } = useApp();
  const { module } = useModule(id);
  const [stepIdx, setStepIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; kind: string }>({ text: '', kind: 'info' });
  const [answer, setAnswer] = useState('');
  const [demo, setDemo] = useState<string | null | undefined>(undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [live, setLive] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pinned, setPinned] = useState(false);
  const tutor = useRef<any>(null);
  const video = useRef<HTMLVideoElement>(null), img = useRef<HTMLImageElement>(null), cards = useRef<HTMLDivElement>(null);
  const stats = useRef({ questions: 0, startedAt: Date.now() });

  useEffect(() => {
    if (!module || !config) return;
    if (camera instanceof PhoneCamera && video.current) { video.current.srcObject = camera.stream; camera.element = video.current; }
    else if (camera && img.current) camera.element = img.current;
    const t = new TutorClient({
      moduleId: module.id, source: camera, serverTts: config.tts,
      ui: {
        show: (r: Reply) => {
          if (r.step) setStepIdx(r.step.index);
          if (r.intent === 'koreksi') setFeedback({ text: r.display || '', kind: 'warn' });
          else if (r.intent === 'jawaban') { setAnswer(r.speak || ''); stats.current.questions++; }
          else if (r.intent === 'petunjuk' || r.intent === 'tawar_bantuan') setFeedback({ text: r.speak || '', kind: 'info' });
          else if (r.observation) setFeedback({ text: r.observation, kind: 'info' });
          else if (r.intent === 'instruksi') { setAnswer(''); setFeedback({ text: 'Tekan "Sudah" atau ucapkan "sudah" kalau selesai.', kind: 'info' }); }
        },
        card: (c: unknown) => cards.current && renderCard(cards.current, c),
        demo: (url: string | null, intent: string) => { if (intent !== 'instruksi' || url) setDemo(url); },
        status: (text: string) => setFeedback((f) => f.text ? f : { text, kind: 'info' }),
        transcript: (role: string, text: string) => setLines((l) => [...l.slice(-6), { role, text }]),
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
      if (config.live) { try { await t.startLive(); setLive(true); } catch { /* tetap mode standar */ } }
    })();
    return () => { t.stop(); tutor.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, config]);

  if (!module) return <main className="practice"><p>Memuat…</p></main>;
  const step = module.steps[stepIdx];
  const keluar = () => { if (confirm('Keluar dari latihan?')) { tutor.current?.stop(); setCamera(null); nav('/belajar'); } };
  const tanya = (text: string) => { tutor.current?.say(text); setAsking(false); };
  const isPhone = camera instanceof PhoneCamera;

  return (
    <main className="practice">
      <video ref={video} className="cam" autoPlay playsInline muted hidden={!isPhone} />
      <img ref={img} className="cam" alt="" hidden={!camera || isPhone} />
      <div className="hud">
        <div className="bar"><span style={{ width: `${(stepIdx / module.steps.length) * 100}%` }} /></div>
        <p className="eyebrow">{camera && <span className="rec" />} Tahap {stepIdx + 1} dari {module.steps.length}{live && ' · Live'}</p>
        <h2>{step.title}</h2>
        <p>{step.instruction}</p>
        {feedback.text && <p className={`fb ${feedback.kind}`} aria-live="polite">{feedback.text}</p>}
        {answer && <p className="answer">{answer}</p>}
        {lines.length > 0 && <div className="transcript">{lines.map((l, i) => <p key={i}><b>{l.role === 'user' ? 'Kamu' : 'Tutor'}</b> {l.text}</p>)}</div>}
      </div>
      <div ref={cards} className="cards" />
      <button className="exit" onClick={keluar}>Keluar</button>

      {demo !== undefined && (
        <div className="sheet">
          <p className="eyebrow">Contoh</p>
          <h3>{step.title}</h3>
          {demo ? <video src={demo} controls autoPlay muted playsInline loop /> : <p className="muted">Video contoh untuk tahap ini belum tersedia.</p>}
          <ul className="plain">{(step.tips || []).map((t) => <li key={t}>{t}</li>)}</ul>
          <button className="btn primary wide" onClick={() => setDemo(undefined)}>Saya coba sekarang</button>
        </div>
      )}

      {asking && (
        <form className="ask" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('q') as string; if (v.trim()) tanya(v); }}>
          <input name="q" placeholder="Tanya tutor…" autoFocus autoComplete="off" />
          <button className="btn primary">Kirim</button>
        </form>
      )}

      <nav className="controls">
        <button onClick={() => tutor.current?.button('demo')}>Contoh</button>
        <button className={pinned ? 'on' : ''} onClick={() => { tutor.current?.button('pin'); setPinned(!pinned); }}>Bekukan</button>
        <button onClick={() => live ? setFeedback({ text: 'Mode real-time: langsung bicara saja.', kind: 'info' }) : setAsking(!asking)}>Tanya</button>
        <button className="primary" onClick={() => tutor.current?.button('next')}>Sudah</button>
      </nav>
    </main>
  );
}
