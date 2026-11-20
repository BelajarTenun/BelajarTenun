import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import { kelompokTanggal, useProgres } from '../lib/progres';

// Progres: ringkasan dulu (angka + 4 minggu), lalu penguasaan per modul, lalu riwayat sesi per tanggal.
export default function Progres() {
  const { loading, modules, byId, riwayat, mastery, status } = useProgres();
  const menit = riwayat.reduce((a, s) => a + s.minutes, 0);
  const minggu = Array.from({ length: 4 }, (_, i) => {
    const akhir = new Date(); akhir.setHours(23, 59, 59, 999); akhir.setDate(akhir.getDate() - 7 * (3 - i));
    const awal = new Date(akhir); awal.setDate(awal.getDate() - 6); awal.setHours(0, 0, 0, 0);
    const m = riwayat.filter((s) => { const t = new Date(s.start); return t >= awal && t <= akhir; }).reduce((a, s) => a + s.minutes, 0);
    return { label: i === 3 ? 'Minggu ini' : `${3 - i} mgg lalu`, m };
  });
  const maks = Math.max(10, ...minggu.map((w) => w.m));
  const grup = riwayat.reduce<Record<string, typeof riwayat>>((g, s) => ((g[kelompokTanggal(s.start)] ??= []).push(s), g), {});

  return (
    <Shell>
      <ViewHeader title="Progres" description="Seberapa jauh kamu sudah menenun, dan apa saja yang sudah kamu latih." />
      {loading ? <p className="a-muted">Memuat…</p> : riwayat.length === 0 ? (
        <div className="a-empty"><Icon name="chart" /><b>Belum ada riwayat</b><span>Sesi pertamamu cukup 10 menit. Progresmu akan muncul di sini.</span><Link className="a-btn primary" style={{ marginTop: 16 }} to="/modul">Pilih kain</Link></div>
      ) : (
        <>
          <div className="a-stats">
            <div className="a-stat"><span>Waktu menenun</span><b>{Math.round(menit)} menit</b></div>
            <div className="a-stat"><span>Sesi latihan</span><b>{riwayat.length}</b></div>
            <div className="a-stat"><span>Kain tuntas</span><b>{Object.values(status).filter((x) => x === 'tuntas').length} / {modules.length}</b></div>
          </div>

          <section className="a-section">
            <h2>4 minggu terakhir <small>menit berlatih</small></h2>
            <div className="b-bars">{minggu.map((w) => <div key={w.label}><span className="v">{Math.round(w.m)}</span><i style={{ height: `${(w.m / maks) * 100}%` }} /><span>{w.label}</span></div>)}</div>
          </section>

          <section className="a-section">
            <h2>Penguasaan per kain</h2>
            <ul className="b-mods">
              {modules.filter((m) => riwayat.some((s) => s.module === m.id)).map((m) => {
                const st = Object.values(mastery[m.id] ?? {});
                const ok = st.filter((x) => x.state === 'dikuasai').length, mid = st.filter((x) => x.state === 'dilatih').length;
                return (
                  <li key={m.id}><Link to={`/belajar/${m.id}`}>
                    <span className="th"><KainFoto m={m} /></span>
                    <span className="body"><b>{m.fabricName || m.title}</b>
                      <span className="b-split" aria-label={`${ok} dikuasai, ${mid} sedang dilatih, dari ${m.steps} tahap`}><i className="ok" style={{ width: `${(ok / m.steps) * 100}%` }} /><i className="mid" style={{ width: `${(mid / m.steps) * 100}%` }} /></span>
                      <span className="d">{ok} dikuasai · {mid} sedang dilatih · {m.steps - ok - mid} belum</span></span>
                    <Icon name="chevronRight" />
                  </Link></li>
                );
              })}
            </ul>
          </section>

          <section className="a-section">
            <h2>Riwayat sesi</h2>
            {Object.entries(grup).map(([hari, list]) => (
              <div key={hari} className="b-day">
                <h3>{hari}</h3>
                <ul className="b-mods">
                  {list.map((s) => { const m = byId[s.module]; return (
                    <li key={s.id}><Link to={`/progres/${s.id}`}>
                      <span className="th"><KainFoto m={m} /></span>
                      <span className="body"><b>{m.fabricName || m.title}</b>
                        <span className="d">{new Date(s.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {Math.max(1, Math.round(s.minutes))} menit · tahap {s.done ? m.steps : Math.min(s.reached, m.steps)}/{m.steps}</span></span>
                      {s.done ? <span className="a-badge ok">Tuntas</span> : <span className="a-badge">Berlanjut</span>}
                      <Icon name="chevronRight" />
                    </Link></li>
                  ); })}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </Shell>
  );
}
