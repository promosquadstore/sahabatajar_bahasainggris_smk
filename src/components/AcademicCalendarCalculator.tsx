import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, Copy, Sparkles, 
  RotateCcw, Plus, Trash2, ArrowRight, Save, Info, Layers
} from 'lucide-react';
import { AcademicCalendarData, AcademicCalendarMonth, NonEffectiveWeekEvent, UserContextData } from '../types';
import { saveUserContext, getUserContext } from '../lib/storage';

const DEFAULT_GANJIL_MONTHS: AcademicCalendarMonth[] = [
  { bulan: 'Juli', totalMinggu: 5, mingguTidakEfektif: 2, kegiatanNonEfektif: ['Libur Akhir Tahun Ajaran (1)', 'MPLS & Masa Orientasi (1)'] },
  { bulan: 'Agustus', totalMinggu: 4, mingguTidakEfektif: 0, kegiatanNonEfektif: [] },
  { bulan: 'September', totalMinggu: 4, mingguTidakEfektif: 1, kegiatanNonEfektif: ['Asesmen Sumatif Tengah Semester / STS (1)'] },
  { bulan: 'Oktober', totalMinggu: 5, mingguTidakEfektif: 0, kegiatanNonEfektif: [] },
  { bulan: 'November', totalMinggu: 4, mingguTidakEfektif: 0, kegiatanNonEfektif: [] },
  { bulan: 'Desember', totalMinggu: 4, mingguTidakEfektif: 3, kegiatanNonEfektif: ['Asesmen Sumatif Akhir Semester / SAS (1)', 'Pengolahan Rapor (1)', 'Libur Semester Ganjil (1)'] },
];

const DEFAULT_GENAP_MONTHS: AcademicCalendarMonth[] = [
  { bulan: 'Januari', totalMinggu: 4, mingguTidakEfektif: 1, kegiatanNonEfektif: ['Libur Awal Semester Genap (1)'] },
  { bulan: 'Februari', totalMinggu: 4, mingguTidakEfektif: 0, kegiatanNonEfektif: [] },
  { bulan: 'Maret', totalMinggu: 5, mingguTidakEfektif: 2, kegiatanNonEfektif: ['STS Genap (1)', 'Libur Awal Ramadhan (1)'] },
  { bulan: 'April', totalMinggu: 4, mingguTidakEfektif: 1, kegiatanNonEfektif: ['Libur Hari Raya Idul Fitri (1)'] },
  { bulan: 'Mei', totalMinggu: 5, mingguTidakEfektif: 1, kegiatanNonEfektif: ['Uji Kompetensi Keahlian / UKK SMK (1)'] },
  { bulan: 'Juni', totalMinggu: 4, mingguTidakEfektif: 3, kegiatanNonEfektif: ['SAS Genap (1)', 'Pengolahan Rapor (1)', 'Libur Kenaikan Kelas (1)'] },
];

interface AcademicCalendarCalculatorProps {
  onApplyToProsem?: (rpeText: string) => void;
}

export const AcademicCalendarCalculator: React.FC<AcademicCalendarCalculatorProps> = ({
  onApplyToProsem
}) => {
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [jpPerMinggu, setJpPerMinggu] = useState<number>(4);
  const [bulanList, setBulanList] = useState<AcademicCalendarMonth[]>(DEFAULT_GANJIL_MONTHS);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [customKegiatanText, setCustomKegiatanText] = useState('');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);

  // Load saved calendar from user context
  useEffect(() => {
    const ctx = getUserContext();
    if (ctx.academicCalendar) {
      setSemester(ctx.academicCalendar.semester || 'Ganjil');
      setTahunAjaran(ctx.academicCalendar.tahunAjaran || '2026/2027');
      setJpPerMinggu(ctx.academicCalendar.jpPerMinggu || 4);
      if (ctx.academicCalendar.bulanList && ctx.academicCalendar.bulanList.length > 0) {
        setBulanList(ctx.academicCalendar.bulanList);
      }
    }
  }, []);

  const handleSemesterChange = (newSem: 'Ganjil' | 'Genap') => {
    setSemester(newSem);
    if (newSem === 'Ganjil') {
      setBulanList(DEFAULT_GANJIL_MONTHS);
    } else {
      setBulanList(DEFAULT_GENAP_MONTHS);
    }
  };

  const handleWeekChange = (idx: number, field: 'totalMinggu' | 'mingguTidakEfektif', value: number) => {
    const updated = [...bulanList];
    const val = Math.max(0, value);
    updated[idx] = {
      ...updated[idx],
      [field]: val
    };
    setBulanList(updated);
  };

  const handleAddKegiatan = (monthIdx: number) => {
    if (!customKegiatanText.trim()) return;
    const updated = [...bulanList];
    const current = updated[monthIdx];
    updated[monthIdx] = {
      ...current,
      mingguTidakEfektif: current.mingguTidakEfektif + 1,
      kegiatanNonEfektif: [...current.kegiatanNonEfektif, customKegiatanText.trim()]
    };
    setBulanList(updated);
    setCustomKegiatanText('');
  };

  const handleRemoveKegiatan = (monthIdx: number, kegIdx: number) => {
    const updated = [...bulanList];
    const current = updated[monthIdx];
    const newKegiatan = current.kegiatanNonEfektif.filter((_, i) => i !== kegIdx);
    updated[monthIdx] = {
      ...current,
      mingguTidakEfektif: Math.max(0, current.mingguTidakEfektif - 1),
      kegiatanNonEfektif: newKegiatan
    };
    setBulanList(updated);
  };

  // Calculations
  const totalMingguKalender = bulanList.reduce((acc, curr) => acc + curr.totalMinggu, 0);
  const totalMingguTidakEfektif = bulanList.reduce((acc, curr) => acc + curr.mingguTidakEfektif, 0);
  const totalMingguEfektif = Math.max(0, totalMingguKalender - totalMingguTidakEfektif);
  const totalJamPelajaranEfektif = totalMingguEfektif * jpPerMinggu;
  const jamCadangan = Math.round(totalJamPelajaranEfektif * 0.1); // ~10% cadangan
  const jamMateriInti = totalJamPelajaranEfektif - jamCadangan;

  // Format RPE Text
  const generateRpeText = () => {
    const lines = [
      `RINCIAN PEKAN EFEKTIF (RPE) - BAHASA INGGRIS SMK`,
      `Tahun Ajaran: ${tahunAjaran} | Semester: ${semester}`,
      `Alokasi Jam per Minggu: ${jpPerMinggu} JP`,
      `----------------------------------------------------`,
      `A. JUMLAH MINGGU KALENDER:`,
      ...bulanList.map(b => `   - ${b.bulan.padEnd(10)}: ${b.totalMinggu} Minggu`),
      `   TOTAL           : ${totalMingguKalender} Minggu`,
      ``,
      `B. JUMLAH MINGGU TIDAK EFEKTIF:`,
      ...bulanList.filter(b => b.mingguTidakEfektif > 0).map(b => 
        `   - ${b.bulan.padEnd(10)}: ${b.mingguTidakEfektif} Minggu (${b.kegiatanNonEfektif.join(', ') || 'Non-KBM'})`
      ),
      `   TOTAL NON-EFEKTIF: ${totalMingguTidakEfektif} Minggu`,
      ``,
      `C. JUMLAH MINGGU EFEKTIF:`,
      `   ${totalMingguKalender} Minggu - ${totalMingguTidakEfektif} Minggu = ${totalMingguEfektif} Minggu Efektif`,
      ``,
      `D. DISTRIBUSI ALOKASI JAM PELAJARAN (JP):`,
      `   - Total JP Efektif     : ${totalMingguEfektif} Minggu x ${jpPerMinggu} JP = ${totalJamPelajaranEfektif} JP`,
      `   - Alokasi Materi Inti  : ${jamMateriInti} JP`,
      `   - Alokasi Cadangan/PTS : ${jamCadangan} JP`,
    ];
    return lines.join('\n');
  };

  const handleCopyRpe = () => {
    const text = generateRpeText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToContext = async () => {
    const calendarData: AcademicCalendarData = {
      tahunAjaran,
      semester,
      jpPerMinggu,
      bulanList,
      kegiatanKhusus: [],
      catatanDistribusi: `Total ${totalMingguEfektif} Pekan Efektif (${totalJamPelajaranEfektif} JP)`
    };

    const currentContext = getUserContext();
    const updatedContext: UserContextData = {
      ...currentContext,
      academicCalendar: calendarData
    };

    await saveUserContext(updatedContext);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);

    if (onApplyToProsem) {
      onApplyToProsem(generateRpeText());
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-100 text-indigo-700">
                Kalkulator RPE SMK
              </span>
              <span className="text-xs text-slate-400">Kurikulum Merdeka</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Kalender Akademik & Rincian Pekan Efektif (RPE)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => handleSemesterChange(semester === 'Ganjil' ? 'Genap' : 'Ganjil')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} /> Ganti ke Semester {semester === 'Ganjil' ? 'Genap' : 'Ganjil'}
          </button>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Semester Aktif:</label>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => handleSemesterChange('Ganjil')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                semester === 'Ganjil' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ganjil (Jul - Des)
            </button>
            <button
              onClick={() => handleSemesterChange('Genap')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                semester === 'Genap' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Genap (Jan - Jun)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran:</label>
          <input
            type="text"
            value={tahunAjaran}
            onChange={e => setTahunAjaran(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            placeholder="2026/2027"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Alokasi JP per Minggu (B. Inggris):</label>
          <select
            value={jpPerMinggu}
            onChange={e => setJpPerMinggu(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value={2}>2 JP / Minggu (Standar Fase E/F)</option>
            <option value={3}>3 JP / Minggu (Program Pengayaan)</option>
            <option value={4}>4 JP / Minggu (Konsentrasi Vokasi/Dual Block)</option>
            <option value={6}>6 JP / Minggu (Blok Vokasi Khusus)</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
          <span className="text-[11px] font-bold text-blue-700 uppercase block mb-1">Total Minggu</span>
          <div className="text-2xl font-black text-blue-900">{totalMingguKalender} <span className="text-xs font-normal text-blue-600">Pekan</span></div>
          <span className="text-[10px] text-blue-600/80">Semester {semester}</span>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl">
          <span className="text-[11px] font-bold text-rose-700 uppercase block mb-1">Tidak Efektif</span>
          <div className="text-2xl font-black text-rose-900">{totalMingguTidakEfektif} <span className="text-xs font-normal text-rose-600">Pekan</span></div>
          <span className="text-[10px] text-rose-600/80">Libur / Ujian / ANBK</span>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block mb-1">Minggu Efektif</span>
          <div className="text-2xl font-black text-emerald-900">{totalMingguEfektif} <span className="text-xs font-normal text-emerald-600">Pekan</span></div>
          <span className="text-[10px] text-emerald-600/80">KBM Tatap Muka</span>
        </div>

        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl">
          <span className="text-[11px] font-bold text-purple-700 uppercase block mb-1">Total JP Efektif</span>
          <div className="text-2xl font-black text-purple-900">{totalJamPelajaranEfektif} <span className="text-xs font-normal text-purple-600">JP</span></div>
          <span className="text-[10px] text-purple-600/80">{jamMateriInti} JP Inti + {jamCadangan} JP Cad.</span>
        </div>
      </div>

      {/* Table of Months */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="p-3">Nama Bulan</th>
              <th className="p-3 text-center w-28">Minggu Kalender</th>
              <th className="p-3 text-center w-28">Tidak Efektif</th>
              <th className="p-3 text-center w-28">Minggu Efektif</th>
              <th className="p-3">Kegiatan / Keterangan Non-Efektif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bulanList.map((item, idx) => {
              const efektif = Math.max(0, item.totalMinggu - item.mingguTidakEfektif);
              return (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{item.bulan}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={item.totalMinggu}
                      onChange={e => handleWeekChange(idx, 'totalMinggu', Number(e.target.value))}
                      className="w-16 p-1 text-center bg-slate-100 border border-slate-200 rounded-lg font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={item.totalMinggu}
                      value={item.mingguTidakEfektif}
                      onChange={e => handleWeekChange(idx, 'mingguTidakEfektif', Number(e.target.value))}
                      className="w-16 p-1 text-center bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-bold"
                    />
                  </td>
                  <td className="p-3 text-center font-extrabold text-emerald-700 bg-emerald-50/30">
                    {efektif} Minggu ({efektif * jpPerMinggu} JP)
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.kegiatanNonEfektif.map((keg, kIdx) => (
                        <span 
                          key={kIdx} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <span>{keg}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKegiatan(idx, kIdx)}
                            className="text-slate-400 hover:text-rose-600"
                            title="Hapus kegiatan"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {item.kegiatanNonEfektif.length === 0 && (
                        <span className="text-slate-400 italic text-[11px]">KBM Penuh Efektif</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Add Custom Non-Effective Event */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 shrink-0">Tambah Kegiatan Non-Efektif:</span>
          <select
            value={selectedMonthIdx}
            onChange={e => setSelectedMonthIdx(Number(e.target.value))}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
          >
            {bulanList.map((b, i) => (
              <option key={i} value={i}>{b.bulan}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={customKegiatanText}
          onChange={e => setCustomKegiatanText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddKegiatan(selectedMonthIdx); }}
          placeholder="Nama kegiatan (contoh: 'Prakerin / PKL 2 Minggu', 'Jeda STS')"
          className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
        />

        <button
          type="button"
          onClick={() => handleAddKegiatan(selectedMonthIdx)}
          disabled={!customKegiatanText.trim()}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> Tambah Kegiatan
        </button>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info size={16} className="text-indigo-600 shrink-0" />
          <span>Hasil RPE ini dapat disimpan untuk menyelaraskan alokasi JP pada Modul Ajar dan Promes.</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyRpe}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Format Teks RPE'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToContext}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSaved ? <CheckCircle2 size={15} className="text-white" /> : <Save size={15} />}
            <span>{isSaved ? 'Tersimpan ke Cloud!' : 'Simpan RPE ke Data Acuan'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
