# Deploy ke Google Cloud Run

Server tidak butuh dependency, jadi satu container cukup. Data (rekaman, akun, log) disimpan di **Cloud Storage** yang di-mount sebagai folder (`DATA_DIR`), sehingga kode tidak perlu SDK cloud.

## 1. Siapkan (sekali)
```bash
gcloud config set project PROJECT_ID
```
```bash
gcloud services enable run.googleapis.com secretmanager.googleapis.com generativelanguage.googleapis.com
```
```bash
gcloud storage buckets create gs://PROJECT_ID-belajartenun --location=asia-southeast2 --uniform-bucket-level-access
```
```bash
printf '%s' "ISI_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
```
```bash
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create auth-secret --data-file=-
```

## 2. Deploy
```bash
gcloud run deploy belajartenun --source . --region asia-southeast2 --allow-unauthenticated \
  --execution-environment gen2 --max-instances 1 \
  --add-volume name=data,type=cloud-storage,bucket=PROJECT_ID-belajartenun \
  --add-volume-mount volume=data,mount-path=/data \
  --set-env-vars DATA_DIR=/data,NODE_ENV=production,KB_SERVE_DRAFT=0 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,AUTH_SECRET=auth-secret:latest
```

- `--max-instances 1`: sesi belajar dan ruang pendamping disimpan di memori, jadi satu instance menjaga semuanya konsisten. Untuk skala besar, pindahkan sesi ke Redis/Firestore.
- Akun yang daftar pertama kali menjadi admin. Segera daftar setelah deploy.
- Tambahkan `GOOGLE_TTS_API_KEY` bila ingin suara Google di mode standar.

## 3. Setelah deploy
- Isi `COST_PER_1K_INPUT_USD` / `COST_PER_1K_OUTPUT_USD` sesuai harga Gemini terbaru untuk dashboard admin.
- Jalankan evaluasi dari laptop dengan bucket yang sama (mount via `gcsfuse`, atau `gcloud storage cp -r`).
- Pendamping di jaringan seluler yang ketat mungkin butuh server TURN (mis. coturn) karena WebRTC saat ini hanya memakai STUN.
