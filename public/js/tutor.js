// Klien tutor bersama untuk halaman HP (/) dan simulator/adaptor kacamata (/kacamata.html).
// Dua mode: "standar" (HTTP: foto berkala + suara/teks) dan "live" (Gemini Live: suara real-time).
import { api } from './api.js';
import { assessFrame, motionBetween, toJpeg } from './quality.js';
import { earcon } from './earcons.js';
import { createTracer } from './tracer.js';
import { LiveTutor } from './live.js';
import { api as apiFn } from './api.js';
import { loadLocalModel, predictLocal } from './local-model.js';

export class TutorClient {
  /**
   * opts: { moduleId, source, audioOnly, serverTts, ui: { show(reply), card(card), demo(url,start), status(text), finish(reply), transcript(role,text) } }
   */
  constructor(opts) {
    Object.assign(this, opts);
    this.lastSent = 0; this.lastTick = 0; this.prevGray = null; this.rejected = 0; this.pinned = false;
    this.tracer = createTracer({ source: opts.source?.kind });
  }

  async start() {
    await loadLocalModel();
    const r = await api('/api/session/start', { moduleId: this.moduleId, source: this.source?.kind, audioOnly: this.audioOnly, audio: this.serverTts });
    this.sessionId = r.sessionId;
    this.tracer.base = { ...this.tracer.base, sessionId: r.sessionId, module: this.moduleId };
    // Label sumber kamera: yang dinyatakan vs yang benar-benar dipakai (VisionClaw capture_source).
    this.tracer.emit('capture_source', { declared: this.source?.kind ?? 'none', observed: this.source?.element ? this.source.kind : 'none' });
    earcon('connected');
    this.handle(r);
    this.loop = setInterval(() => this.#tick(), 1000);
    // Tombol kacamata: ketuk = lanjut, ketuk ganda = ulangi instruksi, tahan = bekukan tampilan.
    if (this.source) this.source.onbutton = (press) => {
      this.tracer.emit('glasses_button', { press });
      const action = { tap: 'next', double: 'repeat', long: 'pin' }[press];
      if (action) this.button(action);
    };
    return r;
  }

  stop() {
    clearInterval(this.loop); this.live?.stop(); this.live = null;
    speechSynthesis.cancel(); this.audio?.pause();
    this.tracer.emit('session_stop', { rejectedFrames: this.rejected }); this.tracer.flush();
    earcon('ended');
  }

  /** Ambil frame terkini + nilai kualitas. */
  grab() {
    const el = this.source?.element;
    if (!el || this.pinned) return null;
    const quality = assessFrame(el);
    const { gray, ...q } = quality;
    const motion = motionBetween(this.prevGray, gray);
    this.prevGray = gray;
    if (!q.ok) { this.rejected++; return { quality: q, motion, jpeg: null }; }
    // Foto kacamata datang berkala: catat kapan diambil supaya foto basi bisa dibuang.
    const capturedAt = this.source?.lastPhotoAt ?? Date.now();
    return { quality: q, motion, jpeg: toJpeg(el), local: predictLocal(el), capturedAt };
  }

  async #tick() {
    if (this.live || !this.sessionId) return;
    const now = Date.now();
    const f = this.grab();
    // Kirim foto bila kualitas baik dan (ada gerakan atau sudah 6 dtk); paling cepat tiap 3 dtk.
    const fromGlasses = this.source?.lastPhotoAt !== undefined;
    const fresh = !fromGlasses || (f?.capturedAt && f.capturedAt !== this.lastCapturedAt);   // jangan kirim foto kacamata yang sama dua kali
    if (f?.jpeg && fresh && now - this.lastSent > (fromGlasses ? 1000 : 3000) && (fromGlasses || f.motion > 2.5 || now - this.lastSent > 6000)) {
      this.lastSent = now; this.lastCapturedAt = f.capturedAt;
      try { this.handle(await api('/api/session/frame', { sessionId: this.sessionId, image: f.jpeg, quality: f.quality, localPrediction: f.local, ageMs: Date.now() - f.capturedAt, audio: this.serverTts })); } catch {}
    } else if (now - this.lastTick > 15000 && now - this.lastSent > 15000) {
      this.lastTick = now;
      try { this.handle(await api('/api/session/tick', { sessionId: this.sessionId, audio: this.serverTts })); } catch {}
    }
    if (f && !f.quality.ok) this.ui.status?.(`Kamera: ${f.quality.reason}`);
  }

  handle(r) {
    if (!r) return;
    const prevIndex = this.stepIndex;
    this.stepIndex = r.step?.index;
    if (r.finished && !this.finished) { this.finished = true; earcon('success'); this.ui.show?.(r); this.speak(r); this.ui.finish?.(r); return; }
    if (prevIndex !== undefined && r.step && r.step.index > prevIndex) earcon('success');
    if (r.intent === 'koreksi') earcon('warning');
    if (r.card) this.ui.card?.(r.card);
    if (r.demo_video !== undefined && (r.intent === 'instruksi' || !r.speak)) this.ui.demo?.(r.demo_video, r.intent);
    if (r.skipped && !r.speak) return;
    this.ui.show?.(r);
    if (!this.live) this.speak(r);
  }

  speak(r) {
    if (!r?.speak) return;
    this.audio?.pause(); speechSynthesis.cancel();
    if (r.audio) { this.audio = new Audio(`data:audio/mp3;base64,${r.audio}`); this.audio.play().catch(() => {}); return; }
    const u = new SpeechSynthesisUtterance(r.speak); u.lang = 'id-ID'; u.rate = 0.95; speechSynthesis.speak(u);
  }

  async say(text) {
    if (!text?.trim()) return;
    this.tracer.emit('user_text', { text });
    if (this.live) return this.live.sendText(text);
    this.handle(await api('/api/session/say', { sessionId: this.sessionId, text, audio: this.serverTts }));
  }
  async button(action) {
    if (action === 'pin') { this.pinned = !this.pinned; earcon('captured'); }
    this.handle(await api('/api/session/button', { sessionId: this.sessionId, action, audio: this.serverTts }));
  }

  /** Mode Gemini Live (percakapan suara real-time). */
  async startLive({ engine = 'auto' } = {}) {
    const cfg = await apiFn('/api/config');
    const useLiveKit = engine === 'livekit' || (engine === 'auto' && cfg.livekit);
    if (useLiveKit) {
      // LiveKit lokal + agen Gemini Live: lebih stabil di jaringan putus-sambung (pola VisionClaw).
      const { LiveKitTutor } = await import('./livekit-tutor.js');
      this.live = new LiveKitTutor({ sessionId: this.sessionId, source: this.source, api });
    } else {
      this.live = new LiveTutor({
        sessionId: this.sessionId, api,
        grabFrame: async () => { const f = this.grab(); return f?.jpeg ? f : null; },
      });
    }
    this.liveEngine = useLiveKit ? 'livekit' : 'gemini-langsung';
    const on = (t, fn) => this.live.addEventListener(t, (e) => fn(e.detail));
    on('user', (d) => { this.ui.transcript?.('user', d.text); this.tracer.emit('user_said', { text: d.text }); });
    on('tutor', (d) => { this.ui.transcript?.('tutor', d.text); this.tracer.emit('tutor_said', { text: d.text }); });
    on('tool', (d) => this.tracer.emit('tool_call', { name: d.name }));
    on('ui', (r) => this.handle({ ...r, speak: '' }));
    on('frame', (d) => d.gapMs && this.tracer.emit('view_gap', { ms: d.gapMs, speaking: d.speaking }));
    on('status', (d) => this.ui.status?.(d.text));
    on('agent', () => this.ui.status?.('Tutor bergabung'));
    on('close', (d) => { this.ui.status?.(`Live berhenti (${d.code})`); earcon('lost'); this.live = null; });
    speechSynthesis.cancel(); this.audio?.pause();
    await this.live.connect();
    earcon('connected');
    this.tracer.emit('live_start', { engine: this.liveEngine });
  }
  stopLive() { this.live?.stop(); this.live = null; this.tracer.emit('live_stop', {}); }
}
