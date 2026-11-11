// Model klasifikasi tahap di perangkat (F8, opsional). Dimuat hanya bila /models/step-classifier/model.json ada
// (hasil scripts/train/). Bila yakin, HP bisa memutuskan tanpa memanggil AI cloud (hemat data & jalan saat sinyal lemah).
let model, labels, tried = false;
const TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

export async function loadLocalModel() {
  if (tried) return Boolean(model);
  tried = true;
  try {
    const meta = await fetch('/models/step-classifier/labels.json');
    if (!meta.ok) return false;
    labels = await meta.json();
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = TFJS; s.onload = res; s.onerror = rej; document.head.append(s); });
    model = await window.tf.loadLayersModel('/models/step-classifier/model.json');
    return true;
  } catch { model = null; return false; }
}

/** Mengembalikan {stepId, label, confidence} atau null. */
export function predictLocal(source) {
  if (!model) return null;
  const tf = window.tf;
  return tf.tidy(() => {
    const x = tf.image.resizeBilinear(tf.browser.fromPixels(source), [224, 224]).toFloat().div(127.5).sub(1).expandDims();
    const p = model.predict(x).dataSync();
    let best = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    const [stepId, label] = labels[best].split('__');
    return { stepId, label, confidence: p[best] };
  });
}
