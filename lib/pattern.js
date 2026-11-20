// Grafik pola motif (cara standar mengajar motif tenun: songket, pakan tambahan, sulam).
// Petak: kolom = helai/kelompok lungsi (kiri→kanan dari sudut pandang penenun), baris = baris pakan,
// baris 1 = baris PERTAMA yang ditenun (paling dekat ke penenun). Tiap sel berisi satu huruf kunci palet.
//
// pattern = {
//   label: "Pola latihan belah ketupat",          // nama yang ditampilkan
//   authentic: false,                              // true hanya bila digambar/divalidasi penenun pemilik motif
//   technique: "pakan_tambahan" | "sulam" | "ikat" | "lainnya",
//   unit: "1 kolom = 2 helai lungsi",              // opsional
//   palette: { ".": { name: "dasar (hitam)", color: "#222" }, "K": { name: "kuning", color: "#e0b21b" } },
//   rows: ["....K....", "...KKK...", ...],        // semua baris sama panjang
//   validated_by: null
// }

export const TECHNIQUES = ['pakan_tambahan', 'sulam', 'ikat', 'lainnya'];
const TECH_LABEL = { pakan_tambahan: 'pakan tambahan', sulam: 'sulam', ikat: 'ikat', lainnya: 'lainnya' };
export const MAX_COLS = 80, MAX_ROWS = 120;

export function validatePattern(p, at = 'Grafik pola') {
  const e = [];
  if (!p || typeof p !== 'object') return [`${at}: tidak valid`];
  if (!String(p.label || '').trim()) e.push(`${at}: nama pola wajib diisi`);
  if (!TECHNIQUES.includes(p.technique)) e.push(`${at}: teknik harus ${TECHNIQUES.join(' / ')}`);
  const keys = Object.keys(p.palette || {});
  if (!keys.length) e.push(`${at}: palet warna kosong`);
  for (const k of keys) {
    if ([...k].length !== 1) e.push(`${at}: kunci palet "${k}" harus satu huruf`);
    if (!p.palette[k]?.name) e.push(`${at}: warna "${k}" butuh nama`);
    if (!/^#[0-9a-f]{3,8}$/i.test(p.palette[k]?.color || '')) e.push(`${at}: warna "${k}" butuh kode warna (#rrggbb)`);
  }
  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) e.push(`${at}: belum ada baris`);
  if (rows.length > MAX_ROWS) e.push(`${at}: maksimal ${MAX_ROWS} baris`);
  const w = rows[0]?.length ?? 0;
  if (w > MAX_COLS) e.push(`${at}: maksimal ${MAX_COLS} kolom`);
  rows.forEach((r, i) => {
    if (typeof r !== 'string' || r.length !== w) e.push(`${at}: baris ${i + 1} panjangnya harus ${w}`);
    else for (const ch of r) if (!keys.includes(ch)) { e.push(`${at}: baris ${i + 1} memakai huruf "${ch}" yang tidak ada di palet`); break; }
  });
  return e;
}

/** Kelompok sel berurutan dengan warna sama pada satu baris (nomor kolom mulai 1). */
export function rowRuns(p, n) {
  const r = p.rows[n - 1];
  if (!r) return [];
  const runs = [];
  [...r].forEach((ch, i) => {
    const last = runs.at(-1);
    if (last && last.key === ch) last.to = i + 1; else runs.push({ key: ch, from: i + 1, to: i + 1, name: p.palette[ch]?.name ?? ch });
  });
  return runs;
}

/** Baris yang isinya sama persis dengan baris sebelumnya: tutor cukup bilang "ulangi baris tadi". */
const sameAsPrev = (p, n) => n > 1 && p.rows[n - 1] === p.rows[n - 2];

/** Kalimat instruksi satu baris, siap diucapkan tutor. Kunci pertama palet dianggap warna dasar. */
export function describeRow(p, n) {
  const total = p.rows.length;
  if (n < 1 || n > total) return null;
  const base = Object.keys(p.palette)[0];
  const runs = rowRuns(p, n);
  const motif = runs.filter((x) => x.key !== base);
  const span = (x) => (x.from === x.to ? `kolom ${x.from}` : `kolom ${x.from}–${x.to}`);
  const text = sameAsPrev(p, n) ? `Baris ${n} dari ${total}: sama seperti baris sebelumnya.`
    : !motif.length ? `Baris ${n} dari ${total}: baris dasar saja, tanpa motif.`
    : `Baris ${n} dari ${total}: ${motif.map((x) => `${x.name} di ${span(x)}`).join(', ')}; selebihnya ${p.palette[base].name}.`;
  return { baris: n, total, kalimat: text, kelompok: runs.map(({ from, to, name }) => ({ dari: from, sampai: to, warna: name })), sama_dengan_sebelumnya: sameAsPrev(p, n) };
}

/** Ringkasan untuk tutor: jangan pernah menyebut pola latihan sebagai motif asli. */
export function patternSummary(p) {
  return { nama: p.label, asli: p.authentic === true && Boolean(p.validated_by), teknik: TECH_LABEL[p.technique] ?? p.technique, satuan: p.unit ?? null,
    lebar_kolom: p.rows[0]?.length ?? 0, jumlah_baris: p.rows.length, warna: Object.values(p.palette).map((c) => c.name),
    catatan: p.authentic === true && p.validated_by ? `Digambar/divalidasi oleh ${p.validated_by}.` : 'Pola latihan, BUKAN motif asli. Jangan menyebutnya motif budaya tertentu.' };
}

/** Pola latihan belah ketupat umum (untuk menguji fitur; bukan motif budaya mana pun). */
export function diamondPattern(size = 9) {
  const h = Math.floor(size / 2);
  const rows = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (Math.abs(x - h) + Math.abs(y - h) <= h ? 'K' : '.')).join(''));
  return { label: 'Pola latihan belah ketupat', authentic: false, technique: 'pakan_tambahan', unit: '1 kolom = 2 helai lungsi',
    palette: { '.': { name: 'dasar', color: '#2b2b2b' }, K: { name: 'kuning', color: '#e0b21b' } }, rows, validated_by: null };
}
