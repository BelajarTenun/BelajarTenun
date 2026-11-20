import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { api } from '../lib/api';
import { useApp } from '../lib/session';

// Kerangka aplikasi murid. Terpisah dari Ruang tim (admin/partner punya dashboard sendiri di public/*.html).
export default function Shell({ children }: { children: ReactNode }) {
  const { config, refresh } = useApp();
  const nav = useNavigate();
  const user = config?.user;
  const keluar = async () => { await api('/api/auth/logout', {}); await refresh(); nav('/'); };
  const { pathname } = useLocation();
  // Detail modul (/belajar/:id) termasuk tab Modul; detail sesi (/progres/:id) termasuk tab Progres.
  const aktif = (to: string) => (to === '/belajar' ? pathname === '/belajar' : to === '/modul' ? pathname.startsWith('/modul') || /^\/belajar\/./.test(pathname) : pathname.startsWith(to));
  const item = (to: string, label: string, icon: string) =>
    <Link className={`a-link${aktif(to) ? ' active' : ''}`} aria-current={aktif(to) ? 'page' : undefined} to={to}><Icon name={icon} /><span>{label}</span><Icon name="arrowUpRight" className="arr" /></Link>;
  return (
    <div className="a-shell">
      <a className="a-skip" href="#konten">Lewati ke konten</a>
      <aside className="a-side">
        <Link to="/" className="a-brand"><img src="/icon.svg" alt="" /><span>BelajarTenun</span></Link>
        <nav className="a-tabs" aria-label="Menu utama">
          {item('/belajar', 'Beranda', 'home')}
          {item('/modul', 'Modul', 'book')}
          {item('/progres', 'Progres', 'chart')}
        </nav>
        {user && user.role !== 'pemula' && (
          <div className="a-preview-note">
            <span>Kamu melihat sebagai murid</span>
            <a href={config?.home || '/'} className="a-link"><Icon name="chevronLeft" /><span>Kembali ke dashboard</span></a>
          </div>
        )}
        {user && (
          <div className="a-user">
            <span className="name">{user.name}</span>
            <button className="a-btn ghost sm" onClick={keluar} title="Keluar" aria-label="Keluar"><Icon name="logout" /></button>
          </div>
        )}
      </aside>
      <main className="a-main" id="konten" tabIndex={-1}><div className="a-content">{children}</div></main>
    </div>
  );
}

export function ViewHeader({ title, description, crumb, actions }: { title: ReactNode; description?: ReactNode; crumb?: { to: string; label: string }; actions?: ReactNode }) {
  // Judul tab mengikuti halaman (Vercel: <title> sesuai konteks).
  useEffect(() => { if (typeof title === 'string' && title.trim()) document.title = `${title} · BelajarTenun`; }, [title]);
  return (
    <header className="a-head">
      <div>
        {crumb && <Link className="crumb" to={crumb.to}><Icon name="chevronLeft" className="a-small" />{crumb.label}</Link>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
