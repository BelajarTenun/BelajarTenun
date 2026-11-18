import { Link } from 'react-router-dom';
import { useState } from 'react';
import GoogleButton from './GoogleButton';
import { useApp } from '../lib/session';

// Landing: bilah atas (logo kiri, tautan + Masuk kanan), judul besar di tengah,
// baris kemitraan sebagai "bukti sosial", satu tombol pil besar. Awan tipis melayang pelan di langit lukisan.
export default function Landing() {
  const { config } = useApp();
  const [logoOk, setLogoOk] = useState(true);
  const user = config?.user;

  const cta = !user ? <GoogleButton className="hero-cta" />
    : user.role === 'pemula' ? <Link className="btn-google hero-cta" to="/belajar">Lanjut belajar</Link>
    : <a className="btn-google hero-cta" href={config.home}>{user.role === 'admin' ? 'Buka dashboard admin' : 'Buka ruang partner'}</a>;

  return (
    <main className="landing">
      <div className="clouds" aria-hidden="true">
        <span className="cloud c1" /><span className="cloud c2" /><span className="cloud c3" /><span className="cloud c4" /><span className="cloud c5" />
      </div>

      <header className="landing-nav">
        <Link to="/" className="landing-brand"><img src="/icon.svg" alt="" />BelajarTenun</Link>
        <nav>
          <a href="/arsip.html" className="nav-text">Arsip tenun</a>
          <a href="/masuk.html?untuk=partner" className="nav-text">Untuk penenun</a>
          {user
            ? <Link to={user.role === 'pemula' ? '/belajar' : '/'} className="nav-pill" onClick={(e) => { if (user.role !== 'pemula') { e.preventDefault(); location.href = config!.home!; } }}>
                {user.name.split(' ')[0]}
              </Link>
            : <Link to="/masuk" className="nav-pill">Masuk</Link>}
        </nav>
      </header>

      <section className="landing-hero">
        <h1><span>Belajar menenun,</span> <span>dibimbing di setiap helai</span></h1>
        <div className="partner">
          <span>in partnership with</span>
          {logoOk
            ? <img src="/partner-puta-dino-kayangan.png" alt="Puta Dino Kayangan" onError={() => setLogoOk(false)} />
            : <strong>Puta Dino Kayangan</strong>}
        </div>
        {cta}
        {user && user.role !== 'pemula' && <Link className="landing-sub" to="/belajar">atau mulai belajar</Link>}
      </section>

      <a className="landing-more" href="/arsip.html">Lihat arsip tenun<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></a>
    </main>
  );
}
