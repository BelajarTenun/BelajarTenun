// Sumber kamera. Semua sumber punya antarmuka yang sama:
//   await src.start(videoOrImgElement)  → mulai
//   src.element                          → <video>/<img> yang bisa digambar ke canvas
//   src.kind                             → 'phone' | 'openglass'  (label sumber, ala VisionClaw capture_source)
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

// ---------------------------------------------------------------------------------------------
// Kacamata kamera lewat Web Bluetooth. Satu adaptor untuk tiga firmware dengan UUID yang sama:
//  - "BelajarTenun" (firmware/belajartenun-glasses): header foto + perintah & event (tombol, status, Wi-Fi)
//  - "OMI Glass" (omiGlass, penerus OpenGlass): header foto berisi orientasi
//  - "OpenGlass" (lama): tanpa header, kamera terpasang miring 270°
// Format paket: [id_lo, id_hi, data…]; paket id 0 (BelajarTenun/omi) diawali 1 byte header; [0xFF,0xFF] = akhir foto.
// ---------------------------------------------------------------------------------------------
const OG_SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214';
const OG_PHOTO = '19b10005-e8f2-537e-4f6c-d104768a1214';
const OG_CONTROL = '19b10006-e8f2-537e-4f6c-d104768a1214';
const BT_CONTROL = '19b10020-e8f2-537e-4f6c-d104768a1214';
const BT_EVENTS = '19b10021-e8f2-537e-4f6c-d104768a1214';

export const PROFILES = {
  belajartenun: { name: 'BelajarTenun', headerByte: true, rotate: null, label: 'Kacamata BelajarTenun' },
  omiglass: { name: 'OMI Glass', headerByte: true, rotate: null, label: 'omiGlass' },
  openglass: { name: 'OpenGlass', headerByte: false, rotate: 270, label: 'OpenGlass' },
};
export const CMD = { CAMERA_ON: 0x01, CAMERA_OFF: 0x02, SET_INTERVAL: 0x03, SET_FRAMESIZE: 0x04, SET_QUALITY: 0x05, SNAP: 0x06, WIFI_CREDS: 0x10, WIFI_ON: 0x11, WIFI_OFF: 0x12, STATUS: 0x20 };
export const BUTTON = { 1: 'tap', 2: 'double', 3: 'long' };
const ERRORS = { 1: 'kamera gagal menyala', 2: 'gagal mengambil foto', 3: 'Wi-Fi gagal tersambung', 4: 'perintah tidak dikenal', 5: 'kamera belum diizinkan' };

/** Perakit JPEG dari potongan BLE. opts.headerByte: potongan pertama memuat 1 byte header. */
export function createJpegAssembler(onPhoto, { headerByte = false } = {}) {
  let prev = -1, parts = [], size = 0, header = null;
  return (bytes) => {
    if (bytes[0] === 0xff && bytes[1] === 0xff) {
      if (prev >= 0 && size) {
        const out = new Uint8Array(size); let o = 0;
        for (const p of parts) { out.set(p, o); o += p.length; }
        onPhoto(out, header);
      }
      prev = -1; parts = []; size = 0; header = null; return;
    }
    const id = bytes[0] | (bytes[1] << 8);
    if (id === 0) {
      prev = 0; header = headerByte ? bytes[2] : null;
      const start = headerByte ? 3 : 2;
      parts = [bytes.slice(start)]; size = bytes.length - start; return;
    }
    if (prev < 0 || id !== prev + 1) { prev = -1; parts = []; size = 0; return; } // paket hilang → buang foto
    prev = id; parts.push(bytes.slice(2)); size += bytes.length - 2;
  };
}

/** Ubah event BT_EVENTS menjadi objek. */
export function parseEvent(bytes) {
  switch (bytes[0]) {
    case 1: return { type: 'button', press: BUTTON[bytes[1]] ?? 'unknown' };
    case 2: return { type: 'status', cameraOn: bytes[1] === 1, battery: bytes[2], wifi: ['off', 'connecting', 'connected', 'failed'][bytes[3]] ?? 'unknown', intervalMs: bytes[4] | (bytes[5] << 8), framesize: bytes[6] };
    case 3: return { type: 'wifi_ip', ip: `${bytes[1]}.${bytes[2]}.${bytes[3]}.${bytes[4]}` };
    case 4: return { type: 'error', code: bytes[1], message: ERRORS[bytes[1]] ?? `kesalahan ${bytes[1]}` };
    default: return { type: 'unknown', raw: [...bytes] };
  }
}
export const encodeInterval = (ms) => new Uint8Array([CMD.SET_INTERVAL, ms & 0xff, (ms >> 8) & 0xff]);
export function encodeWifiCreds(ssid, password) {
  const enc = new TextEncoder();
  const a = enc.encode(ssid), b = enc.encode(password);
  if (!a.length || a.length > 32 || b.length > 64) throw new Error('SSID 1–32 byte, kata sandi maks 64 byte');
  const out = new Uint8Array(1 + a.length + 1 + b.length + 1);
  out[0] = CMD.WIFI_CREDS; out.set(a, 1); out.set(b, 2 + a.length);
  return out;
}

export class GlassesCamera {
  constructor({ profile = 'belajartenun', intervalMs = 2000 } = {}) {
    this.profile = PROFILES[profile] ? profile : 'belajartenun';
    this.kind = this.profile;           // label sumber kamera (capture_source)
    this.intervalMs = intervalMs;
    this.battery = null; this.wifiIp = null; this.stopped = false;
  }
  static supported() { return 'bluetooth' in navigator; }
  get p() { return PROFILES[this.profile]; }

  async start(img) {
    if (!GlassesCamera.supported()) throw new Error('Browser ini tidak mendukung Web Bluetooth (pakai Chrome di Android/desktop). Di iPhone perlu aplikasi native.');
    this.element = img;
    this.device = await navigator.bluetooth.requestDevice({ filters: [{ name: this.p.name }], optionalServices: [OG_SERVICE, 'battery_service'] });
    this.device.addEventListener('gattserverdisconnected', () => this.#reconnect());
    await this.#connect();
    this.#watchdog();
  }

  async #connect() {
    const gatt = await this.device.gatt.connect();
    const service = await gatt.getPrimaryService(OG_SERVICE);
    const photo = await service.getCharacteristic(OG_PHOTO);
    const assemble = createJpegAssembler((jpeg, header) => this.#show(jpeg, header), { headerByte: this.p.headerByte });
    photo.addEventListener('characteristicvaluechanged', (e) => assemble(new Uint8Array(e.target.value.buffer)));
    await photo.startNotifications();
    this.control = await service.getCharacteristic(OG_CONTROL);
    if (this.profile === 'belajartenun') {
      this.btControl = await service.getCharacteristic(BT_CONTROL);
      const ev = await service.getCharacteristic(BT_EVENTS);
      ev.addEventListener('characteristicvaluechanged', (e) => this.#onEvent(parseEvent(new Uint8Array(e.target.value.buffer))));
      await ev.startNotifications();
      await this.command(encodeInterval(this.intervalMs));
      await this.command([CMD.CAMERA_ON]);      // izin kamera (firmware menyalakan LED privasi)
      await this.command([CMD.STATUS]);
    } else {
      await this.setInterval(this.intervalMs);
    }
    try {
      const bat = await (await gatt.getPrimaryService('battery_service')).getCharacteristic('battery_level');
      this.battery = (await bat.readValue()).getUint8(0);
      bat.addEventListener('characteristicvaluechanged', (e) => { this.battery = e.target.value.getUint8(0); this.onbattery?.(this.battery); });
      await bat.startNotifications().catch(() => {});
      this.onbattery?.(this.battery);
    } catch { /* firmware tanpa layanan baterai */ }
    this.retries = 0;
    this.onstatus?.(`${this.p.label} tersambung`);
  }

  // Sambung ulang dengan jeda bertambah (pola pemulihan sesi dari ai-glasses-research / xiao-esp32s3-vision).
  async #reconnect() {
    if (this.stopped) return;
    this.onstatus?.('Kacamata terputus, mencoba menyambung ulang…');
    for (this.retries = 1; this.retries <= 6 && !this.stopped; this.retries++) {
      await new Promise((r) => setTimeout(r, Math.min(15000, 1000 * 2 ** (this.retries - 1))));
      try { await this.#connect(); return; } catch { /* coba lagi */ }
    }
    if (!this.stopped) this.onstatus?.('Kacamata tidak bisa disambung ulang. Dekatkan ke HP lalu sambungkan lagi.');
  }

  #watchdog() {
    clearInterval(this.wd);
    this.wd = setInterval(() => {
      const late = Date.now() - (this.lastPhotoAt ?? this.startedAt ?? Date.now());
      if (this.device?.gatt?.connected && late > this.intervalMs * 3 + 5000) this.onstatus?.('Foto dari kacamata tidak masuk. Cek baterai / jarak.');
    }, 5000);
    this.startedAt = Date.now();
  }

  #onEvent(ev) {
    if (ev.type === 'button') this.onbutton?.(ev.press);
    else if (ev.type === 'status') { this.status = ev; if (ev.battery) { this.battery = ev.battery; this.onbattery?.(ev.battery); } this.onstatusdata?.(ev); }
    else if (ev.type === 'wifi_ip') { this.wifiIp = ev.ip; this.onstatus?.(`Wi-Fi kacamata: ${ev.ip}`); this.#startWifiPull(); }
    else if (ev.type === 'error') this.onstatus?.(`Kacamata: ${ev.message}`);
  }

  async command(bytes) { if (this.btControl) await this.btControl.writeValue(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)); }
  async setInterval(ms) {
    this.intervalMs = ms;
    if (this.btControl) return this.command(encodeInterval(ms));
    const v = Math.max(5, Math.min(127, Math.round(ms / 5000) * 5));   // firmware lama: kelipatan 5 dtk
    await this.control?.writeValue(new Int8Array([v]));
  }
  async snap() { if (this.btControl) return this.command([CMD.SNAP]); await this.control?.writeValue(new Int8Array([-1])); }
  async enableWifi(ssid, password) { await this.command(encodeWifiCreds(ssid, password)); await this.command([CMD.WIFI_ON]); }

  // Mode Wi-Fi: tarik foto langsung dari kacamata (lebih cepat dari BLE). Hanya bila halaman boleh
  // memanggil alamat lokal (http lokal / aplikasi native); bila diblokir, tetap memakai BLE.
  #startWifiPull() {
    clearInterval(this.pull);
    this.pull = setInterval(async () => {
      if (!this.wifiIp || this.stopped) return;
      try {
        const r = await fetch(`http://${this.wifiIp}/capture`, { cache: 'no-store', targetAddressSpace: 'local' });
        if (r.ok) this.#show(new Uint8Array(await r.arrayBuffer()), null);
      } catch { clearInterval(this.pull); this.onstatus?.('Mode Wi-Fi diblokir browser (halaman HTTPS). Tetap memakai Bluetooth.'); this.command([CMD.WIFI_OFF]).catch(() => {}); }
    }, Math.max(300, Math.min(this.intervalMs, 1000)));
  }

  async #show(jpeg, header) {
    const bmp = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
    const orientation = header != null ? header & 0x0f : null;
    const deg = this.p.rotate ?? [0, 90, 180, 270][orientation ?? 0] ?? 0;
    const c = document.createElement('canvas');
    const rot = deg % 180 !== 0;
    c.width = rot ? bmp.height : bmp.width; c.height = rot ? bmp.width : bmp.height;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2); ctx.rotate((deg * Math.PI) / 180); ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    this.element.src = c.toDataURL('image/jpeg', 0.85);
    await this.element.decode().catch(() => {});
    this.lastPhotoAt = Date.now();
    this.onphoto?.();
  }

  stop() {
    this.stopped = true; clearInterval(this.wd); clearInterval(this.pull);
    if (this.btControl) this.command([CMD.CAMERA_OFF]).catch(() => {});   // LED privasi padam
    else this.control?.writeValue(new Int8Array([0])).catch(() => {});
    this.device?.gatt?.disconnect();
  }
}

/** Kompatibilitas: adaptor lama OpenGlass. */
export class OpenGlassCamera extends GlassesCamera {
  constructor(opts = {}) { super({ ...opts, profile: 'openglass', intervalMs: (opts.intervalSec ?? 5) * 1000 }); }
}
