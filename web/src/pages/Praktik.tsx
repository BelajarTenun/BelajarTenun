import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { TutorClient } from '@legacy/tutor.js';

type Reply = { intent?: string; speak?: string; display?: string; step?: { index: number; total: number } };
type Line = { role: 'user' | 'tutor'; text: string };

// Sesi latihan gaya Gemini Live: kamera memenuhi layar, ucapan tutor tampil sebagai subtitle,
// tahap saat ini berupa label kecil di atas (ketuk untuk melihat semua tahap), dan hanya dua tombol: mic dan akhiri.
// Gemini Live adalah satu-satunya tutor (liveOnly): tidak ada suara browser atau foto berkala di belakangnya.
export default function Praktik() {
  const { id } = useParams();
  const nav = useNavigate();
  const { config, camera, setCamera } = useApp();
  const { module } = useModule(id);
  const [params] = useSearchParams();
  const startStep = Number(params.get('mulai')) || 0;
  const [stepIdx, setStepIdx] = useState(startStep);
  const [tutorLine, setTutorLine] = useState('');
  const [userLine, setUserLine] = useState('');
  const [live, setLive] = useState<'menyambung' | 'aktif' | 'gagal'>('menyambung');
  const [liveError, setLiveError] = useState('');
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState<'tutor' | 'user' | ''>('');
  const [sheet, setSheet] = useState(false);
  const [camLost, setCamLost] = useState(!camera);
  const tutor = useRef<any>(null);
  const video = useRef<HTMLVideoElement>(null), img = useRef<HTMLImageElement>(null);
  const stats = useRef({ questions: 0, startedAt: Date.now() });
  const pakaiVideo = !!camera?.stream;

  // Tanpa kamera, sesi Live tidak berguna: kembali ke langkah sambungkan kamera.
  useEffect(() => { if (!camera) nav(`/belajar/${id}/siapkan${startStep ? `?mulai=${startStep}` : ''}`, { replace: true }); }, []);

  useEffect(() => {
    if (!module || !config || !camera) return;
    if (pakaiVideo && video.current) { video.current.srcObject = camera.stream; video.current.play().catch(() => {}); camera.element = video.current; }
    else if (img.current) camera.element = img.current;
    const t = new TutorClient({
      moduleId: module.id, source: camera, serverTts: false, startStep, liveOnly: true,
      ui: {
        show: (r: Reply) => { if (r.step) setStepIdx(r.step.index); },
        card: () => {}, demo: () => {},
        status: () => {},
        speaking: (d: { tutor: boolean; user: boolean }) => setSpeaking(d.tutor ? 'tutor' : d.user ? 'user' : ''),
        transcript: (role: Line['role'], text: string) => {
          if (!text) return;
          if (role === 'tutor') { setTutorLine(text); setUserLine(''); } else { setUserLine(text); stats.current.questions++; }
        },
        finish: () => akhiri(true),
      },
    });
    tutor.current = t;
    log('practice_start', { module: module.id, camera: camera.paired ? 'hp-berpasangan' : camera.kind });
    (async () => { try { await t.start(); await mulaiLive(t); } catch (e) { setLive('gagal'); setLiveError((e as Error).message); } })();
    // Kamera mati di tengah sesi (HP terkunci, izin dicabut, HP pasangan menutup halaman): tampilkan peringatan.
    const health = setInterval(() => {
      const tr = camera.stream?.getVideoTracks?.()[0];
      setCamLost(Boolean(camera.stream) && (!tr || tr.readyState === 'ended'));
    }, 2000);
    if (camera.paired) camera.onchange = (ok: boolean) => setCamLost(!ok);
    return () => { clearInterval(health); t.stop(); tutor.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, config]);

  async function mulaiLive(t: any) {
    setLive('menyambung'); setLiveError('');
    try { await t.startLive(); setLive('aktif'); }
    catch (e) { setLive('gagal'); setLiveError((e as Error).message || 'Tutor tidak bisa tersambung.'); }
  }

  function akhiri(tuntas = false) {
    const mins = Math.max(1, Math.round((Date.now() - stats.current.startedAt) / 60000));
    const sessionId = tutor.current?.sessionId;
    tutor.current?.stop(); camera?.stop?.(); setCamera(null);
    nav(`/belajar/${id}/selesai`, { state: { mins, questions: stats.current.questions, sessionId, reached: tuntas ? total : stepIdx, total } });
  }

  if (!module || !camera) return <div className="lv"><p className="lv-wait">Memuat…</p></div>;
  const total = module.steps.length;
  const step = module.steps[Math.min(stepIdx, total - 1)];
  const toggleMic = () => { const m = !muted; setMuted(m); tutor.current?.setMuted(m); };
  const status = live === 'menyambung' ? 'Menyambungkan tutor…' : live === 'gagal' ? 'Tutor belum tersambung'
    : muted ? 'Mikrofon dibisukan' : speaking === 'tutor' ? 'Tutor berbicara' : speaking === 'user' ? 'Mendengarkanmu…' : 'Tutor memperhatikan';

  return (
    <div className="lv">
      <video ref={video} className="lv-cam" autoPlay playsInline muted hidden={!pakaiVideo} />
      <img ref={img} className="lv-cam" alt="" hidden={pakaiVideo} />

      <header className="lv-top">
        <button className="lv-step" onClick={() => setSheet(true)} aria-label="Lihat semua tahap">
          <span className="n">Tahap {Math.min(stepIdx + 1, total)}/{total}</span>
          <span className="t">{step.title}</span>
          <Icon name="chevronRight" />
        </button>
        <span className={`lv-live ${live}`}><i />{live === 'aktif' ? 'Live' : live === 'menyambung' ? 'Menyambung' : 'Terputus'}</span>
      </header>
      <div className="lv-progress"><i style={{ width: `${(stepIdx / total) * 100}%` }} /></div>

      {camLost && (
        <div className="lv-alert">
          <b>Gambar kamera terputus</b>
          <span>{camera.paired ? 'Buka lagi halaman kamera di HP dan jaga layarnya tetap menyala.' : 'Kamera berhenti. Sambungkan ulang kamera, lalu lanjutkan.'}</span>
          <button className="lv-pill" onClick={() => akhiri()}>Simpan dan sambungkan ulang</button>
        </div>
      )}

      <div className="lv-bottom">
        <div className="lv-caption" aria-live="polite">
          {live === 'gagal'
            ? <><p className="tutor">{liveError || 'Tutor belum tersambung.'}</p><button className="lv-pill" onClick={() => tutor.current && mulaiLive(tutor.current)}>Coba lagi</button></>
            : <>
                {userLine && <p className="user">{userLine}</p>}
                <p className="tutor">{tutorLine || (live === 'menyambung' ? 'Tutor sedang bergabung…' : step.instruction)}</p>
              </>}
        </div>
        <div className="lv-status"><span className={`lv-orb ${live === 'aktif' && !muted ? speaking || 'idle' : 'off'}`} />{status}</div>
        <div className="lv-controls">
          <button className={`lv-btn${muted ? ' muted' : ''}`} onClick={toggleMic} disabled={live !== 'aktif'} aria-pressed={muted} aria-label={muted ? 'Nyalakan mikrofon' : 'Bisukan mikrofon'}>
            <Icon name={muted ? 'micOff' : 'mic'} />
          </button>
          <button className="lv-btn end" onClick={() => akhiri()} aria-label="Akhiri sesi"><Icon name="x" /></button>
        </div>
      </div>

      {sheet && (
        <div className="lv-sheet-bg" onClick={() => setSheet(false)}>
          <div className="lv-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Tahap latihan">
            <div className="grab" />
            <h2>{module.title}</h2>
            <ol>
              {module.steps.map((s, i) => (
                <li key={s.id} className={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''}>
                  <i>{i < stepIdx ? <Icon name="check" /> : i + 1}</i>
                  <div><b>{s.title}</b>{i === stepIdx && <p>{s.instruction}</p>}</div>
                </li>
              ))}
            </ol>
            <p className="hint">Tutor memindahkan tahap sendiri. Bilang "sudah", "ulangi", atau tanyakan apa saja.</p>
          </div>
        </div>
      )}
    </div>
  );
}
