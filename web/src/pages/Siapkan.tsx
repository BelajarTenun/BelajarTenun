import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { PhoneCamera, GlassesCamera } from '@legacy/sources.js';
// @ts-ignore
import { assessFrame } from '@legacy/quality.js';

type Pilihan = 'belajartenun' | 'phone';

// Sambungkan kamera: hanya dua pilihan. Pratinjau + cek kualitas gambar, lalu Mulai latihan.
export default function Siapkan() {
  const { id } = useParams();
  const nav = useNavigate();
  const { module } = useModule(id);
  const { camera, setCamera } = useApp();
  const bt = GlassesCamera.supported();
  const [pilih, setPilih] = useState<Pilihan>(bt ? 'belajartenun' : 'phone');
  const [status, setStatus] = useState<{ text: string; kind: '' | 'ok' | 'warn' }>({ text: '', kind: '' });
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const img = useRef<HTMLImageElement>(null);
  const isPhone = camera ? camera instanceof PhoneCamera : pilih === 'phone';

  useEffect(() => {
    if (!camera) return;
    if (camera instanceof PhoneCamera && video.current) { video.current.srcObject = camera.stream; camera.element = video.current; }
    else if (img.current) camera.element = img.current;
    const t = setInterval(() => {
      const q = camera.element && assessFrame(camera.element);
      if (!q || q.reason === 'kosong') return;
      setStatus(q.ok ? { text: 'Gambar jelas. Pastikan lungsi dan tanganmu terlihat.', kind: 'ok' }
        : { text: q.reason === 'buram' ? 'Gambar buram. Bersihkan lensa atau tahan kepala sebentar.' : `Gambar ${q.reason}. Atur posisi lampu.`, kind: 'warn' });
    }, 1200);
    return () => clearInterval(t);
  }, [camera]);

  async function sambungkan() {
    setBusy(true); setCamera(null); setStatus({ text: pilih === 'phone' ? 'Menyalakan kamera…' : 'Mencari kacamata…', kind: '' });
    const cam = pilih === 'phone' ? new PhoneCamera() : new GlassesCamera({ profile: 'belajartenun', intervalMs: 2000 });
    cam.onstatus = (t: string) => setStatus({ text: t, kind: '' });
    try { await cam.start(pilih === 'phone' ? video.current : img.current); setCamera(cam); log('setup_connected', { module: id, camera: cam.kind }); }
    catch (e) { setStatus({ text: (e as Error).message, kind: 'warn' }); }
    finally { setBusy(false); }
  }

  const pick = (p: Pilihan) => { setPilih(p); setCamera(null); setStatus({ text: '', kind: '' }); };
  return (
    <Shell>
      <ViewHeader crumb={{ to: `/belajar/${id}`, label: module?.title ?? 'Modul' }} title="Sambungkan kamera"
        description="Tutor perlu melihat lungsi dan tanganmu. Pakai earbuds supaya suara tutor terdengar jelas." />
      <div className="a-grid2">
        <section className="a-section">
          <h2>Perangkat</h2>
          <div className="a-choice">
            <button type="button" aria-pressed={pilih === 'belajartenun'} disabled={!bt} onClick={() => pick('belajartenun')}>
              <Icon name="glasses" /><span><b>Kacamata BelajarTenun</b><small>{bt ? 'Tersambung lewat Bluetooth' : 'Butuh Chrome di Android atau komputer'}</small></span>
            </button>
            <button type="button" aria-pressed={pilih === 'phone'} onClick={() => pick('phone')}>
              <Icon name="phone" /><span><b>Kamera HP</b><small>HP di head strap atau di atas alat tenun</small></span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="a-btn" onClick={sambungkan} disabled={busy}>{busy ? 'Menyambungkan…' : camera ? 'Sambungkan ulang' : pilih === 'phone' ? 'Nyalakan kamera' : 'Sambungkan kacamata'}</button>
          </div>
        </section>
        <section className="a-section">
          <h2>Pratinjau {camera && <span className="a-badge ok"><span className="a-dot" />Tersambung</span>}</h2>
          <div className="a-preview">
            <video ref={video} autoPlay playsInline muted hidden={!camera || !isPhone} />
            <img ref={img} alt="" hidden={!camera || isPhone} />
            {!camera && <span className="a-muted a-small">Belum ada gambar</span>}
          </div>
          {status.text && <p className={`a-status ${status.kind}`} aria-live="polite">{status.text}</p>}
        </section>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <button className="a-btn ghost" onClick={() => { setCamera(null); nav(`/belajar/${id}/praktik`); }}>Lanjut tanpa kamera</button>
        <button className="a-btn primary lg" disabled={!camera} onClick={() => nav(`/belajar/${id}/praktik`)}><Icon name="play" />Mulai latihan</button>
      </div>
    </Shell>
  );
}
