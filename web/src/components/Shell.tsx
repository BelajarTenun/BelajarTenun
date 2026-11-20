import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { api } from '../lib/api';
import { useApp } from '../lib/session';

// Kerangka aplikasi murid. Terpisah dari Ruang tim (admin/partner punya dashboard sendiri di public/*.html).
export default function Shell({ children }: { children: ReactNode }) {
  const { config, refresh } = useApp();
  const nav = useNavigate();
  const user = config?.user;
  const keluar = async () => { await api('/api/auth/logout', {}); await refresh(); nav('/'); };
  const item = (to: string, label: string, icon: string) =>
    <NavLink className={({ isActive }) => `a-link${isActive ? ' active' : ''}`} to={to} end={to === '/belajar'}><Icon name={icon} /><span>{label}</span><Icon name="arrowUpRight" className="arr" /></NavLink>;
  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link to="/" className="a-brand"><img src="/icon.svg" alt="" /><span>BelajarTenun</span></Link>
        {item('/belajar', 'Modul', 'book')}
        {user && (
          <div className="a-user">
            <span className="name">{user.name}</span>
            <button className="a-btn ghost sm" onClick={keluar} title="Keluar"><Icon name="logout" /></button>
          </div>
        )}
      </aside>
      <main className="a-main"><div className="a-content">{children}</div></main>
    </div>
  );
}

export function ViewHeader({ title, description, crumb, actions }: { title: ReactNode; description?: ReactNode; crumb?: { to: string; label: string }; actions?: ReactNode }) {
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
