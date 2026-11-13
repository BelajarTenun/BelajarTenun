// Sumber kamera. Semua sumber punya antarmuka yang sama:
//   await src.start(videoOrImgElement)  → mulai
//   src.element                          → <video>/<img> yang bisa digambar ke canvas
//   src.kind                             → 'phone' | 'openglass' | 'file'  (label sumber, ala VisionClaw capture_source)
//   src.stream (opsional)                → MediaStream untuk dibagikan ke pendamping (WebRTC)
//   src.onstatus = (text) => {}          → status koneksi

export class PhoneCamera {
  kind = 'phone';
  async start(video) {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
    video.srcObject = this.stream;
    await video.play().catch(() => {});
    this.element = video;
    this.onstatus?.('Kamera HP aktif');
  }
  stop() { this.stream?.getTracks().forEach((t) => t.stop()); }
}

// Video rekaman (mis. video tenun POV berlisensi terbuka) diputar sebagai kamera.
// Untuk uji coba & demo tanpa alat tenun: tutor tetap menganalisis frame sungguhan.
export class VideoFileCamera {
  kind = 'file';
  constructor(file) { this.file = file; }
  async start(video) {
    if (!this.file) throw new Error('pilih berkas video dulu');
    this.url = URL.createObjectURL(this.file);
    video.srcObject = null;
    video.src = this.url;
    video.muted = true;
    video.loop = true;
    await video.play().catch(() => {});
    this.stream = video.captureStream?.();
    this.element = video;
    this.onstatus?.(`Memutar video: ${this.file.name}`);
  }
  stop() {
    if (this.element) { this.element.pause(); this.element.removeAttribute('src'); this.element.load(); }
    if (this.url) URL.revokeObjectURL(this.url);
  }
}

// OpenGlass (ESP32-S3) lewat Web Bluetooth. Protokol dari OpenGlass firmware.ino & DeviceView.tsx:
// - service 19B10000-…, karakteristik foto 19B10005 (notify), kontrol foto 19B10006 (write)
// - setiap paket: 2 byte id (little-endian) + data JPEG; paket 0xFFFF = foto selesai
// - kontrol: -1 = satu foto, 0 = berhenti, 5..300 = foto tiap N detik (dibulatkan ke kelipatan 5)
const OG_SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214';
const OG_PHOTO = '19b10005-e8f2-537e-4f6c-d104768a1214';
const OG_CONTROL = '19b10006-e8f2-537e-4f6c-d104768a1214';

export function createJpegAssembler(onPhoto) {
  let prev = -1, parts = [], size = 0;
  return (bytes) => {
    if (bytes[0] === 0xff && bytes[1] === 0xff) {
      if (prev >= 0 && size) {
        const out = new Uint8Array(size); let o = 0;
        for (const p of parts) { out.set(p, o); o += p.length; }
        onPhoto(out);
      }
      prev = -1; parts = []; size = 0; return;
    }
    const id = bytes[0] | (bytes[1] << 8);
    if (id === 0) { prev = 0; parts = [bytes.slice(2)]; size = bytes.length - 2; return; }
    if (prev < 0 || id !== prev + 1) { prev = -1; parts = []; size = 0; return; } // paket hilang → buang foto
    prev = id; parts.push(bytes.slice(2)); size += bytes.length - 2;
  };
}

export class OpenGlassCamera {
  kind = 'openglass';
  constructor({ intervalSec = 5, rotate = 270 } = {}) { this.intervalSec = intervalSec; this.rotate = rotate; }
  static supported() { return 'bluetooth' in navigator; }
  async start(img) {
    if (!OpenGlassCamera.supported()) throw new Error('Browser ini tidak mendukung Web Bluetooth (pakai Chrome di Android/desktop).');
    this.element = img;
    this.device = await navigator.bluetooth.requestDevice({ filters: [{ name: 'OpenGlass' }], optionalServices: [OG_SERVICE] });
    this.device.addEventListener('gattserverdisconnected', () => this.onstatus?.('Kacamata terputus'));
    const gatt = await this.device.gatt.connect();
    const service = await gatt.getPrimaryService(OG_SERVICE);
    const photo = await service.getCharacteristic(OG_PHOTO);
    const assemble = createJpegAssembler((jpeg) => this.#show(jpeg));
    photo.addEventListener('characteristicvaluechanged', (e) => assemble(new Uint8Array(e.target.value.buffer)));
    await photo.startNotifications();
    this.control = await service.getCharacteristic(OG_CONTROL);
    await this.setInterval(this.intervalSec);
    this.onstatus?.('Kacamata OpenGlass tersambung');
  }
  async setInterval(sec) {
    const v = Math.max(5, Math.min(300, Math.round(sec / 5) * 5));
    await this.control?.writeValue(new Int8Array([v > 127 ? 127 : v])); // firmware membaca int8
  }
  async snap() { await this.control?.writeValue(new Int8Array([-1])); }
  async #show(jpeg) {
    // Kamera OpenGlass terpasang miring; putar seperti di DeviceView.tsx (rotateImage 270°).
    const bmp = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
    const c = document.createElement('canvas');
    const rot = this.rotate % 180 !== 0;
    c.width = rot ? bmp.height : bmp.width; c.height = rot ? bmp.width : bmp.height;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2); ctx.rotate((this.rotate * Math.PI) / 180); ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    this.element.src = c.toDataURL('image/jpeg', 0.85);
    await this.element.decode().catch(() => {});
    this.lastPhotoAt = Date.now();
    this.onphoto?.();
  }
  stop() { this.control?.writeValue(new Int8Array([0])).catch(() => {}); this.device?.gatt?.disconnect(); }
}
