import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileCheck, Loader2, X, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface DocumentUploaderProps {
  label: string;
  onExtracted: (text: string, fileName: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DocumentUploader({ label, onExtracted, disabled = false, compact = false }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUploadedFile, setLastUploadedFile] = useState<{ name: string; size: number; chars: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isValidFormat = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || lowerName.endsWith('.txt');

    if (!isValidFormat) {
      setErrorMessage('Format file tidak didukung. Harap unggah file dengan ekstensi .pdf atau .docx');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 25 MB.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengekstrak teks dari dokumen');
      }

      setLastUploadedFile({
        name: result.fileName,
        size: result.fileSize,
        chars: result.characterCount,
      });

      onExtracted(result.text, result.fileName);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses dokumen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={14} />}
          <span>{isUploading ? 'Mengekstrak Dokumen...' : 'Upload PDF/DOCX'}</span>
        </button>

        {errorMessage && (
          <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle size={13} /> {errorMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-brand-primary bg-brand-bg/80 scale-[0.99] shadow-inner'
            : 'border-slate-200 hover:border-brand-primary/50 bg-slate-50/70 hover:bg-slate-50'
        } ${disabled || isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDragging ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-primary'}`}>
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <UploadCloud size={20} />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">
              {isUploading ? 'Sedang mengekstrak isi teks dokumen...' : `Tarik file PDF atau DOCX ${label} ke sini`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              atau <span className="text-brand-primary font-semibold underline">klik untuk memilih file</span> (Maksimal 25MB)
            </p>
          </div>
        </div>
      </div>

      {lastUploadedFile && (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileCheck size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold truncate max-w-xs">{lastUploadedFile.name}</span>
            <span className="text-emerald-700/70 text-[11px]">({formatFileSize(lastUploadedFile.size)} • {lastUploadedFile.chars.toLocaleString()} karakter)</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLastUploadedFile(null);
            }}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-500 hover:text-rose-700"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
