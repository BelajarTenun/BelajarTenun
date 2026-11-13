import { Link } from 'react-router-dom';
import Nav from './Nav';
import { useApp } from '../lib/session';

const ALUR = [
  ['Kenali', 'Tonton video tutorial singkat dari penenun: alat, posisi duduk, dan tahap yang akan dikerjakan.'],
  ['Siapkan', 'Pakai kacamata BelajarTenun dan earbuds. Kamera melihat lungsi dan tanganmu, bukan wajahmu.'],
  ['Praktik', 'Tutor membimbing tahap demi tahap lewat suara, memberi tahu kalau ada yang perlu dibetulkan.'],
];

export default function Landing() {
  const { config } = useApp();
  return (
    <main className="page">
      <Nav />
      <section className="hero">
        <p className="eyebrow">Tenun tradisional Nusantara</p>
        <h1>Belajar menenun, dibimbing langsung lewat kacamata.</h1>
        <p className="lead">Tanganmu tetap di alat tenun. Tutor melihat apa yang kamu kerjakan dan menjelaskan langkah berikutnya, seperti penenun yang duduk di sebelahmu.</p>
        <div className="actions">
          <Link className="btn primary" to="/belajar">Mulai belajar</Link>
          {!config?.user && <Link className="btn text" to="/masuk">Sudah punya akun? Masuk</Link>}
        </div>
      </section>

      <section className="block">
        <h2>Cara belajarnya</h2>
        <ol className="steps-line">
          {ALUR.map(([t, d], i) => (
            <li key={t}><span className="num">{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="block">
        <h2>Yang kamu butuhkan</h2>
        <ul className="plain">
          <li>Alat tenun gedogan dengan lungsi terpasang</li>
          <li>Kacamata BelajarTenun, atau HP dengan head strap</li>
          <li>Earbuds yang tersambung ke HP</li>
        </ul>
      </section>

      <section className="block">
        <h2>Dibuat bersama penenun</h2>
        <p>Setiap modul disusun dan ditinjau oleh penenun dari komunitasnya. Rekaman hanya dipakai sesuai izin yang mereka berikan.</p>
        <p><a href="/arsip.html">Lihat arsip tenun</a> · <a href="/masuk.html?untuk=partner">Untuk penenun &amp; tim</a></p>
      </section>

      <footer className="foot">BelajarTenun</footer>
    </main>
  );
}
