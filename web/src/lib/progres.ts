import { useEffect, useMemo, useState } from 'react';
import { api, type ModuleSummary } from './api';

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

export type Kuasai = 'dikuasai' | 'dilatih' | 'belum';
export type Mastery = Record<string, Record<string, { state: Kuasai; attempts: number }>>;

/** Modul kelas tugas lebih tinggi terkunci sampai semua modul kelas terendah (Modul Dasar) tuntas. */
export function terkunci(modules: ModuleSummary[], status: Record<string, Status>) {
  const kelas = modules.map((m) => m.taskClass ?? 1);
  const min = Math.min(...kelas);
  const dasarTuntas = modules.filter((m) => (m.taskClass ?? 1) === min).every((m) => status[m.id] === 'tuntas');
  return Object.fromEntries(modules.map((m) => [m.id, !dasarTuntas && (m.taskClass ?? 1) > min]));
}

/** Data dashboard murid: modul, sesi bermakna, status jalur, kunci, penguasaan tahap. */
export function useProgres() {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [sesi, setSesi] = useState<Sesi[] | null>(null);
  const [mastery, setMastery] = useState<Mastery>({});
  useEffect(() => {
    api<{ modules: ModuleSummary[] }>('/api/modules').then((r) => setModules(r.modules)).catch(() => setModules([]));
    api<{ sessions: Sesi[] }>('/api/progress?mine=1').then((r) => setSesi(r.sessions)).catch(() => setSesi([]));
    api<{ mastery: Mastery }>('/api/me/mastery').then((r) => setMastery(r.mastery)).catch(() => {});
  }, []);
  return useMemo(() => {
    const byId = Object.fromEntries((modules ?? []).map((m) => [m.id, m]));
    const riwayat = (sesi ?? []).filter((s) => byId[s.module] && bermakna(s)).sort((a, b) => b.start.localeCompare(a.start));
    const status = statusModul((modules ?? []).map((m) => m.id), riwayat);
    const kunci = terkunci(modules ?? [], status);
    // "Berikutnya" tidak boleh jatuh ke modul yang masih terkunci.
    for (const id of Object.keys(status)) if (status[id] === 'berikut' && kunci[id]) status[id] = 'nanti';
    return { loading: !modules || !sesi, modules: modules ?? [], byId, riwayat, status, kunci, mastery };
  }, [modules, sesi, mastery]);
}

export const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export function kelompokTanggal(iso: string, now = new Date()) {
  const d = new Date(iso), a = new Date(now); a.setHours(0, 0, 0, 0);
  const diff = Math.round((a.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  return diff === 0 ? 'Hari ini' : diff === 1 ? 'Kemarin' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}
