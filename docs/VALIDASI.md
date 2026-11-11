# Rencana Validasi

| Validasi | Cara ukur | Target awal |
|---|---|---|
| Knowledge | Penenun mereview setiap tahap & 20 jawaban Q&A (benar / perlu koreksi / salah) | ≥ 90% benar setelah koreksi |
| Technical | Klip berlabel per tahap → bandingkan keputusan AI vs label | Akurasi "done" ≥ 80%; salah-positif "done" ≤ 10%; jeda < 5 detik |
| Learning | 5–10 pemula, satu sesi; observasi + kuesioner | ≥ 70% menyelesaikan 5 tahap; dapat menjelaskan alasan ≥ 3 tahap |

Data sesi tersimpan di `logs/sessions.jsonl` (step_start, check, step_done + sumbernya: vision/button/voice, question). Contoh metrik: proporsi tahap yang dikenali kamera vs. konfirmasi manual, pertanyaan per tahap (tahap yang membingungkan), durasi per tahap.
