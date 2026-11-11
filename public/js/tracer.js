// Tracer interaksi (pola VisionClaw Tracer): teks saja – tidak pernah gambar/audio.
// Dikirim berkelompok; gagal kirim → diantrekan ulang (maks 500, terlama dibuang).
const FLUSH_AFTER = 20, FLUSH_MS = 5000, MAX_FIELD = 2000, MAX_QUEUE = 500;
const BAD = /image|frame|audio|b64|base64/i;

export function createTracer(base = {}) {
  let queue = [];
  const tracer = {
    base,
    emit(type, fields = {}) {
      const ev = { ...tracer.base, type, ts: new Date().toISOString() };
      for (const [k, v] of Object.entries(fields)) {
        if (typeof v === 'string' && BAD.test(k) && v.length > 200) continue;
        ev[k] = typeof v === 'string' && v.length > MAX_FIELD ? v.slice(0, MAX_FIELD) + '…' : v;
      }
      queue.push(ev);
      if (queue.length >= FLUSH_AFTER) tracer.flush();
    },
    async flush(useBeacon = false) {
      if (!queue.length) return;
      const batch = queue; queue = [];
      const body = JSON.stringify({ events: batch });
      try {
        if (useBeacon && navigator.sendBeacon) { if (!navigator.sendBeacon('/api/trace', new Blob([body], { type: 'application/json' }))) throw new Error('beacon'); return; }
        const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
        if (!r.ok) throw new Error(r.status);
      } catch {
        queue = [...batch, ...queue].slice(-MAX_QUEUE);
      }
    },
  };
  setInterval(() => tracer.flush(), FLUSH_MS);
  addEventListener('pagehide', () => tracer.flush(true));
  return tracer;
}
