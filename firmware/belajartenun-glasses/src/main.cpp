// BelajarTenun Glasses – firmware MVP untuk XIAO ESP32S3 Sense.
// Kacamata hanya: KAMERA + TOMBOL + LED PRIVASI. Mikrofon & suara ada di HP (earbuds Bluetooth).
//
// Diambil dari proyek terbuka (lihat README):
//  - omiGlass/OpenGlass: UUID & potongan foto BLE, manajemen daya & baterai, deep sleep dengan tombol
//  - RIO (Gemini Live di ESP32): kamera hanya menyala setelah izin dari aplikasi; aturan dikunci di firmware
//  - xiao-esp32s3-vision: mode Wi-Fi "pull" GET /capture, CAMERA_GRAB_LATEST, WiFi.setSleep(false)
//  - ai-glasses-research: pemulihan otomatis kamera setelah gagal beruntun, laporan status/kesalahan
#include <Arduino.h>
#include <NimBLEDevice.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include "esp_camera.h"
#include "esp_sleep.h"
#include "config.h"
#include "protocol.h"

using namespace bt;

static Settings settings;
static Preferences prefs;
static ButtonDetector button;
static NimBLECharacteristic *photoData, *events, *batteryLevel;
static bool bleConnected = false, cameraOn = false, snapRequested = false, oneShot = false;
static uint8_t wifiState = WIFI_OFF, batteryPct = 0, captureFailures = 0;
static uint32_t lastCapture = 0, lastActivity = 0, lastBatteryReport = 0, wifiStartedAt = 0;
static WebServer http(HTTP_PORT);
static bool httpStarted = false;

// ---------------- LED privasi: menyala tepat selama kamera aktif ----------------
static void privacyLed(bool on) { digitalWrite(PIN_PRIVACY_LED, (on == (bool)PRIVACY_LED_ACTIVE_HIGH) ? HIGH : LOW); }

static void sendEvent(const uint8_t* data, size_t len) {
  if (bleConnected && events) { events->setValue(data, len); events->notify(); }
}
static void sendError(uint8_t code) { uint8_t e[2] = {EVT_ERROR, code}; sendEvent(e, 2); }
static void sendStatus() {
  uint8_t s[8]; size_t n = buildStatus(s, cameraOn, batteryPct, wifiState, settings.intervalMs, settings.framesize);
  sendEvent(s, n);
}

// ---------------- Kamera (gerbang persetujuan) ----------------
static framesize_t frameSize(uint8_t f) { return f == 0 ? FRAMESIZE_QVGA : f == 2 ? FRAMESIZE_SVGA : FRAMESIZE_VGA; }

static bool cameraStart() {
  if (cameraOn) return true;
  if (!settings.cameraAllowed) { sendError(ERR_CAMERA_NOT_ALLOWED); return false; }
  privacyLed(true);                                   // LED dulu, baru sensor menyala
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0; c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = CAM_PIN_D0; c.pin_d1 = CAM_PIN_D1; c.pin_d2 = CAM_PIN_D2; c.pin_d3 = CAM_PIN_D3;
  c.pin_d4 = CAM_PIN_D4; c.pin_d5 = CAM_PIN_D5; c.pin_d6 = CAM_PIN_D6; c.pin_d7 = CAM_PIN_D7;
  c.pin_xclk = CAM_PIN_XCLK; c.pin_pclk = CAM_PIN_PCLK; c.pin_vsync = CAM_PIN_VSYNC; c.pin_href = CAM_PIN_HREF;
  c.pin_sccb_sda = CAM_PIN_SIOD; c.pin_sccb_scl = CAM_PIN_SIOC; c.pin_pwdn = CAM_PIN_PWDN; c.pin_reset = CAM_PIN_RESET;
  c.xclk_freq_hz = 20000000; c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = frameSize(settings.framesize); c.jpeg_quality = settings.quality;
  c.fb_count = 2; c.fb_location = CAMERA_FB_IN_PSRAM; c.grab_mode = CAMERA_GRAB_LATEST;  // selalu foto terbaru
  if (esp_camera_init(&c) != ESP_OK) { privacyLed(false); sendError(ERR_CAMERA_INIT); return false; }
  cameraOn = true; captureFailures = 0;
  setCpuFrequencyMhz(CPU_MHZ_ACTIVE);
  sendStatus();
  return true;
}

static void cameraStop() {
  if (cameraOn) esp_camera_deinit();
  cameraOn = false;
  privacyLed(false);                                  // sensor mati dulu, baru LED padam
  setCpuFrequencyMhz(CPU_MHZ_IDLE);
  sendStatus();
}

static void cameraReconfigure() {
  if (!cameraOn) return;
  sensor_t* s = esp_camera_sensor_get();
  if (s) { s->set_framesize(s, frameSize(settings.framesize)); s->set_quality(s, settings.quality); }
}

// ---------------- Kirim foto lewat BLE ----------------
static void sendPhotoBle(camera_fb_t* fb) {
  static uint8_t buf[CHUNK_PAYLOAD + 3];
  for (uint16_t i = 0;; i++) {
    size_t n = buildChunk(fb->buf, fb->len, i, CAM_ORIENTATION, buf);
    if (!n || !bleConnected) break;
    photoData->setValue(buf, n); photoData->notify();
    delay(4);                                         // beri napas ke stack BLE (pola omiGlass)
  }
  uint8_t end[2] = {0xFF, 0xFF};
  if (bleConnected) { photoData->setValue(end, 2); photoData->notify(); }
}

static void captureAndSend() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    sendError(ERR_CAMERA_CAPTURE);
    if (++captureFailures >= 3) { cameraStop(); delay(200); cameraStart(); }   // pulihkan sesi kamera
    return;
  }
  captureFailures = 0;
  if (bleConnected && wifiState != WIFI_CONNECTED) sendPhotoBle(fb);  // Wi-Fi aktif → aplikasi menarik via HTTP
  esp_camera_fb_return(fb);
}

// ---------------- Wi-Fi (mode cepat) ----------------
static void handleCapture() {
  http.sendHeader("Access-Control-Allow-Origin", "*");
  http.sendHeader("Access-Control-Allow-Private-Network", "true");
  http.sendHeader("Cache-Control", "no-store");
  if (!cameraOn) { http.send(403, "text/plain", "kamera belum diizinkan"); return; }
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { http.send(503, "text/plain", "gagal mengambil foto"); return; }
  http.setContentLength(fb->len);
  http.send(200, "image/jpeg", "");
  http.client().write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
  lastActivity = millis();
}
static void handleStatus() {
  http.sendHeader("Access-Control-Allow-Origin", "*");
  http.sendHeader("Access-Control-Allow-Private-Network", "true");
  char j[160];
  snprintf(j, sizeof j, "{\"device\":\"%s\",\"fw\":\"%s\",\"camera\":%s,\"battery\":%u,\"interval\":%u}", DEVICE_NAME, FIRMWARE_VERSION, cameraOn ? "true" : "false", batteryPct, settings.intervalMs);
  http.send(200, "application/json", j);
}

static void wifiStart() {
  if (!settings.ssid[0]) { sendError(ERR_WIFI_CONNECT); return; }
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);                               // cegah Wi-Fi membeku saat streaming
  WiFi.begin(settings.ssid, settings.password);
  wifiState = WIFI_CONNECTING; wifiStartedAt = millis();
  sendStatus();
}
static void wifiStop() {
  if (httpStarted) { http.stop(); httpStarted = false; }
  WiFi.disconnect(true); WiFi.mode(WIFI_OFF);
  wifiState = WIFI_OFF; sendStatus();
}
static void wifiLoop() {
  if (wifiState == WIFI_CONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      wifiState = WIFI_CONNECTED;
      if (!httpStarted) { http.on("/capture", handleCapture); http.on("/status", handleStatus); http.begin(); httpStarted = true; }
      MDNS.begin(MDNS_NAME);
      IPAddress ip = WiFi.localIP();
      uint8_t e[5] = {EVT_WIFI_IP, ip[0], ip[1], ip[2], ip[3]};
      sendEvent(e, 5); sendStatus();
    } else if (millis() - wifiStartedAt > WIFI_CONNECT_TIMEOUT_MS) {
      wifiState = WIFI_FAILED; WiFi.disconnect(true); sendError(ERR_WIFI_CONNECT); sendStatus();
    }
  } else if (wifiState == WIFI_CONNECTED) {
    http.handleClient();
    if (WiFi.status() != WL_CONNECTED) { wifiState = WIFI_CONNECTING; wifiStartedAt = millis(); WiFi.reconnect(); }
  }
}

// ---------------- BLE ----------------
class ServerCb : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s) override { bleConnected = true; lastActivity = millis(); }
  void onDisconnect(NimBLEServer* s) override {
    bleConnected = false;
    settings.cameraAllowed = false; cameraStop();      // aplikasi putus → kamera wajib mati
    NimBLEDevice::startAdvertising();
  }
};

class PhotoControlCb : public NimBLECharacteristicCallbacks {   // kompatibel OpenGlass
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.size() != 1) return;
    bool one; long ms = legacyIntervalMs((int8_t)v[0], one);
    settings.cameraAllowed = (ms >= 0 || one);
    if (ms < 0 && !one) { cameraStop(); return; }
    if (ms > 0) settings.intervalMs = (uint16_t)ms;
    oneShot = one; snapRequested = one;
    cameraStart();
  }
};

class BtControlCb : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    Action a = applyCommand(settings, (const uint8_t*)v.data(), v.size());
    lastActivity = millis();
    switch (a) {
      case ACT_CAMERA_ON: cameraStart(); break;
      case ACT_CAMERA_OFF: cameraStop(); break;
      case ACT_RECONFIGURE: cameraReconfigure(); prefs.putUShort("interval", settings.intervalMs); sendStatus(); break;
      case ACT_SNAP: snapRequested = true; break;
      case ACT_WIFI_ON: prefs.putString("ssid", settings.ssid); prefs.putString("pass", settings.password); wifiStart(); break;
      case ACT_WIFI_OFF: wifiStop(); break;
      case ACT_STATUS: sendStatus(); break;
      case ACT_ERROR: sendError(ERR_BAD_COMMAND); break;
      default: break;
    }
  }
};

static void bleStart() {
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setMTU(BLE_MTU);
  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCb());
  NimBLEService* svc = server->createService(SERVICE_UUID);
  photoData = svc->createCharacteristic(PHOTO_DATA_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  svc->createCharacteristic(PHOTO_CONTROL_UUID, NIMBLE_PROPERTY::WRITE)->setCallbacks(new PhotoControlCb());
  svc->createCharacteristic(BT_CONTROL_UUID, NIMBLE_PROPERTY::WRITE)->setCallbacks(new BtControlCb());
  events = svc->createCharacteristic(BT_EVENTS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEService* bat = server->createService(NimBLEUUID((uint16_t)0x180F));
  batteryLevel = bat->createCharacteristic(NimBLEUUID((uint16_t)0x2A19), NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  bat->start();
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->start();
}

// ---------------- Baterai & daya ----------------
static void readBattery() {
  uint32_t mv = 0;
  for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(PIN_BATTERY_ADC);
  float volts = (mv / 16.0f) / 1000.0f * BATTERY_DIVIDER;
  batteryPct = batteryPercent(volts);
  if (batteryLevel) { batteryLevel->setValue(&batteryPct, 1); if (bleConnected) batteryLevel->notify(); }
}

static void goToSleep() {
  cameraStop(); wifiStop();
  privacyLed(false);
  esp_sleep_enable_ext0_wakeup((gpio_num_t)PIN_BUTTON, 0);   // tekan tombol untuk bangun
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PRIVACY_LED, OUTPUT); privacyLed(false);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  analogReadResolution(12);
  setCpuFrequencyMhz(CPU_MHZ_IDLE);
  prefs.begin("bt-glasses", false);
  settings.intervalMs = prefs.getUShort("interval", 2000);
  prefs.getString("ssid", settings.ssid, sizeof settings.ssid);
  prefs.getString("pass", settings.password, sizeof settings.password);
  bleStart();
  readBattery();
  lastActivity = millis();
  Serial.println("BelajarTenun Glasses " FIRMWARE_VERSION " siap. Kamera MATI sampai aplikasi mengizinkan.");
}

void loop() {
  const uint32_t now = millis();
  ButtonEvent b = button.update(digitalRead(PIN_BUTTON) == LOW, now);
  if (b != BTN_NONE) {
    lastActivity = now;
    uint8_t e[2] = {EVT_BUTTON, b};
    sendEvent(e, 2);
    if (b == BTN_LONG && !bleConnected) goToSleep();   // tahan lama tanpa koneksi = matikan
  }
  if (cameraOn && bleConnected && (snapRequested || (!oneShot && now - lastCapture >= settings.intervalMs))) {
    snapRequested = false; lastCapture = now; lastActivity = now;
    captureAndSend();
    if (oneShot) { oneShot = false; }
  }
  if (wifiState != WIFI_OFF) wifiLoop();
  if (now - lastBatteryReport >= BATTERY_REPORT_MS) { lastBatteryReport = now; readBattery(); sendStatus(); }
  if (!bleConnected && !cameraOn && wifiState != WIFI_CONNECTED && now - lastActivity > IDLE_DEEP_SLEEP_MS) goToSleep();
  delay(5);
}
