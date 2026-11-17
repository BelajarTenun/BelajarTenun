import { useSearchParams } from 'react-router-dom';
import Nav from './Nav';
import GoogleButton from './GoogleButton';
import { useApp } from '../lib/session';

// Masuk hanya dengan akun Google. Akun baru otomatis menjadi pemula.
export default function Masuk() {
  const { config } = useApp();
  const [params] = useSearchParams();
  const lanjut = params.get('lanjut') || '/belajar';
  return (
    <main className="page narrow">
      <Nav back={{ to: '/', label: 'Beranda' }} />
      <h1>Masuk</h1>
      <p className="muted">Pakai akun Google untuk menyimpan progres latihanmu.</p>
      {params.get('galat') === 'google' && <p className="error" role="alert">Masuk dengan Google belum berhasil. Coba lagi.</p>}
      {config && !config.googleLogin
        ? <p className="error" role="alert">Masuk dengan Google belum disiapkan di server ini.</p>
        : <div className="form"><GoogleButton next={lanjut} className="dark wide" /></div>}
    </main>
  );
}
