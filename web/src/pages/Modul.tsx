import { Link } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { useProgres } from '../lib/progres';
import { LEVELS, TEKNIK, bacaProfil } from '../lib/level';

// Modul berdasarkan TEKNIK, dikelompokkan per level alat. Level di atas level murid terkunci (butuh alat itu).
export default function Modul() {
  const { status } = useProgres();
  const myLevel = bacaProfil()?.level ?? 1;
  const tuntas = TEKNIK.filter((t) => t.module && status[t.module] === 'tuntas').length;
  return (
    <Shell>
      <ViewHeader title="Pilih teknik yang ingin kamu kuasai" description={<>Kamu di <b>Level {myLevel} · {LEVELS[myLevel - 1].name}</b>. {tuntas} dari {TEKNIK.length} teknik tuntas. <Link to="/mulai">Ubah level</Link></>} />
      {LEVELS.map((L) => {
        const atas = L.n > myLevel;
        return (
          <section key={L.n} className={`m-level${atas ? ' kunci' : ''}`}>
            <h2>Level {L.n} · {L.name} {L.n === myLevel && <span className="lv-tag">Levelmu</span>}{atas && <span className="lv-tag"><Icon name="lock" />Terkunci</span>}</h2>
            <p>{L.desc} Alat: {L.alat}.</p>
            <ul className="kain-grid">
              {TEKNIK.filter((t) => t.level === L.n).map((t) => {
                const st = t.module ? status[t.module] : undefined;
                const label = atas ? 'Terkunci' : !t.module ? 'Segera hadir' : { tuntas: 'Tuntas', berjalan: 'Sedang dipelajari', berikut: 'Berikutnya', nanti: 'Belum mulai' }[st ?? 'nanti'];
                const isi = (
                  <>
                    <span className="kain-frame"><span className="kain-photo" style={{ backgroundImage: `url("${t.foto}")` }} role="img" aria-label={t.title} />
                      <span className="kain-status">{atas && <Icon name="lock" />}{st === 'tuntas' && <Icon name="check" />}{label}</span></span>
                    <span className="kain-meta"><b>{t.title}</b><span>{atas ? `Butuh ${L.alat.toLowerCase()}` : t.desc}</span></span>
                  </>
                );
                return <li key={t.id}>{t.module && !atas
                  ? <Link to={`/belajar/${t.module}`} className={`kain-card ${st ?? ''}`}>{isi}</Link>
                  : <div className={`kain-card ${atas ? 'terkunci' : 'segera'}`} aria-disabled="true">{isi}</div>}</li>;
              })}
            </ul>
          </section>
        );
      })}
    </Shell>
  );
}
