import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';

type Hotspot = { label: string; body: string };
type Chapter = { id: string; band: string; kicker: string; title: string; text: string; hotspots: Hotspot[]; scene?: 'kapal'; media: { type: 'video' | 'image'; src: string; caption?: string } | null; source?: string };
type Story = { id: string; module: string; title: string; subtitle: string; owner: string; status: string; statusNote?: string; validated_by: string | null; chapters: Chapter[];
  piece: { code: string; weaver: string | null; year: number; place: string; note?: string } | null };

// Kain Bercerita: sejarah ditampilkan sebagai selembar kain yang terurai saat digulir.
// Tiap pita motif = satu bab; motif bisa diketuk (titik cerita). Dibuka dari modul (/cerita/:id) atau QR di label kain (/k/:kode).
export default function Cerita() {
  const { id, kode } = useParams();
  const [st, setSt] = useState<Story | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<{ ch: Chapter; h: Hotspot } | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = kode ? `code=${encodeURIComponent(kode)}` : `id=${encodeURIComponent(id ?? '')}`;
    api<Story>(`/api/story?${q}`).then((s) => { setSt(s); document.title = `${s.title} · Kain Bercerita`; }).catch((e) => setErr(e.message));
  }, [id, kode]);

  // Pita kain "terurai" saat masuk layar.
  useEffect(() => {
    if (!st || !root.current) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setSeen((s) => new Set(s).add((e.target as HTMLElement).dataset.ch!)); }), { threshold: 0.25 });
    root.current.querySelectorAll('[data-ch]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [st]);

  if (err) return <div className="kc kc-msg"><h1>Cerita tidak ditemukan</h1><p>{err}</p><Link to="/">Ke BelajarTenun</Link></div>;
  if (!st) return <div className="kc kc-msg"><p>Membentangkan kain…</p></div>;
  const progress = seen.size / st.chapters.length;

  return (
    <div className="kc" ref={root}>
      <div className="kc-progress" aria-hidden="true"><i style={{ height: `${progress * 100}%` }} /></div>

      <header className="kc-cover">
        <span className="kc-owner">{st.owner}</span>
        <h1>{st.title}</h1>
        <p>{st.subtitle}</p>
        {st.piece && (
          <div className="kc-piece">
            <b>Lembar {st.piece.code}</b>
            <span>{st.piece.weaver ? `Ditenun oleh ${st.piece.weaver}` : 'Nama penenun menyusul'} · {st.piece.place}, {st.piece.year}</span>
          </div>
        )}
        {st.status !== 'tervalidasi' && <p className="kc-draft">{st.statusNote || 'Draf: menunggu validasi pemilik motif.'}</p>}
        <span className="kc-hint"><Icon name="chevronRight" />Gulir untuk membentangkan kain</span>
        <div className="kc-rod" aria-hidden="true" />
      </header>

      <main className="kc-cloth">
        {st.chapters.map((c, i) => (
          <section key={c.id} data-ch={c.id} className={`kc-ch${seen.has(c.id) ? ' in' : ''}${i % 2 ? ' alt' : ''}`}>
            <div className="kc-band" aria-hidden="true"><Band kind={c.band} />{c.scene === 'kapal' && <Kapal />}</div>
            <article className="kc-card">
              <span className="k">{c.kicker}</span>
              <h2>{c.title}</h2>
              <p>{c.text}</p>
              {c.media?.type === 'video' && <video src={c.media.src} controls playsInline preload="none" />}
              {c.media?.type === 'image' && <img src={c.media.src} alt={c.media.caption ?? ''} loading="lazy" />}
              {c.hotspots.length > 0 && (
                <div className="kc-hot">{c.hotspots.map((h) => <button key={h.label} onClick={() => setOpen({ ch: c, h })}><i />{h.label}</button>)}</div>
              )}
              {c.source && <small>Sumber: {c.source}</small>}
            </article>
          </section>
        ))}
        <div className="kc-fringe" aria-hidden="true" />
      </main>

      <footer className="kc-end">
        <h2>Cerita ini berlanjut di tanganmu</h2>
        <p>Pelajari cara menenun motif ini bersama tutor BelajarTenun, langkah demi langkah.</p>
        <Link className="kc-btn" to={`/belajar/${st.module}`}><Icon name="play" />Belajar menenun motif ini</Link>
        <small>Cerita dan motif milik {st.owner}. Ditampilkan dengan izin.</small>
      </footer>

      {open && (
        <div className="kc-sheet-bg" onClick={() => setOpen(null)}>
          <div className="kc-sheet" role="dialog" aria-label={open.h.label} onClick={(e) => e.stopPropagation()}>
            <span className="k">{open.ch.title}</span>
            <h3>{open.h.label}</h3>
            <p>{open.h.body}</p>
            <button onClick={() => setOpen(null)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pita tenun ilustratif (SVG berulang), satu jenis per bab. Bukan foto kain asli.
const NAVY = '#141c3a', GOLD = '#d4b866', CREAM = '#f5efe2', RUST = '#8a3b22';
function Band({ kind }: { kind: string }) {
  const id = `p-${kind}`;
  const pats: Record<string, JSX.Element> = {
    polos: <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill={CREAM} /><path d="M0 4h8" stroke="#e4dac4" strokeWidth="2" /><path d="M4 0v8" stroke="#ebe2cf" strokeWidth="1" /></pattern>,
    garis: <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill={NAVY} /><rect y="4" width="24" height="3" fill={GOLD} /><rect y="14" width="24" height="6" fill={RUST} /><rect y="21" width="24" height="1.5" fill={GOLD} /></pattern>,
    tikar: <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#cbbf9f" /><rect width="10" height="10" fill="#a8996f" /><rect x="10" y="10" width="10" height="10" fill="#a8996f" /><path d="M0 0l20 20M20 0l-20 20" stroke="#8e8058" strokeWidth=".8" /></pattern>,
    anyam: <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill={NAVY} /><rect x="1" y="1" width="6" height="14" rx="2" fill={GOLD} /><rect x="9" y="1" width="6" height="14" rx="2" fill={CREAM} transform="rotate(90 12 8)" /></pattern>,
    jodati: <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#1d1d1d" /><path d="M18 3l15 15-15 15L3 18z" fill={GOLD} /><path d="M18 11l7 7-7 7-7-7z" fill="#1d1d1d" /><circle cx="18" cy="18" r="2" fill={GOLD} /></pattern>,
    bintang: <pattern id={id} width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill={NAVY} /><path d="M15 4l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={GOLD} /><circle cx="0" cy="0" r="2" fill={CREAM} /><circle cx="30" cy="30" r="2" fill={CREAM} /></pattern>,
  };
  return (
    <svg width="100%" height="100%" preserveAspectRatio="none">
      <defs>{pats[kind] ?? pats.polos}</defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <rect width="100%" height="4%" fill={GOLD} opacity=".85" /><rect y="96%" width="100%" height="4%" fill={GOLD} opacity=".85" />
    </svg>
  );
}

// Kapal layar berlayar dari kanan ke kiri saat bab terbuka (sejarah interaktif).
function Kapal() {
  return (
    <div className="kc-kapal">
      <svg viewBox="0 0 220 160" className="kc-kapal-ship">
        <path d="M20 112h180l-26 30H48z" fill="#5a3a22" />
        <path d="M30 112h160" stroke="#d4b866" strokeWidth="3" />
        <path d="M108 20v92M64 44v68M152 48v64" stroke="#3b2616" strokeWidth="4" />
        <path d="M108 26c34 10 40 46 0 66z" fill="#f5efe2" />
        <path d="M64 50c24 8 28 34 0 50z" fill="#efe6d3" />
        <path d="M152 54c22 8 24 30 0 44z" fill="#efe6d3" />
        <path d="M108 20l22 8-22 6z" fill="#8a3b22" />
      </svg>
      <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="kc-kapal-sea"><path d="M0 20c25-12 50-12 75 0s50 12 75 0 50-12 75 0 50 12 75 0 50-12 75 0 25 6 25 6V40H0z" fill="#141c3a" opacity=".55" /></svg>
    </div>
  );
}
