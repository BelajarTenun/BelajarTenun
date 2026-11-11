# Referensi: dari Rekaman Video ke Data Belajar (dan Konservasi)

Kumpulan repo dan dataset yang bisa ditiru alur kerjanya untuk mengubah **rekaman menenun** (video internet, rekaman partner, rekaman kacamata) menjadi **data belajar**: kurikulum, anotasi tahap, dialog tutor, dan model. Disusun 11 Nov 2026. Repo di bagian 1 sudah di-clone dan dibaca; sisanya dari hasil pencarian. **Selalu cek lisensi sebelum memakai kode atau datanya.**

## 1. Repo alur kerja "video → data belajar" (sudah dicek isinya)

| Repo | Lisensi | Isi | Yang kita tiru |
|---|---|---|---|
| [google/howtodiv](https://github.com/google/howtodiv) | Apache-2.0 | Mengubah video instruksional satu orang menjadi **dialog tutor ↔ murid per tahap**, selaras dengan klip video (kode `generate_*_DIV.py`, memakai LLM Gemma 3). Termasuk sesi **dengan kesalahan dan koreksinya**. | Pipeline paling mirip kebutuhan kita: anotasi tahap + waktu → LLM → dialog tutor bertahap + tanya jawab + koreksi kesalahan. Jadi bahan uji tutor dan knowledge base. |
| [OpenGVLab/EgoExoLearn](https://github.com/OpenGVLab/EgoExoLearn) | MIT | Dataset & benchmark: orang **menonton video demonstrasi dari luar (exo)** lalu **mengerjakan sendiri sambil direkam dari kepala (ego)**. Ada anotasi tahap halus, asosiasi lintas sudut, dan penilaian keterampilan dengan video ahli sebagai acuan. | **Persis situasi kita**: video internet (exo) → murid berkacamata (ego). Tiru format anotasinya (`fine_annotation_*.csv`), benchmark asosiasi exo↔ego, dan penilaian keterampilan berbasis referensi ahli (CV-6). |
| [facebookresearch/Ego4d](https://github.com/facebookresearch/Ego4d) | MIT (kode) | Alat unduh & anotasi Ego4D / **Ego-Exo4D** (termasuk anotasi **Goal-Step** dan keystep). | Skema anotasi tujuan → tahap → sub-tahap untuk segmen kita; contoh dataset ego+exo berskala besar (lisensi datanya terpisah, perlu persetujuan). |
| [facebookresearch/ProcedureVRL](https://github.com/facebookresearch/ProcedureVRL) | **CC BY-NC-SA 3.0** (non-komersial) | Belajar representasi video yang paham urutan prosedur dari video instruksional + narasinya. | Ide: pakai **narasi penenun** di video sebagai label lemah urutan tahap. Kodenya **tidak boleh dipakai komersial**. |
| [sled-group/Watch-Talk-and-Guide](https://github.com/sled-group/Watch-Talk-and-Guide) | MIT | Dataset & pipeline tutor dari video POV memasak (sudah dipakai di tahap 1). | Kapan tutor bicara, anotasi tahap & kesalahan. |

## 2. Proyek pelestarian kerajinan (konservasi)

| Proyek | Yang relevan | Kode? |
|---|---|---|
| [Mingei (EU, 2019–2022)](https://www.cordis.europa.eu/project/id/822336) | Kerajinan sebagai warisan budaya takbenda; **Mingei Online Platform** untuk menyusun proses kerajinan + narasi konteks; *Crafts Ontology*. Lihat [makalah Heritage 2022](https://mdpi.com/2571-9408/5/2/40). | Tidak ditemukan repo publik |
| [CRAEFT (EU, 2023–2026)](https://cordis.europa.eu/project/id/101094349) | Pendidikan & pelatihan kerajinan dengan alat digital; pemodelan gestur & genggaman; **simulasi alat tenun yang bisa dicetak**. | Tidak ditemukan repo publik |

Yang ditiru: cara mereka **merepresentasikan proses kerajinan** (langkah, alat, bahan, gestur, narasi budaya). Konsep ini cocok untuk struktur modul dan knowledge base kita.

## 3. Dataset kain & tenun tradisional

| Dataset | Isi | Pemakaian untuk BelajarTenun |
|---|---|---|
| [Motif tekstil tradisional NTT (Mendeley)](https://data.mendeley.com/datasets/wj3r25d8jv/1) | 534 gambar motif tenun Nusa Tenggara Timur, **dengan nama motif, provinsi, dan makna filosofis**; mencakup tenun ikat, ikat lungsi, pahikung | Bahan **knowledge base motif & filosofi** (tetap divalidasi penenun) dan pengenal motif |
| [Motif-Sikka (Mendeley)](https://data.mendeley.com/datasets/b2k52v9mkc) · [Motif-Sikka-ROI](https://data.mendeley.com/datasets/rbsg4gwp6d) | Motif ikat Sikka, 24 kelas, label sesuai sertifikat Indikasi Geografis | Pengenal motif ikat Sikka |
| [motif_Ikat_Tenun (Roboflow)](https://universe.roboflow.com/motiftenun/motif_ikat_tenun) · [Motif Songket (Roboflow)](https://universe.roboflow.com/songket-classification/motif-songket-classification) | Klasifikasi motif ikat (17 kelas) & songket | Modul lanjutan: mengenali motif hasil tenunan |
| [Textile manufacturing egocentric sample (Hugging Face)](https://huggingface.co/datasets/VerboseTechLabs/textile-manufacturing-egocentric-sample) | Contoh video **POV** pekerja tekstil termasuk menenun, CC BY 4.0 (sampel; set lengkap dari vendor) | Uji awal deteksi aktivitas dari sudut kepala, sebelum ada rekaman kacamata sendiri |
| [LoomGen (IEEE DataPort)](https://ieee-dataport.org/documents/loomgen-digitally-curated-dataset-assamese-handloom-motifs-pattern-recognition-and-image) | Motif tenun tangan Assam (tanpa label) | Pembanding; kurang relevan untuk proses menenun |

Sumber lain yang perlu dicek: basis data **Warisan Budaya Takbenda Indonesia** (Kemendikbud) untuk deskripsi resmi tradisi tenun per daerah, museum tekstil, dan arsip video komunitas tenun. Pakai dengan izin dan atribusi.

## 4. Alur kerja yang diusulkan (gabungan referensi)

```
Video internet (exo, banyak tradisi)      Rekaman partner (izin)      Rekaman kacamata (ego, milik sendiri)
        │                                          │                              │
        ▼  CV-1: Gemini membaca video + narasi (ide ProcedureVRL: narasi = label lemah)
 Draf kurikulum lintas tradisi: tahap · alat · kriteria · kesalahan · waktu
        │  penenun memvalidasi (konsep representasi kerajinan Mingei/CRAEFT)
        ▼
 Segmen beranotasi (skema Goal-Step Ego4D: tujuan → tahap → sub-tahap)
        │
        ├─► Dialog tutor bertahap + tanya jawab + koreksi kesalahan (pipeline HowToDIV) → uji & latih tutor
        ├─► Pasangan exo ↔ ego per tahap (EgoExoLearn) → contoh few-shot & pembanding keterampilan
        └─► Frame/klip berlabel → evaluasi & model lokal (tahap 1 & 2)
 Knowledge base motif & filosofi ← dataset motif NTT/Sikka + penenun (validasi wajib)
```

Rincian implementasinya ada di [RENCANA-TAHAP-2.md](RENCANA-TAHAP-2.md) (CV-1 s.d. CV-7).
