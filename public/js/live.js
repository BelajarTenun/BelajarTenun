// Klien Gemini Live di browser (F2). Pola dari VisionClaw:
// - suara dua arah real-time (PCM 16 kHz naik, PCM 24 kHz turun), bisa disela (barge-in)
// - video disampling menurut aktivitas suara: 1 fps saat pengguna bicara, 0,3 fps saat diam
//   (VoiceActivityVideoSampler) + catat umur tampilan (StalenessSampler)
// - function tools dieksekusi di server lewat mesin sesi, bukan oleh model
// Token sementara dari server: API key tidak pernah ada di perangkat.

const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

const MIC_WORKLET = `
class Mic extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / 16000; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0][0]; if (!ch) return true;
    let sum = 0;
    for (; this.pos < ch.length; this.pos += this.ratio) { const s = ch[Math.floor(this.pos)]; this.buf.push(s); }
    this.pos -= ch.length;
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
    if (this.buf.length >= 1600) { // 100 ms
      const pcm = new Int16Array(this.buf.length);
      for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-1, Math.min(1, this.buf[i])) * 0x7fff;
      this.port.postMessage({ pcm: pcm.buffer, rms: Math.sqrt(sum / ch.length) }, [pcm.buffer]);
      this.buf = [];
    }
    return true;
  }
}
registerProcessor('mic', Mic);`;

const toB64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Sampler video berbasis aktivitas suara (VisionClaw VoiceActivityVideoSampler). */
export class VoiceActivitySampler {
  constructor({ speakingFps = 1, silentFps = 0.3, hangMs = 800 } = {}) { Object.assign(this, { speakingFps, silentFps, hangMs }); this.last = 0; this.speakingUntil = 0; this.lastAdmit = 0; }
  voice(rms, now = Date.now()) { if (rms > 0.02) this.speakingUntil = now + this.hangMs; }
  get speaking() { return Date.now() < this.speakingUntil; }
  admit(now = Date.now()) {
    const fps = this.speaking ? this.speakingFps : this.silentFps;
    if (now - this.last < 1000 / fps) return false;
    this.gap = this.lastAdmit ? now - this.lastAdmit : 0; // jarak antar frame ke model (staleness)
    this.last = this.lastAdmit = now;
    return true;
  }
}

export class LiveTutor extends EventTarget {
  constructor({ sessionId, grabFrame, api }) { super(); Object.assign(this, { sessionId, grabFrame, api }); this.sampler = new VoiceActivitySampler(); this.playing = []; }
  #emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  async connect() {
    const { token, setup } = await this.api('/api/live/token', { sessionId: this.sessionId });
    this.ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
    this.ws.onmessage = (e) => this.#onMessage(e);
    this.ws.onclose = (e) => { this.#emit('close', { code: e.code, reason: e.reason }); this.stop(); };
    await new Promise((resolve, reject) => {
      this.ws.onopen = () => this.ws.send(JSON.stringify(setup));
      this.ready = resolve;
      this.ws.onerror = () => reject(new Error('Gagal tersambung ke Gemini Live'));
      setTimeout(() => reject(new Error('Gemini Live tidak merespons')), 15000);
    });
    await this.#startMic();
    this.videoTimer = setInterval(() => this.#maybeSendFrame(), 200);
    this.#emit('open');
    this.sendText('Halo, aku siap mulai latihan.');
  }

  async #startMic() {
    this.audioIn = new AudioContext();
    this.audioOut = new AudioContext({ sampleRate: 24000 });
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const url = URL.createObjectURL(new Blob([MIC_WORKLET], { type: 'text/javascript' }));
    await this.audioIn.audioWorklet.addModule(url);
    const node = new AudioWorkletNode(this.audioIn, 'mic');
    node.port.onmessage = ({ data }) => {
      this.sampler.voice(data.rms);
      this.#emit('level', { rms: data.rms, speaking: this.sampler.speaking });
      if (!this.muted) this.#send({ realtimeInput: { audio: { data: toB64(data.pcm), mimeType: 'audio/pcm;rate=16000' } } });
    };
    this.audioIn.createMediaStreamSource(this.micStream).connect(node);
  }

  async #maybeSendFrame() {
    if (!this.sampler.admit()) return;
    const f = await this.grabFrame?.();
    if (!f) return;
    this.#send({ realtimeInput: { video: { data: f.jpeg, mimeType: 'image/jpeg' } } });
    // Frame yang sama juga ke mesin sesi, agar tool check_my_work memakai apa yang dilihat pengguna (attach_view).
    this.api('/api/session/frame', { sessionId: this.sessionId, image: f.jpeg, quality: f.quality }).catch(() => {});
    this.#emit('frame', { gapMs: this.sampler.gap, speaking: this.sampler.speaking });
  }

  sendText(text) { this.#send({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }); }
  #send(obj) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(obj)); }

  async #onMessage(e) {
    const msg = JSON.parse(typeof e.data === 'string' ? e.data : await e.data.text());
    if (msg.setupComplete) return this.ready?.();
    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) this.#stopPlayback();                       // barge-in
      for (const p of sc.modelTurn?.parts || []) if (p.inlineData?.data) this.#play(p.inlineData.data);
      if (sc.inputTranscription?.text) this.#emit('user', { text: sc.inputTranscription.text });
      if (sc.outputTranscription?.text) this.#emit('tutor', { text: sc.outputTranscription.text.replace(/<ctrl\d+>/g, '') });
      if (sc.turnComplete) this.#emit('turn');
    }
    if (msg.toolCall) {
      const functionResponses = [];
      for (const fc of msg.toolCall.functionCalls || []) {
        this.#emit('tool', { name: fc.name, args: fc.args });
        try {
          const out = await this.api('/api/live/tool', { sessionId: this.sessionId, name: fc.name, args: fc.args });
          if (out.ui) this.#emit('ui', out.ui);
          functionResponses.push({ id: fc.id, name: fc.name, response: out.response });
        } catch (err) { functionResponses.push({ id: fc.id, name: fc.name, response: { error: err.message } }); }
      }
      this.#send({ toolResponse: { functionResponses } });
    }
    if (msg.goAway) this.#emit('goaway', msg.goAway);
  }

  #play(b64) {
    const bytes = fromB64(b64);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
    const buf = this.audioOut.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = this.audioOut.createBufferSource();
    src.buffer = buf; src.connect(this.audioOut.destination);
    this.playAt = Math.max(this.playAt || 0, this.audioOut.currentTime);
    src.start(this.playAt); this.playAt += buf.duration;
    this.playing.push(src); src.onended = () => { this.playing = this.playing.filter((x) => x !== src); };
  }
  #stopPlayback() { for (const s of this.playing) try { s.stop(); } catch {} this.playing = []; this.playAt = 0; }

  stop() {
    clearInterval(this.videoTimer);
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.audioIn?.close().catch(() => {}); this.audioOut?.close().catch(() => {});
    if (this.ws && this.ws.readyState <= 1) this.ws.close();
    this.ws = null;
  }
}
