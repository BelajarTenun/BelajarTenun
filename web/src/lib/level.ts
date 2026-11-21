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
