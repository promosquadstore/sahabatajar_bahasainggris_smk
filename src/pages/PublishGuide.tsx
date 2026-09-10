import React, { useState } from 'react';
import { 
  Github, Globe, HelpCircle, ArrowRight, CheckCircle2, 
  ExternalLink, Copy, Check, Code, LayoutGrid, FileText, 
  Sparkles, ListCollapse, Play, FileCheck, Share2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PublishGuide() {
  const [activeTab, setActiveTab] = useState<'github' | 'sites'>('github');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Premium Hero Banner */}
      <div className="bg-gradient-to-r from-brand-primary via-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-accent text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
            <Sparkles size={14} /> Panduan Administrasi & Digitalisasi
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Panduan Publikasi Perangkat Pembelajaran
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-2xl">
            Sajikan administrasi guru secara profesional dan interaktif. Pelajari cara membagikan perangkat ajar ke komunitas melalui GitHub Pages dan menyematkannya ke Google Sites Portofolio Guru.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm mb-8">
        <button
          onClick={() => setActiveTab('github')}
          className={`flex items-center gap-2.5 px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'github'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Github size={18} />
          <span>Publikasi lewat GitHub Pages</span>
        </button>
        <button
          onClick={() => setActiveTab('sites')}
          className={`flex items-center gap-2.5 px-6 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'sites'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Globe size={18} />
          <span>Integrasi ke Google Sites</span>
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'github' ? (
          <motion.div
            key="github"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Intro Alert */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex gap-4 items-start">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                <Github size={20} />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 text-base">Mengapa Menggunakan GitHub Pages?</h3>
                <p className="text-xs sm:text-sm text-indigo-800/90 mt-1 leading-relaxed">
                  GitHub Pages memungkinkan Anda menghosting halaman modul pembelajaran interaktif secara online dan **gratis**. Komite sekolah, pengawas, atau sesama guru dapat melihat dokumen dan berinteraksi secara real-time langsung melalui browser.
                </p>
              </div>
            </div>

            {/* Step by Step */}
            <h2 className="text-lg font-bold text-slate-900 mt-4 flex items-center gap-2">
              <Code size={18} className="text-indigo-600" />
              Langkah demi Langkah Publikasi ke GitHub:
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Siapkan Berkas Pembelajaran HTML</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Setiap modul yang Anda hasilkan dari **SahabatAjar** dapat dicetak langsung atau disimpan sebagai paket pembelajaran visual yang interaktif. Pastikan Anda telah menyimpan dokumen Word (.docx) atau mengunggahnya ke Google Drive Anda.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Buat Repositori Baru di GitHub</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Masuk ke akun <a href="https://github.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">GitHub <ExternalLink size={12} /></a> Anda, kemudian buat repositori baru:
                  </p>
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-500 space-y-1">
                    <li>Beri nama repositori yang mudah dipahami, contohnya: <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">perangkat-ajar-bahasa-inggris</code></li>
                    <li>Pastikan visibilitas repositori disetel ke <strong>Public</strong> agar GitHub Pages dapat diaktifkan secara gratis.</li>
                    <li>Centang opsi <strong>Add a README file</strong> jika diperlukan.</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Unggah Berkas atau Lakukan Commit</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Unggah dokumen-dokumen administrasi, file presentasi, atau halaman interaktif pembelajaran ke repositori Anda:
                  </p>
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-500 space-y-1">
                    <li>Klik tombol <strong>Add file</strong> &gt; <strong>Upload files</strong> di GitHub.</li>
                    <li>Seret (drag & drop) semua dokumen pembelajaran Anda ke area unggah GitHub.</li>
                    <li>Klik tombol <strong>Commit changes</strong> di bagian bawah halaman.</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Aktifkan GitHub Pages</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Setelah berkas Anda berhasil terunggah, aktifkan fitur hosting otomatis gratis:
                  </p>
                  <ul className="list-decimal pl-5 text-xs sm:text-sm text-slate-500 space-y-1.5">
                    <li>Masuk ke menu tab <strong>Settings</strong> di bagian atas repositori Anda.</li>
                    <li>Pada sidebar sebelah kiri, cari dan pilih menu <strong>Pages</strong>.</li>
                    <li>Di bawah bagian <strong>Build and deployment</strong>, cari opsi <strong>Source</strong> lalu pilih <strong>Deploy from a branch</strong>.</li>
                    <li>Pada bagian <strong>Branch</strong>, pilih <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">main</code> atau <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">master</code> dan folder <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">/(root)</code>, lalu klik <strong>Save</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  5
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Dapatkan Tautan Pembelajaran Online</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Tunggu sekitar 1–2 menit, lalu segarkan (refresh) halaman GitHub Pages Anda. Tautan situs web pembelajaran online Anda akan muncul di bagian atas halaman dengan format:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 justify-between">
                    <code className="text-xs font-mono text-indigo-700 truncate font-semibold">
                      https://[username-github].github.io/[nama-repositori]/
                    </code>
                    <button
                      onClick={() => copyToClipboard('https://[username-github].github.io/[nama-repositori]/', 'g_link')}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Salin Pola Tautan"
                    >
                      {copiedText === 'g_link' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tautan ini sekarang siap disebarkan ke siswa, dipublikasikan ke MGMP, atau disematkan langsung ke Google Sites Portofolio Guru Anda!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sites"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Intro Alert */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex gap-4 items-start">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-base">Google Sites: Portofolio Guru Profesional</h3>
                <p className="text-xs sm:text-sm text-emerald-800/90 mt-1 leading-relaxed">
                  Menyematkan dokumen perangkat pembelajaran langsung dari folder Google Drive Anda ke Google Sites membuat situs kelas atau portofolio Anda terlihat profesional, otomatis terupdate, dan mudah diunduh oleh rekan sejawat maupun dinas pendidikan.
                </p>
              </div>
            </div>

            {/* Step by Step */}
            <h2 className="text-lg font-bold text-slate-900 mt-4 flex items-center gap-2">
              <LayoutGrid size={18} className="text-emerald-600" />
              Cara Menyematkan Perangkat Ajar ke Google Sites:
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Atur Hak Akses Folder di Google Drive</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Sebelum menyematkan dokumen atau folder, Anda harus memastikan dokumen atau folder <strong>`Sahabat Ajar`</strong> di Google Drive Anda dapat dilihat oleh publik:
                  </p>
                  <ul className="list-decimal pl-5 text-xs sm:text-sm text-slate-500 space-y-1">
                    <li>Buka <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5">Google Drive <ExternalLink size={12} /></a> Anda.</li>
                    <li>Cari folder <strong>`Sahabat Ajar`</strong> yang telah otomatis dibuat oleh aplikasi.</li>
                    <li>Klik kanan pada folder tersebut, lalu pilih <strong>Bagikan (Share)</strong> &gt; <strong>Bagikan</strong>.</li>
                    <li>Ubah Hak Akses Umum (General Access) dari <strong>Dibatasi (Restricted)</strong> menjadi <strong>Siapa saja yang memiliki tautan (Anyone with the link)</strong> dengan peran sebagai <strong>Pelihat (Viewer)</strong>.</li>
                    <li>Klik <strong>Selesai (Done)</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Buka Google Sites Sekolah atau Pribadi</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Masuk ke portal <a href="https://sites.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5">Google Sites <ExternalLink size={12} /></a> Anda. Pilih situs portofolio kelas yang sudah ada, atau klik ikon tambah <strong>(+)</strong> untuk membuat situs baru.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Penyematan Seluruh Isi Folder (Rekomendasi)</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Metode terbaik agar semua dokumen perangkat ajar Anda otomatis terorganisir di halaman web sekolah Anda:
                  </p>
                  <ul className="list-decimal pl-5 text-xs sm:text-sm text-slate-500 space-y-1">
                    <li>Pada panel sebelah kanan di Google Sites, pilih tab <strong>Sisipkan (Insert)</strong>.</li>
                    <li>Scroll ke bawah dan klik ikon <strong>Drive</strong>.</li>
                    <li>Di bilah pencarian Google Drive yang muncul di sisi kanan, cari folder <strong>`Sahabat Ajar`</strong>.</li>
                    <li>Klik folder tersebut, lalu klik tombol <strong>Sisipkan (Insert)</strong> di bagian bawah.</li>
                    <li>Atur ukuran kotak folder di halaman Anda sesuai preferensi tata letak visual. Folder ini sekarang akan menampilkan semua modul ajar .docx secara live!</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Penyematan Dokumen Word Tunggal</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Jika Anda ingin menampilkan pratinjau isi dokumen Word interaktif secara langsung di halaman depan:
                  </p>
                  <ul className="list-decimal pl-5 text-xs sm:text-sm text-slate-500 space-y-1">
                    <li>Buka dokumen Word dari folder <strong>`Sahabat Ajar`</strong> di Google Drive Anda.</li>
                    <li>Klik menu <strong>File</strong> &gt; <strong>Bagikan</strong> &gt; <strong>Sematkan (Embed)</strong> (jika dibuka melalui Google Docs).</li>
                    <li>Salin kode HTML penyematan (iframe) yang disediakan oleh Google Docs.</li>
                    <li>Di Google Sites, pilih menu <strong>Sematkan (Embed)</strong> pada tab Sisipkan, pilih tab <strong>Sematkan Kode (Embed Code)</strong>, tempel kode tersebut, dan klik <strong>Berikutnya</strong> &gt; <strong>Simpan</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  5
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-slate-800 text-base">Publikasikan Google Sites Anda</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Setelah semua tata letak terlihat rapi, klik tombol biru <strong>Publikasikan (Publish)</strong> di pojok kanan atas halaman Google Sites Anda. Portofolio perangkat pembelajaran Anda sekarang telah resmi mengudara secara online dan interaktif!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Support Card */}
      <div className="mt-8 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-brand-accent mb-0.5">Butuh Bantuan Tambahan?</h4>
            <p className="text-xs text-slate-300">
              Pelajari struktur dan penyusunan administrasi selengkapnya di menu Referensi Industri.
            </p>
          </div>
        </div>
        <a 
          href="/references"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <span>Pusat Referensi</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
