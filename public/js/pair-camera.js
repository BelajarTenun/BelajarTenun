// HP sebagai kamera untuk laptop (pola "Continuity Camera"): HP menerbitkan video ke ruang LiveKit pair-<kode>,
// laptop berlangganan lalu memakainya seperti kamera biasa (stream + <video>). Tutor Live tetap berjalan di laptop.
import { Room, RoomEvent, Track, createLocalVideoTrack } from '../vendor/livekit-client/livekit-client.esm.mjs';
import { api } from './api.js';

/** Sisi laptop: sumber kamera yang gambarnya datang dari HP. Antarmuka sama dengan PhoneCamera. */
export class PairedPhoneCamera {
  kind = 'phone';
  paired = true;
  constructor(code) { this.code = code; }
  async start(video) {
    const { url, token } = await api('/api/pair/token', { code: this.code, role: 'viewer' });
    this.room = new Room();
    const got = new Promise((resolve) => {
      const use = (track) => {
        if (track.kind !== Track.Kind.Video) return;
        this.stream = new MediaStream([track.mediaStreamTrack]);
        video.srcObject = this.stream; video.play().catch(() => {});
        this.element = video;
        this.onstatus?.('Kamera HP tersambung');
        this.onchange?.(true);
        resolve();
      };
      this.room.on(RoomEvent.TrackSubscribed, use);
      this.room.on(RoomEvent.TrackUnsubscribed, (t) => { if (t.kind === Track.Kind.Video) { this.onstatus?.('Kamera HP terputus. Buka lagi halaman kamera di HP.'); this.onchange?.(false); } });
    });
    await this.room.connect(url, token);
    this.onstatus?.('Menunggu HP…');
    return got;
  }
  stop() { this.room?.disconnect(); this.room = null; }
}

/** Sisi HP: nyalakan kamera belakang dan kirim ke laptop. */
export async function sendCameraFromPhone(code, video, onstatus) {
  const { url, token } = await api('/api/pair/token', { code, role: 'camera' });
  const room = new Room();
  room.on(RoomEvent.Disconnected, () => onstatus?.('Terputus dari laptop'));
  room.on(RoomEvent.Reconnecting, () => onstatus?.('Menyambung ulang…'));
  room.on(RoomEvent.Reconnected, () => onstatus?.('Tersambung ke laptop'));
  const track = await createLocalVideoTrack({ facingMode: 'environment', resolution: { width: 1280, height: 720, frameRate: 15 } });
  track.attach(video);
  await room.connect(url, token);
  await room.localParticipant.publishTrack(track, { source: Track.Source.Camera, simulcast: false });
  onstatus?.('Tersambung ke laptop');
  return { room, track, stop: () => { track.stop(); room.disconnect(); } };
}
