import { Link, useSearchParams } from 'react-router-dom';
import GoogleButton from './GoogleButton';
import { useApp } from '../lib/session';

// Masuk hanya dengan Google, dalam satu panel kecil di tengah (gaya Ilmora).
export default function Masuk() {
  const { config } = useApp();
  const [params] = useSearchParams();
  return (
    <main className="a-auth">
      <div className="a-auth-box">
        <Link to="/" className="a-brand"><img src="/icon.svg" alt="" /><span>BelajarTenun</span></Link>
        <h1>Masuk</h1>
        <p className="a-muted">Pakai akun Google untuk menyimpan progres latihanmu.</p>
        {params.get('galat') === 'google' && <p className="a-status warn">Masuk dengan Google belum berhasil. Coba lagi.</p>}
        {config && !config.googleLogin
          ? <p className="a-status warn">Masuk dengan Google belum disiapkan di server ini.</p>
          : <GoogleButton next={params.get('lanjut') || '/mulai'} className="a-google" />}
      </div>
    </main>
  );
}
