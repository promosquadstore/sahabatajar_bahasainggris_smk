import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, BookOpen, FileCheck2, Lightbulb, Sparkles, Database, 
  Calendar as CalendarIcon, Layers, ShieldCheck, CheckCircle2, HelpCircle 
} from 'lucide-react';
import { getUserContext, getHistory, fetchUserContextFromCloud, saveUserContext } from '../lib/storage';
import { ModuleData, UserContextData } from '../types';
import { motion } from 'motion/react';
import { AcademicCalendarCalculator } from '../components/AcademicCalendarCalculator';
import { CpTpMapperModal } from '../components/CpTpMapperModal';
import { InteractiveTutorialModal } from '../components/InteractiveTutorialModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [context, setContext] = useState<UserContextData>(getUserContext());
  const [history, setHistory] = useState<ModuleData[]>([]);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [showCalendarSection, setShowCalendarSection] = useState(true);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => {
    return localStorage.getItem('sabi_onboarding_seen') !== 'true';
  });

  useEffect(() => {
    async function load() {
      const [ctx, hist] = await Promise.all([
        fetchUserContextFromCloud(),
        getHistory()
      ]);
      setContext(ctx);
      setHistory(hist);

      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const status = await res.json();
          setDbConnected(status.status === 'connected');
        } else {
          setDbConnected(false);
        }
      } catch {
        setDbConnected(false);
      }
    }
    load();
  }, []);

  const hasData = !!(context.prota || context.prosem || context.cpAtp);

  const handleApplyRpeToProsem = async (rpeText: string) => {
    const updated = {
      ...context,
      prosem: context.prosem ? `${context.prosem}\n\n${rpeText}` : rpeText
    };
    setContext(updated);
    await saveUserContext(updated);
  };

  const handleApplyCpToContext = async (cpText: string) => {
    const updated = {
      ...context,
      cpAtp: cpText
    };
    setContext(updated);
    await saveUserContext(updated);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-primary tracking-tight">Selamat Datang, Guru Hebat!</h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-lg">
            Asisten AI Anda siap membantu merancang perangkat pembelajaran Bahasa Inggris SMK yang berpusat pada siswa, kontekstual, dan selaras dengan Kurikulum Merdeka.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 text-brand-primary border border-brand-primary/20 text-xs font-bold rounded-2xl hover:bg-brand-primary/20 transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle size={16} className="text-brand-primary" />
            <span>Panduan Interaktif</span>
          </button>

          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">InsForge PostgreSQL</span>
                <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {dbConnected === null ? 'Memeriksa database...' : dbConnected ? 'Penyimpanan Cloud Terhubung' : 'Penyimpanan Lokal Aktif'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Highlight Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pemetaan CP ke TP Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-xs rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3">
              <ShieldCheck size={13} /> Acuan Kurikulum Resmi Terbaru
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Pemetaan CP ke TP Otomatis
            </h3>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-4">
              Petakan Capaian Pembelajaran (CP) Fase E & F menjadi Alur Tujuan Pembelajaran (ATP), indikator ketercapaian, dan alokasi JP kejuruan secara instan.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setIsCpModalOpen(true)}
              className="px-5 py-2.5 bg-white text-indigo-700 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Buka Pemetaan CP & TP</span>
            </button>
            <Link
              to="/upload"
              className="text-xs font-semibold text-white/80 hover:text-white underline underline-offset-4"
            >
              Kelola Data Acuan
            </Link>
          </div>
        </div>

        {/* Generator Quick Action */}
        <div className="bg-brand-primary rounded-3xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-md">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand-accent/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3 text-amber-200">
              <Sparkles size={13} /> AI Studio Generator
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Buat Paket Perangkat Ajar
            </h3>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed mb-4">
              Generate Modul Ajar, LKPD Siswa, Skenario Media, dan Rubrik Asesmen yang bebas klise AI dan kontekstual industri.
            </p>
          </div>
          <Sparkles className="absolute -bottom-4 -right-4 opacity-10 w-32 h-32 rotate-12" />
          <div className="relative z-10 flex items-center gap-3 pt-2">
            <Link 
              to="/generator" 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-accent text-white font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-accent/20"
            >
              <span>Buat Perangkat Baru</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Kalender Akademik & Kalkulator Pekan Efektif (RPE) Module */}
      <section className="space-y-4">
        <AcademicCalendarCalculator onApplyToProsem={handleApplyRpeToProsem} />
      </section>

      {/* Status Data Acuan & Recent Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-bold text-brand-accent uppercase tracking-wider mb-1">STATUS PENYUSUNAN</p>
                <h2 className="text-lg font-bold text-slate-800">Status Data Acuan</h2>
              </div>
              <div className="p-3 bg-brand-bg text-brand-primary rounded-2xl">
                <FileCheck2 size={22} />
              </div>
            </div>
            
            {hasData ? (
              <p className="text-slate-600 text-xs leading-relaxed">
                Data acuan Anda (Prota, Prosem, CP/ATP) telah tersimpan di InsForge Cloud. Perangkat ajar yang dihasilkan akan otomatis selaras dengan dokumen Anda.
              </p>
            ) : (
              <p className="text-slate-500 text-xs leading-relaxed">
                Anda belum mengunggah data acuan. Silakan lengkapi Prota, Prosem, dan CP/ATP agar perangkat yang dihasilkan sinkron dengan kalender Anda.
              </p>
            )}
          </div>
          
          <div className="mt-6">
            <Link 
              to="/upload" 
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
              {hasData ? 'Perbarui Data Acuan' : 'Input Data Sekarang'}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* History Modules List */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-brand-primary" /> Perangkat Terakhir Dibuat
            </h2>
            {history.length > 0 && (
              <span className="text-xs text-slate-400">{history.length} perangkat tersimpan</span>
            )}
          </div>

          {history.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {history.slice(0, 4).map((mod) => (
                <Link 
                  key={mod.id} 
                  to={`/result/${mod.id}`}
                  className="group bg-slate-50/70 border border-slate-200/80 p-4 rounded-2xl hover:bg-white hover:shadow-md hover:border-brand-primary transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-2.5 py-0.5 bg-white text-brand-primary text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-slate-200">
                        {mod.kelas} • Smt {mod.semester}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(mod.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors line-clamp-2 mb-1 text-xs">
                      {mod.topic}
                    </h3>
                    <p className="text-[11px] text-slate-500">{mod.jurusan}</p>
                  </div>

                  {mod.catatanRevisi && mod.catatanRevisi.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{mod.catatanRevisi.length} catatan revisi</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center">
              <Lightbulb size={28} className="text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-700 mb-1">Belum ada perangkat yang dibuat</p>
              <p className="text-[11px] text-slate-400 max-w-xs mb-4">Mulai rancang Modul Ajar pertama Anda sekarang.</p>
              <Link 
                to="/generator"
                className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl"
              >
                Buat Perangkat Sekarang
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CP to TP Modal */}
      <CpTpMapperModal
        isOpen={isCpModalOpen}
        onClose={() => setIsCpModalOpen(false)}
        onAppliedToContext={handleApplyCpToContext}
      />

      {/* Interactive Onboarding Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </motion.div>
  );
}

