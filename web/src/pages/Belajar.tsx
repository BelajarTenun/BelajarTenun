import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { api, type ModuleSummary } from '../lib/api';
import { useApp } from '../lib/session';

type Sesi = { id: string; module: string; start: string; end: string; done: boolean; reached: number; questions: number; minutes: number };

const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Beranda pengguna: Lanjutkan sesi (sesi terakhir yang belum tuntas), ringkasan latihan, dan daftar modul.
export default function Belajar() {
  const { config } = useApp();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [sesi, setSesi] = useState<Sesi[] | null>(null);
  useEffect(() => {
    api<{ modules: ModuleSummary[] }>('/api/modules').then((r) => setModules(r.modules));
    api<{ sessions: Sesi[] }>('/api/progress?mine=1').then((r) => setSesi(r.sessions)).catch(() => setSesi([]));
  }, []);
  const byId = useMemo(() => Object.fromEntries((modules ?? []).map((m) => [m.id, m])), [modules]);
  // Sesi bermakna = sudah ada kemajuan atau berlangsung > 1 menit; sesi kosong (buka lalu keluar) tidak ditampilkan.
  const riwayat = (sesi ?? []).filter((s) => byId[s.module] && (s.done || s.reached > 0 || s.minutes >= 1));
  const terakhir = riwayat.find((s) => !s.done && s.reached < (byId[s.module]?.steps ?? 0));
  const total = { sesi: riwayat.length, tuntas: riwayat.filter((s) => s.done).length, menit: riwayat.reduce((a, s) => a + Math.max(1, Math.round(s.minutes || 0)), 0) };

  return (
    <Shell>
      <ViewHeader title={`Halo, ${config?.user?.name?.split(' ')[0] ?? ''}`} description="Lanjutkan latihanmu atau mulai modul baru." />

      {terakhir && (() => {
        const m = byId[terakhir.module]; const next = Math.min(terakhir.reached, m.steps - 1);
        return (
          <section className="a-section">
            <h2>Lanjutkan sesi</h2>
            <div className="a-resume">
              <span className="tile"><Icon name="loom" /></span>
              <div className="body">
                <div className="title">{m.title}</div>
                <div className="desc">Tahap {next + 1} dari {m.steps} · terakhir {tanggal(terakhir.end)}</div>
                <div className="s-bar" style={{ maxWidth: 280 }}><i style={{ width: `${(next / m.steps) * 100}%` }} /></div>
              </div>
              <Link className="a-btn primary lg" to={`/belajar/${m.id}/siapkan?mulai=${next}`}><Icon name="play" />Lanjutkan</Link>
            </div>
          </section>
        );
      })()}

      {riwayat.length > 0 && (
        <section className="a-section">
          <h2>Ringkasan latihan</h2>
          <div className="a-stats" style={{ marginBottom: 20 }}>
            <div className="a-stat"><span>Sesi latihan</span><b>{total.sesi}</b></div>
            <div className="a-stat"><span>Modul tuntas</span><b>{total.tuntas}</b></div>
            <div className="a-stat"><span>Waktu berlatih</span><b>{total.menit} menit</b></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead><tr><th>Modul</th><th>Tanggal</th><th>Tahap selesai</th><th>Durasi</th><th>Status</th></tr></thead>
              <tbody>
                {riwayat.slice(0, 8).map((s) => {
                  const m = byId[s.module];
                  return (
                    <tr key={s.id}>
                      <td><Link to={`/belajar/${m.id}`}>{m.title}</Link></td>
                      <td>{tanggal(s.start)}</td>
                      <td>{s.done ? m.steps : Math.min(s.reached, m.steps)}/{m.steps}</td>
                      <td>{Math.max(1, Math.round(s.minutes))} menit</td>
                      <td>{s.done ? <span className="a-badge ok">Tuntas</span> : <span className="a-badge warn">Belum selesai</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="a-section">
        <h2>Modul {modules && <small>{modules.length} modul</small>}</h2>
        {!modules ? <p className="a-muted">Memuat…</p> : modules.length === 0
          ? <div className="a-empty"><Icon name="book" /><b>Belum ada modul</b><span>Modul muncul di sini setelah diterbitkan oleh penenun mitra.</span></div>
          : (
            <ul className="a-list">
              {modules.map((m) => (
                <li key={m.id}>
                  <Link to={`/belajar/${m.id}`} className="a-row">
                    <span className="tile"><Icon name="loom" /></span>
                    <span className="body"><span className="title">{m.title}</span>{m.description && <span className="desc" style={{ display: 'block' }}>{m.description}</span>}</span>
                    <span className="meta"><span className="a-badge">{m.tradition || 'Tenun'}</span><span className="a-badge">{m.steps} tahap</span></span>
                    <Icon name="chevronRight" className="go" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </section>
    </Shell>
  );
}
