import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useApp } from '../lib/session';

export default function Nav({ back }: { back?: { to: string; label: string } }) {
  const { config, refresh } = useApp();
  const nav = useNavigate();
  const keluar = async () => { await api('/api/auth/logout', {}); await refresh(); nav('/'); };
  return (
    <header className="nav">
      {back ? <Link to={back.to} className="nav-back">← {back.label}</Link> : <Link to="/" className="wordmark">BelajarTenun</Link>}
      <span className="nav-right">
        {config?.user
          ? <>{config.user.role !== 'pemula' && <a href="/admin.html">Ruang tim</a>}<button className="text" onClick={keluar}>Keluar</button></>
          : <Link to="/masuk">Masuk</Link>}
      </span>
    </header>
  );
}
