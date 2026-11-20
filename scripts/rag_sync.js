// Sinkronkan entri pengetahuan TERVALIDASI ke korpus Vertex AI RAG Engine (rencana 5.2).
//   node scripts/rag_sync.js            (butuh RAG_CORPUS, VERTEX_GCS_BUCKET, kredensial Vertex)
// Langkah: tulis tiap entri tervalidasi ke gs://<bucket>/rag/<tag>/<id>.txt → importRagFiles dari folder itu.
// Entri draf TIDAK pernah dikirim. Jalankan ulang setiap ada entri yang divalidasi/diubah.
import { config } from '../lib/config.js';
import { getAccessToken } from '../lib/google-auth.js';
import { loadKnowledge } from '../lib/knowledge.js';

if (!config.ragCorpus || !config.vertexBucket) { console.error('Isi RAG_CORPUS (projects/…/ragCorpora/…) dan VERTEX_GCS_BUCKET'); process.exit(2); }
const tag = config.ragCorpus.split('/').pop();
const token = await getAccessToken();
const kb = await loadKnowledge();
const valid = kb.entries.filter((e) => e.status === 'tervalidasi');
for (const e of valid) {
  const text = [`Pertanyaan: ${e.question}`, `Jawaban: ${e.answer}`, e.module ? `Modul: ${e.module}` : '', `Topik: ${e.topic ?? ''}`, `Sumber: ${e.source ?? '-'}`, `Divalidasi oleh: ${e.validated_by}`].filter(Boolean).join('\n');
  const name = `rag/${tag}/${e.id}.txt`;
  const r = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${config.vertexBucket}/o?uploadType=media&name=${encodeURIComponent(name)}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain; charset=utf-8' }, body: text,
  });
  if (!r.ok) throw new Error(`unggah ${e.id} gagal: ${r.status}`);
}
const loc = config.vertexLocation, host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
const imp = await fetch(`https://${host}/v1/${config.ragCorpus}/ragFiles:import`, {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ import_rag_files_config: { gcs_source: { uris: [`gs://${config.vertexBucket}/rag/${tag}/`] }, rag_file_chunking_config: { chunk_size: 512, chunk_overlap: 64 } } }),
});
if (!imp.ok) throw new Error(`importRagFiles gagal: ${imp.status} ${(await imp.text()).slice(0, 200)}`);
console.log(`${valid.length} entri tervalidasi dikirim (dari ${kb.entries.length}); operasi impor: ${(await imp.json()).name}`);
