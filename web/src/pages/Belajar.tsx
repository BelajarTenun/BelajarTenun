import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from './Nav';
import { api, type ModuleSummary } from '../lib/api';
import { useApp } from '../lib/session';

export default function Belajar() {
  const { config } = useApp();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  useEffect(() => { api<{ modules: ModuleSummary[] }>('/api/modules').then((r) => setModules(r.modules)); }, []);
  return (
    <main className="page">
      <Nav />
      <p className="eyebrow">Halo, {config?.user?.name}</p>
      <h1>Pilih modul</h1>
      {!modules ? <p className="muted">Memuat…</p> : modules.length === 0 ? <p className="muted">Belum ada modul yang diterbitkan.</p> : (
        <ul className="list">
          {modules.map((m) => (
            <li key={m.id}>
              <Link to={`/belajar/${m.id}`} className="row">
                <span>
                  <small className="eyebrow">{m.tradition || 'Tenun'} · {m.steps} tahap</small>
                  <strong>{m.title}</strong>
                  {m.description && <span className="muted">{m.description}</span>}
                </span>
                <span className="arrow" aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small"><a href="/progres.html">Progres latihanku</a></p>
    </main>
  );
}
