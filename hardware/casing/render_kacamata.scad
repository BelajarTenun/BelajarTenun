// Render ilustrasi: kacamata biasa + casing BelajarTenun terpasang di engsel kiri.
// Hanya untuk gambar dokumentasi (tidak untuk dicetak).
use <belajartenun_casing.scad>
$fn = 64;

module lens_ring(w = 52, h = 40, t = 4) {
  linear_extrude(t) difference() {
    offset(r = 5) square([w - 10, h - 10], center = true);
    offset(r = 3) square([w - 16, h - 16], center = true);
  }
}
module glasses() {
  color([0.12, 0.12, 0.13]) {
    for (s = [-1, 1]) translate([s * 31, 0, 0]) rotate([90, 0, 0]) lens_ring();
    translate([-6, -4, 6]) rotate([0, 90, 0]) cylinder(d = 5, h = 12);         // jembatan
    for (s = [-1, 1]) translate([s * 56, -4, 8]) cube([4, 4, 12], center = true); // engsel
  }
  // gagang putih 5 × 11 mm (sama dengan parameter penjepit), pusat x = ±59.5
  color([0.93, 0.92, 0.88]) for (s = [-1, 1]) translate([s * 59.5 - 2.5, -4, 3]) cube([5, 120, 11]);
  color([0.25, 0.18, 0.15, 0.55]) for (s = [-1, 1]) translate([s * 31, -1, 0]) rotate([90, 0, 0]) linear_extrude(1) offset(r = 4) square([36, 26], center = true);
}

glasses();
// Casing (XIAO + baterai) dijepit di gagang kiri, tepat di belakang engsel.
// Jangkar penjepit pada model casing: [-1.6, out_y*0.55, out_z-4] = [-1.6, 12.1, 32.5].
translate([-64, 13.9, 16]) rotate([0, 0, 180]) translate([1.6, -12.1, -32.5]) {
  color([0.16, 0.16, 0.17]) body();
  color([0.22, 0.22, 0.24]) lid();
}
// Dudukan kamera ditempel di sisi luar ujung bingkai, lensa ke depan & menunduk 25°.
translate([-59.6, -4, 8]) rotate([0, 0, 180]) color([0.2, 0.2, 0.21]) camera_mount();
// Kabel pita (FPC) kamera ke celah depan casing
color([0.85, 0.55, 0.15]) hull() {
  translate([-67.5, -3.5, 1]) cube([9, 0.3, 0.4]);
  translate([-81, 5.4, 13.4]) cube([9, 0.3, 0.4]);
}
