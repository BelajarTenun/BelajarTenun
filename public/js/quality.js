// Filter kualitas frame di perangkat (F3). Ide dari OpenGlass imageBlurry.ts, tapi tanpa model:
// ketajaman = varians Laplacian pada gambar abu-abu kecil; kecerahan = rata-rata luminans.
// Frame buram/gelap/terlalu terang tidak dikirim ke AI → hemat biaya & kurangi salah deteksi.
const W = 160;
let work;

export const THRESHOLDS = { minSharpness: 40, minBrightness: 35, maxBrightness: 235 };

export function assessFrame(source, t = THRESHOLDS) {
  const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
  if (!sw || !sh) return { ok: false, reason: 'kosong', sharpness: 0, brightness: 0, gray: null };
  const h = Math.max(1, Math.round((sh / sw) * W));
  work ??= document.createElement('canvas');
  work.width = W; work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, W, h);
  const px = ctx.getImageData(0, 0, W, h).data;
  const gray = new Float32Array(W * h);
  let sum = 0;
  for (let i = 0; i < W * h; i++) { const g = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; gray[i] = g; sum += g; }
  const brightness = sum / (W * h);
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const lap = gray[i - 1] + gray[i + 1] + gray[i - W] + gray[i + W] - 4 * gray[i];
    n++; const d = lap - mean; mean += d / n; m2 += d * (lap - mean);
  }
  const sharpness = n > 1 ? m2 / (n - 1) : 0;
  let reason = null;
  if (brightness < t.minBrightness) reason = 'terlalu gelap';
  else if (brightness > t.maxBrightness) reason = 'terlalu terang';
  else if (sharpness < t.minSharpness) reason = 'buram';
  return { ok: !reason, reason, sharpness: Math.round(sharpness), brightness: Math.round(brightness), gray };
}

/** Besar perubahan antar frame (0..255). Dipakai untuk mendeteksi ada gerakan/aktivitas. */
export function motionBetween(a, b) {
  if (!a || !b || a.length !== b.length) return 255;
  let d = 0;
  for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]);
  return d / (a.length / 4);
}

/** Ambil JPEG base64 (tanpa prefix) dari video/canvas, lebar maksimal 640. */
export function toJpeg(source, width = 640, quality = 0.7) {
  const sw = source.videoWidth || source.width, sh = source.videoHeight || source.height;
  const c = document.createElement('canvas');
  c.width = Math.min(width, sw); c.height = Math.round((sh / sw) * c.width);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality).split(',')[1];
}
