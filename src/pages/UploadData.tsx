import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, CloudCheck, FileText, Sparkles, AlertCircle, Loader2, RefreshCw, Layers, Check, Trash2, ArrowRight } from 'lucide-react';
import { fetchUserContextFromCloud, saveUserContext } from '../lib/storage';
import { UserContextData } from '../types';
import { DocumentUploader } from '../components/DocumentUploader';
import { CpTpMapperModal } from '../components/CpTpMapperModal';
import { motion } from 'motion/react';

export default function UploadData() {
  const [formData, setFormData] = useState<UserContextData>({
    prota: '',
    prosem: '',
    cpAtp: ''
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSplitting, setIsAutoSplitting] = useState(false);
  const [isMapperOpen, setIsMapperOpen] = useState(false);
  const [masterUploadStatus, setMasterUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const masterFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchUserContextFromCloud();
      setFormData(data);
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleExtracted = (field: keyof UserContextData, extractedText: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: extractedText
    }));
    setSaved(false);
  };

  const handleClearField = (field: keyof UserContextData) => {
    setFormData(prev => ({
      ...prev,
      [field]: ''
    }));
    setSaved(false);
  };

  const handleMasterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const lowerName = file.name.toLowerCase();
    const isValidFormat = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || lowerName.endsWith('.txt');

    if (!isValidFormat) {
      setMasterUploadStatus({ success: false, message: 'Format file tidak didukung. Harap unggah .pdf atau .docx' });
      return;
    }

    setIsAutoSplitting(true);
    setMasterUploadStatus(null);

    try {
      // 1. Parse Document text
      const uploadForm = new FormData();
      uploadForm.append('file', file);

      const parseRes = await fetch('/api/parse-document', {
        method: 'POST',
        body: uploadForm,
      });

      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || 'Gagal mengekstrak dokumen');

      // 2. AI Smart Split
      const splitRes = await fetch('/api/auto-split-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseData.text }),
      });

      const splitData = await splitRes.json();
      if (!splitRes.ok) throw new Error(splitData.error || 'Gagal memisahkan dokumen dengan AI');

      setFormData(prev => ({
        prota: splitData.prota || prev.prota || parseData.text,
        prosem: splitData.prosem || prev.prosem,
        cpAtp: splitData.cpAtp || prev.cpAtp
      }));

      setMasterUploadStatus({
        success: true,
        message: `Berhasil mengekstrak & memetakan isi "${file.name}" ke Prota, Promes, dan CP/ATP!`
      });
      setSaved(false);
    } catch (err: any) {
      setMasterUploadStatus({
        success: false,
        message: err.message || 'Gagal memproses dokumen gabungan'
      });
    } finally {
      setIsAutoSplitting(false);
      if (masterFileInputRef.current) {
        masterFileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveUserContext(formData);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-full mb-3 shadow-xs">
          <CloudCheck size={14} /> Sinkronisasi InsForge Cloud Aktif
        </div>
        <h1 className="text-3xl font-extrabold text-brand-primary tracking-tight">Data Acuan Guru</h1>
        <p className="text-slate-500 mt-2 text-lg">
          Unggah file dokumen kurikulum Anda dalam format <strong>PDF</strong> atau <strong>DOCX (Word)</strong>, atau ketik langsung di kolom yang disediakan. Data ini tersimpan aman di InsForge Cloud.
        </p>
      </header>

      {/* Master Smart Upload Box */}
      <div className="bg-gradient-to-r from-brand-primary/5 via-brand-bg to-brand-accent/5 rounded-3xl p-6 border border-brand-primary/15 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-accent" />
              <h3 className="text-base font-extrabold text-slate-800">
                Punya 1 File Lengkap (PDF / DOCX)?
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Unggah 1 dokumen kurikulum Anda yang berisi Prota, Promes, dan CP/ATP sekaligus. AI akan otomatis mengekstrak dan membaginya ke kolom masing-masing.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <input
              ref={masterFileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleMasterFileUpload}
              className="hidden"
              disabled={isAutoSplitting}
            />
            <button
              type="button"
              onClick={() => masterFileInputRef.current?.click()}
              disabled={isAutoSplitting}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm active:scale-98"
            >
              {isAutoSplitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Mengekstrak & Memetakan dengan AI...</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>Upload Dokumen Lengkap (PDF/DOCX)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {masterUploadStatus && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
            masterUploadStatus.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {masterUploadStatus.success ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
              <span>{masterUploadStatus.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMasterUploadStatus(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Prota Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-base font-extrabold text-slate-800" htmlFor="prota">
                1. Program Tahunan (Prota)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Alokasi waktu, distribusi elemen capaian, dan urutan materi pembelajaran dalam 1 tahun ajaran.
              </p>
            </div>
            {formData.prota && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-slate-400">
                  {formData.prota.length.toLocaleString()} karakter
                </span>
                <button
                  type="button"
                  onClick={() => handleClearField('prota')}
                  title="Hapus teks Prota"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <DocumentUploader
            label="Program Tahunan (Prota)"
            onExtracted={(text) => handleExtracted('prota', text)}
          />

          <textarea
            id="prota"
            name="prota"
            value={formData.prota}
            onChange={handleChange}
            className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none resize-y text-slate-700 text-sm leading-relaxed"
            placeholder="Ketik atau tempel teks Program Tahunan di sini, atau gunakan tombol upload PDF/DOCX di atas..."
          />
        </div>

        {/* Prosem Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-base font-extrabold text-slate-800" htmlFor="prosem">
                2. Program Semester (Prosem / Promes)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian minggu efektif, alokasi JP per topik materi, dan jadwal pelaksanaan per semester.
              </p>
            </div>
            {formData.prosem && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-slate-400">
                  {formData.prosem.length.toLocaleString()} karakter
                </span>
                <button
                  type="button"
                  onClick={() => handleClearField('prosem')}
                  title="Hapus teks Prosem"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <DocumentUploader
            label="Program Semester (Promes)"
            onExtracted={(text) => handleExtracted('prosem', text)}
          />

          <textarea
            id="prosem"
            name="prosem"
            value={formData.prosem}
            onChange={handleChange}
            className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none resize-y text-slate-700 text-sm leading-relaxed"
            placeholder="Ketik atau tempel teks Program Semester di sini, atau gunakan tombol upload PDF/DOCX di atas..."
          />
        </div>

        {/* CP & ATP Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-base font-extrabold text-slate-800" htmlFor="cpAtp">
                3. Capaian Pembelajaran (CP) & Alur Tujuan Pembelajaran (ATP)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Fase E/F Kurikulum Merdeka Bahasa Inggris SMK (Elemen Menyimak, Berbicara, Membaca, Menulis, dsb).
              </p>
            </div>
            {formData.cpAtp && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-slate-400">
                  {formData.cpAtp.length.toLocaleString()} karakter
                </span>
                <button
                  type="button"
                  onClick={() => handleClearField('cpAtp')}
                  title="Hapus teks CP/ATP"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <Sparkles size={16} className="text-emerald-600 shrink-0" />
              <span>Belum punya dokumen CP/ATP? Petakan otomatis dari Standar BSKAP No. 032/H/KR/2024.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMapperOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all whitespace-nowrap"
            >
              Pemetaan CP ke TP Otomatis
            </button>
          </div>

          <DocumentUploader
            label="Capaian Pembelajaran (CP) & ATP"
            onExtracted={(text) => handleExtracted('cpAtp', text)}
          />

          <textarea
            id="cpAtp"
            name="cpAtp"
            value={formData.cpAtp}
            onChange={handleChange}
            className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none resize-y text-slate-700 text-sm leading-relaxed"
            placeholder="Ketik atau tempel teks CP dan ATP di sini, atau gunakan tombol upload PDF/DOCX di atas..."
          />
        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 sticky bottom-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-lg">
          <div className="text-xs text-slate-500">
            {saved ? (
              <span className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 size={16} /> Data acuan berhasil tersimpan di InsForge Cloud!
              </span>
            ) : (
              <span>Pastikan klik <strong>Simpan Data</strong> setelah mengunggah atau mengubah dokumen.</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-primary text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-brand-primary/20"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Data ke InsForge'}</span>
          </button>
        </div>
      </div>

      <CpTpMapperModal 
        isOpen={isMapperOpen} 
        onClose={() => setIsMapperOpen(false)} 
        onAppliedToContext={(newCpText) => {
          setFormData(prev => ({ ...prev, cpAtp: newCpText }));
          setSaved(false);
        }}
      />
    </motion.div>
  );
}
