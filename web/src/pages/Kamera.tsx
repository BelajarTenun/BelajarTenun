import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
// @ts-ignore modul JS bersama
import { sendCameraFromPhone } from '@legacy/pair-camera.js';

// HP sebagai kamera untuk laptop. Dibuka dari QR di laptop (/kamera?kode=123456), tanpa perlu masuk.
// Layar penuh gambar kamera belakang; layar dijaga tetap menyala selama dipakai.
export default function Kamera() {
  const [params] = useSearchParams();
  const [kode, setKode] = useState(params.get('kode') ?? '');
  const [state, setState] = useState<'isi' | 'menyambung' | 'aktif' | 'gagal'>(params.get('kode') ? 'menyambung' : 'isi');
  const [pesan, setPesan] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const sesi = useRef<{ stop: () => void } | null>(null);

  async function mulai(k: string) {
    setState('menyambung'); setPesan('Menyalakan kamera…');
    try {
      sesi.current = await sendCameraFromPhone(k, video.current, (t: string) => setPesan(t));
      setState('aktif');
      try { await (navigator as any).wakeLock?.request('screen'); } catch {}
    } catch (e) {
      const err = e as Error;
      setState('gagal');
      setPesan(err.name === 'NotAllowedError' ? 'Izin kamera ditolak. Ketuk ikon gembok di bilah alamat, izinkan Kamera, lalu muat ulang.' : err.message);
    }
  }
  useEffect(() => { if (params.get('kode')) mulai(params.get('kode')!); return () => sesi.current?.stop(); }, []);

  return (
    <div className="k-wrap">
      <video ref={video} autoPlay playsInline muted className={state === 'aktif' ? '' : 'dim'} />
      <div className="k-top">
        <span className="k-brand"><img src="/icon.svg" alt="" />BelajarTenun</span>
        {state === 'aktif' && <span className="k-live"><i />Terkirim ke laptop</span>}
      </div>
      {state === 'isi' && (
        <form className="k-card" onSubmit={(e) => { e.preventDefault(); if (kode.length === 6) mulai(kode); }}>
          <h1>Jadikan HP ini kamera</h1>
          <p>Masukkan kode 6 angka yang tampil di laptop.</p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus />
          <button className="k-btn" disabled={kode.length !== 6}>Sambungkan</button>
        </form>
      )}
      {state !== 'isi' && (
        <div className={`k-note ${state}`}>
          {state === 'aktif' ? 'Arahkan HP ke lungsi dan tanganmu. Biarkan halaman ini terbuka; lanjutkan latihan di laptop.' : pesan}
          {state === 'gagal' && <button className="k-btn" onClick={() => { setState('isi'); setPesan(''); }}>Masukkan kode lagi</button>}
        </div>
      )}
    </div>
  );
}
