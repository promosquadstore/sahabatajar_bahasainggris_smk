import React, { useState, useRef } from 'react';
import { 
  Printer, X, Download, FileText, CheckCircle2, User, Building, 
  Layers, Eye, Calendar, Award, ShieldCheck, ChevronRight
} from 'lucide-react';
import { ModuleData } from '../types';

interface PrintPreviewModalProps {
  data: ModuleData;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'all' | 'modul' | 'lkpd' | 'asesmen';
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  data,
  isOpen,
  onClose,
  initialTab = 'all'
}) => {
  const [printScope, setPrintScope] = useState<'all' | 'modul' | 'lkpd' | 'asesmen'>(initialTab);
  const [namaSekolah, setNamaSekolah] = useState('SMK NEGERI 1 CONTOH');
  const [namaGuru, setNamaGuru] = useState('Guru Pengampu, S.Pd.');
  const [nipGuru, setNipGuru] = useState('19850101 201001 1 001');
  const [namaKepala, setNamaKepala] = useState('Kepala Sekolah, M.Pd.');
  const [nipKepala, setNipKepala] = useState('19750202 199903 1 002');
  const [kotaTanggal, setKotaTanggal] = useState(`Kota Contoh, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeRubrik, setIncludeRubrik] = useState(true);
  const [includeRevisionNotes, setIncludeRevisionNotes] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeRevisions = data.catatanRevisi || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        
        {/* Header - Screen only */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-primary text-white rounded-xl shadow-xs">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Pratinjau Cetak & Ekspor Dokumen Resmi
              </h2>
              <p className="text-xs text-slate-500">
                Tata letak standar kurikulum resmi siap cetak langsung atau disimpan sebagai PDF (A4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar Settings - Screen only */}
        <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs print:hidden shrink-0">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Cakupan Cetak Dokumen:</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Semua (Lengkap)' },
                { id: 'modul', label: 'Modul Ajar' },
                { id: 'lkpd', label: 'LKPD Siswa' },
                { id: 'asesmen', label: 'Asesmen & Rubrik' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPrintScope(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    printScope === tab.id 
                      ? 'bg-brand-primary text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="block font-bold text-slate-700">Nama Sekolah:</label>
              <input
                type="text"
                value={namaSekolah}
                onChange={e => setNamaSekolah(e.target.value)}
                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                placeholder="Contoh: SMKN 1 KOTA..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-600 text-[11px]">Guru Pengampu:</label>
                <input
                  type="text"
                  value={namaGuru}
                  onChange={e => setNamaGuru(e.target.value)}
                  className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 text-[11px]">Kepala Sekolah:</label>
                <input
                  type="text"
                  value={namaKepala}
                  onChange={e => setNamaKepala(e.target.value)}
                  className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={e => setIncludeSignature(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                <span>Sertakan Kolom Tanda Tangan Pengesahan</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRubrik}
                  onChange={e => setIncludeRubrik(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                <span>Sertakan Matriks Rubrik Penilaian</span>
              </label>
              {activeRevisions.length > 0 && (
                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRevisionNotes}
                    onChange={e => setIncludeRevisionNotes(e.target.checked)}
                    className="rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Lampirkan Catatan Revisi ({activeRevisions.length})</span>
                </label>
              )}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Tip: Di dialog print browser, pilih <strong>Destination: Save as PDF</strong> dan Margin: <strong>Default</strong>.
            </p>
          </div>
        </div>

        {/* Print Document Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={printAreaRef}
            className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-0 print:max-w-none text-slate-900 text-sm leading-relaxed"
          >
            
            {/* 1. KOP DOKUMEN RESMI */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
              <h3 className="text-xs uppercase font-bold tracking-widest text-slate-600">
                PEMERINTAH PROVINSI DAERAH KHUSUS / DINAS PENDIDIKAN
              </h3>
              <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-wide mt-0.5">
                {namaSekolah}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Program Keahlian: {data.jurusan} • Mata Pelajaran: Bahasa Inggris Vokasi
              </p>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide underline underline-offset-4">
                {printScope === 'lkpd' ? 'LEMBAR KERJA PESERTA DIDIK (LKPD)' : printScope === 'asesmen' ? 'INSTRUMEN ASESMEN PEMBELAJARAN' : 'MODUL AJAR KURIKULUM MERDEKA'}
              </h2>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                Topik Pembelajaran: {data.topic}
              </p>
            </div>

            {/* TABEL IDENTITAS UMUM */}
            <div className="mb-6 overflow-hidden rounded-lg border border-slate-300">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-bold w-1/4 border-r border-slate-200">Nama Sekolah</td>
                    <td className="p-2 w-1/4 border-r border-slate-200">{namaSekolah}</td>
                    <td className="p-2 font-bold w-1/4 border-r border-slate-200">Fase / Kelas</td>
                    <td className="p-2 w-1/4">Fase {data.kelas === '10' ? 'E' : 'F'} / Kelas {data.kelas} SMK</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-bold border-r border-slate-200">Mata Pelajaran</td>
                    <td className="p-2 border-r border-slate-200">Bahasa Inggris (Vokasi)</td>
                    <td className="p-2 font-bold border-r border-slate-200">Semester</td>
                    <td className="p-2">Semester {data.semester}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-bold border-r border-slate-200">Konsentrasi Keahlian</td>
                    <td className="p-2 border-r border-slate-200">{data.jurusan}</td>
                    <td className="p-2 font-bold border-r border-slate-200">Alokasi Waktu</td>
                    <td className="p-2">{data.modulAjar?.keselarasan?.alokasiJamModul || 4} Jam Pelajaran (JP)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-200">Gaya Bahasa / Sintaks</td>
                    <td className="p-2 border-r border-slate-200 capitalize">{data.gayaBahasa || 'Formal Akademik'}</td>
                    <td className="p-2 font-bold border-r border-slate-200">Format Perangkat</td>
                    <td className="p-2 capitalize">{data.templateLayout || 'Standar Lengkap'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SEKSI MODUL AJAR */}
            {(printScope === 'all' || printScope === 'modul') && data.modulAjar && (
              <div className="space-y-6 mb-8">
                <div className="border-b border-slate-300 pb-1">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">A</span>
                    KOMPONEN INTI MODUL AJAR
                  </h3>
                </div>

                {/* 1. Tujuan Pembelajaran */}
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-slate-800">1. Tujuan Pembelajaran (Learning Objectives):</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {data.modulAjar.tujuanPembelajaran}
                  </div>
                </div>

                {/* 2. Pemahaman Bermakna & Pertanyaan Pemantik */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800">2. Pemahaman Bermakna:</h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed h-full">
                      {data.modulAjar.pemahamanBermakna}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800">3. Pertanyaan Pemantik (Essential Questions):</h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed h-full space-y-1">
                      {data.modulAjar.pertanyaanPemantik.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold">•</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Kegiatan Pembelajaran Per Pertemuan */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800">4. Kegiatan Pembelajaran Terstruktur:</h4>
                  {data.modulAjar.kegiatanPembelajaran.map((keg, idx) => (
                    <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 p-2 font-bold text-slate-900 border-b border-slate-300">
                        Pertemuan Ke-{keg.pertemuan || idx + 1}
                      </div>
                      <div className="p-3 space-y-2.5">
                        <div>
                          <span className="font-bold text-slate-800 block mb-0.5">a. Kegiatan Pendahuluan:</span>
                          <p className="text-slate-700 pl-3 leading-relaxed whitespace-pre-wrap">{keg.pembuka}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-0.5">b. Kegiatan Inti (Sintaks Pembelajaran Vokasi):</span>
                          <p className="text-slate-700 pl-3 leading-relaxed whitespace-pre-wrap">{keg.inti}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block mb-0.5">c. Kegiatan Penutup & Refleksi:</span>
                          <p className="text-slate-700 pl-3 leading-relaxed whitespace-pre-wrap">{keg.penutup}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Refleksi Guru & Siswa */}
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-slate-800">5. Rencana Refleksi Guru dan Peserta Didik:</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {data.modulAjar.refleksi}
                  </div>
                </div>
              </div>
            )}

            {/* SEKSI LKPD SISWA */}
            {(printScope === 'all' || printScope === 'lkpd') && data.lkpd && (
              <div className="space-y-6 mb-8 print:break-before-page">
                <div className="border-b border-slate-300 pb-1">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">B</span>
                    LEMBAR KERJA PESERTA DIDIK (LKPD VOKASI)
                  </h3>
                </div>

                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-bold">Judul LKPD: {data.lkpd.judul}</span>
                    <span className="text-slate-500">Nama Siswa / Kelompok: ____________________</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Tujuan Tugas: </span>
                    <span>{data.lkpd.tujuan}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Petunjuk Pengerjaan: </span>
                    <span>{data.lkpd.instruksi}</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <h4 className="font-bold text-slate-800">Daftar Aktivitas & Tugas Kejuruan:</h4>
                  {data.lkpd.aktivitas.map((act, idx) => (
                    <div key={idx} className="p-3.5 border border-slate-300 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                          Soal {idx + 1} ({act.tipe.toUpperCase()})
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 leading-relaxed">{act.pertanyaan}</p>

                      {act.tipe === 'pilihan_ganda' && act.opsi && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-3 pt-1">
                          {act.opsi.map((op, opIdx) => (
                            <div key={opIdx} className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border border-slate-400 inline-block shrink-0 text-center text-[9px]">
                                {String.fromCharCode(65 + opIdx)}
                              </span>
                              <span>{op}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {act.tipe === 'isian' && (
                        <div className="mt-2 border-b border-dotted border-slate-400 h-10 w-full" />
                      )}

                      {act.tipe === 'checklist' && (
                        <div className="mt-1 flex items-center gap-4 text-slate-500 italic text-[11px]">
                          <span>[ &nbsp; ] Ya / Sesuai Standar SOP</span>
                          <span>[ &nbsp; ] Tidak / Butuh Perbaikan</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEKSI ASESMEN & RUBRIK */}
            {(printScope === 'all' || printScope === 'asesmen') && data.asesmenInstrumen && (
              <div className="space-y-6 mb-8 print:break-before-page">
                <div className="border-b border-slate-300 pb-1">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold">C</span>
                    INSTRUMEN ASESMEN & RUBRIK PENILAIAN
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Formatif & Sumatif */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                      <h4 className="font-bold text-slate-900">Asesmen Formatif (Proses):</h4>
                      <p className="text-slate-700 leading-relaxed">{data.asesmenInstrumen.formatif.instruksi}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                      <h4 className="font-bold text-slate-900">Asesmen Sumatif (Akhir Bab):</h4>
                      <p className="text-slate-700 leading-relaxed">{data.asesmenInstrumen.sumatif.instruksi}</p>
                    </div>
                  </div>

                  {/* Rubrik Matriks Penilaian */}
                  {includeRubrik && data.asesmenInstrumen.sumatif.rubrik && data.asesmenInstrumen.sumatif.rubrik.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900">Rubrik Penilaian Kinerja Ketercapaian:</h4>
                      <div className="overflow-x-auto border border-slate-300 rounded-lg">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                              <th className="p-2 text-left border-r border-slate-300 w-1/4">Kriteria / Aspek</th>
                              <th className="p-2 text-left border-r border-slate-300">Perlu Bimbingan (1)</th>
                              <th className="p-2 text-left border-r border-slate-300">Cukup (2)</th>
                              <th className="p-2 text-left border-r border-slate-300">Baik (3)</th>
                              <th className="p-2 text-left">Sangat Baik (4)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.asesmenInstrumen.sumatif.rubrik.map((rub, idx) => (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className="p-2 font-semibold border-r border-slate-200 bg-slate-50">{rub.kriteria}</td>
                                <td className="p-2 border-r border-slate-200 text-slate-600">{rub.perluBimbingan}</td>
                                <td className="p-2 border-r border-slate-200 text-slate-600">{rub.cukup}</td>
                                <td className="p-2 border-r border-slate-200 text-slate-600">{rub.baik}</td>
                                <td className="p-2 text-slate-700 font-medium">{rub.sangatBaik}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEKSI CATATAN REVISI (OPSIONAL) */}
            {includeRevisionNotes && activeRevisions.length > 0 && (
              <div className="space-y-3 mb-8 print:break-before-page text-xs">
                <div className="border-b border-slate-300 pb-1">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider">
                    LAMPIRAN: CATATAN REVISI & TINDAK LANJUT GURU
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  {activeRevisions.map((rev, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        rev.status === 'selesai' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {rev.status === 'selesai' ? '✓' : '!'}
                      </span>
                      <div>
                        <span className="font-bold uppercase text-[10px] text-slate-600">[{rev.komponen}]</span>{' '}
                        <span>{rev.catatan}</span>
                        <span className="text-slate-400 text-[10px] ml-2">({rev.status === 'selesai' ? 'Selesai' : 'Perlu Tindakan'})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KOLOM TANDA TANGAN PENGESAHAN */}
            {includeSignature && (
              <div className="mt-10 pt-4 border-t border-slate-300 text-xs">
                <div className="flex justify-end mb-4">
                  <p>{kotaTanggal}</p>
                </div>
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p className="mb-16">Mengetahui,<br />Kepala Sekolah</p>
                    <p className="font-bold underline">{namaKepala}</p>
                    <p className="text-slate-600 text-[11px]">NIP. {nipKepala}</p>
                  </div>
                  <div>
                    <p className="mb-16">Guru Mata Pelajaran<br />Bahasa Inggris</p>
                    <p className="font-bold underline">{namaGuru}</p>
                    <p className="text-slate-600 text-[11px]">NIP. {nipGuru}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
