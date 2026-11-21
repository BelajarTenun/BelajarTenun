import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import { api, log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { PhoneCamera, GlassesCamera } from '@legacy/sources.js';
// @ts-ignore
import { PairedPhoneCamera } from '@legacy/pair-camera.js';
// @ts-ignore
import { assessFrame } from '@legacy/quality.js';

type Pilihan = 'belajartenun' | 'phone';
const diHP = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches);

// Sambungkan kamera. Dua pilihan: kacamata, atau kamera HP.
// Dibuka di HP → kamera HP ini langsung menyala. Dibuka di laptop → pindai QR dengan HP, gambar HP dikirim ke laptop.
export default function Siapkan() {
  const { id } = useParams();
  const nav = useNavigate();
  const { module } = useModule(id);
  const { config, camera, setCamera } = useApp();
  const [params] = useSearchParams();
  const lanjut = params.get('mulai') ? `?mulai=${Number(params.get('mulai'))}` : '';
  const bt = GlassesCamera.supported();
  const [pilih, setPilih] = useState<Pilihan>('phone');
  const [status, setStatus] = useState<{ text: string; kind: '' | 'ok' | 'warn' }>({ text: '', kind: '' });
  const [busy, setBusy] = useState(false);
  const [pair, setPair] = useState<{ code: string; url: string; qr: string } | null>(null);
  const [webcam, setWebcam] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const img = useRef<HTMLImageElement>(null);
  const pakaiVideo = pilih === 'phone';
  const lewatQR = pilih === 'phone' && !diHP && !webcam && config?.livekit;

  // Cek kualitas gambar tiap detik selama pratinjau.
  useEffect(() => {
    if (!camera) return;
    const t = setInterval(() => {
      const q = camera.element && assessFrame(camera.element);
      if (!q || q.reason === 'kosong') return;
      setStatus(q.ok ? { text: 'Gambar jelas. Pastikan lungsi dan tanganmu terlihat.', kind: 'ok' }
        : { text: q.reason === 'buram' ? 'Gambar buram. Bersihkan lensa atau tahan sebentar.' : `Gambar ${q.reason}. Atur posisi lampu.`, kind: 'warn' });
    }, 1200);
    return () => clearInterval(t);
  }, [camera]);

  // Laptop + Kamera HP: buat kode pasangan, tampilkan QR, lalu tunggu HP mengirim gambar.
  useEffect(() => {
    if (!lewatQR || camera) return;
    let cam: any; let batal = false; let dipakai = false;
    (async () => {
      try {
        const { code } = await api<{ code: string }>('/api/pair/new', {});
        const url = `${location.origin}/kamera?kode=${code}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#0f172a', light: '#ffffff' } });
        if (batal) return;
        setPair({ code, url, qr });
        cam = new PairedPhoneCamera(code);
        cam.onstatus = (t: string) => setStatus({ text: t, kind: '' });
        await cam.start(video.current);
        if (batal) return cam.stop();
        dipakai = true; setCamera(cam); log('setup_connected', { module: id, camera: 'hp-berpasangan' });
      } catch (e) { if (!batal) setStatus({ text: (e as Error).message, kind: 'warn' }); }
    })();
    // Kamera yang sudah tersambung dibawa ke sesi Live; hanya yang belum jadi yang ditutup.
    return () => { batal = true; if (cam && !dipakai) cam.stop?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lewatQR]);

  async function sambungkan() {
    setBusy(true); setCamera(null); setStatus({ text: pilih === 'phone' ? 'Menyalakan kamera…' : 'Mencari kacamata…', kind: '' });
    const cam = pilih === 'phone' ? new PhoneCamera() : new GlassesCamera({ profile: 'belajartenun', intervalMs: 2000 });
    cam.onstatus = (t: string) => setStatus({ text: t, kind: '' });
    try { await cam.start(pilih === 'phone' ? video.current : img.current); setCamera(cam); log('setup_connected', { module: id, camera: cam.kind }); }
    catch (e) {
      const m = (e as Error).name === 'NotAllowedError' ? 'Izin kamera ditolak. Ketuk ikon gembok di bilah alamat, izinkan Kamera, lalu coba lagi.'
        : (e as Error).name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini.' : (e as Error).message;
      setStatus({ text: m, kind: 'warn' });
    } finally { setBusy(false); }
  }

  const pick = (p: Pilihan) => { camera?.stop?.(); setPilih(p); setCamera(null); setPair(null); setWebcam(false); setStatus({ text: '', kind: '' }); };
  const mulai = () => nav(`/belajar/${id}/praktik${lanjut}`);

  return (
    <Shell>
      <ViewHeader crumb={{ to: `/belajar/${id}`, label: module?.title ?? 'Modul' }} title="Sambungkan kamera"
        description="Tutor perlu melihat lungsi dan tanganmu. Pakai earbuds supaya suara tutor terdengar jelas." />
      <div className="a-grid2">
        <section className="a-section">
          <h2>Perangkat</h2>
          <div className="a-choice">
            <button type="button" aria-pressed={pilih === 'phone'} onClick={() => pick('phone')}>
              <Icon name="phone" /><span><b>Kamera HP</b><small>{diHP ? 'Kamera belakang HP ini' : 'Pindai QR dengan HP, gambar dikirim ke laptop'}</small></span>
            </button>
            <button type="button" aria-pressed={pilih === 'belajartenun'} disabled={!bt} onClick={() => pick('belajartenun')}>
              <Icon name="glasses" /><span><b>Kacamata BelajarTenun</b><small>{bt ? 'Tersambung lewat Bluetooth' : 'Butuh Chrome di Android atau komputer'}</small></span>
            </button>
          </div>

          {lewatQR ? (
            <div className="a-pair">
              {pair ? <img src={pair.qr} alt={`QR untuk ${pair.url}`} /> : <div className="ph" />}
              <ol>
                <li>Buka kamera HP dan pindai kode ini.</li>
                <li>Izinkan kamera, lalu pasang HP di head strap atau di atas alat tenun.</li>
                <li>Gambar dari HP akan muncul di pratinjau.</li>
              </ol>
              {pair && <p className="a-small a-muted">Atau buka <b>{location.host}/kamera</b> di HP dan masukkan kode <b className="code">{pair.code}</b></p>}
              <button className="a-btn ghost sm" onClick={() => { setWebcam(true); setPair(null); }}>Pakai webcam laptop saja</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              <button className={`a-btn${camera ? '' : ' primary'}`} onClick={sambungkan} disabled={busy}>{busy ? 'Menyambungkan…' : camera ? 'Sambungkan ulang' : pilih === 'phone' ? 'Nyalakan kamera' : 'Sambungkan kacamata'}</button>
            </div>
          )}
        </section>

        <section className="a-section">
          <h2>Pratinjau {camera && <span className="a-badge ok"><span className="a-dot" />Tersambung</span>}</h2>
          <div className="a-preview">
            <video ref={video} autoPlay playsInline muted hidden={!camera || !pakaiVideo} />
            <img ref={img} alt="" hidden={!camera || pakaiVideo} />
            {!camera && <span className="a-muted a-small">{lewatQR ? 'Menunggu HP…' : 'Belum ada gambar'}</span>}
          </div>
          {status.text && <p className={`a-status ${status.kind}`} aria-live="polite">{status.text}</p>}
        </section>
      </div>
      <div className="a-actions">
        <button className="a-btn primary lg" disabled={!camera} onClick={mulai}><Icon name="play" />{lanjut ? 'Lanjutkan latihan' : 'Mulai latihan'}</button>
      </div>
    </Shell>
  );
}
