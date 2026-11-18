import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
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
  const { state } = useLocation() as { state: { mins?: number; questions?: number; sessionId?: string; reached?: number; total?: number } | null };
  const belumTuntas = state?.total != null && (state.reached ?? 0) < state.total - 1;
  const [jawab, setJawab] = useState<Record<string, number>>({});
  const [terkirim, setTerkirim] = useState(false);
  useEffect(() => setCamera(null), []);

  return (
    <Shell>
      <ViewHeader crumb={{ to: '/belajar', label: 'Modul' }} title={belumTuntas ? 'Sesi disimpan' : 'Latihan selesai'} description={module?.title}
        actions={belumTuntas
          ? <><Link className="a-btn" to="/belajar">Ke beranda</Link><Link className="a-btn primary" to={`/belajar/${id}/siapkan?mulai=${state!.reached}`}>Lanjutkan sesi</Link></>
          : <><Link className="a-btn" to={`/belajar/${id}`}>Ulangi modul</Link><Link className="a-btn primary" to="/belajar">Ke beranda</Link></>} />
      <div className="a-stats">
        <div className="a-stat"><span>Tahap dicapai</span><b>{belumTuntas ? `${(state?.reached ?? 0) + 1}/${state?.total}` : module?.steps.length ?? '–'}</b></div>
        <div className="a-stat"><span>Durasi</span><b>{state?.mins ? `±${state.mins} menit` : '–'}</b></div>
        <div className="a-stat"><span>Pertanyaan ke tutor</span><b>{state?.questions ?? 0}</b></div>
      </div>
      <section className="a-section" style={{ maxWidth: 560 }}>
        <h2>Bagaimana latihanmu?</h2>
        {terkirim ? <p className="a-text">Terima kasih. Masukanmu membantu penenun memperbaiki modul ini.</p> : (
          <form onSubmit={(e) => { e.preventDefault(); log('survey', { module: id, sessionId: state?.sessionId, ...jawab, text: new FormData(e.currentTarget).get('text') }); setTerkirim(true); }}>
            {PERTANYAAN.map(([k, q]) => (
              <div key={k} className="a-field">{q}
                <div className="a-scale">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={jawab[k] === n ? 'on' : ''} onClick={() => setJawab({ ...jawab, [k]: n })}>{n}</button>)}</div>
              </div>
            ))}
            <label className="a-field">Bagian yang membingungkan<textarea name="text" rows={3} className="a-input" style={{ marginTop: 6 }} /></label>
            <button className="a-btn primary" style={{ marginTop: 20 }}>Kirim masukan</button>
          </form>
        )}
      </section>
    </Shell>
  );
}
