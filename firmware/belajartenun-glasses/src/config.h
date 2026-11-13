// Konfigurasi hardware kacamata BelajarTenun (Seeed XIAO ESP32S3 Sense).
#pragma once

#define DEVICE_NAME "BelajarTenun"
#define FIRMWARE_VERSION "0.1.0"

// ---- Pin (lihat hardware/README.md untuk skema kabel) ----
#define PIN_BUTTON 1          // D0 / GPIO1 → tombol ke GND (pull-up internal), juga untuk bangun dari deep sleep
#define PIN_BATTERY_ADC 2     // D1 / GPIO2 → pembagi tegangan baterai (2× 100 kΩ)
#define PIN_PRIVACY_LED 3     // D2 / GPIO3 → LED privasi 3 mm (+ resistor 330 Ω) – menyala SELAMA kamera aktif
#define PRIVACY_LED_ACTIVE_HIGH 1
#define BATTERY_DIVIDER 2.0f  // rasio pembagi (100k/100k = 2.0); kalibrasi dengan multimeter

// ---- Kamera OV2640/OV3660 pada XIAO ESP32S3 Sense ----
#define CAM_PIN_PWDN -1
#define CAM_PIN_RESET -1
#define CAM_PIN_XCLK 10
#define CAM_PIN_SIOD 40
#define CAM_PIN_SIOC 39
#define CAM_PIN_D7 48
#define CAM_PIN_D6 11
#define CAM_PIN_D5 12
#define CAM_PIN_D4 14
#define CAM_PIN_D3 16
#define CAM_PIN_D2 18
#define CAM_PIN_D1 17
#define CAM_PIN_D0 15
#define CAM_PIN_VSYNC 38
#define CAM_PIN_HREF 47
#define CAM_PIN_PCLK 13
#define CAM_ORIENTATION 0      // 0 = normal, 1 = 90°, 2 = 180°, 3 = 270° (dikirim di header foto)

// ---- BLE (UUID kompatibel OpenGlass / omiGlass) ----
#define SERVICE_UUID "19B10000-E8F2-537E-4F6C-D104768A1214"
#define PHOTO_DATA_UUID "19B10005-E8F2-537E-4F6C-D104768A1214"
#define PHOTO_CONTROL_UUID "19B10006-E8F2-537E-4F6C-D104768A1214"
#define BT_CONTROL_UUID "19B10020-E8F2-537E-4F6C-D104768A1214"
#define BT_EVENTS_UUID "19B10021-E8F2-537E-4F6C-D104768A1214"
#define BLE_MTU 247

// ---- Daya ----
#define IDLE_DEEP_SLEEP_MS (5UL * 60UL * 1000UL)   // tanpa koneksi & kamera mati selama 5 menit → tidur
#define BATTERY_REPORT_MS 60000UL
#define CPU_MHZ_ACTIVE 160
#define CPU_MHZ_IDLE 80

// ---- Wi-Fi (mode cepat, ke hotspot HP) ----
#define WIFI_CONNECT_TIMEOUT_MS 15000UL
#define HTTP_PORT 80
#define MDNS_NAME "belajartenun"   // http://belajartenun.local/capture
