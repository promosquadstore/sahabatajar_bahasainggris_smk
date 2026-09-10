import React, { useState } from 'react';
import { 
  Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2, 
  FileText, Calendar, BookOpen, Layers, Download, FileSpreadsheet,
  Check, ArrowRight, ShieldCheck, Play, Cloud, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    step: 1,
    badge: 'Langkah 1 dari 6',
    title: 'Selamat Datang di SahabatAjar SMK',
    subtitle: 'Platform Generatif Perangkat Pembelajaran Merdeka Belajar Vokasi',
    description: 'SahabatAjar membantu Guru Bahasa Inggris SMK menyusun administrasi pembelajaran lengkap, kontekstual dunia kerja, dan selaras dengan BSKAP Kemendikbudristek No. 032/H/KR/2024.',
    features: [
      'Penyusunan Modul Ajar, LKPD, Media, & Asesmen dalam hitungan detik',
      'Integrasi kosakata vokasi & standar kompetensi industri SKKNI',
      'Format siap cetak kedinasan & ekspor Microsoft Word (.docx)'
    ],
    icon: Sparkles,
    color: 'from-brand-primary to-indigo-900',
    actionText: 'Mulai Tur Interaktif'
  },
  {
    step: 2,
    badge: 'Langkah 2 dari 6',
    title: '1. Input Data Acuan Kurikulum',
    subtitle: 'Upload Dokumen atau Gunakan Pemetaan CP-TP Otomatis',
    description: 'Aplikasi menggunakan Prota, Promes, dan CP/ATP Anda sebagai fondasi agar perangkat yang dihasilkan 100% konsisten dengan target semester Anda.',
    features: [
      'Unggah file .pdf / .docx kurikulum Anda di menu Data Acuan',
      'Fitur AI Smart Splitter otomatis memisahkan Prota, Promes, dan CP',
      'Belum punya CP/ATP? Gunakan Generator Pemetaan CP ke TP Otomatis'
    ],
    icon: FileText,
    color: 'from-emerald-600 to-teal-800',
    actionLink: '/upload',
    actionLinkLabel: 'Buka Halaman Data Acuan'
  },
  {
    step: 3,
    badge: 'Langkah 3 dari 6',
    title: '2. Hitung Pekan Efektif (RPE)',
    subtitle: 'Kalkulator Kalender Akademik Vokasi',
    description: 'Sebelum melakukan generate perangkat, hitung efektivitas minggu belajar pada semester aktif Anda langsung melalui Dashboard.',
    features: [
      'Menghitung total minggu kalender & alokasi JP per minggu',
      'Simulasi kegiatan non-efektif (STS/SAS, PKL/Prakerin, MPLS, Libur)',
      'Simpan kalkulasi RPE ke Data Acuan secara otomatis'
    ],
    icon: Calendar,
    color: 'from-amber-600 to-orange-800',
    actionLink: '/',
    actionLinkLabel: 'Lihat Kalkulator RPE'
  },
  {
    step: 4,
    badge: 'Langkah 4 dari 6',
    title: '3. AI Generator Perangkat Ajar',
    subtitle: 'Buat Paket Perangkat Berbasis Pembelajaran Proyek (PjBL)',
    description: 'Pilih Kelas, Semester, dan Konsentrasi Keahlian / Jurusan SMK Anda. AI akan merancang 4 komponen perangkat pembelajaran vokasi sekaligus.',
    features: [
      'Modul Ajar Vokasi dengan sintaks PjBL / Teaching Factory',
      'LKPD Siswa interaktif dengan simulasi tugas dunia kerja',
      'Skenario Media Pembelajaran & Instrumen Asesmen + Rubrik Penilaian'
    ],
    icon: Layers,
    color: 'from-blue-600 to-cyan-800',
    actionLink: '/generator',
    actionLinkLabel: 'Coba AI Generator'
  },
  {
    step: 5,
    badge: 'Langkah 5 dari 6',
    title: '4. Ekspor Word & Google Drive',
    subtitle: 'Penyimpanan Awan & Kolaborasi Google Docs',
    description: 'Dokumen hasil generate akan langsung diunduh secara otomatis, dan dapat disimpan langsung ke folder khusus `Sahabat Ajar` di Google Drive Anda.',
    features: [
      'Unduh otomatis instan berformat .docx (Microsoft Word)',
      'Otorisasi aman Google Drive API langsung menggunakan Gmail Anda',
      'Penyimpanan otomatis ke folder `Sahabat Ajar` di Google Drive',
      'Buka langsung di Google Docs untuk diedit bersama guru lain'
    ],
    icon: Cloud,
    color: 'from-teal-600 to-emerald-800',
    actionText: 'Lanjut ke Publikasi'
  },
  {
    step: 6,
    badge: 'Langkah 6 dari 6',
    title: '5. Publikasi GitHub & Google Sites',
    subtitle: 'Digitalisasi Portofolio & Administrasi Online',
    description: 'Bagikan perangkat pembelajaran secara online melalui GitHub Pages dan sematkan portofolio digital tersebut ke Google Sites sekolah Anda.',
    features: [
      'Dukungan hosting online gratis melalui repositori GitHub Pages',
      'Penyematan langsung folder Google Drive `Sahabat Ajar` ke Google Sites',
      'Akses live-update untuk pengawas sekolah, guru, dan peserta didik'
    ],
    icon: Globe,
    color: 'from-purple-600 to-brand-primary',
    actionLink: '/guide',
    actionLinkLabel: 'Buka Panduan Publikasi'
  }
];

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('sabi_onboarding_seen', 'true');
    }
    onClose();
  };

  const IconComp = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex justify-center items-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-100"
      >
        {/* Header Visual Bar */}
        <div className={`bg-gradient-to-r ${currentStep.color} p-6 text-white relative overflow-hidden transition-all duration-300`}>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 text-white">
                <ShieldCheck size={13} /> {currentStep.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {currentStep.title}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1 font-medium">
                {currentStep.subtitle}
              </p>
            </div>

            <button
              onClick={handleComplete}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors cursor-pointer shrink-0"
              title="Tutup Panduan"
            >
              <X size={18} />
            </button>
          </div>

          <IconComp className="absolute -bottom-6 -right-6 opacity-15 w-40 h-40 rotate-12 pointer-events-none text-white" />
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-slate-700 text-sm leading-relaxed font-normal">
            {currentStep.description}
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-primary" /> Poin Penting:
            </h4>
            <ul className="space-y-2.5">
              {currentStep.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentStep.actionLink && (
            <div className="pt-1 flex items-center justify-between bg-brand-bg/60 p-3 rounded-xl border border-brand-primary/20">
              <span className="text-xs text-brand-primary font-medium">Ingin langsung mencoba langkah ini?</span>
              <button
                onClick={() => {
                  handleComplete();
                  navigate(currentStep.actionLink!);
                }}
                className="px-3.5 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentStep.actionLinkLabel}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Footer / Step Indicators */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 font-medium select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
              />
              <span>Jangan tampilkan otomatis lagi</span>
            </label>
          </div>

          {/* Dots Indicator & Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex 
                      ? 'w-6 bg-brand-primary' 
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Langkah ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  <span>Kembali</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2 bg-brand-primary hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-primary/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isLast ? 'Mulai Sekarang' : 'Lanjut'}</span>
                {isLast ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
