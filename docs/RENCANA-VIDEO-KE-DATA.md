# Rencana Implementasi: Video Tenun → Data Belajar (Lintas Tradisi)

Tujuan: mengubah **kumpulan video tenun tradisional** (dari internet, partner, dan kacamata sendiri) menjadi **data belajar terstruktur dan terverifikasi** untuk tutor BelajarTenun dan untuk **dokumentasi pelestarian**. Mencakup **semua tradisi tenun**, bukan hanya Tidore.

Rencana ini merinci CV-1 di [RENCANA-TAHAP-2.md](RENCANA-TAHAP-2.md) dan memakai referensi di [REFERENSI-DATA.md](REFERENSI-DATA.md):
- **HowToDIV** → video + tahap → dialog tutor bertahap (termasuk kesalahan & koreksi)
- **EgoExoLearn** → pasangan video luar (exo) ↔ kacamata (ego), penilaian keterampilan
- **Ego4D Goal-Step** → struktur tujuan → tahap → sub-tahap
- **ProcedureVRL** → narasi penenun sebagai label lemah (ide saja; kodenya non-komersial)
- **Mingei / CRAEFT** → cara merepresentasikan proses kerajinan + konteks budaya

---

## 1. Alur besar

```
 ① Impor sumber        ② Pra-proses           ③ Analisis per video        ④ Penyelarasan lintas video
 video + metadata  →   ffmpeg: potong,     →  Gemini (video + audio):  →  kelompokkan tahap serupa,
 + status izin         audio, keyframe        tahap+waktu, alat, istilah,   taksonomi alat/aksi,
                                              kesalahan, narasi, sudut      kurikulum per tradisi
                                                                                   │
 ⑧ Konservasi    ←  ⑦ Pasangan exo↔ego  ←  ⑥ Dialog tutor (HowToDIV) ←  ⑤ Tinjauan penenun
 arsip terbuka      saat ada rekaman        & tanya jawab                 terima/ubah/tolak,
 per tradisi        kacamata                                              status per kolom
```

Prinsip:
1. **AI mengusulkan, penenun memutuskan.** Tidak ada isi AI yang sampai ke pemula sebelum berstatus *tervalidasi*.
2. **Setiap fakta punya asal-usul** (video, detik ke-berapa, siapa yang memvalidasi).
3. **Status izin melekat pada sumber** dan menentukan ke mana datanya boleh mengalir.

---

## 2. Model data baru

```
sources/<id>/meta.json        Sumber video
  id, kind: internet|partner|kacamata, url, channel, title, downloadedAt
  tradition (mis. "tenun ikat Sikka"), region, loomType (gedogan / ATBM / …), technique (ikat lungsi, songket, …)
  viewpoint: exo|ego|campuran, language, durationSec
  license: { status: "riset_internal"|"izin_tertulis"|"cc_by"|"milik_sendiri", proof?, note }
  files: video.mp4, audio.wav, keyframes/*.jpg, transcript.json

analyses/<sourceId>.json      Hasil analisis AI per video (tidak diubah setelah dibuat)
  model, promptVersion, createdAt
  goal, steps[{ key, title, start, end, actions[], tools[], materials[], success_visual, mistakes[], narrationQuotes[] }]
  terms[{ term, meaningGuess, said_at }], viewpointCheck, confidence

taxonomy.json                 Kosakata bersama lintas tradisi (ala EgoExoLearn verb/noun taxonomy)
  tools[{ id, names: {id: "pedang", lokal: ["belida", "sumbi", …]}, traditions[] }]
  actions[{ id, verb: "merapatkan", objects: ["pakan"] }]
  genericSteps[{ id, title, actionIds[], toolIds[] }]   mis. "membuka mulut lungsi"

modules/<id>.json (diperluas)
  tradition, region, sources[]    ← asal tiap tahap
  steps[].provenance[{ sourceId, start, end }], steps[].genericStepId, steps[].fieldStatus { instruction: "usulan_ai"|"tervalidasi", … }

dialogs/<moduleId>/*.json     Dialog tutor sintetis (HowToDIV)
  scenario: normal|kesalahan, turns[{ role, text, stepKey, clip:{sourceId,start,end} }]
```

**Aturan aliran data berdasarkan izin**

| Status izin | Analisis AI & draf kurikulum | Ditonton pemula (demo) | Contoh few-shot / latih model | Arsip konservasi publik |
|---|---|---|---|---|
| `riset_internal` (internet tanpa izin) | ✅ | ❌ | ❌ | Hanya tautan + metadata |
| `cc_by` / lisensi terbuka | ✅ | ✅ dengan atribusi | ✅ sesuai lisensi | ✅ dengan atribusi |
| `izin_tertulis` (partner) | ✅ | sesuai cakupan persetujuan | sesuai cakupan | sesuai cakupan |
| `milik_sendiri` (rekaman kacamata) | ✅ | ✅ | ✅ | ✅ |

---

## 3. Langkah implementasi

### ① Impor sumber
- Halaman **`/sumber.html`**: unggah video (file) atau daftarkan URL + metadata (tradisi, daerah, jenis alat, teknik, sudut kamera, status izin, catatan).
- Impor massal dari CSV (`scripts/import_sources.js`: kolom url, path, tradisi, …) untuk koleksi yang sudah kamu punya.
- Validasi: status izin wajib dipilih; sumber `riset_internal` otomatis dikunci dari jalur publik.
- Deteksi duplikat (hash file + kemiripan judul/durasi).

**Berkas:** `lib/sources.js`, route `/api/sources/*`, `public/sumber.html`, `scripts/import_sources.js`.

### ② Pra-proses (ffmpeg, lokal)
- Normalisasi ke MP4 480p/720p, ekstrak audio WAV 16 kHz.
- **Deteksi pergantian adegan** + keyframe tiap 2 detik (filter kualitas tahap 1 dipakai ulang).
- Video panjang dipotong per 10–15 menit untuk analisis.
- Transkrip audio (Gemini) dengan cap waktu → narasi penenun sebagai label lemah urutan tahap (ide ProcedureVRL).

**Berkas:** `scripts/preprocess.js` (memanggil `ffmpeg`/`ffprobe`), antrean pekerjaan sederhana `lib/jobs.js`.

### ③ Analisis per video (Gemini)
- Unggah ke **Gemini Files API**, minta JSON terstruktur (schema) berisi tujuan, tahap + waktu mulai/akhir, aksi, alat, bahan, kriteria berhasil yang terlihat, kesalahan, istilah lokal, kutipan narasi, dan **cek sudut kamera** (exo/ego).
- Prompt bertingkat: (a) daftar tahap kasar → (b) per tahap, detail & kesalahan → (c) verifikasi silang dengan transkrip.
- Simpan hasil mentah apa adanya (`analyses/`), dengan versi prompt dan model, supaya bisa dibandingkan saat prompt diperbaiki.
- Konsistensi: jalankan 2× dengan suhu rendah; tahap yang tidak konsisten ditandai "ragu".

**Berkas:** `lib/video-analysis.js`, `lib/prompts/video-steps.js`, unggah resumable di `lib/ai.js`.

### ④ Penyelarasan lintas video → taksonomi & kurikulum per tradisi
1. **Normalisasi kosakata**: nama alat & aksi dipetakan ke `taxonomy.json` (embedding + aturan + konfirmasi manusia). Contoh: pedang = belida = sumbi.
2. **Kelompokkan tahap serupa** antar video (embedding judul + aksi + alat, lalu klaster). Hasilnya **tahap generik** yang berlaku lintas tradisi (mis. "membuka mulut lungsi") dan **tahap khas** suatu tradisi (mis. mengikat motif ikat sebelum pewarnaan).
3. **Urutan kanonik** per tradisi: urutan yang paling sering muncul (perbandingan urutan berpasangan). Variasi dicatat sebagai alternatif.
4. **Draf modul per tradisi**: instruksi (gaya bicara ke murid), kriteria berhasil, tips, kesalahan umum (gabungan dari banyak video), dan `provenance` ke detik video.
5. **Modul dasar lintas tradisi** ("Dasar Menenun Gedogan") dari tahap generik, cocok untuk pemula sebelum masuk tradisi tertentu.

**Berkas:** `lib/alignment.js`, `scripts/build_curriculum.js`, `data/taxonomy.json`.

### ⑤ Tinjauan penenun (wajib)
- **Mode tinjau** di editor: setiap kolom berlabel *usulan AI* / *diubah* / *tervalidasi*; tombol "lihat bukti" memutar video sumber di detik terkait (hanya untuk peninjau).
- Antrean tinjau diurutkan dari yang paling berdampak (tahap yang dipakai banyak modul, istilah yang sering muncul).
- Penenun dari **tradisi yang bersangkutan** yang memvalidasi tahap khas tradisi itu.
- Riwayat perubahan per kolom (siapa, kapan) untuk atribusi.

**Berkas:** perluasan `public/editor.html`, `lib/data.js` (fieldStatus, riwayat).

### ⑥ Dialog tutor & tanya jawab (pola HowToDIV)
- Dari tahap + waktu tervalidasi, LLM membuat **dialog tutor ↔ murid** per tahap: instruksi, pertanyaan murid yang wajar, jawaban, konfirmasi selesai.
- **Skenario kesalahan**: sisipkan kesalahan umum, lalu koreksi tutor (seperti sesi error di HowToDIV).
- Pemakaian:
  1. **Uji otomatis tutor**: putar dialog ke mesin sesi + knowledge base, lalu nilai apakah jawaban & keputusan tahap sesuai (regresi saat prompt diubah);
  2. **Kandidat entri knowledge base**: pertanyaan + jawaban masuk sebagai *draft* untuk divalidasi;
  3. **Contoh gaya bicara** untuk instruksi Gemini Live.

**Berkas:** `lib/dialog-gen.js`, `scripts/generate_dialogs.js`, `scripts/eval_dialogs.js`, `data/dialogs/`.

### ⑦ Pasangan exo ↔ ego (pola EgoExoLearn)
- Saat rekaman kacamata (ego) sudah ada, **asosiasikan** segmen ego dengan tahap/segmen exo (dari tahap generik + kemiripan visual).
- Dipakai untuk:
  1. **video demo yang relevan**: murid melihat contoh dari luar untuk tahap yang sama;
  2. **penilaian keterampilan berbasis referensi ahli** (CV-6): bandingkan klip murid dengan klip ahli;
  3. evaluasi seberapa jauh beda sudut pandang memengaruhi deteksi.

**Berkas:** `lib/exo-ego.js`, kolom `pairs` di dataset, laporan di `scripts/evaluate.js`.

### ⑧ Arsip konservasi
- Halaman publik **`/arsip.html`** per tradisi: daerah, jenis alat, tahap proses, istilah lokal, motif & maknanya (yang tervalidasi), dan **tautan** ke sumber asli dengan atribusi. Video tanpa izin tidak ditampilkan ulang.
- Ekspor terbuka (JSON/CSV) untuk peneliti & komunitas, dengan lisensi yang disepakati komunitas.
- Impor **dataset motif** (NTT, Sikka) ke knowledge base sebagai *draft* dengan atribusi dataset, setelah lisensinya dicek.

**Berkas:** `public/arsip.html`, `GET /api/arsip/*`, `scripts/import_motif_dataset.js`.

---

## 4. Evaluasi

| Yang diukur | Cara | Target awal |
|---|---|---|
| Ketepatan tahap dari video | Bandingkan dengan anotasi manual 10 video | ≥80% tahap terdeteksi; waktu meleset < 5 dtk |
| Mutu draf kurikulum | Persentase kolom yang diterima penenun tanpa/ dengan sedikit perubahan | ≥70% |
| Penyelarasan istilah | Sampel 50 pemetaan istilah dicek penenun | ≥90% benar |
| Mutu dialog | Penenun menilai 20 dialog (benar/natural/aman budaya) | ≥80% layak |
| Tutor lewat dialog uji | Jawaban & keputusan tahap yang sesuai | ≥85% |
| Biaya & waktu | Token & menit per jam video | Dicatat di dashboard admin |

---

## 5. Urutan & perkiraan

| Fase | Isi | Hasil yang bisa didemokan | Perkiraan |
|---|---|---|---|
| **1** | ① Impor + ② Pra-proses + ③ Analisis per video | Unggah video tenun → daftar tahap bercap waktu, alat, istilah | 1,5 minggu |
| **2** | ④ Penyelarasan + taksonomi + draf modul per tradisi & modul dasar lintas tradisi | Kurikulum draf untuk beberapa tradisi sekaligus | 1,5 minggu |
| **3** | ⑤ Mode tinjau penenun + riwayat & atribusi | Penenun memvalidasi dengan melihat bukti video | 1 minggu |
| **4** | ⑥ Dialog HowToDIV + uji otomatis tutor + kandidat KB | Tutor diuji dengan ratusan dialog sintetis | 1 minggu |
| **5** | ⑧ Arsip konservasi + impor dataset motif | Halaman arsip publik per tradisi | 1 minggu |
| **6** | ⑦ Pasangan exo↔ego | Demo relevan & penilaian keterampilan (butuh rekaman kacamata) | 1,5 minggu, setelah ada rekaman |

Total ±7–8 minggu untuk satu developer. Fase 1 dan 2 cukup memakai video internet yang sudah kamu punya.

## 6. Kebutuhan
- **Gemini API key + billing** (Files API untuk video panjang). Perkiraan biaya per jam video dihitung di Fase 1 dan ditampilkan di dashboard.
- **ffmpeg** di komputer/server pemroses (sudah tersedia di banyak sistem).
- **Daftar video** dengan metadata minimal: tautan/berkas, tradisi, daerah (bisa diisi bertahap di `/sumber.html`).
- **Penenun peninjau per tradisi** (minimal 1 orang per tradisi yang akan dirilis).
- Kesepakatan lisensi arsip dengan komunitas sebelum Fase 5 dibuka publik.

## 7. Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Hak cipta video internet | Status izin per sumber; `riset_internal` tidak pernah ditampilkan ulang atau dipakai melatih model; minta izin ke pembuat video yang bagus |
| AI salah mengenali tradisi/istilah, atau **mencampur tradisi** | Metadata tradisi dari manusia; tahap khas hanya divalidasi penenun tradisi itu; asal-usul per kolom |
| Makna budaya dikarang AI | Makna motif/filosofi hanya dari penenun atau dataset bersumber jelas; selalu *draft* sampai divalidasi |
| Video berkualitas rendah / tanpa narasi | Filter kualitas, analisis visual saja, tandai "ragu" |
| Perbedaan sudut pandang (exo vs ego) | Video internet untuk proses & kurikulum; deteksi kacamata tetap pakai contoh ego (Fase 6) |
| Biaya analisis video panjang | Potong per segmen, keyframe + audio terlebih dulu, analisis ulang hanya bagian ragu |
