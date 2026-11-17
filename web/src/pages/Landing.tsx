import { Link } from 'react-router-dom';
import GoogleButton from './GoogleButton';
import { useState } from 'react';
import { useApp } from '../lib/session';

export default function Landing() {
  const { config } = useApp();
  const [logoOk, setLogoOk] = useState(true);
  return (
    <main className="landing">
      <div className="landing-hero">
        <p className="eyebrow-line"><span />Tenun Nusantara<span /></p>
        <h1>BelajarTenun</h1>
        {/* Benang emas yang "ditenun" melintasi judul: lungsi lurus, pakan bergelombang. */}
        <svg className="thread" viewBox="0 0 320 24" aria-hidden="true">
          <path className="warp" d="M0 12 H320" />
          <path className="weft" d="M0 12 C 20 2, 40 2, 60 12 S 100 22, 120 12 S 160 2, 180 12 S 220 22, 240 12 S 280 2, 300 12 S 316 18, 320 12" />
        </svg>
        <p className="tagline">Belajar dari tangan penenun,<br />dibimbing di setiap helai.</p>
        {!config?.user ? <GoogleButton />
          : config.user.role === 'pemula' ? <Link className="btn-google" to="/belajar">Lanjut belajar</Link>
          : <span className="landing-actions">
              <a className="btn-google" href={config.home}>{config.user.role === 'admin' ? 'Buka dashboard admin' : 'Buka ruang partner'}</a>
              <Link className="landing-sub" to="/belajar">atau mulai belajar</Link>
            </span>}
        <div className="partner">
          <span>in partnership with</span>
          {logoOk
            ? <img src="/partner-puta-dino-kayangan.png" alt="Puta Dino Kayangan" onError={() => setLogoOk(false)} />
            : <strong>Puta Dino Kayangan</strong>}
        </div>
      </div>
    </main>
  );
}
