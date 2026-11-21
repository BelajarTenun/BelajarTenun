// Level belajar & alat (purwarupa untuk pitch: tersimpan di perangkat, belum di server).
export type Level = 1 | 2 | 3 | 4;
export const LEVELS: { n: Level; name: string; desc: string; alat: string; foto: string }[] = [
  { n: 1, name: 'Dasar', desc: 'Teknik dasar dengan alat sederhana seperti kardus atau sumpit.', alat: 'Kardus atau bingkai sumpit', foto: '/img/alat/sumpit.webp' },
  { n: 2, name: 'Pengembangan', desc: 'Inkle loom, sekoci, dan pola yang lebih beragam.', alat: 'Inkle loom dan sekoci', foto: '/img/alat/inkle.webp' },
  { n: 3, name: 'Teknik Lanjutan', desc: 'Alat empat gun dan urutan pengangkatan benang.', alat: 'Alat tenun empat gun', foto: '/img/alat/empat-gun.webp' },
  { n: 4, name: 'Kreasi', desc: 'ATBM dan perancangan motif.', alat: 'ATBM (alat tenun bukan mesin)', foto: '/img/alat/atbm.webp' },
];
/** Modul per level (sementara, sampai kurikulum per alat divalidasi penenun). */
export const MODUL_LEVEL: Record<string, Level> = {
  'tidore-dasar': 1, 'puta-dino-jodati': 2, 'puta-dino-tobaru': 2, 'puta-dino-marasante': 3, 'puta-dino-barakati': 3, 'puta-dino-kalajengking': 4,
};
export const levelOf = (id: string): Level => MODUL_LEVEL[id] ?? 1;

const KEY = 'bt-level';
export type Profil = { level: Level; alat: Level[]; pengalaman: number };
export function bacaProfil(): Profil | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function simpanProfil(p: Profil) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* mode privat */ } }

/** Level = pengetahuan, dibatasi alat yang dimiliki (Level 1 selalu bisa: kardus/sumpit). */
export function tentukanLevel(pengalaman: number, kuisBenar: number, alat: Level[]): { level: Level; pengetahuan: Level; alatTertinggi: Level } {
  const pengetahuan = Math.max(1, Math.min(4, pengalaman + (kuisBenar === 2 ? 1 : 0) - (kuisBenar === 0 ? 1 : 0))) as Level;
  const alatTertinggi = Math.max(1, ...alat) as Level;
  return { level: Math.min(pengetahuan, alatTertinggi) as Level, pengetahuan, alatTertinggi };
}

/** Modul berdasarkan TEKNIK per level (purwarupa pitch). `module` = modul yang sudah bisa dipraktikkan bersama tutor. */
export type Teknik = { id: string; level: Level; title: string; desc: string; foto: string; module?: string };
export const TEKNIK: Teknik[] = [
  { id: 'anyaman-polos', level: 1, title: 'Anyaman polos', desc: 'Lungsi dan pakan bergantian atas-bawah.', foto: '/img/kain/tidore-dasar.jpg', module: 'tidore-dasar' },
  { id: 'bingkai-sumpit', level: 1, title: 'Memasang lungsi di bingkai', desc: 'Merentang benang di kardus atau sumpit.', foto: '/img/alat/sumpit.webp' },
  { id: 'tepi-rapi', level: 1, title: 'Merapatkan pakan & tepi rapi', desc: 'Kain rapat tanpa tepi menyempit.', foto: '/img/kain/tidore-dasar.jpg' },
  { id: 'pita-inkle', level: 2, title: 'Pita tenun inkle', desc: 'Lungsi bergantian di inkle loom dan sekoci.', foto: '/img/alat/inkle.webp' },
  { id: 'pickup-ketupat', level: 2, title: 'Pungut lungsi: belah ketupat', desc: 'Mengangkat lungsi pilihan untuk membentuk motif.', foto: '/img/kain/puta-dino-jodati.jpg', module: 'puta-dino-jodati' },
  { id: 'pakan-tambahan', level: 2, title: 'Pakan tambahan dua warna', desc: 'Benang motif di atas dasar polos.', foto: '/img/kain/puta-dino-tobaru.jpg', module: 'puta-dino-tobaru' },
  { id: 'urutan-gun', level: 3, title: 'Urutan pengangkatan gun', desc: 'Membaca dan mengikuti urutan 4 gun.', foto: '/img/alat/empat-gun.webp' },
  { id: 'kepar', level: 3, title: 'Kepar (twill) dan kepar berlian', desc: 'Garis miring dan berlian dari urutan gun.', foto: '/img/kain/puta-dino-marasante.jpg', module: 'puta-dino-marasante' },
  { id: 'draft', level: 3, title: 'Membaca draft tenun', desc: 'Grafik pemasangan, pengangkatan, dan injakan.', foto: '/img/kain/puta-dino-barakati.jpg', module: 'puta-dino-barakati' },
  { id: 'atbm', level: 4, title: 'Menenun di ATBM', desc: 'Kain lebar dengan pedal dan sisir.', foto: '/img/alat/atbm.webp' },
  { id: 'rancang-motif', level: 4, title: 'Merancang motif sendiri', desc: 'Dari sketsa ke grafik, lalu ke kain.', foto: '/img/kain/puta-dino-kalajengking.jpg', module: 'puta-dino-kalajengking' },
];
