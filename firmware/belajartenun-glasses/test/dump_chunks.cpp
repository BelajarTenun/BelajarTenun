// Dipakai test/glasses-protocol.test.js: cetak paket BLE (hex per baris) untuk JPEG sintetis sepanjang argv[1].
#include <cstdio>
#include <cstdlib>
#include <vector>
#include "protocol.h"
int main(int argc, char** argv) {
  size_t len = argc > 1 ? strtoul(argv[1], nullptr, 10) : 1000;
  std::vector<uint8_t> jpeg(len); for (size_t i = 0; i < len; i++) jpeg[i] = (uint8_t)(i * 31 + 7);
  uint8_t buf[bt::CHUNK_PAYLOAD + 3];
  for (uint16_t i = 0;; i++) {
    size_t n = bt::buildChunk(jpeg.data(), len, i, 3, buf); if (!n) break;
    for (size_t k = 0; k < n; k++) printf("%02x", buf[k]); printf("\n");
  }
  printf("ffff\n");
  uint8_t st[8]; size_t n = bt::buildStatus(st, true, 64, bt::WS_CONNECTED, 1500, 1);
  printf("S"); for (size_t k = 0; k < n; k++) printf("%02x", st[k]); printf("\n");
  return 0;
}
