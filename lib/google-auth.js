// Token akses Google Cloud untuk Vertex AI tanpa dependency.
// Urutan sumber kredensial:
//   1. GOOGLE_APPLICATION_CREDENTIALS → file JSON service account (VPS / Docker)
//   2. metadata server (Cloud Run, GCE, GKE) bila tidak ada file
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
let cached = null; // { token, exp }

function b64url(x) { return Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url'); }

/** JWT RS256 yang ditukar dengan access token (OAuth 2.0 JWT bearer). Diekspor untuk tes. */
export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64url({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id });
  const claim = b64url({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key).toString('base64url');
  return `${head}.${claim}.${sig}`;
}

async function fromServiceAccount(path) {
  const sa = JSON.parse(await readFile(path, 'utf8'));
  if (sa.type !== 'service_account') throw new Error('GOOGLE_APPLICATION_CREDENTIALS harus file kunci service account');
  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(sa) }),
  });
  if (!res.ok) throw new Error(`Gagal mengambil token Google: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fromMetadata() {
  const res = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })
    .catch(() => { throw new Error('Kredensial Google tidak ditemukan: set GOOGLE_APPLICATION_CREDENTIALS ke file service account'); });
  if (!res.ok) throw new Error(`Metadata server menolak: ${res.status}`);
  return res.json();
}

export async function getAccessToken() {
  if (cached && cached.exp - Date.now() > 60_000) return cached.token;
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const r = path ? await fromServiceAccount(path) : await fromMetadata();
  cached = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
  return cached.token;
}
