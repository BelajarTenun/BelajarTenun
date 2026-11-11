// Konfigurasi sesi Gemini Live untuk tutor tenun.
// Diadaptasi dari VisionClaw agent/main.py: INSTRUCTIONS, ASSISTIVE_INSTRUCTIONS, CARD_TOOL_SCHEMA, function tools.

export function liveInstructions(module, { audioOnly = false } = {}) {
  const steps = module.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
  let text = `Kamu adalah tutor menenun BelajarTenun untuk modul "${module.title}" (${module.tradition}).
Pengguna adalah pemula yang sedang berlatih di alat tenun sambil memakai kacamata/kamera. Kamu melihat video dari sudut pandang matanya (sekitar 1 gambar per detik saat ia bicara, lebih jarang saat diam) dan mendengar suaranya.

Gaya bicara: bahasa Indonesia yang hangat, sabar, singkat (1–2 kalimat), mudah diikuti sambil tangan bekerja. Jangan membaca daftar panjang.

Urutan tahap modul:
${steps}

ATURAN WAJIB:
- Kurikulum adalah sumber kebenaran. Panggil get_current_step di awal dan setiap kali tidak yakin tahap mana yang aktif.
- Kamu TIDAK boleh menyatakan tahap selesai hanya dari dugaan. Gunakan check_my_work untuk menilai hasil dari kamera. Jika pengguna berkata sudah selesai, panggil mark_step_done dengan user_confirmed=true.
- Jika melihat kesalahan yang ada di daftar kesalahan umum, panggil report_mistake lalu jelaskan perbaikannya dengan lembut.
- Untuk pertanyaan tentang teknik, alat, motif, makna, filosofi, sejarah, atau pakem: SELALU panggil search_knowledge dan jawab hanya dari hasilnya. Jika tidak ada hasil, katakan jujur bahwa informasinya belum tervalidasi dan sudah dicatat untuk penenun pendamping. Jangan pernah mengarang makna budaya.
- Jangan terlalu sering bicara. Diam saat pengguna sedang mengerjakan dengan benar. Beri petunjuk bila ia terlihat bingung atau lama tidak ada kemajuan.
- Bila pengguna minta contoh, panggil play_demo. Bila minta dicatat, panggil save_note.
- Kartu di layar (show_card) hanya pendukung: dipakai untuk ringkasan bertahap atau daftar singkat; tetap ucapkan intinya.
- Ucapkan pengakuan singkat sebelum memanggil tool yang lambat (mis. "Sebentar, aku lihat dulu ya").`;
  if (audioOnly) {
    // Analog ASSISTIVE_INSTRUCTIONS VisionClaw: kacamata tanpa layar → suara satu-satunya saluran.
    text += `

MODE SUARA SAJA. Kacamata pengguna tidak punya layar; ia tidak melihat kartu atau teks.
- Ucapkan semua hal penting; jangan bergantung pada kartu.
- Jelaskan posisi dengan arah yang jelas: "benang di sisi kirimu", "pedang yang dekat dengan badanmu". Hindari "yang ini" atau "di situ".
- Saat ragu dengan apa yang terlihat, katakan dan minta ia mendekatkan atau mengarahkan pandangan.`;
  }
  return text;
}

const obj = (properties = {}, required = []) => ({ type: 'OBJECT', properties, required });

export const LIVE_TOOLS = [
  { name: 'get_current_step', description: 'Ambil tahap aktif: judul, instruksi, kriteria berhasil, tips, kesalahan umum.', parameters: obj() },
  { name: 'check_my_work', description: 'Nilai hasil pengguna dari gambar kamera terbaru memakai kriteria tahap. Bila terkonfirmasi selesai, tahap otomatis maju.', parameters: obj() },
  { name: 'mark_step_done', description: 'Tandai tahap aktif selesai. Hanya bila pengguna mengonfirmasi dengan suara (user_confirmed=true) atau check_my_work baru saja menilai selesai.', parameters: obj({ user_confirmed: { type: 'BOOLEAN' } }, ['user_confirmed']) },
  { name: 'report_mistake', description: 'Laporkan kesalahan umum yang terlihat (nomor sesuai daftar kesalahan tahap aktif). Mengembalikan cara memperbaiki.', parameters: obj({ mistake_index: { type: 'INTEGER' } }, ['mistake_index']) },
  { name: 'search_knowledge', description: 'Cari jawaban di basis pengetahuan tenun yang divalidasi penenun.', parameters: obj({ question: { type: 'STRING' } }, ['question']) },
  { name: 'repeat_instruction', description: 'Ulangi instruksi tahap aktif.', parameters: obj() },
  { name: 'play_demo', description: 'Putar video demonstrasi penenun untuk tahap aktif di layar HP.', parameters: obj() },
  { name: 'save_note', description: 'Simpan catatan belajar pengguna (satu hal per panggilan).', parameters: obj({ text: { type: 'STRING' } }, ['text']) },
  { name: 'recall_notes', description: 'Bacakan catatan belajar yang sudah disimpan.', parameters: obj() },
  {
    name: 'show_card',
    description: 'Tampilkan kartu visual pendukung ucapan. Pakai uuid yang sama untuk mengganti kartu, bukan menumpuk.',
    parameters: obj({
      uuid: { type: 'STRING' },
      type: { type: 'STRING', enum: ['info', 'list', 'image'] },
      title: { type: 'STRING' },
      value: { type: 'STRING', description: 'Satu nilai besar yang disorot.' },
      body: { type: 'STRING', description: 'Satu kalimat pendukung.' },
      facts: { type: 'ARRAY', items: obj({ label: { type: 'STRING' }, value: { type: 'STRING' } }, ['label', 'value']) },
      items: { type: 'ARRAY', items: obj({ glyph: { type: 'STRING' }, title: { type: 'STRING' }, subtitle: { type: 'STRING' }, trailing: { type: 'STRING' } }, ['title']) },
      image_url: { type: 'STRING' },
      fallback_text: { type: 'STRING', description: 'Satu baris teks ringkasan kartu (dipakai di lensa kacamata).' },
    }, ['uuid', 'type', 'fallback_text']),
  },
];

/** Pesan "setup" pertama untuk WebSocket Gemini Live (BidiGenerateContent). */
export function liveSetup(module, { model, voice, audioOnly }) {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
      systemInstruction: { parts: [{ text: liveInstructions(module, { audioOnly }) }] },
      tools: [{ functionDeclarations: LIVE_TOOLS }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };
}

/** Gemini kadang membocorkan token kontrol (mis. "<ctrl46>") ke transkrip di sekitar tool call (catatan VisionClaw). */
export const cleanTranscript = (t) => String(t || '').replace(/<ctrl\d+>/g, '').trim();
