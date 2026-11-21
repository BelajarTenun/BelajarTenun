import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

// Onboarding setelah masuk: beberapa pertanyaan singkat menentukan level awal murid (1–4).
// Hasil disimpan di perangkat (localStorage 'bt-level'); jalur modul tetap mengikuti kelas tugas.
export const LEVELS = [
  { n: 1, name: 'Dasar', body: 'Teknik dasar dengan alat sederhana seperti kardus atau sumpit.' },
  { n: 2, name: 'Pengembangan', body: 'Inkle loom, sekoci, dan pola yang lebih beragam.' },
  { n: 3, name: 'Teknik Lanjutan', body: 'Alat empat gun dan urutan pengangkatan benang.' },
  { n: 4, name: 'Kreasi', body: 'ATBM dan perancangan motif.' },
] as const;

type Q = { q: string; opts: { label: string; score: number }[] };
const QUESTIONS: Q[] = [
  { q: 'Pernahkah kamu menenun sebelumnya?', opts: [
    { label: 'Belum pernah sama sekali', score: 1 },
    { label: 'Pernah mencoba sekali dua kali', score: 2 },
    { label: 'Sudah beberapa kali membuat kain', score: 3 },
    { label: 'Rutin menenun', score: 4 },
  ] },
  { q: 'Alat tenun apa yang kamu punya?', opts: [
    { label: 'Belum ada, atau kardus/sumpit', score: 1 },
    { label: 'Inkle loom atau alat kecil dengan sekoci', score: 2 },
    { label: 'Alat meja empat gun', score: 3 },
    { label: 'ATBM (alat tenun bukan mesin)', score: 4 },
  ] },
  { q: 'Mana yang sudah bisa kamu lakukan?', opts: [
    { label: 'Belum ada', score: 1 },
    { label: 'Memasukkan pakan dan merapatkannya', score: 2 },
    { label: 'Mengatur urutan angkat benang untuk pola', score: 3 },
    { label: 'Merancang motif sendiri', score: 4 },
  ] },
];

export const levelFrom = (answers: number[]) => Math.max(1, Math.min(4, Math.round(answers.reduce((a, b) => a + b, 0) / answers.length - 0.25)));

export default function Onboarding() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const done = answers.length === QUESTIONS.length;
  const level = done ? levelFrom(answers) : 0;

  const pick = (score: number) => {
    const next = [...answers.slice(0, i), score];
    setAnswers(next);
    if (i < QUESTIONS.length - 1) setI(i + 1);
  };
  const mulai = () => { try { localStorage.setItem('bt-level', String(level)); } catch { /* perangkat tanpa penyimpanan */ } nav('/belajar'); };

  return (
    <main className="a-auth">
      <div className="a-auth-box ob">
        <Link to="/" className="a-brand"><img src="/icon.svg" alt="" /><span>BelajarTenun</span></Link>
        {!done ? (
          <>
            <div className="ob-steps" aria-label={`Pertanyaan ${i + 1} dari ${QUESTIONS.length}`}>{QUESTIONS.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
            <span className="a-muted a-small">Pertanyaan {i + 1} dari {QUESTIONS.length}</span>
            <h1>{QUESTIONS[i].q}</h1>
            <p className="a-muted">Jawabanmu menentukan level awal. Bisa diubah kapan saja.</p>
            <div className="a-choice">
              {QUESTIONS[i].opts.map((o) => (
                <button key={o.label} type="button" aria-pressed={answers[i] === o.score} onClick={() => pick(o.score)}><span><b>{o.label}</b></span></button>
              ))}
            </div>
            {i > 0 && <button className="a-btn ghost sm ob-back" onClick={() => setI(i - 1)}>Kembali</button>}
          </>
        ) : (
          <>
            <span className="a-muted a-small">Level awalmu</span>
            <h1>Level {level} · {LEVELS[level - 1].name}</h1>
            <p className="a-muted">{LEVELS[level - 1].body}</p>
            <ol className="ob-levels">
              {LEVELS.map((l) => (
                <li key={l.n} className={l.n === level ? 'now' : l.n < level ? 'past' : 'next'}>
                  <b>Level {l.n} — {l.name}</b>
                  <span>{l.body}</span>
                </li>
              ))}
            </ol>
            <button className="a-btn primary lg" onClick={mulai}><Icon name="play" />Mulai belajar</button>
            <button className="a-btn ghost sm" onClick={() => { setAnswers([]); setI(0); }}>Ulangi pertanyaan</button>
          </>
        )}
      </div>
    </main>
  );
}
