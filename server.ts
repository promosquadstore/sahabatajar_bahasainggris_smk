import express from 'express';
import path from 'path';
import multer from 'multer';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { pool, initDatabase } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // max 25MB
  });

  app.use(express.json({ limit: '10mb' }));

  // Initialize InsForge PostgreSQL
  await initDatabase();

  // Document Parser API for PDF and DOCX
  app.post('/api/parse-document', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
      }

      const originalName = req.file.originalname.toLowerCase();
      let extractedText = '';

      if (originalName.endsWith('.docx') || originalName.endsWith('.doc')) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value || '';
      } else if (originalName.endsWith('.pdf')) {
        const parser = new PDFParse({ data: req.file.buffer });
        const data = await parser.getText();
        extractedText = data.text || '';
        await parser.destroy();
      } else if (originalName.endsWith('.txt')) {
        extractedText = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Format file tidak didukung. Harap unggah file .pdf atau .docx' });
      }

      // Clean up extra redundant whitespaces while preserving paragraphs
      const cleanedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanedText) {
        return res.status(400).json({ error: 'File berhasil dibaca tetapi tidak ditemukan teks yang dapat diekstrak.' });
      }

      return res.json({
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        text: cleanedText,
        characterCount: cleanedText.length
      });
    } catch (err: any) {
      console.error('Error parsing document:', err);
      return res.status(500).json({ error: `Gagal membaca file: ${err.message || 'Terjadi kesalahan sistem'}` });
    }
  });

  const CANDIDATE_FLASH_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];

  async function generateWithFallback(ai: GoogleGenAI, requestParams: {
    contents: any;
    config?: any;
  }) {
    let lastError: any = null;
    for (const model of CANDIDATE_FLASH_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: requestParams.contents,
          config: requestParams.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();
        console.warn(`[Gemini Fallback] Model ${model} failed (${err.message}). Trying next candidate model immediately...`);
        // If it's a spike or rate limit, add a tiny jitter before trying the next model
        if (msg.includes('503') || msg.includes('429') || msg.includes('unavailable') || msg.includes('demand')) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
    throw lastError || new Error('Layanan AI sedang mengalami lonjakan antrean tinggi. Silakan coba kembali sesaat lagi.');
  }

  // AI Smart Splitter for Master/Combined Curriculum Document
  app.post('/api/auto-split-document', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text document is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `Kamu adalah Asisten Kurikulum Merdeka SMK ahli.
Tugasmu adalah menganalisis teks dokumen kurikulum yang diberikan dan mengekstrak serta memisahkannya ke dalam 3 bagian:
1. "prota": Program Tahunan (alokasi waktu 1 tahun, distribusi materi/elemen, target tahunan)
2. "prosem": Program Semester (alokasi minggu efektif, target semester 1/2)
3. "cpAtp": Capaian Pembelajaran dan Alur Tujuan Pembelajaran (elemen menyimak, membaca, berbicara, menulis, capaian fase E/F, serta alur tujuan pembelajaran).

Jika dokumen hanya berisi salah satu bagian, tempatkan di bagian yang relevan dan biarkan bagian lainnya kosong ("").
Jaga substansi dan keaslian teks dokumen.
Output HARUS berformat JSON murni:
{
  "prota": "Teks prota hasil ekstraksi...",
  "prosem": "Teks prosem hasil ekstraksi...",
  "cpAtp": "Teks CP/ATP hasil ekstraksi..."
}`;

      const response = await generateWithFallback(ai, {
        contents: text.slice(0, 30000), // safe length
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prota: { type: Type.STRING },
              prosem: { type: Type.STRING },
              cpAtp: { type: Type.STRING }
            },
            required: ['prota', 'prosem', 'cpAtp']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        prota: parsed.prota || '',
        prosem: parsed.prosem || '',
        cpAtp: parsed.cpAtp || ''
      });
    } catch (err: any) {
      console.error('Error auto-splitting document:', err);
      return res.status(500).json({ error: err.message || 'Gagal memproses pembagian dokumen otomatis' });
    }
  });

  // InsForge Database Status Endpoint
  app.get('/api/db-status', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
      res.json({ 
        status: 'connected', 
        provider: 'InsForge PostgreSQL',
        database: result.rows[0].db_name,
        time: result.rows[0].current_time 
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // User Context API (InsForge PostgreSQL)
  app.get('/api/user-context', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const result = await pool.query('SELECT prota, prosem, cp_atp as "cpAtp", academic_calendar as "academicCalendar" FROM user_contexts WHERE user_id = $1', [userId]);
      if (result.rows.length === 0) {
        return res.json({ prota: '', prosem: '', cpAtp: '' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('Error fetching user context:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user-context', async (req, res) => {
    try {
      const { userId, prota, prosem, cpAtp, academicCalendar } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const now = Date.now();
      await pool.query(`
        INSERT INTO user_contexts (user_id, prota, prosem, cp_atp, academic_calendar, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          prota = EXCLUDED.prota,
          prosem = EXCLUDED.prosem,
          cp_atp = EXCLUDED.cp_atp,
          academic_calendar = EXCLUDED.academic_calendar,
          updated_at = EXCLUDED.updated_at
      `, [userId, prota || '', prosem || '', cpAtp || '', academicCalendar ? JSON.stringify(academicCalendar) : null, now]);
      res.json({ success: true, prota, prosem, cpAtp, academicCalendar });
    } catch (err: any) {
      console.error('Error saving user context:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Modules & History API (InsForge PostgreSQL)
  app.get('/api/modules', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const result = await pool.query(`
        SELECT 
          id, 
          user_id as "userId", 
          status, 
          kelas, 
          semester, 
          jurusan, 
          topic, 
          gaya_bahasa as "gayaBahasa",
          template_layout as "templateLayout",
          modul_ajar as "modulAjar", 
          lkpd, 
          media, 
          asesmen_instrumen as "asesmenInstrumen", 
          referensi_industri as "referensiIndustri",
          catatan_revisi as "catatanRevisi",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM modules 
        WHERE user_id = $1 
        ORDER BY updated_at DESC
      `, [userId]);
      res.json(result.rows);
    } catch (err: any) {
      console.error('Error fetching modules:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT 
          id, 
          user_id as "userId", 
          status, 
          kelas, 
          semester, 
          jurusan, 
          topic, 
          gaya_bahasa as "gayaBahasa",
          template_layout as "templateLayout",
          modul_ajar as "modulAjar", 
          lkpd, 
          media, 
          asesmen_instrumen as "asesmenInstrumen", 
          referensi_industri as "referensiIndustri",
          catatan_revisi as "catatanRevisi",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM modules 
        WHERE id = $1
      `, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('Error fetching module by id:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/modules', async (req, res) => {
    try {
      const { id, userId, status, kelas, semester, jurusan, topic, gayaBahasa, templateLayout, modulAjar, lkpd, media, asesmenInstrumen, referensiIndustri, catatanRevisi, createdAt, updatedAt } = req.body;
      if (!id || !userId) return res.status(400).json({ error: 'id and userId are required' });
      const now = Date.now();
      await pool.query(`
        INSERT INTO modules (
          id, user_id, status, kelas, semester, jurusan, topic, 
          gaya_bahasa, template_layout,
          modul_ajar, lkpd, media, asesmen_instrumen, referensi_industri, catatan_revisi, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          kelas = EXCLUDED.kelas,
          semester = EXCLUDED.semester,
          jurusan = EXCLUDED.jurusan,
          topic = EXCLUDED.topic,
          gaya_bahasa = EXCLUDED.gaya_bahasa,
          template_layout = EXCLUDED.template_layout,
          modul_ajar = EXCLUDED.modul_ajar,
          lkpd = EXCLUDED.lkpd,
          media = EXCLUDED.media,
          asesmen_instrumen = EXCLUDED.asesmen_instrumen,
          referensi_industri = EXCLUDED.referensi_industri,
          catatan_revisi = EXCLUDED.catatan_revisi,
          updated_at = EXCLUDED.updated_at
      `, [
        id,
        userId,
        status || 'draft',
        kelas || '',
        semester || '',
        jurusan || '',
        topic || '',
        gayaBahasa || 'formal',
        templateLayout || 'lengkap',
        modulAjar ? JSON.stringify(modulAjar) : null,
        lkpd ? JSON.stringify(lkpd) : null,
        media ? JSON.stringify(media) : null,
        asesmenInstrumen ? JSON.stringify(asesmenInstrumen) : null,
        referensiIndustri ? JSON.stringify(referensiIndustri) : null,
        catatanRevisi ? JSON.stringify(catatanRevisi) : null,
        Number(createdAt) || now,
        Number(updatedAt) || now
      ]);
      res.json({ success: true, id });
    } catch (err: any) {
      console.error('Error saving module:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const now = Date.now();
      
      const existing = await pool.query('SELECT * FROM modules WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }
      const current = existing.rows[0];

      const updatedStatus = updates.status !== undefined ? updates.status : current.status;
      const updatedKelas = updates.kelas !== undefined ? updates.kelas : current.kelas;
      const updatedSemester = updates.semester !== undefined ? updates.semester : current.semester;
      const updatedJurusan = updates.jurusan !== undefined ? updates.jurusan : current.jurusan;
      const updatedTopic = updates.topic !== undefined ? updates.topic : current.topic;
      const updatedGayaBahasa = updates.gayaBahasa !== undefined ? updates.gayaBahasa : current.gaya_bahasa;
      const updatedTemplateLayout = updates.templateLayout !== undefined ? updates.templateLayout : current.template_layout;
      const updatedModulAjar = updates.modulAjar !== undefined ? updates.modulAjar : current.modul_ajar;
      const updatedLkpd = updates.lkpd !== undefined ? updates.lkpd : current.lkpd;
      const updatedMedia = updates.media !== undefined ? updates.media : current.media;
      const updatedAsesmenInstrumen = updates.asesmenInstrumen !== undefined ? updates.asesmenInstrumen : current.asesmen_instrumen;
      const updatedReferensiIndustri = updates.referensiIndustri !== undefined ? updates.referensiIndustri : current.referensi_industri;
      const updatedCatatanRevisi = updates.catatanRevisi !== undefined ? updates.catatanRevisi : current.catatan_revisi;

      await pool.query(`
        UPDATE modules SET
          status = $1,
          kelas = $2,
          semester = $3,
          jurusan = $4,
          topic = $5,
          gaya_bahasa = $6,
          template_layout = $7,
          modul_ajar = $8,
          lkpd = $9,
          media = $10,
          asesmen_instrumen = $11,
          referensi_industri = $12,
          catatan_revisi = $13,
          updated_at = $14
        WHERE id = $15
      `, [
        updatedStatus,
        updatedKelas,
        updatedSemester,
        updatedJurusan,
        updatedTopic,
        updatedGayaBahasa,
        updatedTemplateLayout,
        updatedModulAjar ? JSON.stringify(updatedModulAjar) : null,
        updatedLkpd ? JSON.stringify(updatedLkpd) : null,
        updatedMedia ? JSON.stringify(updatedMedia) : null,
        updatedAsesmenInstrumen ? JSON.stringify(updatedAsesmenInstrumen) : null,
        updatedReferensiIndustri ? JSON.stringify(updatedReferensiIndustri) : null,
        updatedCatatanRevisi ? JSON.stringify(updatedCatatanRevisi) : null,
        now,
        id
      ]);

      res.json({ success: true, id });
    } catch (err: any) {
      console.error('Error updating module:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/modules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM modules WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting module:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route for Generation
  app.post('/api/generate', async (req, res) => {
    try {
      const { prota, prosem, cpAtp, kelas, semester, jurusan, topic, gayaBahasa, templateLayout, personalStyle } = req.body;

      if (!prota || !prosem || !cpAtp || !kelas || !semester || !jurusan || !topic) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const selectedTone = personalStyle ? 'santai' : (gayaBahasa || 'formal');
      const selectedLayout = templateLayout || 'lengkap';

      let toneText = '';
      if (selectedTone === 'santai') {
        toneText = `GAYA BAHASA: Interaktif, Hangat & Santai (Komunikatif Ramah Siswa).
- Gunakan bahasa yang dialogis, empatik, merangkul, dan menyenangkan untuk siswa SMK.
- Berikan instruksi yang menyemangati, membumi, dan tidak kaku seolah sedang berdialog langsung di kelas.`;
      } else if (selectedTone === 'vokasi') {
        toneText = `GAYA BAHASA: Semi-Formal Kontekstual Industri & Budaya Kerja Vokasi.
- Gunakan gaya bahasa supervisor / mentor tempat kerja industri modern.
- Sertakan terminologi teknis kejuruan (${jurusan}), standar SOP industri, dan komunikasi profesional.`;
      } else {
        toneText = `GAYA BAHASA: Formal Akademik & Standar Kedinasan / Supervisi.
- Gunakan bahasa baku yang rapi, terstruktur, presisi, dan sesuai format baku Kurikulum Merdeka.
- Cocok untuk arsip resmi, supervisi pengawas, dan akreditasi sekolah.`;
      }

      let layoutText = '';
      if (selectedLayout === 'ringkas') {
        layoutText = `FORMAT LAYOUT: Ringkas & Efisien (Praktis Eksekutif 1-2 Lembar).
- Tuliskan intisari kegiatan secara padat, tajam, dan langsung dapat dieksekusi tanpa narasi bertele-tele.`;
      } else if (selectedLayout === 'pjbl') {
        layoutText = `FORMAT LAYOUT: Berbasis Proyek (Project-Based Learning / PjBL).
- Alur kegiatan per pertemuan menerapkan sintaks PjBL: Penentuan Pertanyaan Mendasar, Desain Perencanaan Proyek, Penyusunan Jadwal, Monitoring & Troubleshooting, Pengujian/Presentasi Produk, dan Evaluasi Proyek.`;
      } else {
        layoutText = `FORMAT LAYOUT: Standar Lengkap Kurikulum Merdeka (Komprehensif).
- Rincian menyeluruh dengan pemahaman bermakna mendalam, pertanyaan pemantik eksploratif, dan kegiatan diferensiasi per pertemuan.`;
      }

      let systemInstruction = `Kamu adalah AI Pedagogis yang membantu guru SMK mata pelajaran Bahasa Inggris (Kurikulum Merdeka).
Tugasmu adalah menyusun 'Modul Ajar' berdasarkan data yang diberikan. 

${toneText}

${layoutText}

ATURAN UMUM:
1. Narasi (tujuan pembelajaran, pemahaman bermakna, pertanyaan pemantik, refleksi) HARUS terasa otentik ditulis oleh guru profesional.
2. DILARANG KERAS menggunakan pola klise AI seperti pembuka seragam yang kaku ("Pertama... Kedua...", "Hal ini penting karena..."). Langsung to-the-point dan kontekstual.
3. Variasikan panjang kalimat agar ritmenya alami.
4. Tulis Refleksi Siswa/Guru secara sangat spesifik terhadap topik (${topic}) dan jurusan (${jurusan}).
5. Sesuaikan dengan kondisi nyata vokasi SMK (${jurusan}).
6. Susun Ringkasan Keselarasan yang secara akurat mengestimasikan alokasi waktu.

Hasil harus berupa objek JSON yang valid.`;

      const prompt = `Buatkan Modul Ajar untuk:
- Kelas/Semester: ${kelas} / ${semester}
- Jurusan: ${jurusan}
- Topik/Tujuan Pembelajaran (TP): ${topic}
- Template Layout: ${selectedLayout}
- Gaya Bahasa: ${selectedTone}

Referensi:
- Capaian Pembelajaran / ATP: ${cpAtp}
- Program Tahunan: ${prota}
- Program Semester: ${prosem}

Berikan output JSON dengan format (gunakan angka murni untuk alokasi jam):
{
  "identitas": "String identitas modul (mencantumkan kelas, semester, jurusan, topik, template layout, dan alokasi waktu)",
  "tujuanPembelajaran": "String naratif yang humanis sesuai gaya bahasa ${selectedTone}",
  "pemahamanBermakna": "String naratif yang humanis sesuai gaya bahasa ${selectedTone}",
  "pertanyaanPemantik": ["Pertanyaan 1", "Pertanyaan 2"],
  "kegiatanPembelajaran": [
    { 
      "pertemuan": 1,
      "pembuka": "Kegiatan pembuka...",
      "inti": "Kegiatan inti (konteks ${jurusan}, sesuai alur layout ${selectedLayout})...",
      "penutup": "Kegiatan penutup..."
    }
  ],
  "asesmen": "Deskripsi asesmen",
  "refleksi": "Refleksi guru & siswa",
  "keselarasan": {
    "pertemuanKe": "1-2 (Contoh)",
    "alokasiJamProsem": 12,
    "alokasiJamModul": 12,
    "faseCapaian": "Fase F (Contoh)",
    "penjelasan": "String narasi penjelasan keselarasan modul dengan prosem dan CP"
  }
}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identitas: { type: Type.STRING },
              tujuanPembelajaran: { type: Type.STRING },
              pemahamanBermakna: { type: Type.STRING },
              pertanyaanPemantik: { type: Type.ARRAY, items: { type: Type.STRING } },
              kegiatanPembelajaran: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    pertemuan: { type: Type.INTEGER },
                    pembuka: { type: Type.STRING },
                    inti: { type: Type.STRING },
                    penutup: { type: Type.STRING }
                  },
                  required: ["pertemuan", "pembuka", "inti", "penutup"]
                } 
              },
              asesmen: { type: Type.STRING },
              refleksi: { type: Type.STRING },
              keselarasan: {
                type: Type.OBJECT,
                properties: {
                  pertemuanKe: { type: Type.STRING },
                  alokasiJamProsem: { type: Type.NUMBER },
                  alokasiJamModul: { type: Type.NUMBER },
                  faseCapaian: { type: Type.STRING },
                  penjelasan: { type: Type.STRING }
                },
                required: ["pertemuanKe", "alokasiJamProsem", "alokasiJamModul", "faseCapaian", "penjelasan"]
              }
            },
            required: ["identitas", "tujuanPembelajaran", "pemahamanBermakna", "pertanyaanPemantik", "kegiatanPembelajaran", "asesmen", "refleksi", "keselarasan"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error('Generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  });

  // API Route for LKPD Generation
  app.post('/api/generate/lkpd', async (req, res) => {
    try {
      const { jurusan, topic, modulAjar, gayaBahasa, templateLayout, personalStyle } = req.body;

      if (!jurusan || !topic || !modulAjar) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const selectedTone = personalStyle ? 'santai' : (gayaBahasa || 'formal');
      const selectedLayout = templateLayout || 'lengkap';

      let toneText = '';
      if (selectedTone === 'santai') {
        toneText = `GAYA BAHASA: Interaktif & Santai. Gunakan sapaan akrab, intonasi menyemangati, dan instruksi ramah siswa yang tidak kaku.`;
      } else if (selectedTone === 'vokasi') {
        toneText = `GAYA BAHASA: Semi-Formal Dunia Kerja Vokasi. Gunakan gaya instruksi supervisor / SOP kerja industri nyata di bengkel/lab.`;
      } else {
        toneText = `GAYA BAHASA: Formal Akademik & Standar Kedinasan. Gunakan kalimat instruksi baku yang rapi, terstruktur, dan presisi.`;
      }

      let systemInstruction = `Kamu adalah AI Pedagogis ahli penyusunan LKPD (Lembar Kerja Peserta Didik) SMK.
Susunlah LKPD interaktif yang berakar langsung pada kegiatan pembelajaran Modul Ajar yang diberikan. 

${toneText}
Format Layout: ${selectedLayout}

ATURAN:
1. LKPD harus sangat kontekstual dengan jurusan SMK (${jurusan}) dan spesifik pada topik (${topic}).
2. Bahasa instruksi harus jelas, empatik, dan memotivasi siswa. DILARANG menggunakan gaya bahasa AI klise (kalimat bertele-tele, pembuka repetitif, atau pengulangan kata "penting").
3. Variasikan panjang kalimat agar lebih mengalir dan manusiawi.
4. Buat variasi tipe aktivitas: isian singkat, checklist langkah kerja, atau pilihan ganda. Jangan hanya pertanyaan esai terbuka.
5. Output harus JSON valid.`;

      const prompt = `Topik: ${topic}
Jurusan: ${jurusan}
Gaya Bahasa: ${selectedTone}
Konteks Modul Ajar Terkait:
${JSON.stringify(modulAjar.kegiatanPembelajaran)}

Buatkan LKPD dengan format JSON:
{
  "judul": "Judul LKPD yang menarik",
  "tujuan": "Tujuan spesifik LKPD ini",
  "instruksi": "Instruksi pengerjaan dari guru",
  "aktivitas": [
    {
      "tipe": "isian" (atau "checklist", atau "pilihan_ganda"),
      "pertanyaan": "Teks pertanyaan atau tugas",
      "opsi": ["Opsi A", "Opsi B"] // Hanya wajib jika tipe pilihan_ganda
    }
  ]
}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judul: { type: Type.STRING },
              tujuan: { type: Type.STRING },
              instruksi: { type: Type.STRING },
              aktivitas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tipe: { type: Type.STRING, enum: ["isian", "checklist", "pilihan_ganda"] },
                    pertanyaan: { type: Type.STRING },
                    opsi: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["tipe", "pertanyaan"]
                }
              }
            },
            required: ["judul", "tujuan", "instruksi", "aktivitas"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('LKPD Generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Media Generation
  app.post('/api/generate/media', async (req, res) => {
    try {
      const { jurusan, topic, modulAjar, gayaBahasa, templateLayout, personalStyle } = req.body;

      if (!jurusan || !topic || !modulAjar) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const selectedTone = personalStyle ? 'santai' : (gayaBahasa || 'formal');
      const selectedLayout = templateLayout || 'lengkap';

      let toneText = '';
      if (selectedTone === 'santai') {
        toneText = `GAYA BAHASA: Interaktif & Storytelling Menarik. Buat narasi skenario yang hidup, akrab, dan menyenangkan untuk siswa.`;
      } else if (selectedTone === 'vokasi') {
        toneText = `GAYA BAHASA: Kontekstual Industri Vokasi. Buat skenario simulasi kerja nyata di industri dengan istilah teknis (${jurusan}).`;
      } else {
        toneText = `GAYA BAHASA: Formal Akademik & Terstruktur Rapi.`;
      }

      let systemInstruction = `Kamu adalah Instructional Designer / Ahli Media Pembelajaran Interaktif SMK.
Rancang Konsep Media Pembelajaran yang terintegrasi dengan Modul Ajar dan spesifik jurusan (${jurusan}).

${toneText}
Format Layout: ${selectedLayout}

ATURAN:
1. Media harus berpusat pada siswa (student-centered), spesifik terhadap topik (${topic}).
2. Media bukan sekadar slide PowerPoint. Rancang "Langkah Interaktif" seolah ini adalah aplikasi, game simulasi, atau alat peraga vokasi.
3. Gunakan bahasa deskriptif yang manusiawi. DILARANG KERAS menggunakan frasa AI klise, pembuka yang kaku, atau kalimat seragam/berpola. 
4. Variasikan panjang kalimat.
5. Output JSON valid.`;

      const prompt = `Topik: ${topic}
Jurusan: ${jurusan}
Gaya Bahasa: ${selectedTone}
Kegiatan Inti Modul Ajar Terkait:
${JSON.stringify(modulAjar.kegiatanPembelajaran)}

Buatkan rancangan Media Pembelajaran dalam format JSON:
{
  "judulKonsep": "Judul media (misal: 'Simulasi Front Desk Interaktif')",
  "formatMedia": "Format media (misal: Role-Play, Simulasi Digital, Interactive Video)",
  "skenarioUtama": "Deskripsi singkat skenario yang dialami siswa",
  "langkahInteraktif": [
    {
      "tahap": "Nama Tahapan",
      "deskripsiLayar": "Apa yang dilihat/didengar siswa (atau instruksi peran)",
      "tindakanSiswa": "Apa yang harus diklik, dijawab, atau dilakukan siswa"
    }
  ]
}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judulKonsep: { type: Type.STRING },
              formatMedia: { type: Type.STRING },
              skenarioUtama: { type: Type.STRING },
              langkahInteraktif: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tahap: { type: Type.STRING },
                    deskripsiLayar: { type: Type.STRING },
                    tindakanSiswa: { type: Type.STRING }
                  },
                  required: ["tahap", "deskripsiLayar", "tindakanSiswa"]
                }
              }
            },
            required: ["judulKonsep", "formatMedia", "skenarioUtama", "langkahInteraktif"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Media Generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Asesmen Generation
  app.post('/api/generate/asesmen', async (req, res) => {
    try {
      const { jurusan, topic, modulAjar, fokusAsesmen, gayaBahasa, templateLayout, personalStyle } = req.body;

      if (!jurusan || !topic || !modulAjar || !fokusAsesmen) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const selectedTone = personalStyle ? 'santai' : (gayaBahasa || 'formal');
      const selectedLayout = templateLayout || 'lengkap';

      let toneText = '';
      if (selectedTone === 'santai') {
        toneText = `GAYA BAHASA: Umpan Balik Positif & Membangun (Growth Mindset). Gunakan kata-kata yang memotivasi dan ramah siswa.`;
      } else if (selectedTone === 'vokasi') {
        toneText = `GAYA BAHASA: Standar Uji Kompetensi Industri Vokasi. Rubrik dan tugas mengacu pada standar performa dunia kerja (${jurusan}).`;
      } else {
        toneText = `GAYA BAHASA: Formal Akademik & Standar Evaluasi Kedinasan.`;
      }

      let systemInstruction = `Kamu adalah Ahli Evaluasi Pendidikan dan Asesmen untuk SMK (Kurikulum Merdeka).
Susun instrumen asesmen yang berpusat pada siswa dan sangat spesifik dengan konteks jurusan (${jurusan}) serta topik (${topic}).

${toneText}
Format Layout: ${selectedLayout}

ATURAN:
1. Asesmen harus mencakup 3 jenis: Diagnostik (Awal), Formatif (Proses), dan Sumatif (Akhir).
2. Setiap instrumen harus menyertakan Butir Soal/Tugas yang konkret.
3. Setiap instrumen harus memiliki Rubrik Penilaian dengan 4 level: Perlu Bimbingan, Cukup, Baik, dan Sangat Baik.
4. Sesuaikan rancangan dengan fokus asesmen: ${fokusAsesmen}.
5. Tulis dengan bahasa yang natural dan anti-AI-slop. HINDARI pendahuluan yang repetitif, frasa klise, dan kata-kata kaku. Gunakan variasi panjang kalimat.
6. Deskripsi rubrik harus spesifik menunjuk pada keterampilan/tugas yang dinilai, bukan sekadar kata sifat umum (seperti "sangat bagus", "kurang bagus").
7. Output JSON valid.`;

      const prompt = `Topik: ${topic}
Jurusan: ${jurusan}
Gaya Bahasa: ${selectedTone}
Fokus Asesmen yang Diharapkan: ${fokusAsesmen}
Tujuan Pembelajaran di Modul Terkait:
${modulAjar.tujuanPembelajaran}

Buatkan rancangan Asesmen dengan format JSON berikut:
{
  "fokus": "${fokusAsesmen}",
  "diagnostik": {
    "tujuan": "Tujuan asesmen diagnostik",
    "instruksi": "Instruksi pelaksanaan",
    "butirSoalAtauTugas": ["Soal 1", "Soal 2"],
    "rubrik": [
      {
        "kriteria": "Nama kriteria",
        "perluBimbingan": "Deskripsi level 1",
        "cukup": "Deskripsi level 2",
        "baik": "Deskripsi level 3",
        "sangatBaik": "Deskripsi level 4"
      }
    ]
  },
  "formatif": { ... (struktur sama) },
  "sumatif": { ... (struktur sama) }
}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fokus: { type: Type.STRING },
              diagnostik: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              },
              formatif: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              },
              sumatif: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              }
            },
            required: ["fokus", "diagnostik", "formatif", "sumatif"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Asesmen Generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for 1-Click Complete Package Generation (Modul + LKPD + Media + Asesmen)
  app.post('/api/generate/package', async (req, res) => {
    try {
      const { prota, prosem, cpAtp, kelas, semester, jurusan, topic, gayaBahasa, templateLayout, fokusAsesmen } = req.body;
      if (!prota || !prosem || !cpAtp || !kelas || !semester || !jurusan || !topic) {
        return res.status(400).json({ error: 'Data acuan dan identitas belum lengkap' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const selectedTone = gayaBahasa || 'formal';
      const selectedLayout = templateLayout || 'lengkap';
      const selectedFokus = fokusAsesmen || 'Tes Tulis & Praktik (Standar)';

      // 1. Generate Modul Ajar First
      const systemInstructionModul = `Kamu adalah Pengembang Kurikulum SMK ahli Bahasa Inggris terintegrasi Kurikulum Merdeka.
Tugasmu adalah menyusun Modul Ajar spesifik untuk SMK.

GAYA BAHASA: ${selectedTone}
LAYOUT: ${selectedLayout}

ATURAN:
1. Kontekstual dengan jurusan ${jurusan} dan topik ${topic}.
2. Selaras dengan alokasi waktu Prosem dan Capaian Pembelajaran.
3. Hindari bahasa AI klise. Berikan langkah terstruktur per pertemuan.
4. Output JSON valid.`;

      const promptModul = `Topik: ${topic}
Jurusan: ${jurusan}
Kelas: ${kelas}, Semester: ${semester}
Prota Acuan: ${prota.slice(0, 1000)}
Prosem Acuan: ${prosem.slice(0, 1000)}
CP/ATP Acuan: ${cpAtp.slice(0, 1500)}

Susun Modul Ajar sesuai format JSON:
{
  "identitas": "String identitas lengkap...",
  "tujuanPembelajaran": "String tujuan pembelajaran...",
  "pemahamanBermakna": "String pemahaman bermakna...",
  "pertanyaanPemantik": ["Pertanyaan 1", "Pertanyaan 2"],
  "kegiatanPembelajaran": [
    { "pertemuan": 1, "pembuka": "...", "inti": "...", "penutup": "..." },
    { "pertemuan": 2, "pembuka": "...", "inti": "...", "penutup": "..." }
  ],
  "asesmen": "Deskripsi asesmen...",
  "refleksi": "Refleksi guru & siswa...",
  "keselarasan": {
    "pertemuanKe": "1-2",
    "alokasiJamProsem": 6,
    "alokasiJamModul": 6,
    "faseCapaian": "Fase E/F",
    "penjelasan": "Penjelasan keselarasan..."
  }
}`;

      const resModul = await generateWithFallback(ai, {
        contents: promptModul,
        config: {
          systemInstruction: systemInstructionModul,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identitas: { type: Type.STRING },
              tujuanPembelajaran: { type: Type.STRING },
              pemahamanBermakna: { type: Type.STRING },
              pertanyaanPemantik: { type: Type.ARRAY, items: { type: Type.STRING } },
              kegiatanPembelajaran: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pertemuan: { type: Type.INTEGER },
                    pembuka: { type: Type.STRING },
                    inti: { type: Type.STRING },
                    penutup: { type: Type.STRING }
                  },
                  required: ["pertemuan", "pembuka", "inti", "penutup"]
                }
              },
              asesmen: { type: Type.STRING },
              refleksi: { type: Type.STRING },
              keselarasan: {
                type: Type.OBJECT,
                properties: {
                  pertemuanKe: { type: Type.STRING },
                  alokasiJamProsem: { type: Type.NUMBER },
                  alokasiJamModul: { type: Type.NUMBER },
                  faseCapaian: { type: Type.STRING },
                  penjelasan: { type: Type.STRING }
                },
                required: ["pertemuanKe", "alokasiJamProsem", "alokasiJamModul", "faseCapaian", "penjelasan"]
              }
            },
            required: ["identitas", "tujuanPembelajaran", "pemahamanBermakna", "pertanyaanPemantik", "kegiatanPembelajaran", "asesmen", "refleksi", "keselarasan"]
          }
        }
      });

      const modulAjar = JSON.parse(resModul.text || '{}');

      // 2. Generate LKPD, Media, and Asesmen in Parallel
      const lkpdPromise = generateWithFallback(ai, {
        contents: `Topik: ${topic} | Jurusan: ${jurusan} | Kegiatan: ${JSON.stringify(modulAjar.kegiatanPembelajaran)}
Buatkan LKPD interaktif siswa SMK:
{
  "judul": "Judul LKPD",
  "tujuan": "Tujuan LKPD",
  "instruksi": "Instruksi kerja",
  "aktivitas": [
    { "tipe": "isian", "pertanyaan": "..." },
    { "tipe": "pilihan_ganda", "pertanyaan": "...", "opsi": ["A", "B", "C", "D"] },
    { "tipe": "checklist", "pertanyaan": "..." }
  ]
}`,
        config: {
          systemInstruction: `Ahli LKPD SMK. Buat LKPD kontekstual jurusan ${jurusan}, anti AI slop. Output JSON valid.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judul: { type: Type.STRING },
              tujuan: { type: Type.STRING },
              instruksi: { type: Type.STRING },
              aktivitas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tipe: { type: Type.STRING, enum: ["isian", "checklist", "pilihan_ganda"] },
                    pertanyaan: { type: Type.STRING },
                    opsi: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["tipe", "pertanyaan"]
                }
              }
            },
            required: ["judul", "tujuan", "instruksi", "aktivitas"]
          }
        }
      });

      const mediaPromise = generateWithFallback(ai, {
        contents: `Topik: ${topic} | Jurusan: ${jurusan} | Kegiatan: ${JSON.stringify(modulAjar.kegiatanPembelajaran)}
Buatkan Konsep Media Pembelajaran Interaktif Vokasi:
{
  "judulKonsep": "...",
  "formatMedia": "Simulasi Digital / Role-Play Vokasi / Interactive Video",
  "skenarioUtama": "...",
  "langkahInteraktif": [
    { "tahap": "Tahap 1", "deskripsiLayar": "...", "tindakanSiswa": "..." },
    { "tahap": "Tahap 2", "deskripsiLayar": "...", "tindakanSiswa": "..." },
    { "tahap": "Tahap 3", "deskripsiLayar": "...", "tindakanSiswa": "..." }
  ]
}`,
        config: {
          systemInstruction: `Ahli Media Pembelajaran Interaktif Vokasi SMK. Rancang media kontekstual jurusan ${jurusan}. Output JSON valid.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judulKonsep: { type: Type.STRING },
              formatMedia: { type: Type.STRING },
              skenarioUtama: { type: Type.STRING },
              langkahInteraktif: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tahap: { type: Type.STRING },
                    deskripsiLayar: { type: Type.STRING },
                    tindakanSiswa: { type: Type.STRING }
                  },
                  required: ["tahap", "deskripsiLayar", "tindakanSiswa"]
                }
              }
            },
            required: ["judulKonsep", "formatMedia", "skenarioUtama", "langkahInteraktif"]
          }
        }
      });

      const asesmenPromise = generateWithFallback(ai, {
        contents: `Topik: ${topic} | Jurusan: ${jurusan} | Fokus: ${selectedFokus} | Tujuan: ${modulAjar.tujuanPembelajaran}
Susun Instrumen Asesmen Diagnostik, Formatif, dan Sumatif lengkap dengan rubrik 4 level (Perlu Bimbingan, Cukup, Baik, Sangat Baik).`,
        config: {
          systemInstruction: `Ahli Asesmen & Evaluasi SMK. Rancang asesmen lengkap rubrik 4 level kontekstual jurusan ${jurusan}. Output JSON valid.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fokus: { type: Type.STRING },
              diagnostik: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              },
              formatif: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              },
              sumatif: {
                type: Type.OBJECT,
                properties: {
                  tujuan: { type: Type.STRING },
                  instruksi: { type: Type.STRING },
                  butirSoalAtauTugas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rubrik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kriteria: { type: Type.STRING },
                        perluBimbingan: { type: Type.STRING },
                        cukup: { type: Type.STRING },
                        baik: { type: Type.STRING },
                        sangatBaik: { type: Type.STRING }
                      },
                      required: ["kriteria", "perluBimbingan", "cukup", "baik", "sangatBaik"]
                    }
                  }
                },
                required: ["tujuan", "instruksi", "butirSoalAtauTugas", "rubrik"]
              }
            },
            required: ["fokus", "diagnostik", "formatif", "sumatif"]
          }
        }
      });

      const [resLkpd, resMedia, resAsesmen] = await Promise.all([lkpdPromise, mediaPromise, asesmenPromise]);
      const lkpd = JSON.parse(resLkpd.text || '{}');
      const media = JSON.parse(resMedia.text || '{}');
      const asesmenInstrumen = JSON.parse(resAsesmen.text || '{}');

      res.json({
        modulAjar,
        lkpd,
        media,
        asesmenInstrumen
      });
    } catch (error: any) {
      console.error('Package Generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Reference & Deep Pedagogical Standards Search Agent
  app.post('/api/references/search', async (req, res) => {
    try {
      const { jurusan, topic, query } = req.body;
      if (!jurusan && !topic && !query) {
        return res.status(400).json({ error: 'Jurusan, topik, atau kata kunci pencarian wajib diisi' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const targetJurusan = jurusan || 'Kejuruan Vokasi SMK';
      const targetTopic = topic || query || 'Komunikasi Bahasa Inggris Vokasi Industri';
      const searchQuery = query || `${targetTopic} pada jurusan ${targetJurusan}`;

      const systemInstruction = `Kamu adalah Agen AI Riset Pedagogis & Konsultan Standar Industri Vokasi (DUDI & SKKNI) untuk pembelajaran Bahasa Inggris SMK di Indonesia.
Tugasmu adalah melakukan riset mendalam untuk menyajikan acuan standar industri nyata, glosarium terminologi teknis, skenario kasus dialog otentik dunia kerja, dan rujukan dokumen kurikulum/industri resmi.

PRINSIP ANTI-AI SLOP & NATURALITAS:
1. DILARANG menggunakan bahasa klise atau narasi robotik (hindari kata 'Tentu saja...', 'Di era disrupsi ini...', 'Penting diketahui...').
2. Tulis setiap kalimat secara padat, lugas, presisi, dan bernyawa seperti praktisi industri senior yang membimbing guru vokasi.
3. Skenario kasus dan dialog harus mencerminkan interaksi nyata di tempat kerja modern (misalnya front office hotel berbintang, lab jaringan ISP/Cloud, bengkel resmi APM, dapur profesional hotel, kantor akuntan publik, dll.).
4. Glosarium harus menyajikan istilah bahasa Inggris teknis yang benar-benar dipakai di industri beserta konteks aplikatifnya.
5. Format output HARUS JSON valid sesuai skema.`;

      const prompt = `Lakukan penelusuran standar industri dan referensi pedagogis untuk:
- Jurusan Vokasi: ${targetJurusan}
- Topik / Keterampilan yang Ditargetkan: ${targetTopic}
- Kata Kunci / Fokus: ${searchQuery}

Format JSON yang dibutuhkan:
{
  "query": "${searchQuery}",
  "jurusan": "${targetJurusan}",
  "topik": "${targetTopic}",
  "standarKompetensi": {
    "skkniCode": "Kode/Judul Unit SKKNI relevan (contoh: N.821100.001.01 atau Kepmenaker terkait)",
    "deskripsiUnit": "Penjelasan ringkas unit kompetensi kerja dan relevansinya bagi lulusan SMK",
    "kriteriaKinerja": [
      "Kriteria unjuk kerja terukur 1",
      "Kriteria unjuk kerja terukur 2",
      "Kriteria unjuk kerja terukur 3"
    ]
  },
  "istilahIndustri": [
    {
      "term": "Terminologi Teknis Bahasa Inggris",
      "artinya": "Definisi ringkas dan lugas dalam konteks kerja",
      "contohKalimatVokasi": "Contoh penggunaan kalimat nyata oleh teknisi/staff di tempat kerja"
    }
  ],
  "skenarioDuniaKerja": {
    "judulKasus": "Judul skenario otentik dunia kerja",
    "konteksIndustri": "Latar situasi di tempat kerja industri nyata",
    "dialogOtentik": [
      { "speaker": "Supervisor / Pelanggan", "text": "Dialog berbahasa Inggris otentik..." },
      { "speaker": "Staff / Siswa Magang", "text": "Respon profesional berbahasa Inggris otentik..." }
    ],
    "tantanganKerja": "Tantangan komunikasi atau problem solving teknis yang harus diselesaikan siswa"
  },
  "sumberReferensi": [
    {
      "title": "Judul Dokumen Standar / Panduan Industri / Regulasi Kemendikbudristek",
      "url": "https://kemnaker.go.id atau link referensi kredibel terkait",
      "sourceType": "skkni" (atau "dudi" / "curriculum" / "industry_article" / "video_manual"),
      "snippet": "Ringkasan intisari standar yang dijadikan rujukan"
    }
  ],
  "rekomendasiMateriAjar": [
    "Saran aktivitas praktik kontekstual 1",
    "Saran tugas proyek Teaching Factory / Role-play 2",
    "Saran materi pendukung otentik 3"
  ]
}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING },
              jurusan: { type: Type.STRING },
              topik: { type: Type.STRING },
              standarKompetensi: {
                type: Type.OBJECT,
                properties: {
                  skkniCode: { type: Type.STRING },
                  deskripsiUnit: { type: Type.STRING },
                  kriteriaKinerja: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["deskripsiUnit", "kriteriaKinerja"]
              },
              istilahIndustri: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    artinya: { type: Type.STRING },
                    contohKalimatVokasi: { type: Type.STRING }
                  },
                  required: ["term", "artinya", "contohKalimatVokasi"]
                }
              },
              skenarioDuniaKerja: {
                type: Type.OBJECT,
                properties: {
                  judulKasus: { type: Type.STRING },
                  konteksIndustri: { type: Type.STRING },
                  dialogOtentik: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        speaker: { type: Type.STRING },
                        text: { type: Type.STRING }
                      },
                      required: ["speaker", "text"]
                    }
                  },
                  tantanganKerja: { type: Type.STRING }
                },
                required: ["judulKasus", "konteksIndustri", "dialogOtentik", "tantanganKerja"]
              },
              sumberReferensi: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    sourceType: { type: Type.STRING, enum: ["skkni", "dudi", "curriculum", "industry_article", "video_manual"] },
                    snippet: { type: Type.STRING }
                  },
                  required: ["title", "sourceType", "snippet"]
                }
              },
              rekomendasiMateriAjar: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["query", "jurusan", "topik", "standarKompetensi", "istilahIndustri", "skenarioDuniaKerja", "sumberReferensi", "rekomendasiMateriAjar"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error('Reference Search error:', error);
      res.status(500).json({ error: error.message || 'Gagal mencari referensi standar industri' });
    }
  });

  // Quick Suggest Topics for Vocationals
  app.get('/api/references/quick-suggest', (req, res) => {
    const suggestions = [
      {
        jurusan: 'Teknik Komputer dan Jaringan (TKJ)',
        icon: 'Network',
        topics: [
          'Client Technical Support & Network Troubleshooting',
          'Configuring VLAN & Mikrotik Router via CLI/Winbox',
          'Fiber Optic Splicing & OTDR Measurement Reporting',
          'Cloud Server Provisioning & Linux Terminal Commands'
        ]
      },
      {
        jurusan: 'Rekayasa Perangkat Lunak (RPL)',
        icon: 'Code',
        topics: [
          'Agile Daily Standup & Sprint Planning Dialogue',
          'Code Review & Explaining Pull Requests in GitHub',
          'API Documentation & JSON Response Troubleshooting',
          'Client UI/UX Briefing & User Story Writing'
        ]
      },
      {
        jurusan: 'Teknik Kendaraan Ringan (TKR / Otomotif)',
        icon: 'Wrench',
        topics: [
          'Electronic Fuel Injection (EFI) Diagnostic Scan Report',
          'Service Advisor Greeting & Customer Work Order (WO)',
          'Workshop Safety Briefing & K3 Chemical Hazard Handling',
          'Explaining Engine Overhaul Technical Issues to Customers'
        ]
      },
      {
        jurusan: 'Perhotelan & Akomodasi',
        icon: 'Hotel',
        topics: [
          'Front Office VIP Guest Check-in & Room Upgrades',
          'Handling Guest Complaints & Billing Inquiries with Empathy',
          'Housekeeping Service Request & Luggage Handling (Concierge)',
          'Telephone Etiquette for International Room Reservation'
        ]
      },
      {
        jurusan: 'Kuliner / Tata Boga',
        icon: 'Utensils',
        topics: [
          'Food Safety Hazard (HACCP) & Kitchen Brigade Briefing',
          'Describing International Dishes & Wine/Beverage Pairing',
          'Taking Guest Orders in Fine Dining Table Service',
          'Handling Food Allergies & Custom Diet Requests'
        ]
      },
      {
        jurusan: 'Akuntansi & Keuangan Lembaga',
        icon: 'Calculator',
        topics: [
          'Presenting Quarterly Financial Cash Flow to Management',
          'Explaining Tax Invoice Discrepancies to Clients',
          'Auditing Trial Balance & Bank Reconciliation Statements',
          'Petty Cash Voucher Handling & Expense Reports'
        ]
      },
      {
        jurusan: 'Desain Komunikasi Visual (DKV)',
        icon: 'Palette',
        topics: [
          'Creative Pitching & Brand Identity Presentation',
          'Client Revision Feedback & Design Brief Negotiation',
          'Vector Asset Preparation & Printing Specification Handover',
          'Photography Shot List & Studio Lighting Setup Briefing'
        ]
      },
      {
        jurusan: 'Farmasi Klinis & Komunitas',
        icon: 'Pill',
        topics: [
          'Prescription Drug Dispensing & Patient Counseling',
          'Explaining Dosage Schedule & Side Effects in English',
          'Pharmacy Inventory Audit & Cold Chain Medicine Storage',
          'Handling International Patient Inquiries at Pharmacy Counter'
        ]
      }
    ];

    res.json(suggestions);
  });

  // AI-Powered Automatic CP (Capaian Pembelajaran) to TP (Tujuan Pembelajaran) Mapping
  app.post('/api/curriculum/map-cp-to-tp', async (req, res) => {
    try {
      const { fase, kelas, jurusan, targetMateri, customNotes } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const targetFase = fase || (kelas === '10' ? 'Fase E (Kelas X SMK)' : 'Fase F (Kelas XI/XII SMK)');
      const targetKelas = kelas || '10';
      const targetJurusan = jurusan || 'Semua Bidang Keahlian SMK';

      const prompt = `Lakukan pemetaan Capaian Pembelajaran (CP) ke Tujuan Pembelajaran (TP) dan susun Alur Tujuan Pembelajaran (ATP) mata pelajaran BAHASA INGGRIS SMK berdasarkan standar kurikulum resmi terbaru (Kurikulum Merdeka / BSKAP Kemendikbudristek No. 032/H/KR/2024 dan No. 033/H/KR/2022).

PARAMETER PEMETAAN:
- Sasaran: ${targetFase} - Kelas ${targetKelas} SMK
- Program/Konsentrasi Keahlian: ${targetJurusan}
${targetMateri ? `- Fokus Topik/Materi Khusus: ${targetMateri}` : ''}
${customNotes ? `- Catatan Guru: ${customNotes}` : ''}

PEDOMAN PERUMUSAN:
1. Elemen CP Bahasa Inggris:
   - Menyimak - Berbicara (Listening - Speaking)
   - Membaca - Memirsa (Reading - Viewing)
   - Menulis - Mempresentasikan (Writing - Presenting)
2. Gunakan Kata Kerja Operasional (KKO) Taksonomi Bloom/Anderson yang terukur (misal: Mengidentifikasi, Menganalisis, Menyusun, Mendemonstrasikan, Mengevaluasi).
3. Integrasikan konteks komunikasi kerja dan terminologi otentik kejuruan (${targetJurusan}).
4. Tentukan alokasi Jam Pelajaran (JP) yang realistis per TP (umumnya 2 s.d. 6 JP).
5. Rumuskan indikator ketercapaian tujuan pembelajaran (IKTP) yang spesifik dan kriteria bukti asesmen.
6. Hindari narasi klise AI, buat rumusan baku, padat, dan langsung siap pakai untuk administrasi guru SMK.

HASIL WAJIB BERUPA FORMAT JSON VALID SESUAI SKEMA BERIKUT:
{
  "fase": "${targetFase}",
  "kelas": "${targetKelas}",
  "jurusan": "${targetJurusan}",
  "elemenFokus": ["Menyimak - Berbicara", "Membaca - Memirsa", "Menulis - Mempresentasikan"],
  "rasional": "Ringkasan rasional relevansi bahasa Inggris dengan penguatan kompetensi kerja kejuruan ${targetJurusan}",
  "daftarTp": [
    {
      "kodeTp": "TP-10.1",
      "elemen": "Menyimak - Berbicara",
      "tujuanPembelajaran": "Peserta didik mampu menganalisis dan merespons instruksi kerja lisan (workplace oral instructions) serta SOP teknis dalam bahasa Inggris dengan akurasi dan kesantunan kerja.",
      "lingkupMateri": "Workplace Oral Directives & Safety Instructions",
      "dimensiPpp": ["Bernalar Kritis", "Mandiri", "Komunikasi Global"],
      "alokasiJp": 4,
      "indikatorKetercapaian": [
        "Mengidentifikasi kata kunci teknis dalam instruksi kerja lisan",
        "Merespons klarifikasi instruksi secara lisan dengan santun dan tepat"
      ],
      "ideAsesmen": "Role-play simulasi mendengarkan instruksi supervisor di bengkel/kantor dan meresponsnya secara lisan"
    }
  ],
  "rekomendasiUrutanAtp": [
    "Tahap 1: Penguasaan kosa kata dan instruksi dasar tempat kerja (TP-10.1, TP-10.2)",
    "Tahap 2: Komunikasi interaksional dan pelayanan pelanggan/rekan kerja",
    "Tahap 3: Pembuatan dokumen teknis dan presentasi produk/proyek kejuruan"
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        }
      });

      const responseText = response.text || '{}';
      let jsonResult;
      try {
        jsonResult = JSON.parse(responseText);
      } catch (e) {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonResult = JSON.parse(cleaned);
      }

      res.json(jsonResult);
    } catch (err: any) {
      console.error('Error mapping CP to TP:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
