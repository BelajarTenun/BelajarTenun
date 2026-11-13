// =====================================================================
//  BelajarTenun – casing kacamata (XIAO ESP32S3 Sense + LiPo 502030)
//
//  Mengikuti cara OpenGlass: MODUL KAMERA DIPISAH dari board dan ditempel
//  di ujung bingkai (dekat engsel) menghadap ke depan, tersambung kabel
//  pita (FPC). Kotak casing di gagang hanya berisi XIAO + baterai.
//
//  Bagian:
//    body    – kotak casing (XIAO berdiri di depan, baterai di belakang)
//    lid     – tutup samping + penjepit gagang (atau sirip lem)
//    camera  – dudukan modul kamera OV2640/OV3660, menunduk camera_tilt°,
//              dengan sirip untuk ditempel ke ujung bingkai
//
//  Sumbu:  X = ke luar kepala (lateral)   Y = ke depan   Z = ke atas.
//  Render: openscad -D 'part="body"' -o body.stl belajartenun_casing.scad
//  part = "assembly" | "body" | "lid" | "camera" | "print"
//  SEMUA UKURAN DALAM MM. Ukur komponenmu dulu, lalu ubah parameter di bawah.
// =====================================================================

part = "assembly";

/* [Komponen di casing] */
board_w   = 17.8;  // lebar XIAO (sumbu X)
board_h   = 21.0;  // tinggi XIAO (sumbu Z), sisi USB-C di bawah
stack_d   = 11.0;  // tebal XIAO + board Sense TANPA modul kamera (sumbu Y) – UKUR!
batt_t    = 5.5;   // LiPo 502030: tebal
batt_w    = 20.5;  //               lebar
batt_l    = 30.5;  //               panjang (berdiri, sumbu Z)
wire_gap  = 1.5;   // ruang kabel antara baterai & board
tol       = 0.4;   // kelonggaran tiap sisi

/* [Varian v2: mik + speaker di kacamata] */
with_speaker = false;   // true = tambah ruang amplifier MAX98357A + speaker mikro 15 mm
amp_w = 18.0; amp_h = 19.5; amp_t = 3.5;   // board MAX98357A (berdiri di sisi dalam)
spk_d = 15.5; spk_t = 4.5;                 // speaker mikro bulat
spk_extra_z = with_speaker ? spk_t + 2 : 0; // ruang speaker di bawah

/* [Dinding] */
wall      = 1.6;
radius    = 3.0;   // pembulatan sudut luar

/* [Dudukan kamera] */
camera_tilt  = 25;    // derajat kamera menunduk (lihat tangan & lungsi)
cam_module   = 8.8;   // kantong papan modul kamera (persegi) – UKUR modulmu
cam_module_t = 2.2;   // tebal papan modul + konektor
lens_d       = 7.4;   // lubang laras lensa
pod_w        = 13.0;  // lebar & tinggi dudukan
pod_d        = 8.0;   // tebal dudukan (arah lensa)
flange_t     = 1.6;   // sirip tempel ke ujung bingkai
fpc_w        = 10.0;  // lebar kabel pita kamera + kelonggaran
fpc_t        = 1.8;

/* [Lubang casing] */
led_d      = 3.1;   // LED privasi 3 mm (wajib menyala saat kamera aktif), di dinding depan
button_d   = 3.6;   // tombol taktil 6x6 (batang tombol), di atas
usb_w      = 10.5;  // lubang USB-C di dasar
usb_t      = 4.2;
usb_y      = 4.0;   // posisi tengah USB dari dinding depan (dalam) – UKUR!
mic_holes  = 3;     // lubang mikrofon PDM (di board Sense)
mic_d      = 1.2;

/* [Pemasangan casing] */
mount      = "clip"; // "clip" = penjepit gagang, "tab" = sirip untuk lem (gaya OpenGlass)
temple_t   = 5.0;   // tebal gagang kacamata dekat engsel
temple_h   = 11.0;  // tinggi gagang kacamata dekat engsel
clip_len   = 16;    // panjang penjepit sepanjang gagang
clip_wall  = 2.0;
clip_lip   = 0.6;   // bibir pengunci di bawah gagang
temple_drop = 4;    // posisi penjepit dari atas casing
clip_tilt  = 0;     // casing tidak perlu dimiringkan lagi (kamera sudah terpisah)

$fn = 48;

// ---------- Ukuran turunan ----------
in_x = max(board_w, batt_w) + 2*tol;
in_y = stack_d + wire_gap + batt_t + 2*tol + (with_speaker ? amp_t + 1 : 0);
in_z = max(board_h, batt_l) + 2*tol + 2 + spk_extra_z;
out_x = in_x + wall;           // sisi -X ditutup oleh tutup
out_y = in_y + 2*wall;
out_z = in_z + 2*wall;
lid_t = 1.6;
lip_h = 2.0;                   // bibir tutup yang masuk ke badan

module rbox(size, r) {         // kotak dengan semua sudut membulat
  hull() for (x=[r, size[0]-r], y=[r, size[1]-r], z=[r, size[2]-r]) translate([x,y,z]) sphere(r);
}
// Kotak membulat di sisi +X, sisi -X rata (bidang pertemuan dengan tutup)
module rbox_flatx(size, r) {
  hull() for (y=[r, size[1]-r], z=[r, size[2]-r]) {
    translate([size[0]-r, y, z]) sphere(r);
    translate([0, y, z]) rotate([0,90,0]) cylinder(r=r, h=0.01);
  }
}
// Pelat membulat di tepi Y-Z, tebal t sepanjang X
module rplate(t, w, h, r) { hull() for (y=[r, w-r], z=[r, h-r]) translate([0, y, z]) rotate([0,90,0]) cylinder(r=r, h=t); }
module rbox_flat(size, r) { hull() for (x=[r, size[0]-r], y=[r, size[1]-r]) translate([x,y,0]) cylinder(r=r, h=size[2]); }

// ---------- Badan casing ----------
module body() {
  difference() {
    rbox_flatx([out_x, out_y, out_z], radius);
    translate([-1, wall, wall]) cube([in_x + 1, in_y, in_z]);                       // rongga, terbuka ke -X
    // celah kabel pita (FPC) kamera di dinding depan atas
    translate([in_x/2 - fpc_w/2, out_y - wall - 1, out_z - wall - 3 - fpc_t]) cube([fpc_w, wall + 2, fpc_t]);
    // LED privasi di dinding depan (terlihat orang di depan)
    translate([in_x/2 + 5.5, out_y - wall - 1, out_z - wall - 10]) rotate([-90,0,0]) cylinder(d=led_d, h=wall+2);
    // tombol di atas
    translate([in_x/2 + 3, wall + in_y*0.35, out_z - wall - 1]) cylinder(d=button_d, h=wall+2);
    // USB-C di dasar, dekat dinding depan (board berdiri di depan)
    translate([in_x/2 - usb_w/2, out_y - wall - usb_y - usb_t/2, -1]) rbox_flat([usb_w, usb_t, wall+2], 1.2);
    // mikrofon: deretan lubang kecil di depan bawah
    for (i=[0:mic_holes-1]) translate([in_x/2 - (mic_holes-1)*1.4 + i*2.8, out_y - wall - 1, wall + 5]) rotate([-90,0,0]) cylinder(d=mic_d, h=wall+2, $fn=16);
    // v2: kisi speaker di dinding belakang bawah (mengarah ke telinga)
    if (with_speaker) for (i=[-2:2], j=[-1:1]) translate([in_x/2 + i*2.6, -1, wall + spk_t/2 + 1 + j*2.6]) rotate([-90,0,0]) cylinder(d=1.6, h=wall+2, $fn=12);
  }
  if (with_speaker) translate([in_x/2, wall + spk_d/2 + 0.5, wall]) difference() { cylinder(d=spk_d + 2.4, h=1.6); translate([0,0,-1]) cylinder(d=spk_d + 0.4, h=4); }
  translate([in_x - 3, wall + batt_t + 2*tol, wall]) cube([3, 1.2, in_z*0.6]);      // sekat baterai
  for (z=[wall+6, out_z-wall-6]) translate([0.5, wall-0.01, z]) cube([0.6, 0.6, 3]); // tonjolan snap tutup
}

// ---------- Tutup (+ penjepit / sirip) ----------
module lid() {
  translate([-lid_t, 0, 0]) rplate(lid_t, out_y, out_z, radius);
  translate([0, wall + 0.15, wall + 0.15]) difference() {                            // bibir pas-tekan
    cube([lip_h, in_y - 0.3, in_z - 0.3]);
    translate([-0.1, 1.2, 1.2]) cube([lip_h + 0.2, in_y - 0.3 - 2.4, in_z - 0.3 - 2.4]);
  }
  if (mount == "clip") mount_clip(); else mount_tab();
}
function w_of_clip() = temple_t + 2*clip_wall;
module clip_profile() {   // profil U terbalik: menjepit gagang dari atas, bibir pengunci di bawah
  w = w_of_clip();
  difference() {
    translate([-w, -temple_h - clip_wall]) square([w, temple_h + clip_wall]);
    translate([-w + clip_wall, -temple_h - clip_wall - 0.01]) square([temple_t, temple_h + 0.01]);
  }
  for (side = [0, 1]) {
    x0 = side == 0 ? -w + clip_wall : -clip_wall;
    dir = side == 0 ? 1 : -1;
    translate([x0, -temple_h - clip_wall]) polygon([[0,0],[dir*clip_lip,0],[0,1.6]]);
  }
}
module mount_clip() {
  anchor = [-lid_t, out_y*0.55, out_z - temple_drop];
  translate(anchor) rotate([clip_tilt, 0, 0]) translate([0, clip_len/2, 0]) rotate([90, 0, 0]) linear_extrude(clip_len) clip_profile();
  hull() {   // penguat antara tutup dan atap penjepit
    translate([-lid_t - 0.01, out_y*0.3, out_z*0.45]) cube([0.01, out_y*0.4, out_z*0.4]);
    translate(anchor) rotate([clip_tilt,0,0]) translate([-0.01, -clip_len/2, -clip_wall]) cube([0.01, clip_len, clip_wall]);
  }
}
module mount_tab() { translate([-lid_t, out_y/2, out_z*0.55]) translate([-6, -10, -2]) rbox([6, 20, 4], 1.5); }

// ---------- Dudukan kamera (ditempel di ujung bingkai) ----------
// Koordinat lokal: sirip tempel di bidang x ∈ [-flange_t, 0]; kotak kamera di x > 0,
// lensa menghadap +Y dan menunduk camera_tilt°. Papan modul dimasukkan dari belakang.
module camera_pod() {
  difference() {
    translate([0, 0, -pod_w/2]) rbox([pod_w, pod_d, pod_w], 1.5);
    translate([pod_w/2, -1, 0]) rotate([-90, 0, 0]) cylinder(d=lens_d, h=pod_d + 2);               // laras lensa
    translate([pod_w/2 - cam_module/2, -0.01, -cam_module/2]) cube([cam_module, cam_module_t, cam_module]); // kantong papan
    translate([pod_w/2 - fpc_w/2, -0.01, -pod_w/2 - 1]) cube([fpc_w, cam_module_t, pod_w/2 - cam_module/2 + 1.2]); // jalur FPC ke bawah
  }
}
module camera_mount() {
  rotate([-camera_tilt, 0, 0]) camera_pod();
  // sirip tempel: mengikuti bentuk sisi dudukan, sedikit lebih besar untuk lem/selotip
  hull() for (x = [-flange_t, -0.01]) translate([x, 0, 0]) rotate([-camera_tilt, 0, 0]) translate([0, -1.5, -pod_w/2 - 1.5]) cube([0.01, pod_d + 3, pod_w + 3]);
}

// ---------- Tata letak ----------
module components_preview() {
  color("seagreen", 0.6) translate([tol, wall + in_y - stack_d - tol, wall + tol]) cube([board_w, stack_d, board_h]);
  color("silver", 0.6) translate([tol, wall + tol, wall + tol + spk_extra_z]) cube([batt_w, batt_t, batt_l]);
  if (with_speaker) {
    color("gold", 0.7) translate([in_x/2, wall + spk_d/2 + 0.5, wall + 0.5]) cylinder(d=spk_d, h=spk_t);
    color("purple", 0.6) translate([tol, wall + batt_t + 2*tol + 0.5, wall + spk_extra_z]) cube([amp_w, amp_t, amp_h]);
  }
}
module camera_print() { translate([0, 0, flange_t]) rotate([0, -90, 0]) camera_mount(); }   // sirip rata di meja cetak

if (part == "body") body();
else if (part == "lid") rotate([0, -90, 0]) translate([lid_t, 0, 0]) lid();
else if (part == "camera") camera_print();
else if (part == "print") { body(); translate([-12, 0, 0]) rotate([0,-90,0]) translate([lid_t,0,0]) lid(); translate([-30, 45, 0]) camera_print(); }
else {
  color("dimgray") body(); color("gray") lid(); components_preview();
  // dudukan kamera di depan casing (di kacamata: ditempel di ujung bingkai)
  translate([2, out_y + 14, out_z - 8]) color([0.3, 0.3, 0.32]) camera_mount();
}
