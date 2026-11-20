import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Shell, { ViewHeader } from '../components/Shell';
import Icon from '../components/Icon';
import KainFoto from '../components/KainFoto';
import { log } from '../lib/api';
import { useModule } from '../lib/useModule';
import { useProgres, type Kuasai } from '../lib/progres';
import { useApp } from '../lib/session';

const IKON: Record<Kuasai, { label: string; cls: string }> = {
  dikuasai: { label: 'Dikuasai', cls: 'ok' }, dilatih: { label: 'Sedang dilatih', cls: 'mid' }, belum: { label: 'Belum dicoba', cls: '' },
};

// Detail modul: kain, makna, status tiap tahap untuk murid ini, lalu satu aksi utama (mulai / lanjut).
export default function Pengenalan() {
  const { id } = useParams();
  const { module, error } = useModule(id);
  const { byId, riwayat, mastery, kunci } = useProgres();
  useEffect(() => { if (module) log('intro_open', { module: module.id }); }, [module]);

  if (error) return <Shell><ViewHeader title="Modul tidak ditemukan" crumb={{ to: '/modul', label: 'Modul' }} description={error} /></Shell>;
  if (!module) return <Shell><p className="a-muted">Memuat…</p></Shell>;
  const intro = module.intro || {};
  const sum = byId[module.id];
  const ms = mastery[module.id] ?? {};
  const terakhir = riwayat.find((s) => s.module === module.id && !s.done && s.reached < module.steps.length);
  const lanjut = terakhir ? Math.min(terakhir.reached, module.steps.length - 1) : 0;
  const { config } = useApp();
  // Tim (admin/penenun) yang melihat sebagai murid tetap bisa mencoba modul terkunci.
  const lock = kunci[module.id] && (config?.user?.role ?? 'pemula') === 'pemula';
  const pola = module.steps.find((s) => s.pattern)?.pattern;
  const start = lock
    ? <span className="a-btn lg" aria-disabled="true"><Icon name="lock" />Selesaikan Modul Dasar dulu</span>
    : <Link className="a-btn primary lg" to={`/belajar/${module.id}/siapkan${lanjut ? `?mulai=${lanjut}` : ''}`} onClick={() => log('intro_done', { module: module.id })}><Icon name="play" />{terakhir ? `Lanjutkan tahap ${lanjut + 1}` : 'Mulai latihan'}</Link>;

  return (
    <Shell>
      <ViewHeader crumb={{ to: '/modul', label: 'Modul' }} title={sum?.fabricName || module.title}
        description={<span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {sum?.weaver && <span className="a-badge">{sum.weaver}</span>}
          <span className="a-badge">{module.steps.length} tahap</span>
          {intro.duration_min && <span className="a-badge">±{intro.duration_min} menit</span>}
        </span>}
        actions={start} />

      <div className="a-grid2">
        <div>
          <section className="a-section">
            <h2>Tahapmu <small>{Object.values(ms).filter((x) => x.state === 'dikuasai').length} dari {module.steps.length} dikuasai</small></h2>
            <ol className="b-steps">
              {module.steps.map((s, i) => {
                const k = IKON[ms[s.id]?.state ?? 'belum'];
                return (
                  <li key={s.id} className={k.cls}>
                    <i aria-hidden="true">{ms[s.id]?.state === 'dikuasai' ? <Icon name="check" /> : i + 1}</i>
                    <div><b>{s.title}</b><span>{s.instruction}</span></div>
                    <em>{k.label}</em>
                  </li>
                );
              })}
            </ol>
          </section>
          {intro.video && (
            <section className="a-section">
              <h2>Video pengenalan</h2>
              <div className="a-media"><video src={intro.video} controls playsInline preload="metadata" /></div>
              {intro.video_attribution && <p className="a-small a-muted" style={{ marginTop: 8 }}>{intro.video_attribution}</p>}
            </section>
          )}
        </div>
        <aside>
          {sum && <div className="b-cover"><KainFoto m={sum} /></div>}
          {(intro.summary || module.description) && (
            <section className="a-section"><h2>Tentang kain ini</h2><p className="a-text">{intro.summary || module.description}</p></section>
          )}
          {pola && (
            <section className="a-section"><h2>Grafik pola</h2>
              <div className="b-pola" style={{ gridTemplateColumns: `repeat(${pola.rows[0].length},1fr)` }}>
                {pola.rows.slice().reverse().flatMap((r, y) => [...r].map((c, x) => <i key={`${y}-${x}`} style={{ background: pola.palette[c]?.color }} />))}
              </div>
              <p className="a-small a-muted">{pola.authentic && pola.validated_by ? `Digambar oleh ${pola.validated_by}.` : 'Pola latihan, bukan motif asli. Tutor membimbing baris demi baris.'}</p>
            </section>
          )}
          {!!intro.tools?.length && (
            <section className="a-section"><h2>Yang dibutuhkan</h2>
              <ul className="a-list">{intro.tools.map((t) => <li key={t} className="a-check"><Icon name="check" className="a-small" />{t}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </Shell>
  );
}
