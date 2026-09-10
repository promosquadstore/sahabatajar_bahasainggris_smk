import React, { useState } from 'react';
import { 
  CheckCircle2, Plus, Trash2, Edit3, X, Check, AlertCircle, 
  Copy, FileText, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { RevisionNote } from '../types';

interface RevisionNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: RevisionNote[];
  onSaveNotes: (updatedNotes: RevisionNote[]) => Promise<void>;
  activeComponentContext?: 'umum' | 'modul' | 'lkpd' | 'media' | 'asesmen';
}

export const RevisionNotesDrawer: React.FC<RevisionNotesDrawerProps> = ({
  isOpen,
  onClose,
  notes = [],
  onSaveNotes,
  activeComponentContext = 'umum'
}) => {
  const [newCatatan, setNewCatatan] = useState('');
  const [targetKomponen, setTargetKomponen] = useState<'umum' | 'modul' | 'lkpd' | 'media' | 'asesmen'>(activeComponentContext);
  const [filterKomponen, setFilterKomponen] = useState<'all' | 'umum' | 'modul' | 'lkpd' | 'media' | 'asesmen'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  if (!isOpen) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatatan.trim()) return;

    const newNote: RevisionNote = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      catatan: newCatatan.trim(),
      komponen: targetKomponen,
      status: 'perlu_tindakan',
      createdAt: Date.now()
    };

    const updated = [newNote, ...notes];
    setIsSaving(true);
    await onSaveNotes(updated);
    setIsSaving(false);
    setNewCatatan('');
  };

  const handleToggleStatus = async (id: string) => {
    const updated = notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          status: n.status === 'selesai' ? ('perlu_tindakan' as const) : ('selesai' as const)
        };
      }
      return n;
    });
    setIsSaving(true);
    await onSaveNotes(updated);
    setIsSaving(false);
  };

  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setIsSaving(true);
    await onSaveNotes(updated);
    setIsSaving(false);
  };

  const handleStartEdit = (note: RevisionNote) => {
    setEditingId(note.id);
    setEditingText(note.catatan);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    const updated = notes.map(n => n.id === id ? { ...n, catatan: editingText.trim() } : n);
    setIsSaving(true);
    await onSaveNotes(updated);
    setIsSaving(false);
    setEditingId(null);
  };

  const filteredNotes = notes.filter(n => filterKomponen === 'all' || n.komponen === filterKomponen);
  const pendingCount = notes.filter(n => n.status === 'perlu_tindakan').length;
  const completedCount = notes.filter(n => n.status === 'selesai').length;

  const handleCopyChecklist = () => {
    const text = [
      `CATATAN REVISI PERANGKAT AJAR`,
      `Progress: ${completedCount}/${notes.length} Poin Selesai`,
      `-----------------------------------------`,
      ...notes.map((n, i) => `[${n.status === 'selesai' ? 'X' : ' '}] (${n.komponen.toUpperCase()}) ${n.catatan}`)
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getKomponenLabel = (komponen: string) => {
    switch (komponen) {
      case 'modul': return 'Modul Ajar';
      case 'lkpd': return 'LKPD Siswa';
      case 'media': return 'Media Ajar';
      case 'asesmen': return 'Asesmen & Rubrik';
      default: return 'Umum';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Edit3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Catatan Revisi Perangkat</h3>
                {pendingCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    {pendingCount} Perlu Perbaikan
                  </span>
                ) : notes.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Semua Selesai
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">Catat poin perbaikan manual sebelum mencetak/mengunduh</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <div className="p-4 border-b border-slate-200 bg-white shrink-0">
          <form onSubmit={handleAddNote} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">Tulis Catatan Perbaikan Baru:</label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Sasaran:</span>
                <select
                  value={targetKomponen}
                  onChange={e => setTargetKomponen(e.target.value as any)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="umum">Umum</option>
                  <option value="modul">Modul Ajar</option>
                  <option value="lkpd">LKPD Siswa</option>
                  <option value="media">Media Pembelajaran</option>
                  <option value="asesmen">Asesmen & Rubrik</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCatatan}
                onChange={e => setNewCatatan(e.target.value)}
                placeholder="Contoh: 'Sesuaikan durasi role-play ke 30 menit', 'Ganti istilah SOP...'"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newCatatan.trim() || isSaving}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Tambah</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-slate-400 shrink-0" />
            {[
              { id: 'all', label: 'Semua' },
              { id: 'modul', label: 'Modul' },
              { id: 'lkpd', label: 'LKPD' },
              { id: 'media', label: 'Media' },
              { id: 'asesmen', label: 'Asesmen' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterKomponen(f.id as any)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  filterKomponen === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {notes.length > 0 && (
            <button
              onClick={handleCopyChecklist}
              className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Copy size={12} />
              <span>{copied ? 'Tersalin!' : 'Salin Checklist'}</span>
            </button>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Belum ada catatan revisi</p>
              <p className="text-[11px] max-w-xs mx-auto">
                Ketik poin-poin yang ingin disempurnakan pada form di atas agar Anda tidak lupa saat mengedit atau berdiskusi dengan rekan MGMP.
              </p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                className={`p-3 rounded-2xl border transition-all ${
                  note.status === 'selesai'
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-white border-amber-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => handleToggleStatus(note.id)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      note.status === 'selesai'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-amber-500 bg-white'
                    }`}
                    title={note.status === 'selesai' ? 'Tandai belum selesai' : 'Tandai selesai'}
                  >
                    {note.status === 'selesai' && <Check size={13} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        note.komponen === 'modul' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        note.komponen === 'lkpd' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        note.komponen === 'media' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        note.komponen === 'asesmen' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {getKomponenLabel(note.komponen)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {editingId === note.id ? (
                      <div className="space-y-2 mt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          className="w-full px-2.5 py-1 bg-white border border-brand-primary rounded-lg text-xs"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-2.5 py-1 bg-brand-primary text-white text-[11px] font-bold rounded-lg"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[11px] rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-xs leading-relaxed text-slate-800 ${
                        note.status === 'selesai' ? 'line-through text-slate-400' : 'font-medium'
                      }`}>
                        {note.catatan}
                      </p>
                    )}
                  </div>

                  {editingId !== note.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Edit catatan"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Hapus catatan"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{notes.length} total catatan ({completedCount} selesai)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
