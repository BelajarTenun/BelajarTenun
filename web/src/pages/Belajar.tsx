import { Link, Navigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import Maskot from '../components/Maskot';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
import { streak, useProgres } from '../lib/progres';
import { LEVELS, bacaProfil, levelOf } from '../lib/level';

const TARGET_MENIT = 10, TARGET_MINGGU = 70;

// Beranda gaya edtech: sapaan bersama maskot, kain yang sedang dipelajari, kain lain untuk dijelajahi,
// dan kolom kanan berisi minggu ini, tahap berikutnya, serta aktivitas.
export default function Belajar() {
  const { config } = useApp();
  const profil = bacaProfil();
  const { loading, modules, byId, riwayat, status, kunci, mastery } = useProgres();
  const nama = config?.user?.name?.split(' ')[0] ?? '';
  const st = streak(riwayat);
  const hariIni = riwayat.filter((s) => new Date(s.start).toDateString() === new Date().toDateString()).reduce((a, s) => a + s.minutes, 0);
  const sejak = Date.now() - 7 * 864e5;
  const minggu = riwayat.filter((s) => new Date(s.start).getTime() >= sejak);
  const menitMinggu = minggu.reduce((a, s) => a + s.minutes, 0);

  const terakhir = riwayat.find((s) => !s.done && s.reached < (byId[s.module]?.steps ?? 0));
  const lvl = profil?.level ?? 1;
  const fokusId = terakhir?.module ?? modules.find((m) => levelOf(m.id) === lvl && status[m.id] !== 'tuntas')?.id ?? modules.find((m) => status[m.id] === 'berikut')?.id;
  const { module: fokus } = useModule(fokusId);
  const lanjut = terakhir ? Math.min(terakhir.reached, (byId[terakhir.module]?.steps ?? 1) - 1) : 0;

  const kainku = modules.filter((m) => status[m.id] === 'berjalan' || status[m.id] === 'tuntas' || m.id === fokusId);
  const jelajah = modules.filter((m) => !kainku.includes(m) && levelOf(m.id) <= lvl + 1).slice(0, 4);
  const dikuasai = (id: string) => Object.values(mastery[id] ?? {}).filter((x) => x.state === 'dikuasai').length;
  const totalTahap = kainku.reduce((a, m) => a + m.steps, 0);
  const totalKuasai = kainku.reduce((a, m) => a + dikuasai(m.id), 0);

  if (!profil) return <Navigate to="/mulai" replace />;
  return (
    <Shell wide>
      <div className="e-home">
        <div className="e-main">
          {(() => { const L = LEVELS[lvl - 1]; return (
            <div className="e-level"><span className="ph" style={{ backgroundImage: `url(${L.foto})` }} />
              <div><span>Level {L.n} · {L.name}</span><b>Menenun dengan {L.alat.toLowerCase()}</b></div>
              <Link to="/mulai">Ubah</Link></div>); })()}
          <section className="e-hero">
            <div className="e-hero-text">
              <h1>Halo, {nama}!</h1>
              <p>{st.hariIni ? 'Latihan hari ini sudah tercatat. Benang demi benang, kainmu makin panjang.' : terakhir ? 'Selamat datang kembali. Kainmu menunggu di tahap berikutnya.' : 'Yuk mulai menenun. Sepuluh menit hari ini sudah cukup.'}</p>
              {fokus && (
                <Link className="e-hero-btn" to={terakhir ? `/belajar/${fokus.id}/siapkan?mulai=${lanjut}` : `/belajar/${fokus.id}`}>
                  <Icon name="play" />{terakhir ? `Lanjutkan tahap ${lanjut + 1}` : 'Mulai belajar'}
                </Link>
              )}
            </div>
            <Maskot pose={st.hariIni ? 'bangga' : 'menyapa'} className="e-hero-art" />
          </section>

          <section className="e-sec">
            <h2>Kainku</h2>
            {loading ? <p className="a-muted">Memuat…</p> : (
              <ul className="kain-grid">
                {kainku.map((m) => {
                  const k = dikuasai(m.id), sesiM = riwayat.find((s) => s.module === m.id);
                  const tahap = status[m.id] === 'tuntas' ? m.steps : Math.min(sesiM?.reached ?? 0, m.steps);
                  return (
                    <li key={m.id}>
                      <Link to={`/belajar/${m.id}`} className={`kain-card ${status[m.id]}`}>
                        <span className="kain-frame"><KainFoto m={m} />
                          <span className="kain-status">{status[m.id] === 'tuntas' && <Icon name="check" />}{{ tuntas: 'Tuntas', berjalan: 'Sedang dipelajari', berikut: 'Berikutnya', nanti: 'Belum mulai' }[status[m.id]]}</span></span>
                        <span className="kain-meta">
                          <b>{m.fabricName || m.title}</b>
                          <span>{m.weaver || m.tradition}</span>
                          <span className="e-progress"><span className="e-bar"><i style={{ width: `${(tahap / m.steps) * 100}%` }} /></span>
                            <span className="meta"><span>Tahap <b>{tahap}/{m.steps}</b></span><span>Dikuasai <b>{k}/{m.steps}</b></span></span></span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link to="/modul" className="kain-card kain-add">
                    <span className="plus"><Icon name="plus" /></span>
                    <b>Pilih kain baru</b>
                    <span>{modules.length} kain di jalurmu</span>
                  </Link>
                </li>
              </ul>
            )}
          </section>

          {jelajah.length > 0 && (
            <section className="e-sec">
              <h2>Jelajahi kain lain</h2>
              <ul className="kain-grid">
                {jelajah.map((m) => (
                  <li key={m.id}>
                    <Link to={`/belajar/${m.id}`} className={`kain-card ${kunci[m.id] ? 'terkunci' : status[m.id]}`}>
                      <span className="kain-frame"><KainFoto m={m} />{kunci[m.id] && <span className="kain-status"><Icon name="lock" />Terkunci</span>}</span>
                      <span className="kain-meta"><b>{m.fabricName || m.title}</b><span>{kunci[m.id] ? 'Selesaikan Modul Dasar dulu' : `${m.weaver || m.tradition} · ${m.steps} tahap`}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="e-rail">
          <section className="e-panel">
            <h2>Minggu ini</h2>
            <ol className="e-week">
              {st.minggu.map((d, i) => {
                const t = new Date(); t.setDate(t.getDate() - (6 - i));
                return <li key={i} className={`${d.aktif ? 'on' : ''}${d.hariIni ? ' now' : ''}`}><span>{d.label}</span><b>{t.getDate()}</b></li>;
              })}
            </ol>
            <p className="e-streak"><Icon name="flame" /><span><b>{st.n} hari</b> berturut-turut menenun</span></p>
          </section>

          <section className="e-panel">
            <h2>Tahap berikutnya</h2>
            {!fokus ? <p className="a-muted">Pilih kain untuk melihat tahapnya.</p> : (
              <ul className="e-tasks">
                {fokus.steps.slice(lanjut, lanjut + 4).map((s, i) => {
                  const state = mastery[fokus.id]?.[s.id]?.state ?? 'belum';
                  return (
                    <li key={s.id}>
                      <Link to={`/belajar/${fokus.id}/siapkan?mulai=${lanjut + i}`} className={`e-task ${state}`}>
                        <span className="ic">{state === 'dikuasai' ? <Icon name="check" /> : <b>{lanjut + i + 1}</b>}</span>
                        <span className="tx"><b>{s.title}</b><span>{state === 'dikuasai' ? 'Sudah dikuasai' : state === 'dilatih' ? 'Sedang dilatih' : 'Belum dicoba'}</span></span>
                        <Icon name="chevronRight" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="e-panel">
            <h2>Aktivitas</h2>
            <ul className="e-act">
              {[
                ['Hari ini', hariIni, TARGET_MENIT, `${Math.round(hariIni)}/${TARGET_MENIT} mnt`],
                ['Minggu ini', menitMinggu, TARGET_MINGGU, `${Math.round(menitMinggu)}/${TARGET_MINGGU} mnt`],
                ['Hari aktif', st.minggu.filter((d) => d.aktif).length, 7, `${st.minggu.filter((d) => d.aktif).length}/7`],
                ['Tahap dikuasai', totalKuasai, Math.max(1, totalTahap), `${totalKuasai}/${totalTahap}`],
              ].map(([label, v, max, txt]) => (
                <li key={label as string}><span>{label}</span><i><em style={{ width: `${Math.min(1, (v as number) / (max as number)) * 100}%` }} /></i><b>{txt}</b></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
