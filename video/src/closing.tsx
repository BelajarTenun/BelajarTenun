import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, SERIF, SANS, MONO, Bg, Card, Tag, Chip, Media, fade, useSpring } from './theme';

const Phone: React.FC<{ x: number; y: number; title: string; children: React.ReactNode; w?: number }> = ({ x, y, title, children, w = 380 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: w * 2, borderRadius: 50, background: '#1C1E21', padding: 12 }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 40, background: '#F4F4F1', overflow: 'hidden', fontFamily: SANS, position: 'relative' }}>
      <div style={{ padding: '30px 24px 14px', fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: C.soft }}>[ {title.toUpperCase()} ]</div>
      {children}
    </div>
  </div>
);

// Adegan 14 — pendamping jarak jauh: HP penenun ↔ kacamata murid.
export const A14Pendamping: React.FC<{ src?: string; nama?: string }> = ({ src, nama = 'Ibu [nama]' }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [90, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bx = 640 + t * 560, by = 520 - Math.sin(t * Math.PI) * 220;
  return (
    <Bg>
      <Phone x={240} y={150} title="Pendamping · POV murid">
        <Media src={src} label="POV murid (langsung)" style={{ width: '100%', height: 300 }} />
        <div style={{ padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', fontSize: 22, opacity: fade(f, 30, 45) }}>
            Coba tekan lebih pelan.<span style={{ opacity: f < 80 ? Math.floor(f / 8) % 2 : 0 }}>|</span>
          </div>
          <div style={{ marginTop: 14, background: C.ink, color: '#fff', textAlign: 'center', borderRadius: 999, padding: 12, fontSize: 20, opacity: fade(f, 70, 80) }}>Kirim ke murid</div>
        </div>
      </Phone>
      <div style={{ position: 'absolute', left: bx, top: by, opacity: fade(f, 88, 95) * (1 - fade(f, 150, 158)), fontFamily: SANS, fontSize: 22, background: '#fff', borderRadius: 18, padding: '10px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>Coba tekan lebih pelan.</div>
      <div style={{ position: 'absolute', left: 1220, top: 300, width: 520, height: 400, borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
        <Media src={src} label="kacamata murid" style={{ width: '100%', height: '100%' }} />
        <Card style={{ position: 'absolute', left: 24, right: 24, bottom: 24, opacity: fade(f, 155, 168) }}>
          <Tag>Pesan dari {nama}</Tag>
          <div style={{ fontSize: 26, marginTop: 4 }}>Coba tekan lebih pelan.</div>
        </Card>
      </div>
      <div style={{ position: 'absolute', left: 240, top: 80, fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: C.soft }}>[ PENENUN · DARI RUMAH ]</div>
      <div style={{ position: 'absolute', left: 1220, top: 240, fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: C.soft }}>[ MURID · DI SANGGAR ]</div>
      <Chip label="AKSES" start={170} />
    </Bg>
  );
};

// Adegan 16 — catatan belajar akhir sesi.
export const A16Catatan: React.FC = () => {
  const f = useCurrentFrame();
  const stats = [['5/5', 'tahap selesai'], ['1', 'koreksi'], ['1', 'pertanyaan baru']];
  return (
    <Bg>
      <Phone x={760} y={90} w={400} title="Catatan belajar">
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stats.map(([n, l], i) => (
            <Card light key={l} style={{ padding: '16px 20px', opacity: fade(f, 15 + i * 15, 28 + i * 15) }}>
              <span style={{ fontFamily: SERIF, fontSize: 48, color: C.ink }}>{n}</span> <span style={{ fontSize: 22 }}>{l}</span>
            </Card>
          ))}
          <div style={{ fontSize: 20, color: C.soft, marginTop: 10, opacity: fade(f, 70, 85) }}>Bagian mana yang paling sulit?</div>
          {['Membuka mulut lungsi', 'Memasukkan pakan', 'Merapatkan pakan'].map((o, i) => (
            <div key={o} style={{ fontSize: 20, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${i === 2 && f > 120 ? C.ink : C.line}`, background: '#fff', opacity: fade(f, 80 + i * 8, 92 + i * 8) }}>{o}</div>
          ))}
        </div>
      </Phone>
    </Bg>
  );
};

// Adegan 17 — progres & efektivitas.
export const A17Progres: React.FC = () => {
  const f = useCurrentFrame();
  const data = [92, 64, 78, 51, 70];
  const labels = ['Mengenal alat', 'Membuka mulut lungsi', 'Memasukkan pakan', 'Merapatkan pakan', 'Mengulang baris'];
  const worst = data.indexOf(Math.min(...data));
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 200, top: 120, fontFamily: SANS, fontWeight: 500, letterSpacing: -1, fontSize: 60, color: C.ink }}>Tingkat selesai per tahap</div>
      <div style={{ position: 'absolute', left: 200, top: 205, fontFamily: MONO, fontSize: 15, color: C.soft }}>[ CONTOH · GANTI DENGAN DATA ASLI ]</div>
      {data.map((v, i) => {
        const h = fade(f, 10 + i * 8, 40 + i * 8) * v * 6;
        const hi = i === worst && f > 90;
        return (
          <div key={i} style={{ position: 'absolute', left: 260 + i * 290, bottom: 220, width: 160 }}>
            <div style={{ fontFamily: MONO, fontSize: 22, textAlign: 'center', marginBottom: 10, color: hi ? C.warn : C.ink }}>{Math.round(h / 6)}%</div>
            <div style={{ height: h, background: hi ? C.warn : C.ink, borderRadius: 6, opacity: hi || f < 90 ? 0.9 : 0.25 }} />
            <div style={{ position: 'absolute', top: '100%', marginTop: 14, width: 220, left: -30, textAlign: 'center', fontFamily: SANS, fontSize: 20 }}>{labels[i]}</div>
          </div>
        );
      })}
      <Card light style={{ position: 'absolute', left: 260 + worst * 290 - 60, top: 280, opacity: fade(f, 95, 110) }}>
        <div style={{ fontSize: 22 }}>Paling membingungkan, perlu diperbaiki</div>
      </Card>
      <Chip label="EFEKTIVITAS" start={20} />
    </Bg>
  );
};

// Adegan 19 — arsip publik.
export const A19Arsip: React.FC = () => {
  const f = useCurrentFrame();
  const items = ['Membuka mulut lungsi', 'Istilah: pakan', 'Memasukkan pakan', 'Kesalahan: pinggir menyempit', 'Merapatkan pakan', 'Istilah: belida'];
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 250, background: C.bg, zIndex: 2, paddingLeft: 200, paddingTop: 110, fontFamily: SANS, fontWeight: 500, letterSpacing: -1, fontSize: 60, color: C.ink }}>Arsip tenun terbuka</div>
      <div style={{ position: 'absolute', left: 200, top: 300 - f * 0.25, display: 'grid', gridTemplateColumns: 'repeat(3, 480px)', gap: 30 }}>
        {items.map((t, i) => (
          <Card light key={t} style={{ opacity: fade(f, 10 + i * 8, 24 + i * 8) }}>
            <Tag dark>Tervalidasi</Tag>
            <div style={{ fontSize: 28, margin: '10px 0 14px' }}>{t}</div>
            <div style={{ fontSize: 18, color: C.soft }}>Sumber: [pembuat] · CC BY · Tidore</div>
            <div style={{ fontFamily: MONO, fontSize: 14, color: C.ink, marginTop: 10 }}>JSON · CSV</div>
          </Card>
        ))}
      </div>
      <Chip label="PELESTARIAN" start={20} />
    </Bg>
  );
};

// Adegan 20 — tabel perbandingan. Sisi kanan kosong untuk Andrew.
export const A20Banding: React.FC<{ rightSpace?: boolean }> = ({ rightSpace = true }) => {
  const f = useCurrentFrame();
  const cols = ['Video tutorial', 'Kelas tatap muka', 'BelajarTenun'];
  const rows: [string, string[]][] = [
    ['Melihat kesalahan murid', ['—', '●', '●']],
    ['Kapan & di mana saja', ['●', '—', '●']],
    ['Isi divalidasi penenun', ['?', '●', '●']],
    ['Tangan tetap bebas', ['—', '●', '●']],
    ['Istilah bahasa daerah', ['jarang', '●', '●']],
  ];
  const W = rightSpace ? 1100 : 1500;
  const color = (v: string) => (v === '●' ? C.ink : C.line);
  return (
    <Bg>
      <div style={{ position: 'absolute', left: 110, top: 190, width: W, fontFamily: SANS }}>
        <div style={{ display: 'grid', gridTemplateColumns: `1.5fr repeat(3, 1fr)`, fontFamily: MONO, fontSize: 16, letterSpacing: 1, color: C.soft, paddingBottom: 18, borderBottom: `1px solid ${C.ink}` }}>
          <div />{cols.map((c, i) => <div key={c} style={{ textAlign: 'center', color: i === 2 ? C.ink : C.soft }}>{c}</div>)}
        </div>
        {rows.map(([label, vals], r) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: `1.5fr repeat(3, 1fr)`, fontSize: 30, color: C.ink, padding: '26px 0', borderBottom: `1px solid ${C.line}`, opacity: fade(f, 20 + r * 50, 34 + r * 50) }}>
            <div>{label}</div>
            {vals.map((v, i) => (
              <div key={i} style={{ textAlign: 'center', fontWeight: 700, color: color(v), transform: `scale(${i === 2 ? 0.7 + useSpringLocal(f, 34 + r * 50) * 0.3 : 1})` }}>{v}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 110 + (W / 4.5) * 1.5 + (W - (W / 4.5) * 1.5) * (2 / 3), top: 170, width: (W - (W / 4.5) * 1.5) / 3, height: 760, borderRadius: 20, background: 'rgba(42,50,60,0.05)', opacity: fade(f, 260, 280) }} />
    </Bg>
  );
};
const useSpringLocal = (f: number, s: number) => Math.min(1, Math.max(0, (f - s) / 10));

// Adegan 21–22 — angka uji coba & akurasi. Isi dengan data asli.
export const A21Angka: React.FC<{ pengguna?: string; video?: string; akurasi?: string; latensi?: string }> = ({ pengguna = '[N]', video = '[M]', akurasi = '[x]%', latensi = '[y] dtk' }) => {
  const f = useCurrentFrame();
  const items = [[pengguna, 'pengguna mencoba'], [video, 'video tenun diuji'], [akurasi, 'akurasi deteksi tahap'], [latensi, 'waktu respons tutor']];
  return (
    <Bg>
      <div style={{ position: 'absolute', top: 160, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 500, letterSpacing: -1, fontSize: 60, color: C.ink }}>Hasil uji coba</div>
      <div style={{ position: 'absolute', top: 360, width: '100%', display: 'flex', justifyContent: 'center', gap: 40 }}>
        {items.map(([n, l], i) => {
          const p = fade(f, 20 + i * 25, 38 + i * 25);
          return (
            <Card light key={l} style={{ width: 360, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              <div style={{ fontFamily: SERIF, fontSize: 104, color: C.ink }}>{n}</div>
              <div style={{ fontSize: 22, color: C.soft, textAlign: 'center' }}>{l}</div>
            </Card>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontFamily: SANS, fontSize: 22, color: C.soft, opacity: fade(f, 130, 145) }}>
        Uji memakai video tenun berlisensi terbuka · evaluasi dengan data berlabel
      </div>
    </Bg>
  );
};

// Adegan 24 — model bisnis. Sisi kiri kosong untuk anggota tim.
export const A24Bisnis: React.FC<{ skema?: string[] }> = ({ skema = ['[Langganan sanggar/sekolah]', '[Paket kacamata + modul]', '[Kemitraan dinas/museum]'] }) => {
  const f = useCurrentFrame();
  const col = (title: string, items: string[], x: number, s: number, c: string) => (
    <div style={{ position: 'absolute', left: x, top: 220, width: 330 }}>
      <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 2, color: C.soft, opacity: fade(f, s, s + 10) }}>[ {title} ]</div>
      {items.map((t, i) => (
        <Card light key={t} style={{ marginTop: 16, fontSize: 22, opacity: fade(f, s + 10 + i * 10, s + 22 + i * 10) }}>{t}</Card>
      ))}
    </div>
  );
  return (
    <Bg>
      {col('PENGGUNA', ['Pemula', 'SMK tekstil', 'Sanggar tenun', 'Wisata budaya'], 760, 10, C.ai)}
      <div style={{ position: 'absolute', left: 1100, top: 470, fontSize: 40, fontWeight: 200, color: C.soft, opacity: fade(f, 70, 80) }}>→</div>
      {col('NILAI', ['Sanggar melatih lebih banyak murid', 'Penenun dapat atribusi & honor', 'Pasar kain tenun meluas'], 1160, 80, C.gold)}
      <div style={{ position: 'absolute', left: 1500, top: 470, fontSize: 40, fontWeight: 200, color: C.soft, opacity: fade(f, 150, 160) }}>→</div>
      {col('SKEMA', skema, 1560, 160, C.accent)}
    </Bg>
  );
};

// Adegan 25 — peta: Tidore → Nusantara → dunia. Posisi titik perkiraan di bingkai 1920×1080.
export const A25Peta: React.FC = () => {
  const f = useCurrentFrame();
  const pts: [string, number, number, number][] = [
    ['Tidore', 1430, 470, 10], ['Sumba', 1130, 690, 50], ['Toraja', 1210, 520, 62], ['Toba', 620, 430, 74],
    ['Lombok', 1010, 680, 86], ['Kalimantan', 1000, 450, 98], ['Jawa', 860, 650, 110], ['Flores', 1230, 690, 122],
  ];
  const zoom = interpolate(f, [170, 260], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Bg>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {/* garis kepulauan sederhana */}
        <svg width="1920" height="1080" style={{ position: 'absolute', opacity: 0.35 }}>
          <path d="M520 330 Q620 380 720 520 Q760 600 700 610 Q600 520 520 330 Z M760 620 Q900 640 1060 660 Q1000 680 760 650 Z M880 380 Q1050 360 1080 470 Q1000 560 900 520 Q860 440 880 380 Z M1150 440 Q1240 430 1260 560 Q1200 600 1170 540 Z M1060 680 L1300 690 L1290 710 L1060 700 Z M1380 420 Q1460 440 1450 520 Q1400 500 1380 420 Z M1560 520 Q1720 520 1760 620 Q1640 640 1560 520 Z" fill={C.line} />
        </svg>
        {pts.map(([n, x, y, s], i) => {
          const p = fade(f, s, s + 12);
          return (
            <div key={n} style={{ position: 'absolute', left: x - 14, top: y - 14, opacity: p }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, margin: 7, background: i === 0 ? C.ai : C.ink, boxShadow: i === 0 ? `0 0 0 ${10 + Math.sin(f / 6) * 5}px rgba(110,168,240,0.25)` : 'none' }} />
              <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 1, color: C.ink, marginTop: 4 }}>{n.toUpperCase()}</div>
            </div>
          );
        })}
        {/* garis keluar ke dunia */}
        <svg width="1920" height="1080" style={{ position: 'absolute', overflow: 'visible' }}>
          {[[-1600, -500], [3400, -400], [-1400, 1500], [3300, 1400], [960, -1300]].map(([x, y], i) => (
            <path key={i} d={`M1430 470 Q ${(1430 + x) / 2} ${Math.min(470, y) - 300} ${x} ${y}`} stroke={C.ink} strokeWidth={1.5} opacity={0.6} fill="none" strokeDasharray="4000" strokeDashoffset={4000 * (1 - fade(f, 180 + i * 8, 260 + i * 8))} />
          ))}
        </svg>
      </AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 90, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 64, color: C.ink, opacity: fade(f, 200, 220) }}>Indonesia Cultural Power</div>
    </Bg>
  );
};

// Adegan 28 — kartu penutup + kredit.
export const A28Penutup: React.FC<{ url?: string; credits?: string[] }> = ({ url = 'belajartenun.id', credits = ['Video tenun: [judul] · [pembuat] · CC BY', 'Musik: [judul] · [lisensi]', 'Font: Inter, Fraunces (OFL)'] }) => {
  const f = useCurrentFrame();
  const s = useSpring(5);
  const draw = fade(f, 0, 80);
  return (
    <Bg>
      <svg width="900" height="420" viewBox="0 0 900 420" style={{ position: 'absolute', right: 40, bottom: 20, opacity: 0.55 }}>
        <path d="M60 120 Q60 60 130 60 L360 60 Q420 60 420 120 L420 280 Q420 350 350 350 L140 350 Q60 350 60 280 Z M480 120 Q480 60 550 60 L780 60 Q840 60 840 120 L840 280 Q840 350 770 350 L560 350 Q480 350 480 280 Z M420 150 Q450 120 480 150 M60 140 L10 120 M840 140 L890 120"
          fill="none" stroke={C.soft} strokeWidth="1.5" strokeDasharray="3000" strokeDashoffset={3000 * (1 - draw)} />
      </svg>
      <div style={{ position: 'absolute', left: 200, top: 120, opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
        <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: -0.3, color: C.ink }}>BelajarTenun</div>
        <div style={{ fontFamily: SERIF, fontSize: 88, color: '#111', marginTop: 120, lineHeight: 1.05 }}>Belajar menenun,<br />dipandu ilmu Nusantara.</div>
        <div style={{ display: 'inline-block', marginTop: 30, background: '#111', color: '#F2F2EE', fontFamily: SERIF, fontSize: 52, padding: '6px 34px 10px', borderRadius: 999, opacity: fade(f, 40, 55) }}>{url}</div>
      </div>
      <div style={{ position: 'absolute', left: 200, bottom: 70, fontFamily: SANS, fontSize: 18, color: C.soft, lineHeight: 1.6, opacity: fade(f, 90, 105) }}>
        {credits.map((c) => <div key={c}>{c}</div>)}
      </div>
    </Bg>
  );
};
