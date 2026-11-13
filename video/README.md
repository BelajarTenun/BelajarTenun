# Animasi Video Showcase BelajarTenun

Proyek [Remotion](https://www.remotion.dev/) berisi semua animasi untuk video showcase BUDAYA GO! 2026. Skripnya ada di [`../docs/SHOOTING-SCRIPT.md`](../docs/SHOOTING-SCRIPT.md).

## Menjalankan

```bash
cd video
npm install
```

```bash
npm run studio
```

Studio terbuka di browser: pilih adegan di kiri, putar, dan ubah teks/props di panel kanan.

```bash
npm run render
```

Hasilnya di `video/out/`. Render sebagian: `npm run render -- A06 A09`. Cek cepat satu frame per adegan: `npm run render -- --still`.

## Daftar adegan

| Komposisi | Adegan | Catatan |
|---|---|---|
| `A01-teks-tangan` | 1 | Teks kata per kata. Tempel di layar TV belakang Andrew atau pakai penuh |
| `A02-masalah` | 2 | Penenun berkurang, tiga poin masalah |
| `A04-logo` | 4 | Logo benang menenun diri + Objek Pemajuan Kebudayaan |
| `A05-grid-open-source` | 5 | Sisi kiri kosong untuk Andrew |
| `A06-computer-vision` | 6 | Kotak deteksi + garis waktu tahap + kartu istilah/kesalahan |
| `A07-validasi` | 7 | 🤖 → ✏️ → ✔ + chip KUALITAS |
| `A08-mulai` | 8 | HP + tombol Mulai + AI mendengar |
| `A09-tahap` | 9 | POV dalam bingkai lensa, kartu Tahap 2/5 → 3/5 |
| `A10-kosakata` | 10 | Kartu bahasa daerah |
| `A11-koreksi` | 11 | Sorot oranye → petunjuk tambahan → hijau |
| `A12-tanya-overlay` | 12 | Ditumpuk di atas shot muka samping |
| `A13-luar-modul-overlay` | 13 | Ditumpuk di atas shot muka |
| `A14-pendamping` | 14 | HP penenun ↔ kacamata murid |
| `A16-catatan`, `A17-progres`, `A19-arsip` | 16–19 | Hasil belajar |
| `A20-perbandingan` | 20 | Sisi kanan kosong untuk Andrew |
| `A21-angka-uji` | 21–22 | **Isi angka asli** |
| `A24-bisnis` | 24 | Sisi kiri kosong untuk tim ekonomi. **Isi skema sesuai proposal** |
| `A25-peta` | 25 | Tidore → Nusantara → dunia |
| `A28-penutup` | 28 | Logo, CTA, kredit |
| `chip-*-overlay` | — | Chip kriteria lomba saja, untuk ditempel di adegan mana pun |

Komposisi berakhiran **`-overlay`** dirender sebagai `.mov` ProRes 4444 dengan **latar transparan**: taruh di track atas footage (shot muka Andrew/murid) di CapCut/Premiere/DaVinci.

## Adegan di samping Andrew

Kebanyakan adegan berlatar Andrew yang sedang bicara. Untuk itu setiap adegan informasi punya dua versi tambahan:

- **`<adegan>-andrew-overlay`** → `.mov` transparan: panel kaca berisi animasi, di sisi yang berlawanan dengan Andrew. Taruh di track atas footage Andrew.
- **`<adegan>-andrew-preview`** → sama, tapi dengan siluet penanda Andrew, hanya untuk mengecek komposisi.

Sisi panel: `kanan` (Andrew berdiri di kiri frame) atau `kiri` (Andrew di kanan, misalnya adegan 20). Ubah prop `side` di Studio sesuai posisi Andrew saat syuting.

Tips syuting: posisikan Andrew di sepertiga kiri atau kanan frame, dengan latar yang agak gelap atau blur, supaya panel terang terbaca jelas.

## Memasukkan video tenun sungguhan

1. Taruh file video (lisensi jelas) di `video/public/`, misalnya `public/pov-tenun.mp4`.
2. Di Studio, pilih adegan (`A06`, `A09`, `A10`, `A11`, `A14`), lalu isi prop `src` dengan `pov-tenun.mp4`. Untuk grid `A05`, isi `clips` dengan `[{ "src": "klip1.mp4", "license": "CC BY", "credit": "Nama pembuat" }, …]`.
3. Ubah juga `credit` di adegan POV menjadi pembuat & lisensi aslinya.

Tanpa `src`, adegan memakai kotak bergaris sebagai penanda tempat video.

## Yang wajib diganti sebelum dikirim

- `[istilah daerah]` di `A10-kosakata` (prop `istilah`), dari penenun/modul tervalidasi.
- `Ibu [nama]` di `A07` dan `A14`.
- `[N]`, `[M]`, `[x]%`, `[y] dtk` di `A21-angka-uji`, dari hasil uji asli.
- Skema di `A24-bisnis`, sama dengan proposal.
- Data grafik `A17-progres` (saat ini contoh), dari halaman Progres.
- Kredit di `A28-penutup` dan URL.

## Gaya

Warna dan font ada di `src/theme.tsx`. Font yang dipakai Inter dan Fraunces (keduanya lisensi OFL). Pasang keduanya di komputer sebelum render supaya hasilnya sama.
