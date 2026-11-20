import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { log } from '../lib/api';
import { useModule } from '../lib/useModule';

// Ringkasan modul: video pengenalan, tentang modul, tahap, dan yang dibutuhkan. Satu aksi utama: Mulai latihan.
export default function Pengenalan() {
  const { id } = useParams();
  const { module, error } = useModule(id);
  useEffect(() => { if (module) log('intro_open', { module: module.id }); }, [module]);

  if (error) return <Shell><ViewHeader title="Modul tidak ditemukan" crumb={{ to: '/belajar', label: 'Modul' }} description={error} /></Shell>;
  if (!module) return <Shell><p className="a-muted">Memuat…</p></Shell>;
  const intro = module.intro || {};
  const start = <Link className="a-btn primary lg" to={`/belajar/${module.id}/siapkan`} onClick={() => log('intro_done', { module: module.id })}><Icon name="play" />Mulai latihan</Link>;

  return (
    <Shell>
      <ViewHeader
        crumb={{ to: '/belajar', label: 'Modul' }}
        title={module.title}
        description={<span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <span className="a-badge">{module.tradition || 'Tenun'}</span>
          <span className="a-badge">{module.steps.length} tahap</span>
          {intro.duration_min && <span className="a-badge">±{intro.duration_min} menit</span>}
        </span>}
        actions={start}
      />

      <div className="a-grid2">
        <div>
          {intro.video && (
            <section className="a-section">
              <h2>Video pengenalan</h2>
              <div className="a-media"><video src={intro.video} controls playsInline preload="metadata" /></div>
              {intro.video_attribution && <p className="a-small a-muted" style={{ marginTop: 8 }}>{intro.video_attribution}</p>}
            </section>
          )}
          <section className="a-section">
            <h2>Tahap latihan</h2>
            <ol className="a-steps">{module.steps.map((s) => <li key={s.id}><div><div className="t">{s.title}</div><div className="d">{s.instruction}</div></div></li>)}</ol>
          </section>
        </div>
        <aside>
          {(intro.summary || module.description) && (
            <section className="a-section"><h2>Tentang modul</h2><p className="a-text">{intro.summary || module.description}</p></section>
          )}
          {!!intro.tools?.length && (
            <section className="a-section"><h2>Yang dibutuhkan</h2>
              <ul className="a-list">{intro.tools.map((t) => <li key={t} className="a-check"><Icon name="check" className="a-small" />{t}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </Shell>
  );
}
