import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { log } from '../lib/api';
import { useApp } from '../lib/session';
import { useModule } from '../lib/useModule';
// @ts-ignore modul JS bersama
import { TutorClient } from '@legacy/tutor.js';

type Reply = { pattern_row?: { row: number; total: number; complete?: boolean }; intent?: string; speak?: string; display?: string; step?: { index: number; total: number } };
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
  // Grafik pola: baris yang sedang diajarkan tutor (dari get_pattern_row / pattern_row_done).
  const [patRow, setPatRow] = useState<{ row: number; complete?: boolean } | null>(null);
  // Status agen tutor: menunggu → siap, atau gagal (pesan dari agen / batas waktu). Hanya "siap" berarti tutor benar-benar ada.
  const [tutorState, setTutorState] = useState<{ state: 'menunggu' | 'siap' | 'gagal'; message?: string }>({ state: 'menunggu' });
  const [camLost, setCamLost] = useState(!camera);
  const tutor = useRef<any>(null);
  const video = useRef<HTMLVideoElement>(null), img = useRef<HTMLImageElement>(null), backdrop = useRef<HTMLVideoElement>(null);
  const stats = useRef({ questions: 0, startedAt: Date.now() });
  const pakaiVideo = !!camera?.stream;

  // Tanpa kamera, sesi Live tidak berguna: kembali ke langkah sambungkan kamera.
  useEffect(() => { if (!camera) nav(`/belajar/${id}/siapkan${startStep ? `?mulai=${startStep}` : ''}`, { replace: true }); }, []);

  useEffect(() => {
    if (!module || !config || !camera) return;
    if (pakaiVideo && video.current) { video.current.srcObject = camera.stream; video.current.play().catch(() => {}); camera.element = video.current; if (backdrop.current) { backdrop.current.srcObject = camera.stream; backdrop.current.play().catch(() => {}); } }
    else if (img.current) camera.element = img.current;
    const t = new TutorClient({
      moduleId: module.id, source: camera, serverTts: false, startStep, liveOnly: true,
      ui: {
        show: (r: Reply) => { if (r.step) setStepIdx((i) => { if (i !== r.step!.index) setPatRow(null); return r.step!.index; }); if (r.pattern_row) setPatRow(r.pattern_row); },
        card: () => {}, demo: () => {},
        status: () => {},
        speaking: (d: { tutor: boolean; user: boolean }) => setSpeaking(d.tutor ? 'tutor' : d.user ? 'user' : ''),
        transcript: (role: Line['role'], text: string) => {
          if (!text) return;
          if (role === 'tutor') { setTutorLine(text); setUserLine(''); } else { setUserLine(text); stats.current.questions++; }
        },
        finish: () => akhiri(true),
        tutorState: (d: { state: 'siap' | 'gagal'; message?: string }) => setTutorState(d),
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
  const status = live === 'menyambung' ? 'Menyambungkan…' : live === 'gagal' || tutorState.state === 'gagal' ? 'Tutor tidak tersambung' : tutorState.state === 'menunggu' ? 'Menunggu tutor…'
    : muted ? 'Mikrofon dibisukan' : speaking === 'tutor' ? 'Tutor berbicara' : speaking === 'user' ? 'Mendengarkanmu…' : 'Tutor memperhatikan';

  return (
    <div className="lv">
      {/* Latar buram dari video yang sama: video tegak di layar lebar tidak diapit area hitam. */}
      <video ref={backdrop} className="lv-backdrop" autoPlay playsInline muted aria-hidden="true" hidden={!pakaiVideo} />
      <div className="lv-stage"><video ref={video} className="lv-cam" autoPlay playsInline muted hidden={!pakaiVideo} aria-label="Gambar kamera yang dilihat tutor" /></div>
      <img ref={img} className="lv-cam" alt="" hidden={pakaiVideo} />

      <header className="lv-top">
        <button className="lv-step" onClick={() => setSheet(true)} aria-label="Lihat semua tahap">
          <span className="n">Tahap {Math.min(stepIdx + 1, total)}/{total}</span>
          <span className="t">{step.title}</span>
          <Icon name="chevronRight" />
        </button>
        {(() => { const st = live === 'gagal' || tutorState.state === 'gagal' ? 'gagal' : live === 'aktif' && tutorState.state === 'siap' ? 'aktif' : 'menyambung';
          return <span className={`lv-live ${st}`}><i />{st === 'aktif' ? 'Live' : st === 'menyambung' ? 'Menunggu tutor' : 'Tutor tidak tersambung'}</span>; })()}
      </header>
      <div className="lv-progress"><i style={{ width: `${(stepIdx / total) * 100}%` }} /></div>

      {step.pattern && <PatternCard p={step.pattern} row={patRow?.row ?? 1} complete={!!patRow?.complete} />}

      {camLost && (
        <div className="lv-alert">
          <b>Gambar kamera terputus</b>
          <span>{camera.paired ? 'Buka lagi halaman kamera di HP dan jaga layarnya tetap menyala.' : 'Kamera berhenti. Sambungkan ulang kamera, lalu lanjutkan.'}</span>
          <button className="lv-pill" onClick={() => akhiri()}>Simpan dan sambungkan ulang</button>
        </div>
      )}

      <div className="lv-bottom">
        <div className="lv-caption" aria-live="polite">
          {live === 'gagal' || tutorState.state === 'gagal'
            ? <div className="lv-error" role="alert">
                <b>Tutor belum bisa membimbing</b>
                <span>{tutorState.message || liveError || 'Koneksi ke tutor gagal.'}</span>
                <button className="lv-pill" onClick={() => { setTutorState({ state: 'menunggu' }); tutor.current?.stopLive?.(); tutor.current && mulaiLive(tutor.current); }}>Coba lagi</button>
              </div>
            : <>
                {userLine && <p className="user">“{userLine}”</p>}
                {/* Hanya ucapan tutor sungguhan yang tampil sebagai ucapan tutor; selain itu status yang jujur. */}
                {tutorLine ? <p className="tutor">{tutorLine}</p>
                  : <p className="wait">{tutorState.state === 'siap' ? 'Tutor siap. Arahkan kamera ke alat tenun dan mulai bicara.' : 'Menunggu tutor bergabung…'}</p>}
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

// Grafik pola kecil di pojok: baris 1 di bawah (baris pertama ditenun); baris yang sedang dikerjakan disorot.
function PatternCard({ p, row, complete }: { p: NonNullable<import('../lib/api').Step['pattern']>; row: number; complete: boolean }) {
  const w = p.rows[0]?.length ?? 0;
  return (
    <aside className="lv-pattern" aria-label={`Grafik pola, baris ${row} dari ${p.rows.length}`}>
      <div className="h"><b>{complete ? 'Pola selesai' : `Baris ${row}/${p.rows.length}`}</b><span>{p.authentic && p.validated_by ? p.label : 'Pola latihan'}</span></div>
      <div className="g" style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
        {p.rows.map((r, y) => ({ r, y })).reverse().flatMap(({ r, y }) => [...r].map((ch, x) => (
          <i key={`${y}-${x}`} className={y + 1 === row && !complete ? 'now' : y + 1 < row || complete ? 'done' : ''} style={{ background: p.palette[ch]?.color }} />
        )))}
      </div>
    </aside>
  );
}
