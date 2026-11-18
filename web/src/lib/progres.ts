// Kemajuan belajar dari riwayat sesi: hari beruntun (streak), 7 hari terakhir, dan status tiap modul di jalur.
export type Sesi = { id: string; module: string; start: string; end: string; done: boolean; reached: number; questions: number; minutes: number };
export type Status = 'tuntas' | 'berjalan' | 'berikut' | 'nanti';

const hari = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function bermakna(s: Sesi) { return s.done || s.reached > 0 || s.minutes >= 1; }

export function streak(sesi: Sesi[], now = new Date()) {
  const aktif = new Set(sesi.filter(bermakna).map((s) => hari(new Date(s.start))));
  const d = new Date(now);
  const hariIni = aktif.has(hari(d));
  if (!hariIni) d.setDate(d.getDate() - 1); // streak kemarin masih berlaku sampai hari ini berakhir
  let n = 0;
  while (aktif.has(hari(d))) { n++; d.setDate(d.getDate() - 1); }
  const minggu = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(now); x.setDate(x.getDate() - (6 - i));
    return { label: x.toLocaleDateString('id-ID', { weekday: 'narrow' }), aktif: aktif.has(hari(x)), hariIni: i === 6 };
  });
  return { n, hariIni, minggu };
}

export function statusModul(ids: string[], sesi: Sesi[]) {
  const tuntas = new Set(sesi.filter((s) => s.done).map((s) => s.module));
  const disentuh = new Set(sesi.filter(bermakna).map((s) => s.module));
  let adaBerikut = false;
  return Object.fromEntries(ids.map((id) => {
    let st: Status = 'nanti';
    if (tuntas.has(id)) st = 'tuntas';
    else if (disentuh.has(id)) st = 'berjalan';
    else if (!adaBerikut) { st = 'berikut'; adaBerikut = true; }
    return [id, st];
  })) as Record<string, Status>;
}
