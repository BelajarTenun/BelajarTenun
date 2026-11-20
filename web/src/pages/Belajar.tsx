import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import { useApp } from '../lib/session';
import { streak, tanggal, useProgres } from '../lib/progres';

const TARGET_MENIT = 10;

// Beranda: satu aksi utama (lanjutkan / mulai), ritme minggu ini, target harian, dan satu saran dari data latihan.
export default function Belajar() {
  const { config } = useApp();
  const { loading, modules, byId, riwayat, status, mastery } = useProgres();
  const st = streak(riwayat);
  const hariIni = riwayat.filter((s) => new Date(s.start).toDateString() === new Date().toDateString()).reduce((a, s) => a + s.minutes, 0);
  const terakhir = riwayat.find((s) => !s.done && s.reached < (byId[s.module]?.steps ?? 0));
  const berikut = modules.find((m) => status[m.id] === 'berikut');
  const utama = terakhir ? { m: byId[terakhir.module], tahap: Math.min(terakhir.reached, byId[terakhir.module].steps - 1), kapan: terakhir.end } : berikut ? { m: berikut, tahap: 0, kapan: null } : null;

  // Saran: tahap yang paling sering diulang tapi belum dikuasai (hanya dari data murid sendiri).
  let saran: { modulId: string; n: number } | null = null;
  for (const m of modules) for (const x of Object.values(mastery[m.id] ?? {})) {
    if (x.state === 'dilatih' && x.attempts >= 2 && (!saran || x.attempts > saran.n)) saran = { modulId: m.id, n: x.attempts };
  }

  return (
    <Shell>
      <ViewHeader title={`Halo, ${config?.user?.name?.split(' ')[0] ?? ''}`}
        description={st.hariIni ? 'Latihan hari ini sudah tercatat. Benang demi benang.' : 'Sepuluh menit hari ini sudah cukup untuk menjaga ritme.'} />

      {loading ? <p className="a-muted">Memuat…</p> : (
        <>
          {utama ? (
            <Link className="b-hero" to={terakhir ? `/belajar/${utama.m.id}/siapkan?mulai=${utama.tahap}` : `/belajar/${utama.m.id}`}>
              <span className="b-hero-foto"><KainFoto m={utama.m} /></span>
              <span className="b-hero-body">
                <span className="k">{terakhir ? 'Lanjutkan' : riwayat.length ? 'Berikutnya di jalurmu' : 'Mulai dari sini'}</span>
                <b>{utama.m.fabricName || utama.m.title}</b>
                <span className="d">Tahap {utama.tahap + 1} dari {utama.m.steps}{utama.kapan ? ` · terakhir ${tanggal(utama.kapan)}` : ''}</span>
                <span className="s-bar"><i style={{ width: `${(utama.tahap / utama.m.steps) * 100}%` }} /></span>
                <span className="a-btn primary lg"><Icon name="play" />{terakhir ? 'Lanjutkan latihan' : 'Mulai'}</span>
              </span>
            </Link>
          ) : modules.length > 0 && (
            <div className="a-empty"><Icon name="check" /><b>Semua modul yang tersedia sudah tuntas</b><span>Kamu bisa mengulang modul mana pun dari tab Modul.</span></div>
          )}

          <div className="b-row">
            <section className="b-tile">
              <h2>Minggu ini</h2>
              <div className="b-streak"><span className={`flame${st.hariIni ? ' on' : ''}`}><Icon name="flame" /></span><div><b>{st.n} hari</b><span>berturut-turut</span></div></div>
              <ol className="week" aria-label="Tujuh hari terakhir">{st.minggu.map((d, i) => <li key={i} className={`${d.aktif ? 'on' : ''}${d.hariIni ? ' now' : ''}`}><i />{d.label}</li>)}</ol>
            </section>
            <section className="b-tile">
              <h2>Target hari ini</h2>
              <div className="b-goal">
                <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" className="bg" /><circle cx="18" cy="18" r="15.5" className="fg" style={{ strokeDasharray: `${Math.min(1, hariIni / TARGET_MENIT) * 97.4} 97.4` }} /></svg>
                <div><b>{Math.round(hariIni)} / {TARGET_MENIT} menit</b><span>{hariIni >= TARGET_MENIT ? 'Target tercapai. Hebat!' : 'Sedikit tiap hari lebih baik daripada banyak sekali-sekali.'}</span></div>
              </div>
            </section>
          </div>

          {saran && (
            <section className="b-saran">
              <Icon name="loom" />
              <div><b>Tahap yang masih kamu latih</b><span>Satu tahap di “{byId[saran.modulId]?.fabricName || byId[saran.modulId]?.title}” sudah kamu coba {saran.n} kali. Ulangi tahap ini di sesi berikutnya; tutor akan menawarkan latihan bagian.</span></div>
              <Link className="a-btn sm" to={`/belajar/${saran.modulId}`}>Lihat tahap</Link>
            </section>
          )}

          <div className="b-links">
            <Link to="/modul" className="b-link"><Icon name="book" /><span><b>Semua kain</b>{modules.length} modul di jalurmu</span><Icon name="chevronRight" /></Link>
            <Link to="/progres" className="b-link"><Icon name="chart" /><span><b>Progres & riwayat</b>{riwayat.length} sesi latihan</span><Icon name="chevronRight" /></Link>
          </div>
        </>
      )}
    </Shell>
  );
}
