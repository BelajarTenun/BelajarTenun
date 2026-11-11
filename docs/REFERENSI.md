# Referensi Open Source yang Bisa Ditiru Workflow-nya

| Proyek | Yang bisa ditiru | Catatan |
|---|---|---|
| [VisionClaw](https://www.sourcepulse.org/projects/24188075) (sseanliu) | Alur kacamata → HP → **Gemini Live** (suara + kamera real-time) | Paling dekat dengan v1. iOS + Meta Ray-Ban |
| [OpenGlass fork – DarlingtonDeveloper](https://gh.r-mj.com/DarlingtonDeveloper/OpenGlass) | Meta Ray-Ban ↔ Gemini Live, **kamera iPhone sebagai cadangan** | Pola "HP dulu, kacamata kemudian" sama seperti roadmap kita |
| [OpenGlass – BasedHardware](https://www.sourcepulse.org/projects/1850533) | Kacamata DIY ESP32 kamera, komponen < $25 | Opsi hardware murah buat purwarupa fisik |
| [Brilliant Labs Frame](https://petapixel.com/2024/02/09/the-frame-are-open-source-and-ai-equipped-ar-smart-glasses) | Kacamata dengan **display** + SDK terbuka | Cocok untuk v2 (instruksi visual di lensa) |
| [MentraOS / AugmentOS](https://github.com/PyThaGoAI/AugmentOS) | OS open source untuk banyak merek kacamata; bikin "app" sekali jalan di banyak perangkat | Hindari terkunci ke satu merek |
| [Watch, Talk and Guide (sled-group)](https://github.com/sled-group/Watch-Talk-and-Guide) | Dataset + kode **panduan tugas dari video POV** (memasak) | Workflow paling mirip: rekam POV → anotasi tahap → AI membimbing |
| [Building-Egocentric-Procedural-AI-Assistant](https://github.com/z1oong/Building-Egocentric-Procedural-AI-Assistant) | Daftar paper deteksi tahap & kesalahan dari video POV | Bahan riset untuk model CV khusus (roadmap tahap 3) |
| [HoloAssist (Microsoft)](https://ar5iv.labs.arxiv.org/html/2309.17024) | Desain dataset instruktur ↔ murid + deteksi kesalahan | Referensi cara melabeli kesalahan |

## Rekomendasi
- **Arsitektur aplikasi:** tiru pola VisionClaw/OpenGlass (kacamata hanya kamera+audio, HP yang menjalankan logika, AI di cloud). Engine kita (`lib/core.js`, kurikulum JSON) tetap dipakai; yang diganti hanya sumber kamera.
- **Workflow data & anotasi:** tiru Watch-Talk-and-Guide: rekaman POV → tahap berlabel → kriteria berhasil/kesalahan → evaluasi.

Catatan: repo di atas dikumpulkan dari hasil pencarian dan belum dicek satu per satu (lisensi, status perawatan). Periksa lisensinya sebelum menyalin kode.
