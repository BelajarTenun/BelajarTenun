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
    r.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) { const el = track.attach(); el.dataset.bt = 'tutor-audio'; document.body.append(el); }
    });
    r.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      if (topic !== UI_TOPIC) return;
      try { this.#emit('ui', JSON.parse(new TextDecoder().decode(payload))); } catch {}
    });
    r.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      for (const s of segments) if (s.final) this.#emit(participant?.identity === r.localParticipant.identity ? 'user' : 'tutor', { text: s.text });
    });
    r.on(RoomEvent.ParticipantConnected, (p) => p.isAgent && this.#emit('agent', { identity: p.identity }));
    r.on(RoomEvent.Reconnecting, () => this.#emit('status', { text: 'Menyambung ulang…' }));
    r.on(RoomEvent.Reconnected, () => this.#emit('status', { text: 'Tersambung lagi' }));
    r.on(RoomEvent.Disconnected, (reason) => this.#emit('close', { code: reason }));

    await r.connect(url, token);
    const mic = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
    await r.localParticipant.publishTrack(mic);
    const vt = videoTrackFrom(this.source);
    // Nama track = sumber kamera, supaya agen bisa melabeli capture_source (pola VisionClaw).
    if (vt) await r.localParticipant.publishTrack(new LocalVideoTrack(vt), { name: this.source?.kind || 'camera', source: Track.Source.Camera, simulcast: false });
    this.#emit('open', { room: r.name });
  }

  /** Teks dari klien (mis. ketikan) → agen lewat topik chat bawaan LiveKit. */
  async sendText(text) { await this.room?.localParticipant.sendText(text, { topic: 'lk.chat' }); }

  stop() {
    this.room?.disconnect();
    document.querySelectorAll('audio[data-bt="tutor-audio"]').forEach((a) => a.remove());
    this.room = null;
  }
}
