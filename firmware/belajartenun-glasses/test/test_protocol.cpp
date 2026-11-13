// Tes protokol di komputer:  g++ -std=c++17 -I src test/test_protocol.cpp -o /tmp/t && /tmp/t
#include <cassert>
#include <cstdio>
#include <vector>
#include "protocol.h"
using namespace bt;

static int checks = 0;
#define CHECK(x) do { checks++; if (!(x)) { printf("GAGAL baris %d: %s\n", __LINE__, #x); return 1; } } while (0)

// Perakit di sisi aplikasi (salinan logika public/js/sources.js) untuk uji bolak-balik.
static std::vector<uint8_t> reassemble(const std::vector<std::vector<uint8_t>>& packets, uint8_t& header) {
  std::vector<uint8_t> out; int prev = -1;
  for (auto& p : packets) {
    if (p.size() == 2 && p[0] == 0xFF && p[1] == 0xFF) break;
    int id = p[0] | (p[1] << 8);
    if (id == 0) { header = p[2]; out.assign(p.begin() + 3, p.end()); prev = 0; continue; }
    if (id != prev + 1) return {};
    prev = id; out.insert(out.end(), p.begin() + 2, p.end());
  }
  return out;
}

int main() {
  // 1. Pemotongan foto: berbagai ukuran, termasuk tepat di batas potongan
  for (size_t len : {1u, 150u, 199u, 200u, 201u, 399u, 400u, 12345u}) {
    std::vector<uint8_t> jpeg(len); for (size_t i = 0; i < len; i++) jpeg[i] = (uint8_t)(i * 7 + 3);
    std::vector<std::vector<uint8_t>> packets; uint8_t buf[CHUNK_PAYLOAD + 3];
    for (uint16_t i = 0;; i++) { size_t n = buildChunk(jpeg.data(), len, i, 2, buf); if (!n) break; packets.emplace_back(buf, buf + n); CHECK(n <= CHUNK_PAYLOAD + 3); }
    CHECK(packets.size() == chunkCount(len));
    packets.push_back({0xFF, 0xFF});
    uint8_t header = 0;
    CHECK(reassemble(packets, header) == jpeg);
    CHECK(header == ((PROTOCOL_VERSION << 4) | 2));
  }
  // 2. Interval kompatibel OpenGlass
  bool one; CHECK(legacyIntervalMs(-1, one) == 0 && one); CHECK(legacyIntervalMs(0, one) == -1 && !one);
  CHECK(legacyIntervalMs(2, one) == 2000); CHECK(legacyIntervalMs(30, one) == 30000);
  // 3. Perintah
  Settings s;
  uint8_t snap[] = {CMD_SNAP}; CHECK(applyCommand(s, snap, 1) == ACT_ERROR);  // gerbang persetujuan
  uint8_t on[] = {CMD_CAMERA_ON}; CHECK(applyCommand(s, on, 1) == ACT_CAMERA_ON && s.cameraAllowed);
  CHECK(applyCommand(s, snap, 1) == ACT_SNAP);
  uint8_t iv[] = {CMD_SET_INTERVAL, 0x2C, 0x01}; CHECK(applyCommand(s, iv, 3) == ACT_RECONFIGURE && s.intervalMs == 500);  // 300 → min 500
  uint8_t iv2[] = {CMD_SET_INTERVAL, 0xD0, 0x07}; applyCommand(s, iv2, 3); CHECK(s.intervalMs == 2000);
  uint8_t fs[] = {CMD_SET_FRAMESIZE, 3}; CHECK(applyCommand(s, fs, 2) == ACT_ERROR);
  uint8_t q[] = {CMD_SET_QUALITY, 10}; CHECK(applyCommand(s, q, 2) == ACT_RECONFIGURE && s.quality == 10);
  uint8_t wifiOn[] = {CMD_WIFI_ON}; CHECK(applyCommand(s, wifiOn, 1) == ACT_ERROR);  // belum ada SSID
  const char creds[] = "\x10HotspotHP\0rahasia123";
  CHECK(applyCommand(s, (const uint8_t*)creds, sizeof(creds)) == ACT_NONE);
  CHECK(strcmp(s.ssid, "HotspotHP") == 0 && strcmp(s.password, "rahasia123") == 0);
  CHECK(applyCommand(s, wifiOn, 1) == ACT_WIFI_ON && s.wifiEnabled);
  const char badCreds[] = "\x10";
  CHECK(applyCommand(s, (const uint8_t*)badCreds, 1) == ACT_ERROR);
  uint8_t unknown[] = {0x99}; CHECK(applyCommand(s, unknown, 1) == ACT_ERROR);
  uint8_t st[8]; CHECK(buildStatus(st, true, 77, WIFI_CONNECTED, 2000, 1) == 7 && st[2] == 77 && (st[4] | st[5] << 8) == 2000);
  // 4. Tombol
  auto run = [](std::vector<std::pair<uint32_t, bool>> seq, uint32_t until) {
    ButtonDetector d; std::vector<ButtonEvent> evs; size_t k = 0; bool raw = false;
    for (uint32_t t = 0; t <= until; t++) { while (k < seq.size() && seq[k].first == t) raw = seq[k++].second; auto e = d.update(raw, t); if (e) evs.push_back(e); }
    return evs;
  };
  auto tap = run({{100, true}, {250, false}}, 1200);
  CHECK(tap.size() == 1 && tap[0] == BTN_TAP);
  auto dbl = run({{100, true}, {200, false}, {350, true}, {450, false}}, 1500);
  CHECK(dbl.size() == 1 && dbl[0] == BTN_DOUBLE);
  auto lng = run({{100, true}, {1200, false}}, 2000);
  CHECK(lng.size() == 1 && lng[0] == BTN_LONG);
  auto bounce = run({{100, true}, {105, false}, {110, true}, {300, false}}, 1200);  // pantulan kontak diabaikan
  CHECK(bounce.size() == 1 && bounce[0] == BTN_TAP);
  // 5. Baterai
  CHECK(batteryPercent(4.2f) == 100 && batteryPercent(3.2f) == 0 && batteryPercent(3.7f) == 20 && batteryPercent(3.95f) > 50);
  printf("OK %d cek lulus\n", checks);
  return 0;
}
