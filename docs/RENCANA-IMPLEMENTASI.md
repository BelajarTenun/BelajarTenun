# Rencana Implementasi End-to-End BelajarTenun

Dokumen ini disusun setelah membaca kode lima repo referensi (di-clone 11 Nov 2026). Untuk setiap fitur dijelaskan: **cara kerja**, **apa yang ditiru dari referensi**, **langkah pengembangan**, dan **kebutuhan**.

---

## 0. Pelajaran dari repo referensi

| Repo | Lisensi | Isi kodenya | Yang kita ambil |
|---|---|---|---|
| **VisionClaw** (sseanliu) | Meta Wearables Developer Terms + lainnya | App iOS/Android (Meta DAT SDK) → LiveKit → `agent/main.py` (Python, livekit-agents) → **Gemini Live** (`gemini-2.5-flash-native-audio`), dengan *function tools* dan "kartu" UI | (1) Percakapan **suara real-time** lewat Gemini Live, bukan STT→LLM→TTS. (2) **Sampling video adaptif**: 1 fps saat pengguna bicara, 0,3 fps saat diam (`VoiceActivityVideoSampler`). (3) AI memanggil **tools** untuk bertindak. (4) **Phone mode** untuk menguji tanpa kacamata. (5) Tracer: transkrip & aksi dicatat untuk studi pengguna. |
| **OpenGlass** (BasedHardware) | MIT | Firmware ESP32-S3 (`firmware.ino`) mengirim JPEG lewat **Bluetooth LE** dalam potongan (2 byte id + data, `0xFFFF` = selesai); app web memakai **Web Bluetooth**; filter "gambar buram" sebelum dikirim ke AI | (1) Protokol BLE foto bisa langsung dipakai di **web app kita** (tanpa app native). (2) Saring frame buram/jelek sebelum memanggil AI (hemat biaya, kurangi salah deteksi). ⚠ Repo sudah tidak dirawat (pindah ke Omi). |
| **Brilliant Labs Frame** (`frame-codebase`, `frame-sdk-python`, `noa-flutter`) | ISC | Firmware Lua di kacamata; SDK Python: `camera.take_photo()`, `display.show_text()`, `microphone.record_audio()`, tap; app Noa (Flutter) = state machine + Bluetooth + API AI | Satu-satunya pilihan open source dengan **kamera + layar lensa + mikrofon**. Tidak punya speaker → suara lewat HP/earbuds. Pola `noa-flutter/lib/util/state_machine.dart` mirip `lib/session.js` kita. |
| **MentraOS** | Apache-2.0 | OS + SDK "miniapp" (TypeScript): `session.camera.takePhoto()`, `session.display.render()`, `session.transcription.on()`, `session.speaker.speak()`; matriks kompatibilitas perangkat | Satu miniapp bisa jalan di beberapa merek. **Mentra Live** = kamera + mic + speaker (tanpa layar); Even G1/G2 = layar tanpa kamera. |
| **Watch-Talk-and-Guide** (sled-group) | MIT | Pipeline Python: video POV + anotasi `StepDetection.txt`, intent dialog, kesalahan → prompt LLM berisi resep + riwayat percakapan + objek terdeteksi | (1) Format anotasi **batas tahap dalam satu video panjang**. (2) Tiga keputusan tutor: *kapan bicara*, *niat bicara* (instruksi/koreksi/konfirmasi/jawaban), *isi ucapan*. (3) Prompt "tunggu": setelah hening N detik, tutor menilai apakah perlu menyapa. (4) Hasil riset mereka: model umum "cukup" tanpa pelatihan khusus, tapi belum andal. Jadi konfirmasi pengguna tetap perlu. |

**Kesimpulan penting soal hardware:** tidak ada satu kacamata terjangkau yang punya **kamera + layar + speaker** sekaligus. Karena itu produk harus *capability-aware*: Glasses API kita sudah mengirim `speak` dan `display` terpisah, jadi tiap perangkat memakai yang ia punya.

---

## 1. Arsitektur target

```
┌──────────── Kacamata ─────────────┐     ┌──────── HP (app pendamping / web) ────────┐
│ kamera · mic · (layar) · (speaker)│ BLE │ adaptor perangkat → Glasses API / Live    │
└───────────────────────────────────┘ ──► │ audio ke earbuds bila kacamata tanpa speaker│
                                          └──────────────┬─────────────────────────────┘
                                                         │ HTTPS / WebSocket
┌────────────────────────── Server BelajarTenun (Cloud Run) ─────────────────────────────┐
│ Mesin sesi (sumber kebenaran tahap) ── tools ──► Gemini Live (suara+video real-time)   │
│ Deteksi tahap (VLM + filter kualitas + smoothing) · Tutor RAG (knowledge tervalidasi)  │
│ Dataset & anotasi · Evaluasi · Progres · Editor partner · Auth                         │
└──────────┬───────────────────────────┬──────────────────────────────┬─────────────────┘
       Postgres/Firestore        Cloud Storage (video, frame)      Log & metrik
```

Prinsip: **AI tidak boleh memindah tahap sendiri tanpa lewat mesin sesi.** Gemini Live hanya bisa memanggil tools seperti `mark_step_done`. Mesin sesi yang memeriksa aturannya (pola tool dari VisionClaw, tapi dengan kurikulum sebagai pagar).

---

## 2. Fitur & rencana implementasi

### F1. Adaptor kacamata (prioritas: tinggi)
**Cara kerja:** setiap perangkat punya adaptor tipis yang menerjemahkan kamera, mic, tombol, layar, dan speaker ke Glasses API (sudah ada) atau ke sesi Live (F2).

| Adaptor | Cara | Ditiru dari | Langkah |
|---|---|---|---|
| a. **HP / webcam** | sudah ada (`/`, `/kacamata.html`) | VisionClaw phone mode | – |
| b. **OpenGlass DIY (ESP32-S3)** | Web Bluetooth di halaman web kita: subscribe karakteristik foto, rakit potongan JPEG, kirim ke `/api/glasses/frame` | `OpenGlass/sources/app/DeviceView.tsx`, `firmware/` | 1) rakit hardware ±$25, flash firmware (MIT) 2) buat `public/adapters/openglass.js` 3) audio lewat HP/earbuds |
| c. **Brilliant Labs Frame** | Bridge Python di HP/laptop: `frame_sdk` ambil foto tiap 2 dtk → Glasses API → `display.show_text(display)`; suara ke earbuds | `frame-sdk-python`, `noa-flutter` | 1) beli Frame 2) `clients/frame/bridge.py` 3) tap = `next` |
| d. **MentraOS (Mentra Live)** | Miniapp TS: `camera.takePhoto` → Glasses API; `transcription.on` → `/say`; `speaker.speak(speak)`; `display.render` bila ada layar | `MentraOS/miniapps/captions`, `examples/miniapp` | 1) daftar developer Mentra 2) `clients/mentra/` |
| e. Meta Ray-Ban | Meta Wearables DAT SDK (iOS/Android) + Developer Mode | VisionClaw `samples/` | Belakangan; syarat lisensi Meta lebih ketat |

**Rekomendasi:** b (paling murah dan cocok dengan stack web kita) untuk purwarupa fisik pertama, lalu c **atau** d sesuai anggaran dan ketersediaan. Pilih c kalau instruksi visual di lensa penting, d kalau suara saja cukup.

### F2. Tutor suara real-time (Gemini Live + tools) (prioritas: tinggi)
**Cara kerja:** HP membuka WebSocket ke Gemini Live dengan token sementara (*ephemeral token*) yang dibuat server, jadi API key tidak pernah ada di HP. Audio mic dan frame kamera dialirkan langsung; Gemini menjawab dengan suara natural dan bisa disela (*barge-in*). System prompt berisi kurikulum tahap aktif + aturan budaya. Tools yang tersedia:

| Tool | Efek |
|---|---|
| `get_current_step()` | instruksi, kriteria, kesalahan umum tahap aktif |
| `mark_step_done(evidence)` | mesin sesi memvalidasi (mis. butuh deteksi F3 atau konfirmasi pengguna) lalu maju |
| `report_mistake(index)` | catat & kirim perbaikan ke HUD |
| `search_knowledge(query)` | RAG F5; jawaban hanya dari pengetahuan tervalidasi |
| `show_hud(text)` | teks ≤ 60 karakter ke lensa |
| `play_demo()` | putar video demo tahap di HP |

**Ditiru:** `VisionClaw/agent/main.py`: `build_llm`, `function_tool`, `VoiceActivityVideoSampler`, transkrip ke tracer. Bedanya, kita tidak memakai LiveKit di awal: browser langsung ke Gemini Live, supaya lebih sederhana. LiveKit baru dipakai kalau butuh relay atau perekaman sesi.

**Langkah:** 1) endpoint `/api/live/token` 2) `public/live.js` (mic PCM 16 kHz, frame JPEG adaptif, putar PCM 24 kHz) 3) eksekusi tool di klien → panggil server 4) mode lama (HTTP) tetap sebagai cadangan saat sinyal lemah.

### F3. Deteksi tahap v2 (prioritas: tinggi)
**Cara kerja (lebih andal dari v0):**
1. **Filter kualitas di perangkat**: hitung ketajaman (variance of Laplacian) dan kecerahan di HP; frame buram/gelap dibuang (ide OpenGlass `imageBlurry`, tapi tanpa model, jadi gratis).
2. **Sampling adaptif**: lebih sering saat ada gerakan atau pengguna bicara (ide VisionClaw).
3. **Konteks multi-frame**: kirim 2–3 frame terakhir + riwayat keputusan, bukan satu foto.
4. **Smoothing**: tahap dianggap selesai bila `done` muncul 2× berturut-turut atau 1× + konfirmasi suara.
5. **Contoh referensi (few-shot)**: frame "benar" dari dataset partner (F6) disertakan di prompt.
6. Output terstruktur (JSON schema) + ambang keyakinan per tahap yang bisa diatur di editor.

**Langkah:** ubah `lib/core.js` (prompt multi-frame + few-shot), `lib/session.js` (smoothing), filter kualitas di klien; ukur sebelum/sesudah dengan `scripts/evaluate.js`.

### F4. Tutor proaktif: "kapan bicara" (prioritas: sedang)
**Cara kerja (dari WTaG):** setiap siklus, tutor memutuskan *bicara/diam*, *niat* (instruksi, koreksi, dorongan, konfirmasi, jawaban), lalu *isi*. Aturan awal: diam bila pengguna sedang progres; beri petunjuk bila tidak ada kemajuan > 45 dtk; koreksi segera bila ada kesalahan berkeyakinan tinggi; jangan bicara lebih dari 1× per 10 dtk.
**Langkah:** `lib/policy.js` + tes; log niat untuk analisis.

### F5. Knowledge base & RAG tervalidasi (prioritas: sedang)
**Cara kerja:** entri pengetahuan disimpan dengan *embedding* (Gemini embeddings); pertanyaan → cari entri terdekat → jawaban **wajib** mengutip `id` entri; tanpa entri relevan → "belum ada informasi tervalidasi". Status entri: `draft → ditinjau → tervalidasi`; hanya yang tervalidasi dipakai untuk pengguna.
**Langkah:** tabel `knowledge` + embedding; alur review di editor; log pertanyaan yang tidak terjawab menjadi daftar tugas partner.

### F6. Pipeline data rekaman & anotasi (prioritas: tinggi; ini "aset" utama)
**Cara kerja:**
1. **Rekam**: dari HP (sudah ada) **dan dari kacamata** (adaptor F1 dalam mode rekam), video POV panjang satu sesi penuh.
2. **Anotasi timeline** (format WTaG): penanda awal/akhir tiap tahap, kesalahan, dan ucapan penting pada video panjang; dilakukan di halaman anotasi dengan tombol cepat sambil video diputar.
3. **Pra-anotasi otomatis**: Gemini (video understanding) mengusulkan batas tahap; partner cukup mengoreksi.
4. **Ekspor**: frame berlabel → evaluasi (F7), few-shot (F3), data latih (F8).
5. **Persetujuan & kedaulatan data**: formulir persetujuan digital per penenun, hak tarik kembali, kepemilikan budaya dicatat (komunitas Tidore tetap pemilik pengetahuannya).
**Langkah:** `public/anotasi.html`, skema `recordings/segments`, upload langsung ke Cloud Storage (signed URL), skrip ekspor.

### F7. Evaluasi & dashboard validasi (prioritas: sedang)
Sudah ada `scripts/evaluate.js` + `/progres.html`. Tambahan: evaluasi berkala otomatis tiap kali prompt/model diubah (regresi), *confusion matrix* per tahap, latensi p50/p95, biaya per sesi, kuesioner pemula di akhir sesi (learning validation).

### F8. Model CV di perangkat / offline (prioritas: rendah, setelah data cukup)
Fine-tune klasifikasi tahap ringan (MobileNetV3 / YOLO-cls, ekspor TFLite/ONNX) + MediaPipe Hands. Dipakai sebagai lapis pertama di HP; VLM hanya dipanggil saat ragu. Butuh ±300–1.000 frame berlabel per tahap dari F6.

### F9. Akun, multi-modul, website pendamping (prioritas: sedang)
Login (Google / nomor HP), profil pemula, riwayat & sertifikat modul, katalog beberapa modul/tradisi, peran: pemula · partner penenun · admin.

### F10. Infrastruktur & produksi (prioritas: tinggi sebelum uji lapangan)
Deploy Cloud Run (HTTPS wajib untuk kamera & Bluetooth), Postgres (Cloud SQL) atau Firestore, Cloud Storage, secrets di Secret Manager, rate limit & batas biaya AI per sesi, monitoring, CI (tes + evaluasi).

### F11. Privasi, keamanan, etika
Indikator kamera aktif; foto latihan tidak disimpan kecuali opt-in; data dataset hanya dengan persetujuan; enkripsi saat disimpan; token editor diganti login berperan; AI dilarang mengarang makna motif/pakem (sudah di prompt); kebijakan atribusi untuk penenun.

---

## 3. Urutan pengerjaan (usulan)

| Fase | Isi | Hasil yang bisa didemokan | Perkiraan* |
|---|---|---|---|
| **1** | F3 (deteksi v2) · F10 (deploy dasar) · F1b (OpenGlass Web Bluetooth) | Pemula pakai kacamata DIY, tahap terdeteksi lebih andal, online via HTTPS | 2–3 minggu |
| **2** | F2 (Gemini Live + tools) · F4 (kapan bicara) | Ngobrol natural dengan tutor sambil menenun, bisa menyela | 2–3 minggu |
| **3** | F6 (anotasi timeline + persetujuan + cloud storage) · F5 (RAG tervalidasi) · F7 | Partner mengisi data & memvalidasi; metrik akurasi otomatis | 3 minggu |
| **4** | F1c/d (Frame atau Mentra) · F9 (akun, multi-modul) | Produk di kacamata komersial; uji 5–10 pemula | 3–4 minggu |
| **5** | F8 (model offline) | Bekerja di sinyal lemah | setelah data cukup |

\*Perkiraan untuk 1–2 developer; sangat bergantung ketersediaan hardware & data partner.

---

## 4. Yang dibutuhkan

| Kebutuhan | Untuk | Wajib di fase | Catatan |
|---|---|---|---|
| **Gemini API key** (Google AI Studio) | Deteksi tahap, tutor, Gemini Live, embeddings | 1 | **Paling penting.** Key yang terpasang di lingkungan pengembangan sekarang menolak Gemini API (`API_KEY_SERVICE_BLOCKED`), jadi perlu key baru atau aktifkan *Generative Language API* di project Google Cloud-nya. Billing perlu aktif untuk kuota memadai. |
| Google Cloud project (+ billing) | Cloud Run, Cloud SQL/Firestore, Storage, Secret Manager, TTS | 1 | TTS opsional bila memakai suara native Gemini Live |
| Hardware OpenGlass: XIAO ESP32S3 Sense + baterai LiPo 250 mAh + casing cetak 3D | Purwarupa kacamata | 1 | ±$25 per unit (menurut README OpenGlass) |
| Brilliant Labs Frame **atau** Mentra Live | Kacamata komersial | 4 | Cek harga & ketersediaan terbaru; Mentra perlu akun developer |
| Earbuds Bluetooth | Suara untuk kacamata tanpa speaker | 1 | |
| Domain + HTTPS | Akses publik, kamera & Bluetooth di browser | 1 | Cloud Run sudah HTTPS |
| **Konten partner**: video POV 5 tahap, kartu anotasi, validasi Q&A, makna motif | Kurikulum & dataset | 1–3 | Tanpa ini AI tidak punya "guru" |
| Formulir persetujuan & kesepakatan data dengan komunitas | Etika & legal | 3 | Sebaiknya ditinjau pihak hukum / pendamping komunitas |
| 5–10 pemula penguji | Learning validation | 4 | |
| (Opsional) LiveKit Cloud | Relay real-time, rekam sesi | 2+ | Free tier cukup untuk uji (dipakai VisionClaw) |

## 5. Risiko utama
- **Akurasi deteksi gerakan halus** (hasil WTaG: model umum belum andal) → konfirmasi pengguna + smoothing + data partner.
- **Sinyal internet di sentra tenun** → mode HTTP hemat data, cache konten, model offline (F8).
- **Ketersediaan & dukungan hardware** berubah cepat (OpenGlass sudah tidak dirawat) → arsitektur adaptor, bukan terkunci satu merek.
- **Biaya AI per sesi** → sampling adaptif, filter kualitas, batas per sesi.
- **Hak atas pengetahuan budaya** → persetujuan, atribusi, kontrol partner atas konten.
