import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { api, type ModuleSummary } from '../lib/api';
import { useApp } from '../lib/session';
import { bermakna, streak, statusModul, type Sesi } from '../lib/progres';

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
  const riwayat = (sesi ?? []).filter((s) => byId[s.module] && bermakna(s));
  const st = streak(riwayat);
  const status = statusModul((modules ?? []).map((m) => m.id), riwayat);
  const tuntasN = Object.values(status).filter((x) => x === 'tuntas').length;
  const berikut = (modules ?? []).find((m) => status[m.id] === 'berikut');
  const terakhir = riwayat.find((s) => !s.done && s.reached < (byId[s.module]?.steps ?? 0));
  const total = { sesi: riwayat.length, tuntas: riwayat.filter((s) => s.done).length, menit: riwayat.reduce((a, s) => a + Math.max(1, Math.round(s.minutes || 0)), 0) };

  return (
    <Shell>
      <ViewHeader title={`Halo, ${config?.user?.name?.split(' ')[0] ?? ''}`} description={st.hariIni ? 'Latihan hari ini sudah tercatat. Benang demi benang.' : 'Sepuluh menit hari ini sudah cukup untuk menjaga ritme.'} />

      <div className="a-today">
        <div className="streak"><span className={`flame${st.hariIni ? ' on' : ''}`}><Icon name="flame" /></span>
          <div><b>{st.n} hari</b><span>berturut-turut berlatih</span></div></div>
        <ol className="week" aria-label="Tujuh hari terakhir">{st.minggu.map((d, i) => <li key={i} className={`${d.aktif ? 'on' : ''}${d.hariIni ? ' now' : ''}`}><i />{d.label}</li>)}</ol>
        <div className="sum"><b>{tuntasN}/{modules?.length ?? 0}</b><span>modul tuntas</span></div>
      </div>

      {terakhir && (() => {
        const m = byId[terakhir.module]; const next = Math.min(terakhir.reached, m.steps - 1);
        return (
          <section className="a-section">
            <h2>Lanjutkan dari terakhir</h2>
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

      {!terakhir && berikut && (
        <section className="a-section">
          <h2>{riwayat.length ? 'Berikutnya di jalurmu' : 'Mulai dari sini'}</h2>
          <div className="a-resume">
            <span className="tile"><Icon name="loom" /></span>
            <div className="body"><div className="title">{berikut.title}</div><div className="desc">{berikut.steps} tahap · {berikut.tradition || 'Tenun'}</div></div>
            <Link className="a-btn primary lg" to={`/belajar/${berikut.id}`}><Icon name="play" />Mulai</Link>
          </div>
        </section>
      )}

      <section className="a-section">
        <h2>Pilih kain yang ingin kamu buat {modules && <small>{tuntasN} dari {modules.length} tuntas</small>}</h2>
        {!modules ? <p className="a-muted">Memuat…</p> : modules.length === 0
          ? <div className="a-empty"><Icon name="book" /><b>Belum ada modul</b><span>Modul muncul di sini setelah diterbitkan oleh penenun mitra.</span></div>
          : (
            <ul className="kain-grid">
              {modules.map((m) => {
                const x = status[m.id];
                const label = { tuntas: 'Tuntas', berjalan: 'Sedang dipelajari', berikut: 'Berikutnya', nanti: null }[x];
                return (
                  <li key={m.id}>
                    <Link to={`/belajar/${m.id}`} className={`kain-card ${x}`}>
                      <span className="kain-frame">
                        <span className={`kain-photo${m.cover ? '' : m.motif ? ' motif' : ' tanpa-foto'}`} style={m.cover ? { backgroundImage: `url("${m.cover}")` } : m.motif ? { backgroundImage: motifUrl(m.motif) } : undefined} role="img"
                          aria-label={m.cover ? `Foto kain ${m.fabricName || m.title}` : m.motif ? 'Ilustrasi dari grafik pola' : 'Foto kain belum tersedia'} />
                        {label && <span className="kain-status">{x === 'tuntas' && <Icon name="check" />}{label}</span>}
                      </span>
                      <span className="kain-meta">
                        <b>{m.fabricName || m.title}</b>
                        <span>{[m.weaver || m.tradition, `${m.steps} tahap`].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </section>

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
                {riwayat.slice(0, 5).map((s) => {
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

    </Shell>
  );
}

// Grafik pola → ubin SVG (dipakai sebagai ilustrasi kartu sampai foto kain asli diunggah).
function motifUrl(m: { rows: string[]; colors: Record<string, string> }) {
  const h = m.rows.length, w = m.rows[0]?.length ?? 0;
  const rects = m.rows.flatMap((r, y) => [...r].map((c, x) => `<rect x='${x}' y='${h - 1 - y}' width='1.02' height='1.02' fill='${m.colors[c] ?? '#ccc'}'/>`)).join('');
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w * 6}' height='${h * 6}' shape-rendering='crispEdges'>${rects}</svg>`)}")`;
}
