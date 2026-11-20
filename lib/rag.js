// Adaptor Vertex AI RAG Engine (rencana 5.2). Korpus hanya berisi entri pengetahuan TERVALIDASI
// (scripts/rag_sync.js), satu berkas per entri: gs://<bucket>/rag/<corpusTag>/<entryId>.txt.
// Pencarian dipanggil dari tool search_knowledge milik kita (bukan tool RAG bawaan Live) supaya:
//  1) status tervalidasi tetap dicek ulang secara lokal, 2) apa yang diambil tercatat, 3) ambang relevansi kita sendiri.
import { config } from './config.js';
import { getAccessToken } from './google-auth.js';

export const ragEnabled = () => Boolean(config.ragCorpus && config.vertexProject);
const host = () => (config.vertexLocation === 'global' ? 'aiplatform.googleapis.com' : `${config.vertexLocation}-aiplatform.googleapis.com`);
export const entryIdFromUri = (uri) => /\/([a-z0-9-]+)\.txt$/i.exec(uri || '')?.[1] ?? null;

/** Cari konteks di korpus → [{ id, score }] (score 0–1, makin besar makin relevan). */
export async function ragRetrieve(question, { topK = 5, fetchImpl = fetch, token = getAccessToken } = {}) {
  const url = `https://${host()}/v1/projects/${config.vertexProject}/locations/${config.vertexLocation}:retrieveContexts`;
  const res = await fetchImpl(url, {
    method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      vertex_rag_store: { rag_resources: [{ rag_corpus: config.ragCorpus }] },
      query: { text: question, rag_retrieval_config: { top_k: topK } },
    }),
  });
  if (!res.ok) throw new Error(`RAG Engine ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const ctx = (await res.json()).contexts?.contexts ?? [];
  // RAG Engine mengembalikan "score" (kemiripan) atau "distance" (jarak kosinus) tergantung konfigurasi korpus.
  return ctx.map((c) => ({ id: entryIdFromUri(c.sourceUri ?? c.source_uri), score: c.score ?? (c.distance != null ? 1 - c.distance : 0) })).filter((x) => x.id);
}
