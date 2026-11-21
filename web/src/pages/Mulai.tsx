import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Icon from '../components/Icon';
import { LEVELS, simpanProfil, tentukanLevel, type Level } from '../lib/level';

const PENGALAMAN = [
  { v: 1, t: 'Belum pernah menenun', d: 'Baru mau mulai' },
  { v: 2, t: 'Pernah mencoba sedikit', d: 'Tahu lungsi dan pakan' },
  { v: 3, t: 'Sudah rutin menenun', d: 'Biasa membuat pola' },
  { v: 4, t: 'Mahir', d: 'Biasa memakai alat besar' },
];
const KUIS = [
  { q: 'Benang yang terbentang memanjang di alat tenun disebut…', a: ['Pakan', 'Lungsi', 'Sekoci'], benar: 1 },
  { q: 'Pada alat empat gun, motif terbentuk dari…', a: ['Urutan pengangkatan gun', 'Warna benang saja', 'Panjang kain'], benar: 0 },
];

// Onboarding singkat (3 langkah): pengalaman + 2 pertanyaan → alat yang dimiliki → level & alat yang dipakai.
export default function Mulai() {
  const nav = useNavigate();
  const [langkah, setLangkah] = useState(0);
  const [pengalaman, setPengalaman] = useState(0);
  const [jawab, setJawab] = useState<(number | null)[]>([null, null]);
  const [alat, setAlat] = useState<Level[]>([1]);
  const benar = jawab.filter((j, i) => j === KUIS[i].benar).length;
  const hasil = tentukanLevel(pengalaman || 1, benar, alat);
  const L = LEVELS[hasil.level - 1];
  const bisaLanjut = langkah === 0 ? pengalaman > 0 && jawab.every((j) => j !== null) : true;

  const selesai = () => { simpanProfil({ level: hasil.level, alat, pengalaman }); nav('/belajar'); };

  return (
    <Shell>
      <div className="ob">
        <ol className="ob-steps" aria-label="Langkah">
          {['Pengetahuan', 'Alat', 'Levelmu'].map((s, i) => <li key={s} className={i === langkah ? 'now' : i < langkah ? 'done' : ''}><i>{i < langkah ? <Icon name="check" /> : i + 1}</i>{s}</li>)}
        </ol>

        {langkah === 0 && (
          <section className="ob-card">
            <h1>Seberapa jauh kamu sudah menenun?</h1>
            <div className="ob-opts">
              {PENGALAMAN.map((p) => (
                <button key={p.v} className={`ob-opt${pengalaman === p.v ? ' on' : ''}`} onClick={() => setPengalaman(p.v)} aria-pressed={pengalaman === p.v}>
                  <b>{p.t}</b><span>{p.d}</span>
                </button>
              ))}
            </div>
            <h2>Dua pertanyaan singkat</h2>
            {KUIS.map((k, i) => (
              <div key={i} className="ob-quiz">
                <p>{k.q}</p>
                <div className="ob-chips">{k.a.map((a, j) => (
                  <button key={a} className={jawab[i] === j ? 'on' : ''} aria-pressed={jawab[i] === j} onClick={() => setJawab((x) => x.map((v, n) => (n === i ? j : v)))}>{a}</button>
                ))}<button className={jawab[i] === -1 ? 'on' : ''} onClick={() => setJawab((x) => x.map((v, n) => (n === i ? -1 : v)))}>Belum tahu</button></div>
              </div>
            ))}
          </section>
        )}

        {langkah === 1 && (
          <section className="ob-card">
            <h1>Alat apa yang kamu punya?</h1>
            <p className="ob-sub">Pilih semua yang tersedia. Kardus dan sumpit selalu bisa dipakai untuk mulai.</p>
            <div className="ob-tools">
              {LEVELS.map((l) => {
                const on = alat.includes(l.n);
                return (
                  <button key={l.n} className={`ob-tool${on ? ' on' : ''}`} aria-pressed={on} disabled={l.n === 1}
                    onClick={() => setAlat((a) => (on ? a.filter((x) => x !== l.n) : [...a, l.n]))}>
                    <span className="ph" style={{ backgroundImage: `url(${l.foto})` }} />
                    <span className="tx"><b>{l.alat}</b><span>Level {l.n} · {l.name}</span></span>
                    <span className="ck">{on && <Icon name="check" />}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {langkah === 2 && (
          <section className="ob-card ob-result">
            <span className="ob-kicker">Kamu mulai di</span>
            <h1>Level {L.n} · {L.name}</h1>
            <div className="ob-alat"><span className="ph" style={{ backgroundImage: `url(${L.foto})` }} /><div><span>Kamu akan menenun dengan</span><b>{L.alat}</b><p>{L.desc}</p></div></div>
            {hasil.pengetahuan > hasil.alatTertinggi && (
              <p className="ob-note">Pengetahuanmu sudah setara Level {hasil.pengetahuan}. Begitu punya {LEVELS[hasil.pengetahuan - 1].alat.toLowerCase()}, kamu bisa naik level.</p>
            )}
            <ol className="ob-path">
              {LEVELS.map((l) => <li key={l.n} className={l.n === L.n ? 'now' : l.n < L.n ? 'done' : ''}><i>{l.n}</i><b>{l.name}</b><span>{l.alat}</span></li>)}
            </ol>
          </section>
        )}

        <div className="ob-nav">
          {langkah > 0 ? <button className="a-btn" onClick={() => setLangkah(langkah - 1)}><Icon name="chevronLeft" />Kembali</button> : <span />}
          {langkah < 2
            ? <button className="a-btn primary lg" disabled={!bisaLanjut} onClick={() => setLangkah(langkah + 1)}>Lanjut<Icon name="chevronRight" /></button>
            : <button className="a-btn primary lg" onClick={selesai}>Lihat modul untukku<Icon name="chevronRight" /></button>}
        </div>
      </div>
    </Shell>
  );
}
