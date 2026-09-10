import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHistory, saveToHistory } from '../lib/storage';
import { ModuleData } from '../types';
import { History as HistoryIcon, Clock, ChevronRight, Copy, CheckCircle2, FileEdit, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

export default function History() {
  const [history, setHistory] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHistory() {
      const data = await getHistory();
      setHistory(data);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const handleDuplicate = async (e: React.MouseEvent, mod: ModuleData) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const newId = crypto.randomUUID();
    const duplicatedModule: ModuleData = {
      ...mod,
      id: newId,
      userId: auth.currentUser.uid,
      topic: `${mod.topic} (Salinan)`,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Keep only modulAjar? Or keep everything?
      // "menyalin Modul Ajar kelas X ke kelas XI dengan penyesuaian tingkat kesulitan"
      // Let's keep modulAjar, lkpd, etc., but they can regenerate it in the Result page.
    };
    
    await saveToHistory(duplicatedModule);
    navigate(`/result/${newId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-primary mb-4" size={32} />
        <p className="text-slate-500">Memuat riwayat...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center gap-4 border-b border-slate-200 pb-6">
        <div className="p-3 bg-brand-bg text-brand-primary border border-slate-200 rounded-xl self-start shadow-sm">
          <HistoryIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-brand-primary tracking-tight">Riwayat Perangkat</h1>
          <p className="text-slate-500 mt-1">Daftar perangkat pembelajaran yang pernah Anda hasilkan.</p>
        </div>
      </header>

      {history.length > 0 ? (
        <div className="space-y-4">
          {history.map(mod => (
            <Link 
              key={mod.id} 
              to={`/result/${mod.id}`}
              className="group flex flex-col md:flex-row justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-primary transition-all relative"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {mod.status === 'final' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-md">
                      <CheckCircle2 size={14} /> Final
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-md">
                      <FileEdit size={14} /> Draft
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-bg text-brand-primary border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Kelas {mod.kelas}
                  </span>
                  <span className="text-sm font-medium text-slate-500">{mod.jurusan}</span>
                  {mod.templateLayout && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                      {mod.templateLayout === 'pjbl' ? 'PjBL' : mod.templateLayout === 'ringkas' ? 'Ringkas' : 'Lengkap'}
                    </span>
                  )}
                  {mod.gayaBahasa && (
                    <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent text-[11px] font-semibold rounded-md">
                      {mod.gayaBahasa === 'santai' ? 'Santai' : mod.gayaBahasa === 'vokasi' ? 'Vokasi' : 'Formal'}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-brand-primary transition-colors line-clamp-2">
                  {mod.topic}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> Diperbarui: {new Date(mod.updatedAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:flex-col md:justify-center md:items-end md:ml-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                <button 
                  onClick={(e) => handleDuplicate(e, mod)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-brand-primary rounded-lg transition-colors border border-slate-200"
                >
                  <Copy size={16} /> Duplikat
                </button>
                <div className="hidden md:flex shrink-0 w-10 h-10 bg-slate-50 rounded-full items-center justify-center text-slate-400 group-hover:bg-brand-bg group-hover:text-brand-primary transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <HistoryIcon size={40} />
          </div>
          <h3 className="text-xl font-medium text-slate-800 mb-2">Belum ada riwayat</h3>
          <p className="text-slate-500 max-w-sm mb-8">Riwayat perangkat yang Anda hasilkan akan tersimpan aman di cloud.</p>
          <Link 
            to="/generator"
            className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors"
          >
            Mulai Buat Perangkat Baru
          </Link>
        </div>
      )}
    </motion.div>
  );
}
