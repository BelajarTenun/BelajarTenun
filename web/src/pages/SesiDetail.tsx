import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { tanggal } from '../lib/progres';

type Detail = {
  id: string; module: string; start: string; minutes: number; done: boolean; resumeIndex: number;
  steps: { id: string; title: string; done: boolean; corrections: number; hints: number; patternRows: number }[];
  practice: { step: string; name: string; repsDone: number; target: number }[]; notes: string[]; questions: string[];
};

// Detail satu sesi: apa yang dikerjakan, bantuan tutor, latihan, catatan, dan ulangi dari tahap yang belum selesai.
export default function SesiDetail() {
  const { sesi } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<Detail>(`/api/me/session?id=${encodeURIComponent(sesi ?? '')}`).then(setD).catch((e) => setErr(e.message)); }, [sesi]);
  if (err) return <Shell><ViewHeader title="Sesi tidak ditemukan" crumb={{ to: '/progres', label: 'Progres' }} description={err} /></Shell>;
  if (!d) return <Shell><p className="a-muted">Memuat…</p></Shell>;
  const selesai = d.steps.filter((s) => s.done).length;
  return (
    <Shell>
      <ViewHeader crumb={{ to: '/progres', label: 'Progres' }} title={`Sesi ${tanggal(d.start)}`}
        description={`${Math.max(1, Math.round(d.minutes))} menit · ${selesai} tahap selesai${d.done ? ' · modul tuntas' : ''}`}
        actions={!d.done && <Link className="a-btn primary lg" to={`/belajar/${d.module}/siapkan?mulai=${d.resumeIndex}`}><Icon name="play" />Ulangi dari tahap {d.resumeIndex + 1}</Link>} />
      <section className="a-section">
        <h2>Tahap yang dikerjakan</h2>
        <ol className="b-steps">
          {d.steps.map((s, i) => (
            <li key={s.id} className={s.done ? 'ok' : 'mid'}>
              <i aria-hidden="true">{s.done ? <Icon name="check" /> : i + 1}</i>
              <div><b>{s.title}</b><span>{[s.corrections && `${s.corrections}× dikoreksi tutor`, s.hints && `${s.hints}× diberi petunjuk`, s.patternRows && `${s.patternRows} baris pola`].filter(Boolean).join(' · ') || 'Tanpa koreksi'}</span></div>
              <em>{s.done ? 'Selesai' : 'Belum selesai'}</em>
            </li>
          ))}
        </ol>
      </section>
      {d.practice.length > 0 && <section className="a-section"><h2>Latihan bagian</h2><ul className="a-list">{d.practice.map((p, i) => <li key={i}>{p.name} ({p.step}): {p.repsDone}/{p.target} kali</li>)}</ul></section>}
      {d.notes.length > 0 && <section className="a-section"><h2>Catatanmu</h2><ul className="a-list">{d.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></section>}
      {d.questions.length > 0 && <section className="a-section"><h2>Yang kamu tanyakan</h2><ul className="a-list">{d.questions.map((q, i) => <li key={i}>“{q}”</li>)}</ul></section>}
    </Shell>
  );
}
