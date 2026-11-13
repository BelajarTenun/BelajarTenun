import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_PROVIDER = 'vertex';
process.env.GOOGLE_CLOUD_PROJECT = 'proj-tenun';
process.env.GOOGLE_CLOUD_LOCATION = 'asia-southeast1';
const { config } = await import('../lib/config.js');
const ai = await import('../lib/ai.js');

test('Vertex AI: alamat endpoint regional, model Live Vertex, token Live browser ditolak', async () => {
  assert.equal(config.liveModel, 'gemini-live-2.5-flash-native-audio');
  assert.ok(ai.aiEnabled());
  // Token dipalsukan supaya tes tidak butuh kredensial Google.
  const fetchOrig = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
  try {
    const { url, headers } = await ai.endpoint('models/gemini-2.5-flash:generateContent');
    assert.equal(url, 'https://asia-southeast1-aiplatform.googleapis.com/v1/projects/proj-tenun/locations/asia-southeast1/publishers/google/models/gemini-2.5-flash:generateContent');
    assert.equal(headers.authorization, 'Bearer tok');
  } finally { globalThis.fetch = fetchOrig; }
  await assert.rejects(ai.createLiveToken(), /LiveKit/);
});
