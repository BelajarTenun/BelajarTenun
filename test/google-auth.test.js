import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { signJwt } from '../lib/google-auth.js';

test('JWT service account untuk Vertex AI ditandatangani RS256 dan bisa diverifikasi', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'bt@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), private_key_id: 'k1' };
  const jwt = signJwt(sa, 1000);
  const [h, c, sig] = jwt.split('.');
  const claim = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claim.iss, sa.client_email);
  assert.equal(claim.exp, 4600);
  assert.match(claim.scope, /cloud-platform/);
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url')));
});
