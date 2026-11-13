import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Nav from './Nav';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';

const PERTANYAAN: [string, string][] = [
  ['mudah', 'Seberapa mudah mengikuti panduan?'],
  ['paham', 'Seberapa paham alasan tiap tahap?'],
  ['percaya_diri', 'Seberapa percaya diri mencoba sendiri?'],
];

export default function Selesai() {
  const { id } = useParams();
  const { module } = useModule(id);
  const { setCamera } = useApp();
  const { state } = useLocation() as { state: { mins?: number; questions?: number; sessionId?: string } | null };
  const [jawab, setJawab] = useState<Record<string, number>>({});
  const [terkirim, setTerkirim] = useState(false);
  useEffect(() => setCamera(null), []);

  return (
    <main className="page">
      <Nav />
      <p className="eyebrow">3 dari 3 · Selesai</p>
      <h1>Latihan selesai</h1>
      <p className="lead">Kamu menyelesaikan {module?.steps.length ?? ''} tahap {module?.title}{state?.mins ? ` dalam ±${state.mins} menit` : ''}.</p>
      {state?.questions ? <p className="muted">{state.questions} pertanyaan diajukan ke tutor.</p> : null}

      <section className="block">
        <h2>Bagaimana latihanmu?</h2>
        {terkirim ? <p>Terima kasih atas masukanmu.</p> : (
          <form className="form" onSubmit={(e) => { e.preventDefault(); log('survey', { module: id, sessionId: state?.sessionId, ...jawab, text: new FormData(e.currentTarget).get('text') }); setTerkirim(true); }}>
            {PERTANYAAN.map(([k, q]) => (
              <fieldset key={k} className="scale"><legend>{q}</legend>
                {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={jawab[k] === n ? 'on' : ''} onClick={() => setJawab({ ...jawab, [k]: n })}>{n}</button>)}
              </fieldset>
            ))}
            <label>Bagian yang membingungkan<textarea name="text" rows={2} /></label>
            <button className="btn primary">Kirim</button>
          </form>
        )}
      </section>

      <div className="actions">
        <Link className="btn primary" to="/belajar">Kembali ke modul</Link>
        <Link className="btn text" to={`/belajar/${id}`}>Tonton pengenalan lagi</Link>
      </div>
    </main>
  );
}
