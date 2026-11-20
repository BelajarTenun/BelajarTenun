# Kasus simulasi sesi Live

Satu kasus = satu rekaman ego (kacamata atau HP di kepala) dari modul tertentu, ditambah label emas waktu selesai tiap tahap dari penenun.

```json
{
  "module": "tidore-dasar",
  "video": "rekaman-01.mp4",
  "audio": "murid-01.wav",
  "offset": 0,
  "tail": 15,
  "steps": [{ "end": 42.0 }, { "end": 95.5 }, { "end": 160.0 }, { "end": 210.0 }, { "end": 300.0 }]
}
```

- `steps[i].end`: detik ketika tahap ke-i benar-benar selesai di video (ditandai penenun di Anotasi, bukan oleh AI).
- `audio` (opsional): suara murid, misalnya "sudah", pertanyaan, atau kebingungan. Tanpa audio, mic diisi hening.
- Video dan audio **tidak** disimpan di repo (izin rekaman). Simpan di folder ini di server atau di bucket dataset.

Menjalankan (di VPS atau komputer dengan ffmpeg + Playwright):

```bash
node scripts/simulate_session.js --url https://belajartenun.com --token "$AGENT_TOKEN" --case data/eval/sim/rekaman-01.json
```

Gerbang rilis (lib/sim-score.js): maju terlalu cepat ≤ 5%, tepat waktu ≥ 70%, dan tidak ada maju-tahap lewat kamera tanpa `check_my_work` yang baru.
