// Protokol kacamata: perakit JS di aplikasi vs pemotong C++ di firmware (dikompilasi dengan g++ bila ada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJpegAssembler, parseEvent, encodeWifiCreds, encodeInterval, CMD } from '../public/js/sources.js';

const hex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
const hasGpp = (() => { try { execFileSync('g++', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('firmware C++ → aplikasi JS: foto dirakit utuh, header versi & orientasi terbaca', { skip: !hasGpp && 'g++ tidak ada' }, () => {
  const bin = join(mkdtempSync(join(tmpdir(), 'btfw-')), 'dump');
  execFileSync('g++', ['-std=c++17', '-I', 'firmware/belajartenun-glasses/src', 'firmware/belajartenun-glasses/test/dump_chunks.cpp', '-o', bin]);
  for (const len of [1, 199, 200, 5000]) {
    const lines = execFileSync(bin, [String(len)], { encoding: 'utf8' }).trim().split('\n');
    let got = null, header = null;
    const feed = createJpegAssembler((j, h) => { got = j; header = h; }, { headerByte: true });
    for (const l of lines.filter((x) => !x.startsWith('S'))) feed(hex(l));
    const expected = Uint8Array.from({ length: len }, (_, i) => (i * 31 + 7) & 0xff);
    assert.deepEqual(got, expected, `panjang ${len}`);
    assert.equal(header, (1 << 4) | 3);
    const status = parseEvent(hex(lines.find((x) => x.startsWith('S')).slice(1)));
    assert.deepEqual(status, { type: 'status', cameraOn: true, battery: 64, wifi: 'connected', intervalMs: 1500, framesize: 1 });
  }
});

test('perakit tanpa header (OpenGlass lama) tetap bekerja', () => {
  let got;
  const feed = createJpegAssembler((j) => { got = j; });
  feed(Uint8Array.from([0, 0, 9, 8])); feed(Uint8Array.from([1, 0, 7])); feed(Uint8Array.from([0xff, 0xff]));
  assert.deepEqual([...got], [9, 8, 7]);
});

test('event & perintah', () => {
  assert.deepEqual(parseEvent(Uint8Array.from([1, 2])), { type: 'button', press: 'double' });
  assert.deepEqual(parseEvent(Uint8Array.from([3, 192, 168, 43, 7])), { type: 'wifi_ip', ip: '192.168.43.7' });
  assert.equal(parseEvent(Uint8Array.from([4, 5])).message, 'kamera belum diizinkan');
  assert.deepEqual([...encodeInterval(2000)], [CMD.SET_INTERVAL, 0xd0, 0x07]);
  const w = encodeWifiCreds('HP', 'abc');
  assert.deepEqual([...w], [0x10, 72, 80, 0, 97, 98, 99, 0]);
  assert.throws(() => encodeWifiCreds('', 'x'));
});
