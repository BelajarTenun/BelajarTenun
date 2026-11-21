import { Link } from 'react-router-dom';
import { useState } from 'react';
import GoogleButton from './GoogleButton';
import { useApp } from '../lib/session';

// Landing: bilah atas (logo kiri, tautan + Masuk kanan), judul besar di tengah,
// baris kemitraan sebagai "bukti sosial", satu tombol pil besar. Awan bergumpal melayang pelan di langit lukisan.
export default function Landing() {
  const { config } = useApp();
  const [logoOk, setLogoOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);
  const user = config?.user;

  const cta = !user ? <GoogleButton className="hero-cta" />
    : user.role === 'pemula' ? <Link className="btn-google hero-cta" to="/belajar">Lanjut belajar</Link>
    : <a className="btn-google hero-cta" href={config.home}>{user.role === 'admin' ? 'Buka dashboard admin' : 'Buka ruang partner'}</a>;

  return (
    <div className="landing-page">
    <main className="landing">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
<filter id="awan-dasar" x="-50%" y="-80%" width="200%" height="260%"><feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="5" seed="3"/><feDisplacementMap in="SourceGraphic" scale="150"/><feGaussianBlur stdDeviation="3"/></filter>
<filter id="awan-bayang" x="-50%" y="-80%" width="200%" height="260%"><feTurbulence type="fractalNoise" baseFrequency=".013" numOctaves="4" seed="7"/><feDisplacementMap in="SourceGraphic" scale="110"/><feGaussianBlur stdDeviation="10"/></filter>
<filter id="awan-sorot" x="-50%" y="-80%" width="200%" height="260%"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="5" seed="11"/><feDisplacementMap in="SourceGraphic" scale="120"/><feGaussianBlur stdDeviation="6"/></filter>
</defs></svg>
      <div className="clouds" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`awan a${n}`}><i className="dasar" /><i className="bayang" /><i className="sorot" /></span>)}
      </div>

      <header className="landing-nav">
        <Link to="/" className="landing-brand"><img src="/icon.svg" alt="" />BelajarTenun</Link>
        <nav>
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
      </section>

      {videoOk && <a className="landing-more" href="#video">Lihat cara kerjanya<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></a>}
    </main>

      {videoOk && (
        <section id="video" className="landing-video">
          <h2>Lihat BelajarTenun bekerja</h2>
          <div className="glass">
            <video src="/video-utuh-v7.mp4" poster="/video-utuh-v7.jpg" controls playsInline preload="metadata" onError={() => setVideoOk(false)} />
          </div>
        </section>
      )}
    </div>
  );
}
