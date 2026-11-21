// Pembagian data per ORANG (bukan per klip/frame): orang di set uji tidak pernah muncul di set latih,
// supaya model persepsi dinilai pada penenun/murid yang belum pernah dilihatnya (rencana 6.2).
import { createHash } from 'node:crypto';

export const personOf = (rec) => String(rec.weaver || rec.userId || rec.id).trim().toLowerCase();

/** Pembagian deterministik dari hash nama orang: 70% latih, 15% validasi, 15% uji. */
export function splitOf(person, { train = 0.7, validation = 0.15 } = {}) {
  const h = createHash('sha256').update(`bt-split-v1:${person}`).digest().readUInt32BE(0) / 0xffffffff;
  return h < train ? 'train' : h < train + validation ? 'validation' : 'test';
}
