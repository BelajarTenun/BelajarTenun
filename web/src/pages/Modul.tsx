import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import { useProgres } from '../lib/progres';

// Galeri kain berurutan sesuai jalur belajar (kelas tugas). Status di tiap kartu; modul motif terkunci sampai Modul Dasar tuntas.
export default function Modul() {
  const { loading, modules, status, kunci, mastery } = useProgres();
  const tuntasN = modules.filter((m) => status[m.id] === 'tuntas').length;
  return (
    <Shell>
      <ViewHeader title="Pilih kain yang ingin kamu buat" description={`Mulai dari kain dasar, lalu motif. ${tuntasN} dari ${modules.length} tuntas.`} />
      {loading ? <p className="a-muted">Memuat…</p> : modules.length === 0
        ? <div className="a-empty"><Icon name="book" /><b>Belum ada modul</b><span>Modul muncul di sini setelah diterbitkan oleh penenun mitra.</span></div>
        : (
          <ul className="kain-grid">
            {modules.map((m) => {
              const x = status[m.id], lock = kunci[m.id];
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
                      <span>{lock ? 'Selesaikan Modul Dasar dulu' : [m.weaver || m.tradition, `${m.steps} tahap`].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </Shell>
  );
}
