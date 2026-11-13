// BelajarTenun Glasses – logika protokol yang tidak bergantung hardware.
// Dipakai oleh firmware (main.cpp) dan dites di komputer dengan g++ (test/test_protocol.cpp).
//
// Protokol BLE "BelajarTenun v1" (service 19B10000-…, kompatibel OpenGlass/omiGlass):
//   PHOTO_DATA   19B10005  notify  : [idx_lo, idx_hi, payload...]; potongan pertama (idx 0) diawali
//                                     1 byte header: (VERSI << 4) | orientasi. Akhir foto: [0xFF, 0xFF].
//   PHOTO_CTRL   19B10006  write   : int8 kompatibel OpenGlass: -1 satu foto, 0 berhenti, 5..127 interval detik.
//   BT_CONTROL   19B10020  write   : perintah biner (lihat enum Command).
//   BT_EVENTS    19B10021  notify  : [tipe, data...] (lihat enum EventType).
//   Battery      0x180F/0x2A19     : persen baterai (standar BLE).
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>

namespace bt {

constexpr uint8_t PROTOCOL_VERSION = 1;
constexpr size_t CHUNK_PAYLOAD = 200;          // byte data per notifikasi (aman untuk MTU 247+)

enum Command : uint8_t {
  CMD_CAMERA_ON = 0x01,     // izin kamera dari aplikasi (gerbang persetujuan, pola RIO)
  CMD_CAMERA_OFF = 0x02,
  CMD_SET_INTERVAL = 0x03,  // u16 little-endian, milidetik (min 500)
  CMD_SET_FRAMESIZE = 0x04, // u8: 0 QVGA, 1 VGA, 2 SVGA
  CMD_SET_QUALITY = 0x05,   // u8: 8..40 (makin kecil makin bagus)
  CMD_SNAP = 0x06,          // satu foto sekarang
  CMD_WIFI_CREDS = 0x10,    // ssid\0password\0
  CMD_WIFI_ON = 0x11,
  CMD_WIFI_OFF = 0x12,
  CMD_STATUS = 0x20,        // minta event status
};

enum EventType : uint8_t {
  EVT_BUTTON = 0x01,   // [1, ButtonEvent]
  EVT_STATUS = 0x02,   // [2, camera_on, battery_pct, wifi_state, interval_ms_lo, interval_ms_hi, framesize]
  EVT_WIFI_IP = 0x03,  // [3, ip0, ip1, ip2, ip3]
  EVT_ERROR = 0x04,    // [4, ErrorCode]
};

enum ButtonEvent : uint8_t { BTN_NONE = 0, BTN_TAP = 1, BTN_DOUBLE = 2, BTN_LONG = 3 };
enum ErrorCode : uint8_t { ERR_CAMERA_INIT = 1, ERR_CAMERA_CAPTURE = 2, ERR_WIFI_CONNECT = 3, ERR_BAD_COMMAND = 4, ERR_CAMERA_NOT_ALLOWED = 5 };
enum WifiState : uint8_t { WIFI_OFF = 0, WIFI_CONNECTING = 1, WIFI_CONNECTED = 2, WIFI_FAILED = 3 };

// ---------------- Pemotongan foto menjadi notifikasi BLE ----------------
inline uint8_t photoHeader(uint8_t orientation) { return (uint8_t)((PROTOCOL_VERSION << 4) | (orientation & 0x0F)); }

/** Isi `out` dengan potongan ke-`index` dari JPEG. Mengembalikan panjang paket, 0 bila sudah habis
 *  (pemanggil lalu mengirim penanda akhir [0xFF, 0xFF]). `out` minimal CHUNK_PAYLOAD + 3 byte. */
inline size_t buildChunk(const uint8_t* jpeg, size_t len, uint16_t index, uint8_t orientation, uint8_t* out) {
  size_t offset;
  if (index == 0) offset = 0;
  else offset = (CHUNK_PAYLOAD - 1) + (size_t)(index - 1) * CHUNK_PAYLOAD;  // potongan 0 memuat 1 byte header
  if (offset >= len) return 0;
  out[0] = (uint8_t)(index & 0xFF);
  out[1] = (uint8_t)(index >> 8);
  if (index == 0) {
    out[2] = photoHeader(orientation);
    size_t n = len < CHUNK_PAYLOAD - 1 ? len : CHUNK_PAYLOAD - 1;
    memcpy(out + 3, jpeg, n);
    return n + 3;
  }
  size_t n = (len - offset) < CHUNK_PAYLOAD ? (len - offset) : CHUNK_PAYLOAD;
  memcpy(out + 2, jpeg + offset, n);
  return n + 2;
}
inline size_t chunkCount(size_t len) { return len <= CHUNK_PAYLOAD - 1 ? 1 : 1 + (len - (CHUNK_PAYLOAD - 1) + CHUNK_PAYLOAD - 1) / CHUNK_PAYLOAD; }

// ---------------- Konversi interval kompatibel OpenGlass ----------------
/** int8 OpenGlass → interval ms. -1 = satu foto (kembalikan 0 dan oneShot=true), 0 = berhenti (-1). */
inline long legacyIntervalMs(int8_t v, bool& oneShot) {
  oneShot = false;
  if (v == -1) { oneShot = true; return 0; }
  if (v == 0) return -1;
  if (v >= 1 && v <= 4) return (long)v * 1000;     // ekstensi BelajarTenun: 1–4 detik
  if (v >= 5) return (long)v * 1000;
  return -1;
}

// ---------------- Perintah BT_CONTROL ----------------
struct Settings {
  bool cameraAllowed = false;
  uint16_t intervalMs = 2000;
  uint8_t framesize = 1;   // VGA
  uint8_t quality = 12;
  bool wifiEnabled = false;
  char ssid[33] = {0};
  char password[65] = {0};
};

enum Action : uint8_t { ACT_NONE = 0, ACT_CAMERA_ON, ACT_CAMERA_OFF, ACT_RECONFIGURE, ACT_SNAP, ACT_WIFI_ON, ACT_WIFI_OFF, ACT_STATUS, ACT_ERROR };

/** Terapkan perintah ke Settings. Mengembalikan aksi yang harus dikerjakan firmware. */
inline Action applyCommand(Settings& s, const uint8_t* data, size_t len) {
  if (len == 0) return ACT_ERROR;
  switch (data[0]) {
    case CMD_CAMERA_ON: s.cameraAllowed = true; return ACT_CAMERA_ON;
    case CMD_CAMERA_OFF: s.cameraAllowed = false; return ACT_CAMERA_OFF;
    case CMD_SET_INTERVAL: {
      if (len < 3) return ACT_ERROR;
      uint16_t ms = (uint16_t)(data[1] | (data[2] << 8));
      if (ms < 500) ms = 500;
      s.intervalMs = ms; return ACT_RECONFIGURE;
    }
    case CMD_SET_FRAMESIZE: if (len < 2 || data[1] > 2) return ACT_ERROR; s.framesize = data[1]; return ACT_RECONFIGURE;
    case CMD_SET_QUALITY: if (len < 2 || data[1] < 8 || data[1] > 40) return ACT_ERROR; s.quality = data[1]; return ACT_RECONFIGURE;
    case CMD_SNAP: return s.cameraAllowed ? ACT_SNAP : ACT_ERROR;
    case CMD_WIFI_CREDS: {
      const char* p = (const char*)(data + 1);
      size_t rest = len - 1;
      size_t a = strnlen(p, rest);
      if (a == 0 || a >= rest || a > 32) return ACT_ERROR;
      size_t b = strnlen(p + a + 1, rest - a - 1);
      if (b > 64 || a + 1 + b >= rest + 1) return ACT_ERROR;
      memcpy(s.ssid, p, a); s.ssid[a] = 0;
      memcpy(s.password, p + a + 1, b); s.password[b] = 0;
      return ACT_NONE;
    }
    case CMD_WIFI_ON: if (!s.ssid[0]) return ACT_ERROR; s.wifiEnabled = true; return ACT_WIFI_ON;
    case CMD_WIFI_OFF: s.wifiEnabled = false; return ACT_WIFI_OFF;
    case CMD_STATUS: return ACT_STATUS;
    default: return ACT_ERROR;
  }
}

inline size_t buildStatus(uint8_t* out, bool cameraOn, uint8_t batteryPct, uint8_t wifiState, uint16_t intervalMs, uint8_t framesize) {
  out[0] = EVT_STATUS; out[1] = cameraOn ? 1 : 0; out[2] = batteryPct; out[3] = wifiState;
  out[4] = (uint8_t)(intervalMs & 0xFF); out[5] = (uint8_t)(intervalMs >> 8); out[6] = framesize;
  return 7;
}

// ---------------- Tombol: tap / ketuk ganda / tekan lama ----------------
// Dipanggil terus dengan keadaan tombol (true = ditekan) dan waktu sekarang (ms).
struct ButtonDetector {
  static constexpr uint32_t DEBOUNCE_MS = 30, LONG_MS = 800, DOUBLE_GAP_MS = 350;
  bool stable = false, lastRaw = false, longFired = false, waitingSecond = false;
  uint32_t lastChange = 0, pressedAt = 0, releasedAt = 0;

  ButtonEvent update(bool raw, uint32_t now) {
    if (raw != lastRaw) { lastRaw = raw; lastChange = now; }
    if (now - lastChange >= DEBOUNCE_MS && raw != stable) {
      stable = raw;
      if (stable) {                              // baru ditekan
        pressedAt = now; longFired = false;
        if (waitingSecond && now - releasedAt <= DOUBLE_GAP_MS) { waitingSecond = false; longFired = true; return BTN_DOUBLE; }
      } else {                                   // baru dilepas
        if (!longFired) { waitingSecond = true; releasedAt = now; }
      }
    }
    if (stable && !longFired && now - pressedAt >= LONG_MS) { longFired = true; waitingSecond = false; return BTN_LONG; }
    if (!stable && waitingSecond && now - releasedAt > DOUBLE_GAP_MS) { waitingSecond = false; return BTN_TAP; }
    return BTN_NONE;
  }
};

// ---------------- Baterai ----------------
/** Persen kasar dari tegangan LiPo (kurva sederhana 3,3–4,2 V, sedikit melengkung di bawah 3,7 V). */
inline uint8_t batteryPercent(float volts) {
  if (volts >= 4.15f) return 100;
  if (volts <= 3.30f) return 0;
  if (volts >= 3.70f) return (uint8_t)(20 + (volts - 3.70f) / (4.15f - 3.70f) * 80);
  return (uint8_t)((volts - 3.30f) / (3.70f - 3.30f) * 20);
}

}  // namespace bt
