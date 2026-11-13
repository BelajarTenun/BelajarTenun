import { Link } from 'react-router-dom';
import GoogleButton from './GoogleButton';
import { useApp } from '../lib/session';

export default function Landing() {
  const { config } = useApp();
  return (
    <main className="landing">
      <div className="landing-hero">
        <h1>BelajarTenun</h1>
        <p>Belajar menenun tradisional, dibimbing langsung lewat kacamata.</p>
        {config?.user
          ? <Link className="btn-google" to="/belajar">Lanjut belajar</Link>
          : <GoogleButton />}
      </div>
    </main>
  );
}
