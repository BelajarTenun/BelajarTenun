// =====================================================================
//  BelajarTenun – casing kacamata (XIAO ESP32S3 Sense + LiPo 502030)
//  Terinspirasi casing OpenGlass (kotak + tutup samping), disesuaikan
//  untuk menenun: kamera dimiringkan ke bawah, penjepit gagang kacamata,
//  lubang LED privasi, tombol, mikrofon, dan USB-C.
//
//  Sumbu:  X = ke luar kepala (lateral)   Y = ke depan (arah kamera)
//          Z = ke atas.  Tutup ada di sisi -X (menempel ke gagang).
//
//  Render satu bagian:  openscad -D 'part="body"' -o body.stl belajartenun_casing.scad
//  part = "assembly" | "body" | "lid" | "print"
//  SEMUA UKURAN DALAM MM. Ukur komponenmu dulu, lalu ubah parameter di bawah.
// =====================================================================

part = "assembly";

/* [Komponen] */
board_w   = 17.8;  // lebar XIAO (sumbu X)
board_h   = 21.0;  // tinggi XIAO (sumbu Z), sisi USB-C di bawah
stack_d   = 15.0;  // tebal tumpukan XIAO + board Sense + kamera (sumbu Y)
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

/* [Kamera] */
camera_tilt   = 25;   // derajat kamera menunduk (lihat tangan & lungsi)
lens_d        = 7.2;  // lubang lensa OV2640/OV3660
lens_pocket   = 8.8;  // kantong modul kamera (persegi) di dinding depan
lens_pocket_d = 1.0;  // kedalaman kantong
lens_z        = 26;   // tinggi pusat lensa dari dasar dalam
lens_x        = 0;    // geser lateral pusat lensa dari tengah

/* [Lubang lain] */
led_d      = 3.1;   // LED privasi 3 mm (wajib menyala saat kamera aktif)
led_offset = 8.5;   // jarak LED dari pusat lensa (ke arah luar)
button_d   = 3.6;   // tombol taktil 6x6 (batang tombol)
usb_w      = 10.5;  // lubang USB-C di dasar
usb_t      = 4.2;
usb_y      = 4.0;   // posisi tengah USB dari dinding depan (dalam) – UKUR!
mic_holes  = 3;     // lubang mikrofon PDM
mic_d      = 1.2;

/* [Pemasangan] */
mount      = "clip"; // "clip" = penjepit gagang, "tab" = sirip untuk lem (gaya OpenGlass)
temple_t   = 5.0;   // tebal gagang kacamata dekat engsel
temple_h   = 11.0;  // tinggi gagang kacamata dekat engsel
clip_len   = 16;    // panjang penjepit sepanjang gagang
clip_wall  = 2.0;
clip_lip   = 0.6;   // bibir pengunci di bawah gagang
temple_drop = 4;    // posisi penjepit dari atas casing

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

module rbox(size, r) {         // kotak dengan sudut membulat (tepi vertikal & horizontal)
  hull() for (x=[r, size[0]-r], y=[r, size[1]-r], z=[r, size[2]-r]) translate([x,y,z]) sphere(r);
}
// Kotak membulat di sisi +X, sisi -X rata (bidang pertemuan dengan tutup)
module rbox_flatx(size, r) {
  hull() {
    for (y=[r, size[1]-r], z=[r, size[2]-r]) {
      translate([size[0]-r, y, z]) sphere(r);
      translate([0, y, z]) rotate([0,90,0]) cylinder(r=r, h=0.01);
    }
  }
}
// Pelat tutup: membulat di tepi Y-Z, tebal t sepanjang X
module rplate(t, w, h, r) { hull() for (y=[r, w-r], z=[r, h-r]) translate([0, y, z]) rotate([0,90,0]) cylinder(r=r, h=t); }

// ---------- Badan ----------
module body() {
  difference() {
    rbox_flatx([out_x, out_y, out_z], radius);
    // rongga, terbuka ke sisi -X
    translate([-1, wall, wall]) cube([in_x + 1, in_y, in_z]);
    // kantong + lubang lensa di dinding depan (+Y)
    lens_c = [ -0 + in_x/2 + lens_x, out_y, wall + lens_z ];
    translate([lens_c[0], out_y - wall - 0.01, lens_c[2]]) rotate([-90,0,0]) cylinder(d=lens_d, h=wall+1);
    translate([lens_c[0]-lens_pocket/2, out_y - wall - 0.01 - 0, lens_c[2]-lens_pocket/2]) cube([lens_pocket, lens_pocket_d + 0.02, lens_pocket]);
    // LED privasi di sebelah lensa
    translate([lens_c[0] + led_offset, out_y - wall - 1, lens_c[2]]) rotate([-90,0,0]) cylinder(d=led_d, h=wall+2);
    // tombol di atas
    translate([in_x/2 + 3, wall + in_y*0.35, out_z - wall - 1]) cylinder(d=button_d, h=wall+2);
    // USB-C di dasar, dekat dinding depan (board di depan, berdiri)
    translate([in_x/2 - usb_w/2, out_y - wall - usb_y - usb_t/2, -1]) rbox_flat([usb_w, usb_t, wall+2], 1.2);
    // v2: kisi speaker di dinding belakang bawah (mengarah ke telinga sepanjang gagang)
    if (with_speaker) for (i=[-2:2], j=[-1:1]) translate([in_x/2 + i*2.6, -1, wall + spk_t/2 + 1 + j*2.6]) rotate([-90,0,0]) cylinder(d=1.6, h=wall+2, $fn=12);
    // mikrofon: deretan lubang kecil di depan bawah
    for (i=[0:mic_holes-1]) translate([in_x/2 - (mic_holes-1)*1.4 + i*2.8, out_y - wall - 1, wall + 5]) rotate([-90,0,0]) cylinder(d=mic_d, h=wall+2, $fn=16);
  }
  // v2: dudukan speaker (cincin) di dasar belakang
  if (with_speaker) translate([in_x/2, wall + spk_d/2 + 0.5, wall]) difference() { cylinder(d=spk_d + 2.4, h=1.6); translate([0,0,-1]) cylinder(d=spk_d + 0.4, h=4); }
  // sekat penahan baterai (menjaga board tidak bergeser ke belakang)
  translate([wall*0.0 + in_x - 3, wall + batt_t + 2*tol, wall]) cube([3, 1.2, in_z*0.6]);
  // alur kecil penahan bibir tutup (snap)
  for (z=[wall+6, out_z-wall-6]) translate([0.5, wall-0.01, z]) cube([0.6, 0.6, 3]);
}

module rbox_flat(size, r) { // persegi panjang membulat (untuk lubang)
  hull() for (x=[r, size[0]-r], y=[r, size[1]-r]) translate([x,y,0]) cylinder(r=r, h=size[2]);
}

// ---------- Tutup (+ penjepit / sirip) ----------
module lid() {
  // pelat tutup di sisi -X
  translate([-lid_t, 0, 0]) rplate(lid_t, out_y, out_z, radius);
  // bibir yang masuk ke rongga (friction fit)
  translate([0, wall + 0.15, wall + 0.15]) difference() {
    cube([lip_h, in_y - 0.3, in_z - 0.3]);
    translate([-0.1, 1.2, 1.2]) cube([lip_h + 0.2, in_y - 0.3 - 2.4, in_z - 0.3 - 2.4]);
  }
  if (mount == "clip") mount_clip(); else mount_tab();
}

// Penjepit gagang: profil U terbalik yang menjepit gagang dari atas, dengan dua bibir pengunci
// di bawah. Diputar camera_tilt supaya casing (dan kamera) menunduk saat gagang mendatar.
module clip_profile() {   // 2D di bidang (X, Z); celah gagang di tengah, terbuka ke bawah
  w = w_of_clip();
  difference() {
    translate([-w, -temple_h - clip_wall]) square([w, temple_h + clip_wall]);
    translate([-w + clip_wall, -temple_h - clip_wall - 0.01]) square([temple_t, temple_h + 0.01]);
  }
  // bibir pengunci (segitiga kecil di ujung bawah kedua rahang)
  for (side = [0, 1]) {
    x0 = side == 0 ? -w + clip_wall : -clip_wall;
    dir = side == 0 ? 1 : -1;
    translate([x0, -temple_h - clip_wall]) polygon([[0,0],[dir*clip_lip,0],[0,1.6]]);
  }
}
module clip_solid() {
  translate([0, clip_len/2, 0]) rotate([90, 0, 0]) linear_extrude(clip_len) clip_profile();
}
module mount_clip() {
  anchor = [-lid_t, out_y*0.55, out_z - temple_drop];
  translate(anchor) rotate([camera_tilt, 0, 0]) clip_solid();
  // penguat antara pelat tutup dan atap penjepit
  hull() {
    translate([-lid_t - 0.01, out_y*0.3, out_z*0.45]) cube([0.01, out_y*0.4, out_z*0.4]);
    translate(anchor) rotate([camera_tilt,0,0]) translate([-0.01, -clip_len/2, -clip_wall]) cube([0.01, clip_len, clip_wall]);
  }
}
function w_of_clip() = temple_t + 2*clip_wall;

// Sirip lem (gaya OpenGlass)
module mount_tab() {
  translate([-lid_t, out_y/2, out_z*0.55]) rotate([camera_tilt,0,0])
    translate([-6, -10, -2]) rbox([6, 20, 4], 1.5);
}

// ---------- Tata letak ----------
module components_preview() { // hanya untuk visual
  color("seagreen", 0.6) translate([tol, wall + in_y - stack_d - tol, wall + tol]) cube([board_w, stack_d, board_h]);
  color("silver", 0.6) translate([tol, wall + tol, wall + tol + spk_extra_z]) cube([batt_w, batt_t, batt_l]);
  if (with_speaker) {
    color("gold", 0.7) translate([in_x/2, wall + spk_d/2 + 0.5, wall + 0.5]) cylinder(d=spk_d, h=spk_t);
    color("purple", 0.6) translate([tol, wall + batt_t + 2*tol + 0.5, wall + spk_extra_z]) cube([amp_w, amp_t, amp_h]);
  }
}

if (part == "body") body();
else if (part == "lid") rotate([0, -90, 0]) translate([lid_t, 0, 0]) lid();   // tutup dicetak rebah
else if (part == "print") { body(); translate([-12, 0, 0]) rotate([0,-90,0]) translate([lid_t,0,0]) lid(); }
else {
  // rakitan dipandang dari samping-depan; casing menunduk camera_tilt relatif gagang
  rotate([-camera_tilt, 0, 0]) { color("dimgray") body(); color("gray") lid(); components_preview(); }
}
