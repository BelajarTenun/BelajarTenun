import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Nav from './Nav';
import { log, speak } from '../lib/api';
import { useModule } from '../lib/useModule';

const POIN_BAWAAN = [
  'Tutor membacakan instruksi tiap tahap lewat earbuds; tanganmu tetap bebas.',
  'Kamera melihat lungsi dan tanganmu, lalu memberi tahu kalau tahap selesai atau ada yang perlu dibetulkan.',
  'Tekan tombol di kacamata untuk lanjut, ketuk dua kali untuk mengulang.',
  'Kamu bisa bertanya kapan saja, misalnya "kenapa benangnya lewat sini?"',
];

export default function Pengenalan() {
  const { id } = useParams();
  const { module, error } = useModule(id);
  const [slide, setSlide] = useState(0);
  const nav = useNavigate();
  const intro = module?.intro || {};

  useEffect(() => { if (module) log('intro_open', { module: module.id }); }, [module]);
  useEffect(() => {
    if (!module || intro.video) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % module.steps.length), 5000);
    return () => clearInterval(t);
  }, [module, intro.video]);

  if (error) return <main className="page"><Nav back={{ to: '/belajar', label: 'Modul' }} /><p className="error">{error}</p></main>;
  if (!module) return <main className="page"><p className="muted">Memuat…</p></main>;

  const summary = intro.summary || module.description || '';
  const step = module.steps[slide];
  const dengarkan = () => { log('intro_listen', { module: module.id }); speak([module.title, summary, ...module.steps.map((s, i) => `Tahap ${i + 1}: ${s.title}.`)].join(' ')); };

  return (
    <main className="page">
      <Nav back={{ to: '/belajar', label: 'Modul' }} />
      <p className="eyebrow">1 dari 3 · Kenali</p>
      <h1>{module.title}</h1>
      <p className="muted">{[module.tradition, intro.duration_min && `±${intro.duration_min} menit`, `${module.steps.length} tahap`].filter(Boolean).join(' · ')}</p>

      <figure className="media">
        {intro.video
          ? <video src={intro.video} controls playsInline preload="metadata" />
          : <div className="slide" aria-live="polite">
              <small className="eyebrow">Tahap {slide + 1} dari {module.steps.length}</small>
              <h2>{step.title}</h2>
              <p>{step.instruction}</p>
              <span className="dots">{module.steps.map((s, i) => <button key={s.id} aria-label={`Tahap ${i + 1}`} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />)}</span>
            </div>}
        <figcaption className="muted small">{intro.video ? intro.video_attribution : 'Video pengenalan belum tersedia. Berikut ringkasan tahapnya.'}</figcaption>
      </figure>

      {summary && <p className="lead">{summary}</p>}

      {!!intro.tools?.length && <section className="block"><h2>Yang kamu butuhkan</h2><ul className="plain">{intro.tools.map((t) => <li key={t}>{t}</li>)}</ul></section>}
      <section className="block"><h2>Cara kacamata membimbingmu</h2><ul className="plain">{(intro.points?.length ? intro.points : POIN_BAWAAN).map((t) => <li key={t}>{t}</li>)}</ul></section>
      <section className="block">
        <h2>Tahap yang akan kamu kerjakan</h2>
        <ol className="numbered">{module.steps.map((s) => <li key={s.id}><strong>{s.title}</strong><span className="muted">{s.instruction}</span></li>)}</ol>
      </section>

      <div className="actions sticky">
        <button className="btn primary wide" onClick={() => { log('intro_done', { module: module.id }); nav(`/belajar/${module.id}/siapkan`); }}>Lanjut: siapkan kacamata</button>
        <button className="btn text" onClick={dengarkan}>Dengarkan penjelasan</button>
      </div>
      <p className="muted small center"><Link to={`/belajar/${module.id}/praktik`}>Lewati, langsung praktik</Link></p>
    </main>
  );
}
