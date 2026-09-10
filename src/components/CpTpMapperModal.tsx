import React, { useState } from 'react';
import { 
  Sparkles, X, CheckCircle2, Copy, BookOpen, Layers, ArrowRight, 
  Loader2, Tag, ShieldCheck, Clock, Check, RefreshCw, Send
} from 'lucide-react';
import { CpToTpMappingResult, TpItem } from '../types';
import { saveUserContext, getUserContext } from '../lib/storage';
import { useNavigate } from 'react-router-dom';

const DEFAULT_JURUSAN_LIST = [
  'Teknik Komputer dan Jaringan',
  'Rekayasa Perangkat Lunak',
  'Desain Komunikasi Visual',
  'Perhotelan & Hospitality',
  'Kuliner / Tata Boga',
  'Teknik Kendaraan Ringan Otomotif',
  'Teknik Pengelasan & Fabrikasi Logam',
  'Manajemen Perkantoran & Layanan Bisnis',
  'Akuntansi & Keuangan Lembaga',
  'Farmasi Klinis & Komunitas',
  'Teknik Ketenagalistrikan',
  'Semua Bidang Keahlian SMK'
];

interface CpTpMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppliedToContext?: (text: string) => void;
}

export const CpTpMapperModal: React.FC<CpTpMapperModalProps> = ({
  isOpen,
  onClose,
  onAppliedToContext
}) => {
  const navigate = useNavigate();
  const [kelas, setKelas] = useState<'10' | '11' | '12'>('10');
  const [jurusan, setJurusan] = useState('Teknik Komputer dan Jaringan');
  const [targetMateri, setTargetMateri] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CpToTpMappingResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSavedToContext, setIsSavedToContext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fase = kelas === '10' ? 'Fase E (Kelas X SMK)' : 'Fase F (Kelas XI/XII SMK)';
      const res = await fetch('/api/curriculum/map-cp-to-tp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fase,
          kelas,
          jurusan,
          targetMateri: targetMateri.trim() || undefined,
          customNotes: customNotes.trim() || undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan pemetaan CP ke TP');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat pemetaan');
    } finally {
      setIsLoading(false);
    }
  };

  const formatResultAsText = (data: CpToTpMappingResult) => {
    const lines: string[] = [
      `PEMETAAN CAPAIAN PEMBELAJARAN (CP) KE TUJUAN PEMBELAJARAN (TP) & ATP`,
      `Mata Pelajaran: Bahasa Inggris SMK | ${data.fase} - Kelas ${data.kelas}`,
      `Konsentrasi Keahlian: ${data.jurusan}`,
      `Rasional: ${data.rasional}`,
      `----------------------------------------------------------------------`,
      `DAFTAR TUJUAN PEMBELAJARAN (TP):`,
      ...data.daftarTp.map((tp, i) => 
        `\n[${tp.kodeTp}] (${tp.elemen}) - ${tp.alokasiJp} JP` +
        `\n- TP: ${tp.tujuanPembelajaran}` +
        `\n- Lingkup Materi: ${tp.lingkupMateri}` +
        `\n- Profil Pancasila: ${tp.dimensiPpp.join(', ')}` +
        `\n- Indikator Ketercapaian: ${tp.indikatorKetercapaian.join('; ')}` +
        `\n- Ide Asesmen: ${tp.ideAsesmen}`
      ),
      `\n----------------------------------------------------------------------`,
      `REKOMENDASI ALUR TUJUAN PEMBELAJARAN (ATP):`,
      ...(data.rekomendasiUrutanAtp || []).map(atp => `- ${atp}`)
    ];
    return lines.join('\n');
  };

  const handleCopyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(formatResultAsText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToContext = async () => {
    if (!result) return;
    const formattedText = formatResultAsText(result);
    const currentContext = getUserContext();
    await saveUserContext({
      ...currentContext,
      cpAtp: formattedText
    });
    setIsSavedToContext(true);
    setTimeout(() => setIsSavedToContext(false), 3000);
    if (onAppliedToContext) {
      onAppliedToContext(formattedText);
    }
  };

  const handleUseTpForModule = (tp: TpItem) => {
    onClose();
    navigate('/generator', {
      state: {
        kelas,
        semester: '1',
        jurusan,
        topic: `${tp.lingkupMateri} (${tp.kodeTp})`,
        prefilledTp: tp.tujuanPembelajaran
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-primary text-white rounded-2xl shadow-xs">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  BSKAP No. 032/H/KR/2024
                </span>
                <span className="text-xs text-slate-400">Kurikulum Merdeka SMK</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pemetaan Capaian Pembelajaran (CP) ke Tujuan Pembelajaran (TP)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Input Parameter Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fase & Kelas SMK:</label>
                <select
                  value={kelas}
                  onChange={e => setKelas(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="10">Fase E - Kelas 10 SMK</option>
                  <option value="11">Fase F - Kelas 11 SMK</option>
                  <option value="12">Fase F - Kelas 12 SMK</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Konsentrasi / Program Keahlian:</label>
                <div className="flex gap-2">
                  <select
                    value={jurusan}
                    onChange={e => setJurusan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {DEFAULT_JURUSAN_LIST.map((j, idx) => (
                      <option key={idx} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fokus Topik / Materi Khusus (Opsional):
                </label>
                <input
                  type="text"
                  value={targetMateri}
                  onChange={e => setTargetMateri(e.target.value)}
                  placeholder="Contoh: Technical Manual Interpretation, Job Interview, SOP"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan Guru (Opsional):
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Contoh: Tekankan pada kemampuan speaking di bengkel / lab"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memetakan CP ke TP dengan AI Kurikulum...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Petakan CP ke TP Otomatis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Results View */}
          {result && (
            <div className="space-y-6">
              
              {/* Summary Bar */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {result.fase}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {result.jurusan}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    <strong>Rasional Vokasi:</strong> {result.rasional}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copied ? 'Tersalin!' : 'Salin Semua'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToContext}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSavedToContext ? <Check size={14} /> : <BookOpen size={14} />}
                    <span>{isSavedToContext ? 'Tersimpan ke CP/ATP Saya!' : 'Terapkan ke Data Acuan'}</span>
                  </button>
                </div>
              </div>

              {/* List of Tujuan Pembelajaran (TP) */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers size={16} className="text-brand-primary" />
                  Rincian Rumusan Tujuan Pembelajaran (TP) & Indikator Ketercapaian:
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {result.daftarTp.map((tp, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-brand-primary/60 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-brand-primary text-white font-black text-xs rounded-lg">
                            {tp.kodeTp}
                          </span>
                          <span className="text-xs font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100">
                            Elemen: {tp.elemen}
                          </span>
                          <span className="text-xs font-semibold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50">
                            {tp.alokasiJp} JP
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUseTpForModule(tp)}
                          className="px-3 py-1.5 bg-brand-bg hover:bg-brand-primary hover:text-white text-brand-primary font-bold text-xs rounded-xl transition-all flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Generate Modul Topik Ini</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Rumusan Tujuan Pembelajaran (TP):
                        </span>
                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                          {tp.tujuanPembelajaran}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-700 block">Lingkup Materi Vokasi:</span>
                          <p className="text-slate-600">{tp.lingkupMateri}</p>
                          
                          <div className="pt-1 flex flex-wrap gap-1">
                            {tp.dimensiPpp.map((p, pIdx) => (
                              <span key={pIdx} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-medium">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-700 block">Indikator Ketercapaian (IKTP):</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {tp.indikatorKetercapaian.map((ik, iIdx) => (
                              <li key={iIdx}>{ik}</li>
                            ))}
                          </ul>
                          <div className="pt-1 text-[11px] text-slate-500">
                            <strong>Ide Asesmen:</strong> {tp.ideAsesmen}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Rekomendasi Urutan ATP */}
              {result.rekomendasiUrutanAtp && result.rekomendasiUrutanAtp.length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-2">
                  <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Rekomendasi Alur Tujuan Pembelajaran (ATP / Semester Progression):
                  </h4>
                  <div className="space-y-1.5">
                    {result.rekomendasiUrutanAtp.map((atp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{atp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {!result && !isLoading && (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
              <BookOpen size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm mb-1">
                Belum Melakukan Pemetaan CP ke TP
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pilih Fase/Kelas dan Jurusan di atas, lalu klik tombol <strong>"Petakan CP ke TP Otomatis"</strong> untuk menghasilkan ATP terstruktur sesuai standar resmi Kemendikbudristek.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
