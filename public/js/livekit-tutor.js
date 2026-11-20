// Klien LiveKit lokal untuk tutor real-time (LiveKit + Gemini Live di agen server).
// HP/kacamata hanya menerbitkan mic + kamera; agen (agent/main.py) yang menjalankan Gemini Live.
// Antarmuka event sama dengan LiveTutor (live.js) supaya tutor.js bisa memakai keduanya.
import { Room, RoomEvent, Track, LocalVideoTrack, createLocalAudioTrack } from '../vendor/livekit-client/livekit-client.esm.mjs';

const UI_TOPIC = 'bt.ui';

/** Ubah sumber kamera apa pun (video HP atau <img> foto OpenGlass) menjadi MediaStreamTrack. */
function videoTrackFrom(source) {
  if (source?.stream) return source.stream.getVideoTracks()[0];
  const el = source?.element;
  if (!el) return null;
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const ctx = c.getContext('2d');
  const draw = () => { const w = el.naturalWidth || el.videoWidth, h = el.naturalHeight || el.videoHeight; if (w) { if (c.width !== w) { c.width = Math.min(w, 960); c.height = Math.round((h / w) * c.width); } ctx.drawImage(el, 0, 0, c.width, c.height); } };
  setInterval(draw, 250);
  return c.captureStream(4).getVideoTracks()[0];
}

export class LiveKitTutor extends EventTarget {
  constructor({ sessionId, source, api }) { super(); Object.assign(this, { sessionId, source, api }); }
  #emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  async connect() {
    const { url, token } = await this.api('/api/livekit/token', { sessionId: this.sessionId });
    this.room = new Room({ adaptiveStream: true, dynacast: true });
    const r = this.room;
    // Hanya suara agen tutor yang diputar, satu elemen saja. Suara peserta lain (mis. tab kedua milik
    // pengguna sendiri di room yang sama) tidak diputar supaya ucapan pengguna tidak terdengar memantul.
    r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio || !participant?.isAgent) return;
      document.querySelectorAll('audio[data-bt="tutor-audio"]').forEach((a) => a.remove());
      const el = track.attach(); el.dataset.bt = 'tutor-audio'; document.body.append(el);
    });
    r.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()));
    r.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      if (topic !== UI_TOPIC) return;
      let msg; try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      // Status agen (agent/main.py): siap / gagal. Bukan instruksi tahap.
      if (msg?.type === 'tutor_ready') { clearTimeout(this.waitAgent); this.#emit('tutor_state', { state: 'siap', model: msg.model }); return; }
      if (msg?.type === 'tutor_error') { clearTimeout(this.waitAgent); this.#emit('tutor_state', { state: 'gagal', message: msg.message }); return; }
      this.#emit('ui', msg);
    });
    r.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      for (const s of segments) if (s.final) this.#emit(participant?.identity === r.localParticipant.identity ? 'user' : 'tutor', { text: s.text });
    });
    r.on(RoomEvent.ParticipantConnected, (p) => p.isAgent && this.#emit('agent', { identity: p.identity }));
    r.on(RoomEvent.Reconnecting, () => this.#emit('status', { text: 'Menyambung ulang…' }));
    r.on(RoomEvent.Reconnected, () => this.#emit('status', { text: 'Tersambung lagi' }));
    r.on(RoomEvent.Disconnected, (reason) => this.#emit('close', { code: reason }));

    await r.connect(url, token);
    // Agen yang sudah ada di ruang sebelum murid tidak memicu ParticipantConnected: periksa juga.
    if ([...r.remoteParticipants.values()].some((p) => p.isAgent)) this.#emit('agent', {});
    // Tanpa sinyal "tutor_ready" dalam 25 dtk, anggap agen tidak berjalan (worker mati, model gagal, kuota).
    this.waitAgent = setTimeout(() => this.#emit('tutor_state', { state: 'gagal', message: 'Tutor tidak bergabung dalam 25 detik. Agen di server mungkin tidak berjalan.' }), 25000);
    // Siapa yang sedang bicara: dipakai indikator "Tutor berbicara / mendengarkan" di layar sesi.
    r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => this.#emit('speaking', {
      tutor: speakers.some((p) => p !== r.localParticipant), user: speakers.includes(r.localParticipant),
    }));
    // Terbitkan mic dan kamera dengan batas waktu: kalau jalur kirim (publisher) tidak tersambung,
    // tampilkan galat yang jelas alih-alih macet di "Menyambungkan…".
    const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what} tidak terkirim ke server (batas waktu)`)), ms))]);
    const mic = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
    this.mic = mic;
    await withTimeout(r.localParticipant.publishTrack(mic, { source: Track.Source.Microphone }), 15000, 'Suara mikrofon');
    this.#emit('open', { room: r.name });
    const vt = videoTrackFrom(this.source);
    // Nama track = sumber kamera, supaya agen bisa melabeli capture_source (pola VisionClaw).
    if (!vt) { this.#emit('status', { text: 'Kamera tidak terkirim: sumber kamera tidak ditemukan' }); return; }
    withTimeout(r.localParticipant.publishTrack(new LocalVideoTrack(vt), { name: this.source?.kind || 'camera', source: Track.Source.Camera, simulcast: false }), 15000, 'Gambar kamera')
      .catch((e) => this.#emit('status', { text: e.message }));
  }

  /** Bisukan / nyalakan mikrofon pengguna (tutor tetap terdengar). */
  async setMuted(muted) { if (!this.mic) return; if (muted) await this.mic.mute(); else await this.mic.unmute(); }

  /** Teks dari klien (mis. ketikan) → agen lewat topik chat bawaan LiveKit. */
  async sendText(text) { await this.room?.localParticipant.sendText(text, { topic: 'lk.chat' }); }

  stop() {
    clearTimeout(this.waitAgent);
    this.room?.disconnect();
    document.querySelectorAll('audio[data-bt="tutor-audio"]').forEach((a) => a.remove());
    this.room = null;
  }
}
