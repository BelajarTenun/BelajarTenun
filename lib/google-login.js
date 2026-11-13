// Masuk dengan Google (OAuth 2.0 authorization code, dijalankan di server).
// Rahasia klien tidak pernah sampai ke browser; profil diambil dari endpoint userinfo Google.
import { randomBytes } from 'node:crypto';
import { config } from './config.js';

export const googleLoginEnabled = () => Boolean(config.googleClientId && config.googleClientSecret);

export function redirectUri(req) {
  if (config.publicUrl) return `${config.publicUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}/api/auth/google/callback`;
}

export function authUrl(req) {
  const state = randomBytes(16).toString('hex');
  const q = new URLSearchParams({
    client_id: config.googleClientId, redirect_uri: redirectUri(req), response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account',
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${q}`, state };
}

export async function profileFromCode(req, code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.googleClientId, client_secret: config.googleClientSecret, redirect_uri: redirectUri(req), grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw Object.assign(new Error('Google menolak proses masuk'), { code: 401 });
  const { access_token } = await res.json();
  const p = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } })).json();
  if (!p.sub || !p.email || p.email_verified === false) throw Object.assign(new Error('Email Google belum terverifikasi'), { code: 401 });
  return { sub: p.sub, email: p.email, name: p.name || p.email };
}
