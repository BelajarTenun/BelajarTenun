import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.LIVEKIT_URL = 'ws://localhost:7880';
process.env.LIVEKIT_API_KEY = 'kunci';
process.env.LIVEKIT_API_SECRET = 'rahasia-yang-cukup-panjang-untuk-tes-123';
const { createAccessToken, toJsonSchema, livekitEnabled } = await import('../lib/livekit.js');
const { LIVE_TOOLS } = await import('../lib/live.js');

test('token LiveKit: JWT HS256 valid dengan grant ruang & metadata sesi', () => {
  assert.equal(livekitEnabled(), true);
  const t = createAccessToken({ identity: 'murid-1', name: 'Murid', room: 'bt-abc', metadata: { sessionId: 'abc' } });
  const [h, p, sig] = t.split('.');
  assert.equal(createHmac('sha256', process.env.LIVEKIT_API_SECRET).update(`${h}.${p}`).digest('base64url'), sig);
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(payload.iss, 'kunci');
  assert.equal(payload.sub, 'murid-1');
  assert.deepEqual(JSON.parse(payload.metadata), { sessionId: 'abc' });
  assert.equal(payload.video.room, 'bt-abc');
  assert.equal(payload.video.roomJoin, true);
  assert.ok(payload.exp > payload.nbf);
});

test('skema tools Gemini diubah ke JSON Schema untuk livekit-agents', () => {
  const card = LIVE_TOOLS.find((t) => t.name === 'show_card');
  const s = toJsonSchema(card.parameters);
  assert.equal(s.type, 'object');
  assert.equal(s.properties.items.type, 'array');
  assert.equal(s.properties.items.items.type, 'object');
  assert.deepEqual(s.properties.type.enum, ['info', 'list', 'image']);
});
