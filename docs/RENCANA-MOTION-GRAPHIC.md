# Rencana Motion Graphic v5 (skill `motion-broll` + `sound-effects`)

Tujuan: motion graphic yang terasa dibuat motion designer, bukan template. Mengikuti aturan skill [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics): **satu bentuk yang terus berubah (tidak cut)**, digerakkan kursor yang klik/seret, **setiap perubahan jatuh di kata yang diucapkan**, kamera zoom supaya tiap keadaan memenuhi layar, motion blur asli. Dilarang: efek bouncy, partikel, glow, gradien di UI, ikon campur, waktu kosong, data karangan.

## Gaya global

| Aspek | Keputusan |
|---|---|
| Footage Andrew | Grade "kanan": latar sedikit gelap + blur tipis (MODNet), bawah & samping sedikit gelap. Diterapkan ke semua shot Andrew |
| Kanvas cutaway | Krem `#f5efe2`, komponen putih, tinta navy `#141c3a`, **satu aksen emas `#d4b866`** |
| Panel di samping Andrew | Panel kaca gelap tipis (navy 60%), garis tepi putih 1px, titik kecil di sudut, isi putih (seperti contoh "64%") |
| Huruf | Geist (UI), Geist Mono (angka/label teknis), wordmark logo tetap serif resmi |
| Ikon | Satu set, satu ketebalan garis (Lucide) |
| Gerak | Spring tanpa overshoot berlebihan; tepi depan & belakang indikator beda spring (efek "melar"); konten berganti dengan blur singkat |
| Subtitle | Teks putih kecil di bawah tengah, tanpa kotak, per frasa (seperti contoh) |
| Suara | Efek suara asli CC0 dari skill `sound-effects` (click, pop, tick, whoosh, ding, riser), diukur levelnya; musik dengan ducking |
| Transisi antar-babak | Bentuk yang sama membesar jadi adegan berikutnya (tidak fade, tidak slide template) |

Treatment: **FULL** = cutaway layar penuh (wajah hilang sementara), **PANEL** = panel di sisi kosong saat Andrew tetap terlihat, **–** = wajah saja.

## Daftar klip

| # | Waktu | Kalimat | Yang dilakukan bentuk, di kata apa | Treatment | Alasan |
|---|---|---|---|---|---|
| 01 | 0:00–0:05 | "Selama ratusan tahun, menenun diajarkan dari tangan ke tangan." | Lower-third nama Andrew (kaca gelap). Tanpa grafik lain | – | Pembuka harus wajah; jangan cutaway di detik pertama |
| 02 | 0:05–0:14 | "Penenun senior semakin sedikit… tidak punya akses ke guru… perlahan hilang." | Satu kartu: grafik batang relatif penenun turun di **"sedikit"** → kartu jadi kolom pencarian, kursor ketik "guru menenun", hasil kosong di **"akses"** → kartu memudar jadi garis benang yang putus di **"hilang"** | FULL | Masalah perlu dilihat; tanpa angka karangan (batang relatif) |
| 03 | 0:14–0:18 | "Bagaimana kalau ilmunya bisa ikut… di mata kita?" | Punch-in pelan ke Andrew saat memakai kacamata | – | Momen emosional, wajah saja |
| 04 | 0:18–0:30 | "BelajarTenun adalah tutor AI di kacamata…" | Kotak dari lensa kacamata membesar → logo resmi ditenun → kartu berubah: **"tutor AI"** chip, **"kacamata"** ikon kamera, **"bahasa daerah"** tab 3 bahasa, **"mencoba"** tombol Mulai diklik. Diselingi B-roll asli | FULL | Pengenalan produk |
| 05 | 0:30–0:38 | "Ilmu tenun sudah ada di mana-mana: ribuan video dan arsip…" | Panel di samping Andrew: grid video tenun asli muncul satu per satu di **"ribuan video"**, label daerah di **"banyak tradisi"** | PANEL | Andrew tetap terlihat, grid butuh ruang |
| 06 | 0:38–0:48 | "AI memecah setiap gerakan jadi tahap, istilah, dan kesalahan…" | Video tenun asli di kartu, garis pindai, kotak deteksi di **"gerakan"**; kartu melar jadi garis waktu 5 tahap di **"tahap"**, chip istilah di **"istilah"**, chip peringatan di **"kesalahan"**; kartu-kartu kecil ditarik kursor ke satu modul di **"menggabungkan"** | FULL | Proses yang harus dilihat |
| 07 | 0:48–0:57 | "AI bisa salah… diperiksa penenun sebelum diajarkan." | Kartu tahap dengan label **Usulan AI** → kursor mengedit teks di **"salah"** → toggle **Tervalidasi** di **"diperiksa"**, centang + ding | FULL | Konsep kualitas |
| 08 | 0:57–1:03 | Andrew: "Halo BelajarTenun… langkah pertama aku harus apa?" | Wajah samping. Titik kecil "kamera kacamata aktif" di gagang | – | Pertanyaan pribadi, wajah saja |
| 09–13 | 1:03–2:03 | Tutor T1–T7, POV, koreksi, tanya jawab | POV layar penuh + **HP kaca di samping** (UI aplikasi asli, transkrip per kata). Pulau status di atas HP: *Mendengarkan → Menjawab*. Koreksi: cincin emas di pinggir kain + toast. Istilah: tab 3 tradisi | PANEL (di atas POV) | Demonstrasi produk inti |
| 15 | 2:03–2:12 | "Penenun tidak tergantikan… akses… dari mana saja." | Panel: peta kecil, titik murid muncul di beberapa kota di **"lebih banyak murid"** | PANEL | Andrew tetap terlihat |
| 16 | 2:12–2:17 | "Setiap sesi meninggalkan catatan…" | HP: kartu catatan, baris muncul di **"sudah bisa"**, **"membingungkan"** | FULL | Fitur produk |
| 17 | 2:17–2:22 | "…mengukur efektivitas… tahap yang paling sulit." | Kartu sama melar jadi grafik batang + tooltip pada tahap tersulit di **"paling sulit"** | FULL | Lanjutan bentuk yang sama (tanpa cut) |
| 18 | 2:22–2:29 | "Pengetahuan yang divalidasi… arsip publik… lestari." | Grafik menyusut jadi kartu arsip, kursor menggulir, tombol unduh JSON/CSV | FULL | Lanjutan bentuk yang sama |
| 19 | 2:29–2:45 | Perbandingan video tutorial / kelas / BelajarTenun | Panel di samping Andrew: tabel 3 kolom, setiap baris muncul pada kata pembandingnya, kolom BelajarTenun disorot emas | PANEL | Kalimat panjang, wajah tetap terlihat |
| 20 | 2:45–2:52 | "Kami menguji deteksi tahapnya…" | Panel kaca gelap ala contoh: **angka besar 87%** berhitung naik + batang bertahap; label "ilustrasi" kecil | FULL | Bukti uji (angka mockup, diberi tanda) |
| 22 | 2:52–3:04 | Model bisnis | Panel di samping Andrew: alur Pengguna → Nilai → Skema, panah melar pada tiap kata kunci | PANEL | Wajah tetap terlihat |
| 23 | 3:04–3:11 | "Dari satu tradisi ke seluruh Indonesia, ke dunia." | Peta Nusantara pola titik (halftone) + pin emas muncul di **"seluruh"**, kamera mundur ke peta dunia di **"dunia"** | FULL | Visi |
| 24 | 3:11–3:15 | (musik) | Montase footage asli, cut di ketukan | – | Ritme sebelum penutup |
| 25 | 3:15–3:21 | "BelajarTenun. Belajar menenun, dipandu ilmu Nusantara." | Wajah, subtitle saja | – | Penutup personal |
| 26 | 3:21–3:26 | Kartu penutup | Logo ditenun + belajartenun.com | FULL | Akhir |

Kepadatan: **sedang** (±5 klip per menit), dengan jeda wajah minimal ±2 detik di antara cutaway.

## Yang ilustratif (bukan data asli)
- Batang penenun menurun (02): relatif, tanpa angka.
- Angka uji 128 / 87% / 1,8 dtk (20): mockup, ditandai "ilustrasi".
- Skema bisnis (22): diisi sesuai proposal.
- Istilah 3 tradisi (10): menunggu istilah asli.

## Proses
1. Pasang skill `motion-broll` dan `sound-effects`, terapkan grade ke semua shot Andrew.
2. Tulis satu file per klip, cek gambar diam di setiap kata kunci, perbaiki.
3. Render klip dengan motion blur (4 subframe), gabungkan ke timeline, pasang efek suara dan musik.
4. Kirim per babak untuk dicek.
