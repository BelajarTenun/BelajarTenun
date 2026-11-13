import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Nav from './Nav';
import GoogleButton from './GoogleButton';
import { api } from '../lib/api';
import { useApp } from '../lib/session';

export default function Masuk() {
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh, config } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      if (mode === 'daftar') await api('/api/auth/register', { name: f.name, email: f.email, password: f.password, role: 'pemula' });
      else await api('/api/auth/login', { email: f.email, password: f.password });
      await refresh();
      nav(params.get('lanjut') || '/belajar', { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <main className="page narrow">
      <Nav back={{ to: '/', label: 'Beranda' }} />
      <h1>{mode === 'masuk' ? 'Masuk' : 'Buat akun'}</h1>
      <p className="muted">{mode === 'masuk' ? 'Lanjutkan latihanmu.' : 'Gratis. Progres latihanmu tersimpan di akun ini.'}</p>
      {params.get('galat') === 'google' && <p className="error" role="alert">Masuk dengan Google belum berhasil. Coba lagi atau pakai email.</p>}
      {config?.googleLogin && <><GoogleButton next={params.get('lanjut') || '/belajar'} className="dark wide" /><p className="or muted small">atau dengan email</p></>}
      <form className="form" onSubmit={submit}>
        {mode === 'daftar' && <label>Nama<input name="name" autoComplete="name" required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Kata sandi<input name="password" type="password" minLength={8} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary wide" disabled={busy}>{busy ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
      </form>
      <p className="switch">
        {mode === 'masuk' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
        <button className="text link" onClick={() => { setMode(mode === 'masuk' ? 'daftar' : 'masuk'); setError(''); }}>{mode === 'masuk' ? 'Daftar' : 'Masuk'}</button>
      </p>
    </main>
  );
}
