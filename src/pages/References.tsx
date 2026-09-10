import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Compass, ExternalLink, Sparkles, Copy, Check, 
  ArrowRight, ShieldCheck, MessageSquare, Tag, Award, 
  Network, Code, Wrench, Hotel, Utensils, Calculator, Palette, Pill,
  Layers, ChevronRight, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VocationalReferenceData } from '../types';

interface QuickSuggestion {
  jurusan: string;
  icon: string;
  topics: string[];
}

export default function References() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedJurusan, setSelectedJurusan] = useState('Teknik Komputer dan Jaringan (TKJ)');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [referenceData, setReferenceData] = useState<VocationalReferenceData | null>(null);
  const [quickSuggestions, setQuickSuggestions] = useState<QuickSuggestion[]>([]);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'standar' | 'istilah' | 'skenario' | 'sumber'>('all');

  useEffect(() => {
    // Fetch quick suggestions
    fetch('/api/references/quick-suggest')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQuickSuggestions(data);
      })
      .catch(err => console.warn('Failed to load suggestions:', err));
  }, []);

  const handleSearch = async (targetJurusan?: string, targetTopic?: string) => {
    const finalJurusan = targetJurusan || selectedJurusan;
    const finalTopic = targetTopic || query;

    if (!finalTopic.trim()) {
      setError('Harap masukkan topik, keterampilan, atau pilih saran di bawah.');
      return;
    }

    setIsLoading(true);
    setError('');
    setReferenceData(null);

    try {
      const res = await fetch('/api/references/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurusan: finalJurusan,
          topic: finalTopic,
          query: `${finalTopic} dalam kejuruan ${finalJurusan}`
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengambil referensi standar industri.');
      }

      const data: VocationalReferenceData = await res.json();
      setReferenceData(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses penelusuran standar industri.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleUseInGenerator = () => {
    if (!referenceData) return;
    navigate('/generator', {
      state: {
        prefillJurusan: referenceData.jurusan,
        prefillTopic: referenceData.topik
      }
    });
  };

  const getMajorIcon = (jurusanName: string) => {
    if (jurusanName.includes('Komputer') || jurusanName.includes('TKJ')) return Network;
    if (jurusanName.includes('Perangkat Lunak') || jurusanName.includes('RPL')) return Code;
    if (jurusanName.includes('Kendaraan') || jurusanName.includes('Otomotif')) return Wrench;
    if (jurusanName.includes('Perhotelan')) return Hotel;
    if (jurusanName.includes('Kuliner') || jurusanName.includes('Boga')) return Utensils;
    if (jurusanName.includes('Akuntansi')) return Calculator;
    if (jurusanName.includes('Desain') || jurusanName.includes('DKV')) return Palette;
    if (jurusanName.includes('Farmasi')) return Pill;
    return Compass;
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-primary via-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-accent text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
            <Sparkles size={14} /> Agen AI Riset Industri & SKKNI Vokasi
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Pusat Referensi Pedagogis & Standar DUDI
          </h1>
          <p className="text-white/80 text-base leading-relaxed">
            Eksplorasi acuan unit kompetensi SKKNI resmi, glosarium istilah kerja bahasa Inggris otentik, skenario dialog industri nyata, dan rekomendasi materi ajar kontekstual bebas klise AI.
          </p>
        </div>
      </div>

      {/* Search and Filter Box */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Konsentrasi Keahlian / Jurusan
            </label>
            <select
              value={selectedJurusan}
              onChange={(e) => setSelectedJurusan(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-brand-accent focus:bg-white outline-none transition-all text-sm"
            >
              <option value="Teknik Komputer dan Jaringan (TKJ)">Teknik Komputer dan Jaringan (TKJ)</option>
              <option value="Rekayasa Perangkat Lunak (RPL)">Rekayasa Perangkat Lunak (RPL)</option>
              <option value="Teknik Kendaraan Ringan (TKR / Otomotif)">Teknik Kendaraan Ringan (TKR / Otomotif)</option>
              <option value="Perhotelan & Akomodasi">Perhotelan & Akomodasi</option>
              <option value="Kuliner / Tata Boga">Kuliner / Tata Boga</option>
              <option value="Akuntansi & Keuangan Lembaga">Akuntansi & Keuangan Lembaga</option>
              <option value="Desain Komunikasi Visual (DKV)">Desain Komunikasi Visual (DKV)</option>
              <option value="Farmasi Klinis & Komunitas">Farmasi Klinis & Komunitas</option>
              <option value="Teknik Pengelasan & Fabrikasi Logam">Teknik Pengelasan & Fabrikasi Logam</option>
              <option value="Bisnis Digital & Pemasaran">Bisnis Digital & Pemasaran</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Topik Keterampilan / Kebutuhan Industri
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Contoh: Client Service Inquiry, Troubleshooting VLAN, EFI Engine Scan..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-accent focus:bg-white outline-none transition-all text-sm"
                />
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap disabled:opacity-50 text-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Cari Referensi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <HelpCircle size={16} /> {error}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 block mb-2">
            Rekomendasi Topik Cepat Berdasarkan Jurusan Vokasi:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions
              .filter(s => s.jurusan === selectedJurusan || selectedJurusan.includes(s.jurusan.split(' ')[0]))
              .flatMap(s => s.topics)
              .slice(0, 4)
              .map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(topic);
                    handleSearch(selectedJurusan, topic);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-brand-accent/10 hover:text-brand-accent text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight size={12} className="text-slate-400" /> {topic}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Menjelajah Standar DUDI & SKKNI...</h3>
            <p className="text-sm text-slate-500 mt-1">
              Agen AI sedang menyusun standar unjuk kerja, glosarium teknis otentik, dan skenario dialog industri.
            </p>
          </div>
        </div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {referenceData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Action Bar Header */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {referenceData.jurusan}
                  </span>
                  {referenceData.standarKompetensi.skkniCode && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {referenceData.standarKompetensi.skkniCode}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{referenceData.topik}</h2>
              </div>

              <button
                onClick={handleUseInGenerator}
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl shadow transition-all flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap"
              >
                <span>Buat Modul dengan Referensi Ini</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm">
              {[
                { id: 'all', label: 'Semua Rujukan', icon: Layers },
                { id: 'standar', label: 'Standar SKKNI & DUDI', icon: ShieldCheck },
                { id: 'istilah', label: `Glosarium Istilah (${referenceData.istilahIndustri.length})`, icon: Tag },
                { id: 'skenario', label: 'Skenario Dialog Kerja', icon: MessageSquare },
                { id: 'sumber', label: `Dokumen Rujukan (${referenceData.sumberReferensi.length})`, icon: ExternalLink },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-brand-accent text-brand-accent'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab: Standar Kompetensi */}
            {(activeTab === 'all' || activeTab === 'standar') && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Standar Unjuk Kerja Vokasi</h3>
                      <p className="text-xs text-slate-500">Rujukan Unit Kompetensi Kerja Nasional & Standar Industri</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyText(
                      `${referenceData.standarKompetensi.deskripsiUnit}\n\nKriteria Kinerja:\n${referenceData.standarKompetensi.kriteriaKinerja.map((k, i) => `${i + 1}. ${k}`).join('\n')}`,
                      'standar'
                    )}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                    title="Salin Standar"
                  >
                    {copiedItem === 'standar' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-sm text-slate-800 leading-relaxed font-medium">
                  {referenceData.standarKompetensi.deskripsiUnit}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                    Kriteria Unjuk Kerja Terukur (Performance Criteria):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {referenceData.standarKompetensi.kriteriaKinerja.map((kriteria, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100/80 rounded-xl text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{kriteria}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Glosarium Istilah */}
            {(activeTab === 'all' || activeTab === 'istilah') && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                      <Tag size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Glosarium Kosakata & Frasa Industri</h3>
                      <p className="text-xs text-slate-500">Terminologi teknis bahasa Inggris otentik di tempat kerja</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referenceData.istilahIndustri.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 hover:bg-amber-50/40 border border-slate-200/80 hover:border-amber-200 rounded-xl transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-base">{item.term}</span>
                        <button
                          onClick={() => copyText(`${item.term}: ${item.artinya}\nContoh: "${item.contohKalimatVokasi}"`, `term-${idx}`)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          {copiedItem === `term-${idx}` ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.artinya}</p>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-xs font-mono text-slate-800">
                        <span className="text-amber-700 font-bold block mb-0.5">Penggunaan Kalimat Vokasi:</span>
                        "{item.contohKalimatVokasi}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Skenario & Dialog Otentik */}
            {(activeTab === 'all' || activeTab === 'skenario') && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <MessageSquare size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Skenario Kasus & Transkrip Dialog Nyata</h3>
                      <p className="text-xs text-slate-500">Bahan latihan role-play dan simulasi komunikasi di tempat kerja</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyText(
                      `SKENARIO: ${referenceData.skenarioDuniaKerja.judulKasus}\nKonteks: ${referenceData.skenarioDuniaKerja.konteksIndustri}\n\nDIALOG:\n${referenceData.skenarioDuniaKerja.dialogOtentik.map(d => `${d.speaker}: ${d.text}`).join('\n')}\n\nTantangan: ${referenceData.skenarioDuniaKerja.tantanganKerja}`,
                      'dialog'
                    )}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    {copiedItem === 'dialog' ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl mb-4">
                  <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block mb-1">
                    Kasus: {referenceData.skenarioDuniaKerja.judulKasus}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {referenceData.skenarioDuniaKerja.konteksIndustri}
                  </p>
                </div>

                {/* Dialogue List */}
                <div className="space-y-3 mb-4">
                  {referenceData.skenarioDuniaKerja.dialogOtentik.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border ${
                        idx % 2 === 0 
                          ? 'bg-slate-50 border-slate-200/80 mr-6' 
                          : 'bg-emerald-50/60 border-emerald-200/80 ml-6'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          idx % 2 === 0 ? 'bg-slate-200 text-slate-800' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {turn.speaker}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium italic">
                        "{turn.text}"
                      </p>
                    </div>
                  ))}
                </div>

                {/* Work Challenge */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                    <Award size={16} />
                    <span>Tantangan Pemecahan Masalah Siswa (Workplace Problem):</span>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {referenceData.skenarioDuniaKerja.tantanganKerja}
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Sumber Dokumen & Rekomendasi */}
            {(activeTab === 'all' || activeTab === 'sumber') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* References */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Dokumen Acuan & Standar</h3>
                      <p className="text-xs text-slate-500">Rujukan regulasi dan literatur industri</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {referenceData.sumberReferensi.map((src, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-slate-900 text-sm">{src.title}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {src.sourceType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2">{src.snippet}</p>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline font-semibold"
                          >
                            <span>Buka Tautan Acuan</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Saran Aktivitas Praktik Vokasi</h3>
                      <p className="text-xs text-slate-500">Ide proyek Teaching Factory & Praktik Bengkel</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {referenceData.rekomendasiMateriAjar.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-rose-50/40 border border-rose-100 rounded-xl text-xs sm:text-sm text-slate-800">
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State / Initial Guide */}
      {!referenceData && !isLoading && (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Compass size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Eksplorasi Standar Vokasi & DUDI</h3>
          <p className="text-slate-600 max-w-lg mx-auto text-sm mb-6 leading-relaxed">
            Pilih kejuruan dan masukkan topik atau klik tombol saran di atas untuk mengekstrak standar SKKNI, transkrip dialog kerja otentik, dan glosarium istilah industri.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <ShieldCheck size={20} className="text-blue-600 mb-2" />
              <h4 className="font-bold text-slate-800 text-sm mb-1">Standar SKKNI Resmi</h4>
              <p className="text-xs text-slate-500">Unit kompetensi & kriteria unjuk kerja terukur dari Kemnaker & BNSP.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <Tag size={20} className="text-amber-600 mb-2" />
              <h4 className="font-bold text-slate-800 text-sm mb-1">Glosarium DUDI</h4>
              <p className="text-xs text-slate-500">Kosakata teknis bahasa Inggris kerja dengan contoh kalimat riil.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <MessageSquare size={20} className="text-emerald-600 mb-2" />
              <h4 className="font-bold text-slate-800 text-sm mb-1">Dialog Otentik</h4>
              <p className="text-xs text-slate-500">Transkrip percakapan kerja bebas klise untuk latihan role-play siswa.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
