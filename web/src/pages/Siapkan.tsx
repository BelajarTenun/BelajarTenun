import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Nav from './Nav';
import { log, speak } from '../lib/api';
import { useApp } from '../lib/session';
// @ts-ignore modul JS bersama
import { PhoneCamera, GlassesCamera } from '@legacy/sources.js';
// @ts-ignore
import { assessFrame } from '@legacy/quality.js';

type Pilihan = 'belajartenun' | 'phone' | 'omiglass' | 'openglass';
const PILIHAN: [Pilihan, string, string][] = [
  ['belajartenun', 'Kacamata BelajarTenun', 'Tersambung lewat Bluetooth'],
  ['phone', 'Kamera HP', 'HP di head strap atau di atas alat tenun'],
  ['omiglass', 'omiGlass', 'Kacamata terbuka lain'],
  ['openglass', 'OpenGlass', 'Kacamata terbuka lain'],
];

export default function Siapkan() {
  const { id } = useParams();
  const nav = useNavigate();
  const { camera, setCamera } = useApp();
  const bt = GlassesCamera.supported();
  const [pilih, setPilih] = useState<Pilihan>(bt ? 'belajartenun' : 'phone');
  const [status, setStatus] = useState(''); const [ok, setOk] = useState<boolean | null>(null);
  const [cekPandang, setCekPandang] = useState(false); const [cekSuara, setCekSuara] = useState(false);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const img = useRef<HTMLImageElement>(null);

  // Tampilkan ulang kamera yang sudah tersambung (mis. setelah kembali dari praktik).
  useEffect(() => {
    if (!camera) return;
    if (camera instanceof PhoneCamera && video.current) { video.current.srcObject = camera.stream; camera.element = video.current; }
    else if (img.current) camera.element = img.current;
  }, [camera]);

  useEffect(() => {
    if (!camera) return;
    const t = setInterval(() => {
      const el = camera.element; if (!el) return;
      const q = assessFrame(el);
      if (!q) return;
      setOk(q.ok); setStatus(q.ok ? 'Gambar jelas. Pastikan lungsi dan tanganmu terlihat.' : `Gambar ${q.reason}. ${q.reason === 'buram' ? 'Bersihkan lensa atau diamkan kepala sebentar.' : 'Atur posisi lampu.'}`);
    }, 1200);
    return () => clearInterval(t);
  }, [camera]);

  async function sambungkan() {
    setBusy(true); setStatus(''); setOk(null); setCamera(null);
    const cam = pilih === 'phone' ? new PhoneCamera() : new GlassesCamera({ profile: pilih, intervalMs: 2000 });
    cam.onstatus = (t: string) => setStatus(t);
    try {
      await cam.start(pilih === 'phone' ? video.current : img.current);
      setCamera(cam); log('setup_connected', { module: id, camera: cam.kind });
    } catch (e) { setStatus((e as Error).message); setOk(false); } finally { setBusy(false); }
  }

  const isPhone = camera ? camera instanceof PhoneCamera : pilih === 'phone';
  return (
    <main className="page">
      <Nav back={{ to: `/belajar/${id}`, label: 'Pengenalan' }} />
      <p className="eyebrow">2 dari 3 · Siapkan</p>
      <h1>Siapkan kacamata</h1>

      <fieldset className="options" onChange={(e) => { setPilih((e.target as HTMLInputElement).value as Pilihan); setCamera(null); setStatus(''); }}>
        <legend className="sr">Kamera</legend>
        {PILIHAN.map(([v, t, d]) => {
          const off = v !== 'phone' && !bt;
          return <label key={v} className={off ? 'off' : ''}><input type="radio" name="cam" value={v} defaultChecked={v === pilih} disabled={off} /><span><strong>{t}</strong><small>{d}</small></span></label>;
        })}
      </fieldset>
      {!bt && <p className="warn small">Kacamata butuh Chrome di Android atau komputer. Di perangkat ini, pakai kamera HP.</p>}

      <figure className="media preview">
        <video ref={video} autoPlay playsInline muted hidden={!camera || !isPhone} />
        <img ref={img} alt="" hidden={!camera || isPhone} />
        {!camera && <span className="muted">Belum tersambung</span>}
      </figure>
      {status && <p className={ok === false ? 'warn' : ok ? 'ok' : 'muted'} aria-live="polite">{status}</p>}
      <button className="btn wide" onClick={sambungkan} disabled={busy}>{busy ? 'Menyambungkan…' : camera ? 'Sambungkan ulang' : pilih === 'phone' ? 'Nyalakan kamera HP' : 'Sambungkan kacamata'}</button>

      <ul className="checks">
        <li><label><input type="checkbox" checked={cekPandang} onChange={(e) => setCekPandang(e.target.checked)} /> Pandangan mengarah ke lungsi, tangan terlihat</label></li>
        <li><label><input type="checkbox" checked={cekSuara} onChange={(e) => setCekSuara(e.target.checked)} /> Earbuds tersambung dan suara terdengar</label>{' '}<button className="text link" onClick={() => speak('Halo, suara tutor terdengar.')}>Tes suara</button></li>
      </ul>

      <div className="actions sticky">
        <button className="btn primary wide" disabled={!camera} onClick={() => nav(`/belajar/${id}/praktik`)}>Mulai praktik</button>
        <button className="btn text" onClick={() => { setCamera(null); nav(`/belajar/${id}/praktik`); }}>Lanjut tanpa kamera</button>
      </div>
    </main>
  );
}
