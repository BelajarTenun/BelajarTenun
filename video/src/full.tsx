import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { MONO, SANS, SERIF, setFloating, fade } from './theme';
import { OnAndrew, Side } from './andrew';
import { A01Tangan, A02Masalah, A04Logo, A05Grid, A06Vision, A07Validasi } from './opening';
import { A08Mulai, A09Tahap, A10Kosakata, A11Koreksi, A12Tanya, A13LuarModul } from './pov';
import { A14Pendamping, A16Catatan, A17Progres, A19Arsip, A20Banding, A21Angka, A24Bisnis, A25Peta, A28Penutup } from './closing';
import { Chip } from './theme';

// Animatic utuh: semua adegan berurutan sesuai docs/SHOOTING-SCRIPT.md.
// Shot live diganti layar penanda "SHOT: …" sampai footage asli dimasukkan.

const Full: React.FC<{ S: React.FC<any>; p?: any }> = ({ S, p = {} }) => { setFloating(false); return <S {...p} />; };
const Side_: React.FC<{ S: React.FC<any>; side?: Side; p?: any }> = ({ S, side = 'kanan', p = {} }) => <OnAndrew Scene={S} sceneProps={p} side={side} preview />;

// Layar penanda shot live: siluet + keterangan shot yang harus diambil.
const Shot: React.FC<{ title: string; note: string; side?: 'kiri' | 'kanan' | 'tengah'; over?: React.FC<any> }> = ({ title, note, side = 'tengah', over: Over }) => {
  setFloating(true);
  const x = side === 'kiri' ? 80 : side === 'kanan' ? 1140 : 610;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #6d6a64, #2f2e2c)' }}>
      <svg width="700" height="900" style={{ position: 'absolute', left: x, bottom: 0 }}>
        <circle cx="350" cy="260" r="130" fill="#1f1e1c" />
        <path d="M80 900 Q80 470 350 450 Q620 470 620 900 Z" fill="#1f1e1c" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 22, letterSpacing: 3, color: '#1f1e1c', background: '#F2D36B', padding: '8px 18px', borderRadius: 6 }}>SHOT LIVE · {title}</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: 'rgba(255,255,255,0.8)', marginTop: 14 }}>{note}</div>
      </div>
      {Over && <Over />}
    </AbsoluteFill>
  );
};

// Montase: potongan cepat adegan sebelumnya.
const Montase: React.FC = () => {
  const cuts: [React.FC<any>, number][] = [[A05Grid, 60], [A06Vision, 150], [A09Tahap, 120], [A11Koreksi, 250], [A10Kosakata, 100], [A14Pendamping, 160]];
  return (
    <>
      {cuts.map(([S, from], i) => (
        <Sequence key={i} from={i * 40} durationInFrames={40}>
          <Sequence from={-from}><Full S={S} p={S === A05Grid ? { leftSpace: false } : {}} /></Sequence>
        </Sequence>
      ))}
    </>
  );
};

const Opsional: React.FC = () => {
  setFloating(false);
  return (
    <AbsoluteFill style={{ background: '#EDEDE9', justifyContent: 'center', alignItems: 'center', fontFamily: MONO, fontSize: 26, color: '#8C96A2' }}>
      [ ADEGAN 18 · OFFLINE · OPSIONAL — hapus jika fitur offline belum jalan ]
    </AbsoluteFill>
  );
};

type Row = { n: string; t: number; d: number; el: React.ReactNode; vo: string; kind: string };
const R = (n: string, t: number, d: number, kind: string, el: React.ReactNode, vo: string): Row => ({ n, t, d, el, vo, kind });

export const ROWS: Row[] = [
  R('01', 0, 7, 'ANDREW + ANIMASI', <Side_ S={A01Tangan} />, 'Andrew: Selama ratusan tahun, menenun diajarkan dari tangan ke tangan.'),
  R('02', 7, 7, 'ANIMASI', <Full S={A02Masalah} />, 'Tapi penenun senior makin sedikit. Anak muda sering tidak punya akses ke guru, dan pengetahuannya pelan-pelan hilang.'),
  R('03', 14, 6, 'LIVE', <Shot title="ANDREW PAKAI KACAMATA" note="Andrew di tengah, memakai kacamata saat bilang “di mata kita”, kamera push-in pelan" />, 'Andrew: Bagaimana kalau ilmunya bisa ikut… di mata kita?'),
  R('04', 20, 8, 'ANIMASI', <Full S={A04Logo} />, 'BelajarTenun adalah tutor AI di kacamata yang mengajarkan pengetahuan dan teknologi tradisional menenun, termasuk istilah bahasa daerahnya, langsung saat kita mencoba.'),
  R('05', 28, 8, 'ANDREW + ANIMASI', <Side_ S={A05Grid} p={{ leftSpace: false }} />, 'Andrew: Ilmu tenun sebenarnya sudah ada di mana-mana: ribuan video dan arsip yang dibagikan terbuka di internet.'),
  R('06', 36, 10, 'ANIMASI', <Full S={A06Vision} />, 'AI memecah setiap gerakan jadi tahap, istilah, dan kesalahan yang sering terjadi, lalu menggabungkan pola dari banyak penenun.'),
  R('07', 46, 9, 'ANIMASI', <Full S={A07Validasi} />, 'Tapi AI bisa salah. Untuk menjaga kualitas, setiap tahap diperiksa penenun sebelum diajarkan.'),
  R('08', 55, 7, 'ANIMASI', <Full S={A08Mulai} />, 'Murid: Mulai belajar. · Tutor: Halo. Kita mulai dari mengenal alat. Lihat ke arah belida.'),
  R('09', 62, 10, 'ANIMASI POV', <Full S={A09Tahap} />, 'Tutor: Bagus. Mulut lungsinya sudah terbuka. Sekarang masukkan benang pakan.'),
  R('10', 72, 8, 'ANIMASI POV', <Full S={A10Kosakata} />, 'Tutor: Setiap tradisi punya sebutannya sendiri untuk benang pakan.'),
  R('11', 80, 10, 'ANIMASI POV', <Full S={A11Koreksi} />, 'Tutor: Pinggirnya mulai menyempit. Longgarkan sedikit benang pakannya.'),
  R('12', 90, 9, 'LIVE + ANIMASI', <Shot title="WAJAH SAMPING MURID" note="Murid pakai kacamata, wajah dari samping di kiri, melihat ke bawah" side="kiri" over={A12Tanya} />, 'Murid: Kenapa harus dirapatkan setiap baris? · Tutor: Supaya kain padat dan motifnya tidak bergeser.'),
  R('13', 99, 9, 'LIVE + ANIMASI', <Shot title="WAJAH SAMPING MURID" note="Sama seperti 12, murid berhenti sejenak lalu bertanya" side="kiri" over={A13LuarModul} />, 'Murid: Kalau benangnya putus gimana? · Tutor: Itu belum ada di modul yang divalidasi. Pertanyaanmu kucatat untuk penenun.'),
  R('14', 108, 10, 'ANIMASI', <Full S={A14Pendamping} />, 'Penenun: Coba tekan lebih pelan. · Tutor: Pesan dari Ibu [nama]: coba tekan lebih pelan.'),
  R('15', 118, 8, 'LIVE', <Shot title="ANDREW BICARA" note="Andrew talking head, tengah" over={() => <Chip label="AKSES" start={0} />} />, 'Andrew: Penenun tidak tergantikan. Dengan BelajarTenun, akses ke mereka terbuka untuk lebih banyak murid, dari mana saja.'),
  R('16', 126, 8, 'ANIMASI', <Full S={A16Catatan} />, 'Setiap sesi meninggalkan catatan: apa yang sudah bisa, apa yang membingungkan.'),
  R('17', 134, 7, 'ANIMASI', <Full S={A17Progres} />, 'Dari situ kami bisa mengukur efektivitasnya, dan memperbaiki tahap yang paling sulit.'),
  R('18', 141, 7, 'OPSIONAL', <Opsional />, 'Tanpa sinyal pun, deteksi tahap tetap berjalan di HP.'),
  R('19', 148, 8, 'ANIMASI', <Full S={A19Arsip} />, 'Pengetahuan yang sudah divalidasi kami buka sebagai arsip tenun publik, supaya terus lestari.'),
  R('20', 156, 20, 'ANDREW + ANIMASI', <Side_ S={A20Banding} side="kiri" p={{ rightSpace: false }} />, 'Andrew: Video tutorial tidak bisa melihat kesalahan kita. Kelas tatap muka terbatas tempat dan waktunya. BelajarTenun menggabungkan keduanya.'),
  R('21', 176, 12, 'ANIMASI', <Full S={A21Angka} />, 'Kami menguji BelajarTenun bersama [N] pengguna dan [M] video tenun.'),
  R('22', 188, 8, 'REKAM LAYAR', <Shot title="REKAM LAYAR EVALUASI" note="Rekam layar hasil npm run evaluate (matriks kebingungan)" />, 'Deteksi tahapnya kami uji dengan data berlabel, bukan hanya dicoba-coba.'),
  R('23', 196, 10, 'LIVE', <Shot title="TESTIMONI" note="2 orang × 5 detik: teman yang mencoba aplikasi / penenun lewat video call" />, '(Testimoni dengan kata-kata sendiri)'),
  R('24', 206, 15, 'TIM + ANIMASI', <Side_ S={A24Bisnis} p={{ x0: 320 }} />, 'Tim ekonomi: Kami mulai dari sanggar dan sekolah. Setiap modul yang divalidasi memberi penghasilan bagi penenun.'),
  R('25', 221, 10, 'ANIMASI', <Full S={A25Peta} />, 'Dari satu tradisi ke seluruh tradisi tenun Nusantara, dan dari Indonesia ke dunia.'),
  R('26', 231, 8, 'ANIMASI', <Montase />, '(Musik naik)'),
  R('27', 239, 6, 'LIVE', <Shot title="TIM BERTIGA" note="Andrew + 2 anggota tim berdiri berdampingan" />, 'Andrew: BelajarTenun: cara baru belajar budaya. Terbuka untuk siapa saja, menyesuaikan setiap murid, dan dijaga penenunnya sendiri.'),
  R('28', 245, 8, 'ANIMASI', <Full S={A28Penutup} />, ''),
];
export const FULL_SECONDS = 253;

const Caption: React.FC<{ r: Row }> = ({ r }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: 'absolute', right: 40, top: 30, fontFamily: MONO, fontSize: 16, letterSpacing: 1, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '6px 12px', borderRadius: 6 }}>
        {r.n} · {r.kind}
      </div>
      {r.vo && (
        <div style={{ position: 'absolute', left: 160, right: 160, bottom: 24, textAlign: 'center', opacity: fade(f, 4, 12) }}>
          <span style={{ fontFamily: SANS, fontSize: 24, lineHeight: 1.5, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '4px 12px', borderRadius: 6, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{r.vo}</span>
        </div>
      )}
    </>
  );
};

export const FullVideo: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {ROWS.map((r) => (
      <Sequence key={r.n} from={r.t * 30} durationInFrames={r.d * 30}>
        <AbsoluteFill>{r.el}</AbsoluteFill>
        <Caption r={r} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
