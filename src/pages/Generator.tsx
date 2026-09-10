import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, AlertCircle, Wand2, BookOpen, Zap, Trophy, FileCheck, Smile, Briefcase, Check, Layers, MonitorPlay, ClipboardCheck, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserContext, saveToHistory } from '../lib/storage';
import { auth } from '../lib/firebase';
import { ModuleData, GayaBahasaType, TemplateLayoutType } from '../types';
import { LoadingOverlay } from '../components/LoadingOverlay';

export default function Generator() {
  const navigate = useNavigate();
  const location = useLocation();
  const context = getUserContext();
  
  const [kelas, setKelas] = useState('');
  const [semester, setSemester] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [topic, setTopic] = useState('');
  const [gayaBahasa, setGayaBahasa] = useState<GayaBahasaType>('formal');
  const [templateLayout, setTemplateLayout] = useState<TemplateLayoutType>('lengkap');
  const [generateAllPackage, setGenerateAllPackage] = useState(true);
  const [fokusAsesmen, setFokusAsesmen] = useState('Tes Tulis & Praktik (Standar)');
  const [prefillNotice, setPrefillNotice] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const state = location.state as { prefillJurusan?: string; prefillTopic?: string } | null;
    if (state?.prefillJurusan) {
      setJurusan(state.prefillJurusan);
      setPrefillNotice(true);
    }
    if (state?.prefillTopic) {
      setTopic(state.prefillTopic);
      setPrefillNotice(true);
    }
  }, [location.state]);

  const isReady = !!(context.prota && context.prosem && context.cpAtp);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) {
      setError('Mohon lengkapi Data Acuan (Prota, Prosem, CP/ATP) di halaman sebelumnya.');
      return;
    }

    if (!kelas || !semester || !jurusan || !topic) {
      setError('Mohon lengkapi semua isian formulir di bawah ini.');
      return;
    }

    if (!auth.currentUser) {
      setError('Anda harus masuk (login) terlebih dahulu untuk membuat perangkat.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = generateAllPackage ? '/api/generate/package' : '/api/generate';
      const payload = {
        prota: context.prota,
        prosem: context.prosem,
        cpAtp: context.cpAtp,
        kelas,
        semester,
        jurusan,
        topic,
        gayaBahasa,
        templateLayout,
        fokusAsesmen
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = 'Gagal menghubungi server AI. Silakan coba lagi.';
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const resData = await response.json();
      
      let newModule: ModuleData;
      if (generateAllPackage) {
        newModule = {
          id: uuidv4(),
          userId: auth.currentUser.uid,
          status: 'draft',
          kelas,
          semester,
          jurusan,
          topic,
          gayaBahasa,
          templateLayout,
          modulAjar: resData.modulAjar,
          lkpd: resData.lkpd || null,
          media: resData.media || null,
          asesmenInstrumen: resData.asesmenInstrumen || null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      } else {
        newModule = {
          id: uuidv4(),
          userId: auth.currentUser.uid,
          status: 'draft',
          kelas,
          semester,
          jurusan,
          topic,
          gayaBahasa,
          templateLayout,
          modulAjar: resData,
          lkpd: null,
          media: null,
          asesmenInstrumen: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }

      await saveToHistory(newModule);
      navigate(`/result/${newModule.id}`);
      
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat membuat perangkat.');
      setIsLoading(false);
    }
  };

  const layoutOptions = [
    {
      id: 'lengkap' as TemplateLayoutType,
      title: 'Standar Lengkap',
      subtitle: 'Kurikulum Merdeka',
      desc: 'Format komprehensif dengan sintaks detail per pertemuan, pemahaman bermakna, dan refleksi 2 arah.',
      icon: BookOpen,
      badge: 'Resmi & Detail'
    },
    {
      id: 'ringkas' as TemplateLayoutType,
      title: 'Ringkas & Efisien',
      subtitle: 'Model 1-2 Lembar',
      desc: 'Format to-the-point padat aksi, langkah esensial cepat, langsung siap pakai di kelas atau bengkel.',
      icon: Zap,
      badge: 'Cepat & Praktis'
    },
    {
      id: 'pjbl' as TemplateLayoutType,
      title: 'Berbasis Proyek',
      subtitle: 'PjBL & Portofolio',
      desc: 'Sintaks berbasis tantangan industri nyata, monitoring tahapan karya, dan presentasi produk siswa.',
      icon: Trophy,
      badge: 'Project-Based'
    }
  ];

  const toneOptions = [
    {
      id: 'formal' as GayaBahasaType,
      title: 'Formal Akademik',
      subtitle: 'Standar Kedinasan',
      desc: 'Bahasa baku, terstruktur, presisi, sesuai untuk arsip resmi kedinasan, supervisi, dan akreditasi.',
      icon: FileCheck,
      badge: 'Kedinasan'
    },
    {
      id: 'santai' as GayaBahasaType,
      title: 'Interaktif & Santai',
      subtitle: 'Ramah Siswa',
      desc: 'Bahasa hangat, komunikatif, instruksi menyemangati dan mudah dipahami siswa vokasi.',
      icon: Smile,
      badge: 'Student-Centered'
    },
    {
      id: 'vokasi' as GayaBahasaType,
      title: 'Dunia Kerja Vokasi',
      subtitle: 'Mentor Industri',
      desc: 'Gaya supervisor industri, integrasi istilah teknis kejuruan dan standar SOP bengkel/lab.',
      icon: Briefcase,
      badge: 'Workplace Ready'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8 pb-12"
    >
      <LoadingOverlay isVisible={isLoading} title="Menyusun Modul Ajar" />
      
      <header className="text-center">
        <div className="inline-flex items-center justify-center p-4 bg-brand-bg border border-brand-primary/20 text-brand-primary rounded-full mb-4 shadow-sm">
          <Wand2 size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-brand-primary tracking-tight">Generator Perangkat</h1>
        <p className="text-slate-500 mt-3 text-lg px-6">
          Sesuaikan layout template dan gaya bahasa sebelum menyusun perangkat ajar interaktif.
        </p>
      </header>

      {prefillNotice && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <Compass size={18} className="text-indigo-600 shrink-0" />
            <span>Formulir telah diisi otomatis dari hasil riset <strong>Pusat Referensi Industri</strong>.</span>
          </div>
          <button
            onClick={() => setPrefillNotice(false)}
            className="text-xs text-indigo-600 hover:text-indigo-900 font-bold px-2 py-1 rounded bg-white border border-indigo-200"
          >
            Tutup
          </button>
        </div>
      )}

      {!isReady && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Data acuan belum lengkap</h3>
            <p className="text-sm mt-1">Sistem butuh referensi Prota, Prosem, dan CP untuk memastikan keselarasan. Silakan lengkapi di menu "Data Prota/Prosem".</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleGenerate} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-8">
        {/* Template Layout Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-bold text-slate-800">1. Pilihan Template Layout</label>
              <p className="text-xs text-slate-500">Pilih format susunan dokumen yang paling sesuai kebutuhan kurikulum sekolah</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {templateLayout === 'lengkap' ? 'Standar Lengkap' : templateLayout === 'ringkas' ? 'Ringkas Efisien' : 'Berbasis Proyek'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {layoutOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = templateLayout === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setTemplateLayout(opt.id)}
                  className={`relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-brand-primary bg-brand-bg/60 ring-2 ring-brand-primary/20 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                        <Icon size={18} />
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">{opt.badge}</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{opt.title}</h4>
                    <p className="text-[11px] font-semibold text-brand-primary mb-1">{opt.subtitle}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gaya Bahasa (Tone of Voice) Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-bold text-slate-800">2. Pilihan Gaya Bahasa (Tone of Voice)</label>
              <p className="text-xs text-slate-500">Sesuaikan tingkat formalitas dan gaya komunikasi dengan audiens guru & siswa</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {gayaBahasa === 'formal' ? 'Formal Kedinasan' : gayaBahasa === 'santai' ? 'Interaktif Santai' : 'Dunia Kerja Vokasi'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {toneOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = gayaBahasa === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setGayaBahasa(opt.id)}
                  className={`relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-brand-primary bg-brand-bg/60 ring-2 ring-brand-primary/20 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-primary text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                        <Icon size={18} />
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">{opt.badge}</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{opt.title}</h4>
                    <p className="text-[11px] font-semibold text-brand-primary mb-1">{opt.subtitle}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pilihan Cakupan Generasi: Paket Lengkap vs Modul Saja */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-bold text-slate-800">3. Cakupan Perangkat yang Dibuat</label>
              <p className="text-xs text-slate-500">Pilih apakah ingin menghasilkan seluruh paket perangkat sekaligus atau bertahap</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${generateAllPackage ? 'bg-teal-100 text-teal-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
              {generateAllPackage ? 'Paket Lengkap 4-in-1' : 'Modul Ajar Saja'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setGenerateAllPackage(true)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                generateAllPackage 
                  ? 'border-brand-primary bg-brand-bg/70 ring-2 ring-brand-primary/20 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${generateAllPackage ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Sparkles size={18} />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Paket Lengkap (Rekomendasi)</span>
                </div>
                {generateAllPackage && (
                  <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Membuat <strong>Modul Ajar, LKPD Siswa, Media Interaktif, dan Asesmen + Rubrik</strong> secara otomatis dalam satu klik.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-md">✓ Modul Ajar</span>
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-md">✓ LKPD Interaktif</span>
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-md">✓ Media Vokasi</span>
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-md">✓ Rubrik Asesmen</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setGenerateAllPackage(false)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                !generateAllPackage 
                  ? 'border-brand-primary bg-brand-bg/70 ring-2 ring-brand-primary/20 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${!generateAllPackage ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <BookOpen size={18} />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Modul Ajar Dulu</span>
                </div>
                {!generateAllPackage && (
                  <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Menyusun Modul Ajar terlebih dahulu. LKPD, Media, dan Asesmen dapat disusun terpisah kemudian di tab masing-masing.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/80 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-md">✓ Modul Ajar</span>
                <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-medium text-slate-400 rounded-md">○ LKPD (Menyusul)</span>
                <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-medium text-slate-400 rounded-md">○ Media (Menyusul)</span>
              </div>
            </button>
          </div>

          {generateAllPackage && (
            <div className="mt-4 p-4 bg-brand-bg/50 border border-brand-primary/10 rounded-2xl">
              <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider mb-1.5">Pilihan Fokus Asesmen Awal</label>
              <select 
                value={fokusAsesmen}
                onChange={(e) => setFokusAsesmen(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="Tes Tulis & Praktik (Standar)">Tes Tulis & Praktik (Standar)</option>
                <option value="Praktik Lisan / Role-Play">Praktik Lisan / Role-Play (Cocok untuk Perhotelan/Pariwisata)</option>
                <option value="Penugasan Proyek / Troubleshooting">Penugasan Proyek / Troubleshooting (Cocok untuk Teknik/IT)</option>
                <option value="Observasi Kinerja & Presentasi">Observasi Kinerja & Presentasi (Cocok untuk Bisnis/Manajemen)</option>
              </select>
            </div>
          )}
        </div>

        {/* Form Fields: Kelas, Semester, Jurusan, Topik */}
        <div className="pt-2 border-t border-slate-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kelas</label>
              <select 
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-slate-700 hover:border-brand-primary/50"
              >
                <option value="">Pilih Kelas</option>
                <option value="X">Kelas X (Fase E)</option>
                <option value="XI">Kelas XI (Fase F)</option>
                <option value="XII">Kelas XII (Fase F)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Semester</label>
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-slate-700 hover:border-brand-primary/50"
              >
                <option value="">Pilih Semester</option>
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Kompetensi Keahlian / Jurusan</label>
            <input 
              type="text" 
              value={jurusan}
              onChange={(e) => setJurusan(e.target.value)}
              placeholder="Contoh: Teknik Kendaraan Ringan (TKR), Tata Boga, Rekayasa Perangkat Lunak, dll"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-slate-700 hover:border-brand-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Topik / Tujuan Pembelajaran Utama</label>
            <textarea 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Siswa mampu mempresentasikan laporan praktik kerja (Report Text/Presentation) secara lisan..."
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all text-slate-700 resize-y hover:border-brand-primary/50"
            />
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit"
            disabled={isLoading || !isReady}
            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-brand-primary text-white font-bold text-lg rounded-2xl hover:opacity-90 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-primary/20 active:scale-[0.98]"
          >
            <Sparkles /> {generateAllPackage ? 'Generate Paket Lengkap (4-in-1)' : 'Generate Modul Ajar'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

