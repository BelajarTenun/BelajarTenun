// Render ilustrasi bagian casing untuk dokumentasi (tidak untuk dicetak).
use <belajartenun_casing.scad>
view = "terurai";   // "terurai" | "depan" | "kamera"
$fn = 64;
// Nilai turunan casing default (lihat belajartenun_casing.scad): out_y = 22.0, out_z = 36.5
if (view == "terurai") {
  color([0.16, 0.16, 0.17]) body();
  color([0.25, 0.25, 0.27]) translate([-26, 0, 0]) lid();
  color([0.2, 0.2, 0.21]) translate([4, 40, 26]) camera_mount();                                 // dudukan kamera
  color([0.15, 0.55, 0.35]) translate([0.4, 22 - 1.6 - 11 - 0.4, 2]) cube([17.8, 11, 21]);         // XIAO + Sense
  color([0.75, 0.75, 0.78]) translate([0.4, 2, 2]) cube([20.5, 5.5, 30.5]);                        // LiPo 502030
  color([0.85, 0.55, 0.15]) hull() { translate([6, 20.4, 30.6]) cube([9, 0.3, 0.4]); translate([8, 39, 21]) cube([9, 0.3, 0.4]); } // FPC
} else if (view == "depan") {
  color([0.16, 0.16, 0.17]) body();
} else {
  color([0.2, 0.2, 0.21]) camera_mount();
}
