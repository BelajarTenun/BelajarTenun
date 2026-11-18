import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { api, type ModuleSummary } from '../lib/api';
import { useApp } from '../lib/session';

export default function Belajar() {
  const { config } = useApp();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  useEffect(() => { api<{ modules: ModuleSummary[] }>('/api/modules').then((r) => setModules(r.modules)); }, []);
  return (
    <Shell>
      <ViewHeader title="Modul" description={`Halo, ${config?.user?.name?.split(' ')[0] ?? ''}. Pilih modul untuk mulai berlatih dengan tutor.`} />
      <section className="a-section">
        <h2>Semua modul {modules && <small>{modules.length} modul</small>}</h2>
        {!modules ? <p className="a-muted">Memuat…</p> : modules.length === 0
          ? <div className="a-empty"><Icon name="book" /><b>Belum ada modul</b><span>Modul muncul di sini setelah diterbitkan oleh penenun mitra.</span></div>
          : (
            <ul className="a-list">
              {modules.map((m) => (
                <li key={m.id}>
                  <Link to={`/belajar/${m.id}`} className="a-row">
                    <span className="tile"><Icon name="loom" /></span>
                    <span className="body"><span className="title">{m.title}</span>{m.description && <span className="desc" style={{ display: 'block' }}>{m.description}</span>}</span>
                    <span className="meta"><span className="a-badge">{m.tradition || 'Tenun'}</span><span className="a-badge">{m.steps} tahap</span></span>
                    <Icon name="chevronRight" className="go" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </section>
    </Shell>
  );
}
