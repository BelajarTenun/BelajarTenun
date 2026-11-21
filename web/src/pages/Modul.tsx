import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import { useProgres } from '../lib/progres';
import { LEVELS, bacaProfil, levelOf } from '../lib/level';

// Galeri kain berurutan sesuai jalur belajar (kelas tugas). Status di tiap kartu; modul motif terkunci sampai Modul Dasar tuntas.
export default function Modul() {
  const { loading, modules, status, kunci, mastery } = useProgres();
  const tuntasN = modules.filter((m) => status[m.id] === 'tuntas').length;
  const myLevel = bacaProfil()?.level ?? 1;
  return (
    <Shell>
      <ViewHeader title="Pilih kain yang ingin kamu buat" description={<>Kamu di <b>Level {myLevel} · {LEVELS[myLevel - 1].name}</b>. {tuntasN} dari {modules.length} kain tuntas. <Link to="/mulai">Ubah level</Link></>} />
      {loading ? <p className="a-muted">Memuat…</p> : modules.length === 0
        ? <div className="a-empty"><Icon name="book" /><b>Belum ada modul</b><span>Modul muncul di sini setelah diterbitkan oleh penenun mitra.</span></div>
        : (
          LEVELS.map((L) => { const list = modules.filter((m) => levelOf(m.id) === L.n); const atas = L.n > myLevel; return (
          <section key={L.n} className={`m-level${atas ? ' kunci' : ''}`}>
            <h2>Level {L.n} · {L.name} {L.n === myLevel && <span className="lv-tag">Levelmu</span>}{atas && <span className="lv-tag"><Icon name="lock" />Terkunci</span>}</h2>
            <p>{L.desc} Alat: {L.alat}.</p>
            {list.length === 0 ? <p className="a-muted">Modul untuk level ini sedang disusun bersama penenun.</p> : (
          <ul className="kain-grid">
            {list.map((m) => {
              const x = status[m.id], lock = kunci[m.id] || atas;
              const dicoba = Object.values(mastery[m.id] ?? {}).filter((s) => s.state !== 'belum').length;
              const label = lock ? 'Terkunci' : { tuntas: 'Tuntas', berjalan: `${dicoba} dari ${m.steps} tahap dicoba`, berikut: 'Berikutnya', nanti: 'Belum mulai' }[x];
              return (
                <li key={m.id}>
                  <Link to={`/belajar/${m.id}`} className={`kain-card ${lock ? 'terkunci' : x}`}>
                    <span className="kain-frame">
                      <KainFoto m={m} />
                      <span className="kain-status">{lock ? <Icon name="lock" /> : x === 'tuntas' && <Icon name="check" />}{label}</span>
                    </span>
                    <span className="kain-meta">
                      <b>{m.fabricName || m.title}</b>
                      <span>{atas ? `Butuh ${L.alat.toLowerCase()}` : [m.weaver || m.tradition, `${m.steps} tahap`].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>)}
          </section>); })
        )}
    </Shell>
  );
}
