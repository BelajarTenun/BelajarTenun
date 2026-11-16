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
        <h1>BelajarTenun</h1>
        <p>Belajar menenun tradisional, dibimbing langsung lewat kacamata.</p>
        {config?.user
          ? <Link className="btn-google" to="/belajar">Lanjut belajar</Link>
          : <GoogleButton />}
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
