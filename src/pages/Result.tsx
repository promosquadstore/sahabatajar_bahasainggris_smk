import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleById, updateModule } from '../lib/storage';
import { ModuleData, GayaBahasaType, TemplateLayoutType, LkpdData, MediaData, AsesmenData, VocationalReferenceData, RevisionNote } from '../types';
import { 
  FileText, Download, Edit3, MonitorPlay, Layers, ClipboardCheck, ArrowLeft, 
  AlertCircle, AlertTriangle, Loader2, Sparkles, CheckCircle2, BookOpen, 
  Smile, Zap, Trophy, FileCheck, Briefcase, Copy, Check, Printer, 
  Plus, Trash2, Play, ChevronRight, ChevronLeft, RotateCcw, Calculator,
  Compass, ShieldCheck, Tag, MessageSquare, ExternalLink, Eye, Cloud
} from 'lucide-react';
import { motion } from 'motion/react';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { RevisionNotesDrawer } from '../components/RevisionNotesDrawer';
import { exportModuleToDocx, generateModuleDocxBlob } from '../lib/docxExporter';

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ModuleData | null>(null);
  const [activeTab, setActiveTab] = useState<'modul' | 'lkpd' | 'media' | 'asesmen' | 'referensi'>('modul');
  
  // Modals & Drawers state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  const handleExportDocx = async () => {
    if (!data) return;
    setIsExportingDocx(true);
    try {
      await exportModuleToDocx(data);
      showToast('Dokumen Word (.docx) berhasil dibuat dan diunduh!');
    } catch (err: any) {
      console.error('Docx export error:', err);
      setError('Gagal mengunduh dokumen Word: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleUploadToDrive = async () => {
    if (!data) return;
    setIsUploadingToDrive(true);
    setError('');
    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        throw new Error("SDK Google Identity Services gagal dimuat. Pastikan Anda tidak memblokir skrip pihak ketiga.");
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: "145074551849-hpu90t04dg6bnjii2jsrosta7eunbj45.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setError("Gagal mendapatkan izin Google Drive: " + tokenResponse.error);
            setIsUploadingToDrive(false);
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            setError("Token akses Google Drive kosong.");
            setIsUploadingToDrive(false);
            return;
          }

          try {
            showToast("Menyiapkan dokumen Word...");
            const blob = await generateModuleDocxBlob(data);
            const fileName = `Perangkat_Ajar_${data.topic.replace(/\s+/g, '_')}.docx`;

            showToast("Mencari folder 'Sahabat Ajar'...");
            let folderId = null;
            try {
              const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name%20%3D%20'Sahabat%20Ajar'%20and%20mimeType%20%3D%20'application%2Fvnd.google-apps.folder'%20and%20trashed%20%3D%20false`;
              const searchResponse = await fetch(searchUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              if (searchResponse.ok) {
                const searchResult = await searchResponse.json();
                if (searchResult.files && searchResult.files.length > 0) {
                  folderId = searchResult.files[0].id;
                }
              }
            } catch (searchErr) {
              console.error("Gagal mendeteksi folder:", searchErr);
            }

            if (!folderId) {
              showToast("Membuat folder 'Sahabat Ajar' baru...");
              try {
                const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: 'Sahabat Ajar',
                    mimeType: 'application/vnd.google-apps.folder',
                  }),
                });
                if (createFolderResponse.ok) {
                  const folderData = await createFolderResponse.json();
                  folderId = folderData.id;
                }
              } catch (createErr) {
                console.error("Gagal membuat folder:", createErr);
              }
            }

            showToast("Mengunggah ke Google Drive...");
            const metadata: any = {
              name: fileName,
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            };

            if (folderId) {
              metadata.parents = [folderId];
            }

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: form,
            });

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Google Drive API error: ${errText}`);
            }

            const resData = await response.json();
            showToast("Berhasil disimpan ke folder 'Sahabat Ajar' di Google Drive!");
            
            if (resData.id) {
              const fileUrl = `https://docs.google.com/document/d/${resData.id}/edit`;
              window.open(fileUrl, '_blank');
            }
          } catch (err: any) {
            console.error("Upload error:", err);
            setError("Gagal mengunggah ke Google Drive: " + (err.message || err));
          } finally {
            setIsUploadingToDrive(false);
          }
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      console.error("GSI Init error:", err);
      setError(err.message || "Gagal mengunggah ke Google Drive.");
      setIsUploadingToDrive(false);
    }
  };
  
  // Generation loading states
  const [isGeneratingModul, setIsGeneratingModul] = useState(false);
  const [isGeneratingLkpd, setIsGeneratingLkpd] = useState(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isGeneratingAsesmen, setIsGeneratingAsesmen] = useState(false);
  const [isGeneratingReferensi, setIsGeneratingReferensi] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [fokusAsesmen, setFokusAsesmen] = useState('Tes Tulis & Praktik (Standar)');
  const [error, setError] = useState('');
  const [copiedNotification, setCopiedNotification] = useState('');

  // Interactive LKPD State
  const [lkpdMode, setLkpdMode] = useState<'preview' | 'interactive' | 'edit'>('preview');
  const [lkpdAnswers, setLkpdAnswers] = useState<Record<number, any>>({});
  const [lkpdScoreResult, setLkpdScoreResult] = useState<{ answered: number; total: number; percentage: number } | null>(null);
  const [editableLkpd, setEditableLkpd] = useState<LkpdData | null>(null);

  // Interactive Media State
  const [mediaMode, setMediaMode] = useState<'overview' | 'simulator' | 'edit'>('overview');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepCompleted, setStepCompleted] = useState<Record<number, boolean>>({});
  const [editableMedia, setEditableMedia] = useState<MediaData | null>(null);

  // Interactive Asesmen State
  const [asesmenSubTab, setAsesmenSubTab] = useState<'diagnostik' | 'formatif' | 'sumatif'>('diagnostik');
  const [asesmenMode, setAsesmenMode] = useState<'view' | 'calculator' | 'edit'>('view');
  const [selectedRubricScores, setSelectedRubricScores] = useState<Record<string, number>>({});
  const [editableAsesmen, setEditableAsesmen] = useState<AsesmenData | null>(null);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        const moduleData = await getModuleById(id);
        if (moduleData) {
          setData(moduleData);
          if (moduleData.lkpd) setEditableLkpd(JSON.parse(JSON.stringify(moduleData.lkpd)));
          if (moduleData.media) setEditableMedia(JSON.parse(JSON.stringify(moduleData.media)));
          if (moduleData.asesmenInstrumen) setEditableAsesmen(JSON.parse(JSON.stringify(moduleData.asesmenInstrumen)));
        } else {
          navigate('/history');
        }
      };
      fetchData();
    }
  }, [id, navigate]);

  useEffect(() => {
    if (data && !sessionStorage.getItem(`autodownload_${data.id}`)) {
      sessionStorage.setItem(`autodownload_${data.id}`, 'true');
      exportModuleToDocx(data).catch(console.error);
    }
  }, [data]);

  const showToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin ke clipboard!`);
  };

  // Check missing components
  const hasMissingComponents = !data?.lkpd || !data?.media || !data?.asesmenInstrumen;

  // 1-Click Generate All Missing Components
  const handleGenerateAllMissing = async () => {
    if (!data || !data.modulAjar) return;
    setIsGeneratingBatch(true);
    setError('');

    try {
      const selectedTone = data.gayaBahasa || 'formal';
      const promises: Promise<any>[] = [];

      if (!data.lkpd) {
        promises.push(
          fetch('/api/generate/lkpd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jurusan: data.jurusan,
              topic: data.topic,
              modulAjar: data.modulAjar,
              gayaBahasa: selectedTone,
              templateLayout: data.templateLayout || 'lengkap'
            })
          }).then(r => r.json())
        );
      } else {
        promises.push(Promise.resolve(data.lkpd));
      }

      if (!data.media) {
        promises.push(
          fetch('/api/generate/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jurusan: data.jurusan,
              topic: data.topic,
              modulAjar: data.modulAjar,
              gayaBahasa: selectedTone,
              templateLayout: data.templateLayout || 'lengkap'
            })
          }).then(r => r.json())
        );
      } else {
        promises.push(Promise.resolve(data.media));
      }

      if (!data.asesmenInstrumen) {
        promises.push(
          fetch('/api/generate/asesmen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jurusan: data.jurusan,
              topic: data.topic,
              modulAjar: data.modulAjar,
              fokusAsesmen,
              gayaBahasa: selectedTone,
              templateLayout: data.templateLayout || 'lengkap'
            })
          }).then(r => r.json())
        );
      } else {
        promises.push(Promise.resolve(data.asesmenInstrumen));
      }

      const [lkpdRes, mediaRes, asesmenRes] = await Promise.all(promises);

      const updated = {
        lkpd: lkpdRes,
        media: mediaRes,
        asesmenInstrumen: asesmenRes
      };

      await updateModule(data.id, updated);
      setData(prev => prev ? { ...prev, ...updated } : null);
      setEditableLkpd(JSON.parse(JSON.stringify(lkpdRes)));
      setEditableMedia(JSON.parse(JSON.stringify(mediaRes)));
      setEditableAsesmen(JSON.parse(JSON.stringify(asesmenRes)));
      showToast('Seluruh perangkat (LKPD, Media, Asesmen) berhasil dilengkapi!');
    } catch (err: any) {
      setError(err.message || 'Gagal melengkapi sisa perangkat.');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleRegenerateModul = async (customTone?: GayaBahasaType, customLayout?: TemplateLayoutType) => {
    if (!data) return;
    setIsGeneratingModul(true);
    setError('');

    try {
      const userContextStr = localStorage.getItem('user_context');
      const userContext = userContextStr ? JSON.parse(userContextStr) : null;
      
      const selectedTone = customTone || data.gayaBahasa || 'formal';
      const selectedLayout = customLayout || data.templateLayout || 'lengkap';

      const payload = {
        prota: userContext?.prota || 'Program Tahunan Default',
        prosem: userContext?.prosem || 'Program Semester Default',
        cpAtp: userContext?.cpAtp || 'Capaian Pembelajaran Default',
        kelas: data.kelas,
        semester: data.semester,
        jurusan: data.jurusan,
        topic: data.topic,
        gayaBahasa: selectedTone,
        templateLayout: selectedLayout
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let msg = 'Gagal menyusun ulang Modul Ajar';
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const result = await response.json();
      
      const updatedFields = {
        modulAjar: result,
        gayaBahasa: selectedTone,
        templateLayout: selectedLayout
      };

      await updateModule(data.id, updatedFields);
      setData(prev => prev ? { ...prev, ...updatedFields } : null);
      showToast('Modul Ajar berhasil diperbarui!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingModul(false);
    }
  };

  const handleGenerateLkpd = async (customTone?: GayaBahasaType) => {
    if (!data) return;
    setIsGeneratingLkpd(true);
    setError('');

    try {
      const selectedTone = customTone || data.gayaBahasa || 'formal';
      const response = await fetch('/api/generate/lkpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurusan: data.jurusan,
          topic: data.topic,
          modulAjar: data.modulAjar,
          gayaBahasa: selectedTone,
          templateLayout: data.templateLayout || 'lengkap'
        }),
      });

      if (!response.ok) {
        let msg = 'Gagal menyusun LKPD';
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const lkpdData = await response.json();
      
      await updateModule(data.id, { lkpd: lkpdData });
      setData(prev => prev ? { ...prev, lkpd: lkpdData } : null);
      setEditableLkpd(JSON.parse(JSON.stringify(lkpdData)));
      setLkpdScoreResult(null);
      showToast('LKPD Interaktif berhasil dibuat!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingLkpd(false);
    }
  };

  const handleGenerateMedia = async (customTone?: GayaBahasaType) => {
    if (!data) return;
    setIsGeneratingMedia(true);
    setError('');

    try {
      const selectedTone = customTone || data.gayaBahasa || 'formal';
      const response = await fetch('/api/generate/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurusan: data.jurusan,
          topic: data.topic,
          modulAjar: data.modulAjar,
          gayaBahasa: selectedTone,
          templateLayout: data.templateLayout || 'lengkap'
        }),
      });

      if (!response.ok) {
        let msg = 'Gagal merancang Media';
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const mediaData = await response.json();
      
      await updateModule(data.id, { media: mediaData });
      setData(prev => prev ? { ...prev, media: mediaData } : null);
      setEditableMedia(JSON.parse(JSON.stringify(mediaData)));
      setActiveStepIndex(0);
      showToast('Rancangan Media Pembelajaran berhasil dibuat!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  const handleGenerateAsesmen = async (customTone?: GayaBahasaType) => {
    if (!data) return;
    setIsGeneratingAsesmen(true);
    setError('');

    try {
      const selectedTone = customTone || data.gayaBahasa || 'formal';
      const response = await fetch('/api/generate/asesmen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurusan: data.jurusan,
          topic: data.topic,
          modulAjar: data.modulAjar,
          fokusAsesmen,
          gayaBahasa: selectedTone,
          templateLayout: data.templateLayout || 'lengkap'
        }),
      });

      if (!response.ok) {
        let msg = 'Gagal menyusun Asesmen';
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const asesmenData = await response.json();
      
      await updateModule(data.id, { asesmenInstrumen: asesmenData });
      setData(prev => prev ? { ...prev, asesmenInstrumen: asesmenData } : null);
      setEditableAsesmen(JSON.parse(JSON.stringify(asesmenData)));
      setSelectedRubricScores({});
      showToast('Instrumen Asesmen & Rubrik berhasil dibuat!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingAsesmen(false);
    }
  };

  const handleGenerateReferensi = async () => {
    if (!data) return;
    setIsGeneratingReferensi(true);
    setError('');

    try {
      const response = await fetch('/api/references/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurusan: data.jurusan,
          topic: data.topic,
          query: `${data.topic} untuk kejuruan SMK ${data.jurusan}`
        }),
      });

      if (!response.ok) {
        let msg = 'Gagal menelusuri standar referensi industri';
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const refData: VocationalReferenceData = await response.json();
      
      await updateModule(data.id, { referensiIndustri: refData });
      setData(prev => prev ? { ...prev, referensiIndustri: refData } : null);
      showToast('Standar Industri & SKKNI berhasil diselaraskan!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingReferensi(false);
    }
  };

  // Save edited LKPD
  const handleSaveEditedLkpd = async () => {
    if (!data || !editableLkpd) return;
    await updateModule(data.id, { lkpd: editableLkpd });
    setData({ ...data, lkpd: editableLkpd });
    setLkpdMode('preview');
    showToast('Perubahan LKPD berhasil disimpan!');
  };

  // Save edited Media
  const handleSaveEditedMedia = async () => {
    if (!data || !editableMedia) return;
    await updateModule(data.id, { media: editableMedia });
    setData({ ...data, media: editableMedia });
    setMediaMode('overview');
    showToast('Perubahan Media Pembelajaran berhasil disimpan!');
  };

  // Save edited Asesmen
  const handleSaveEditedAsesmen = async () => {
    if (!data || !editableAsesmen) return;
    await updateModule(data.id, { asesmenInstrumen: editableAsesmen });
    setData({ ...data, asesmenInstrumen: editableAsesmen });
    setAsesmenMode('view');
    showToast('Perubahan Instrumen Asesmen berhasil disimpan!');
  };

  // Check LKPD Interactive Answers
  const handleCheckLkpdScore = () => {
    if (!data?.lkpd) return;
    const total = data.lkpd.aktivitas.length;
    let answered = 0;
    data.lkpd.aktivitas.forEach((_, idx) => {
      if (lkpdAnswers[idx] !== undefined && lkpdAnswers[idx] !== '') {
        answered += 1;
      }
    });
    const percentage = Math.round((answered / total) * 100);
    setLkpdScoreResult({ answered, total, percentage });
  };

  // Reset LKPD answers
  const handleResetLkpdAnswers = () => {
    setLkpdAnswers({});
    setLkpdScoreResult(null);
  };

  // Rubric Calculator Logic
  const handleSelectRubricScore = (criteriaKey: string, score: number) => {
    setSelectedRubricScores(prev => ({ ...prev, [criteriaKey]: score }));
  };

  const getActiveRubricList = () => {
    if (!data?.asesmenInstrumen) return [];
    if (asesmenSubTab === 'diagnostik') return data.asesmenInstrumen.diagnostik.rubrik;
    if (asesmenSubTab === 'formatif') return data.asesmenInstrumen.formatif.rubrik;
    return data.asesmenInstrumen.sumatif.rubrik;
  };

  const calculateRubricTotal = () => {
    const rubrics = getActiveRubricList();
    if (!rubrics || rubrics.length === 0) return { score: 0, max: 0, pct: 0, predicate: '-' };
    let currentScore = 0;
    const maxScore = rubrics.length * 4;
    rubrics.forEach((r, idx) => {
      const key = `${asesmenSubTab}_${idx}`;
      currentScore += (selectedRubricScores[key] || 0);
    });
    const pct = Math.round((currentScore / maxScore) * 100);
    let predicate = 'Perlu Bimbingan';
    if (pct >= 85) predicate = 'Sangat Baik (A)';
    else if (pct >= 70) predicate = 'Baik (B)';
    else if (pct >= 55) predicate = 'Cukup (C)';
    return { score: currentScore, max: maxScore, pct, predicate };
  };

  // Single Component Exports
  const handleDownloadSingleComponent = (type: 'lkpd' | 'media' | 'asesmen') => {
    if (!data) return;
    let title = '';
    let bodyHtml = '';

    if (type === 'lkpd' && data.lkpd) {
      title = `LKPD_${data.topic.replace(/\s+/g, '_')}`;
      bodyHtml = `
        <h1>Lembar Kerja Peserta Didik (LKPD)</h1>
        <p><strong>Mata Pelajaran:</strong> Bahasa Inggris SMK | <strong>Jurusan:</strong> ${data.jurusan} | <strong>Kelas:</strong> ${data.kelas}</p>
        <hr/>
        <h2>${data.lkpd.judul}</h2>
        <p><strong>Tujuan:</strong> ${data.lkpd.tujuan}</p>
        <div style="background:#fef3c7; padding:15px; border-radius:8px; margin:20px 0;"><strong>Instruksi Guru:</strong> ${data.lkpd.instruksi}</div>
        <h3>Aktivitas Siswa:</h3>
        <ol>
          ${data.lkpd.aktivitas.map(a => `
            <li style="margin-bottom:15px;">
              <p><strong>${a.pertanyaan}</strong></p>
              ${a.tipe === 'pilihan_ganda' && a.opsi ? `<ul>${a.opsi.map(o => `<li>${o}</li>`).join('')}</ul>` : ''}
              ${a.tipe === 'isian' ? '<p><em>Jawaban: __________________________________________________</em></p>' : ''}
              ${a.tipe === 'checklist' ? '<p>[ ] <em>Tandai jika tugas sudah terlaksana</em></p>' : ''}
            </li>
          `).join('')}
        </ol>
      `;
    } else if (type === 'media' && data.media) {
      title = `Rancangan_Media_${data.topic.replace(/\s+/g, '_')}`;
      bodyHtml = `
        <h1>Rancangan Media Pembelajaran Interaktif Vokasi</h1>
        <p><strong>Jurusan:</strong> ${data.jurusan} | <strong>Topik:</strong> ${data.topic}</p>
        <hr/>
        <h2>${data.media.judulKonsep}</h2>
        <p><strong>Format Media:</strong> ${data.media.formatMedia}</p>
        <p><strong>Skenario Utama:</strong><br/>${data.media.skenarioUtama}</p>
        <h3>Langkah-Langkah Interaktif:</h3>
        <table border="1" cellpadding="10" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr style="background:#f1f5f9;">
            <th>Tahap</th>
            <th>Situasi Layar / Tampilan</th>
            <th>Tindakan Siswa</th>
          </tr>
          ${data.media.langkahInteraktif.map(l => `
            <tr>
              <td><strong>${l.tahap}</strong></td>
              <td>${l.deskripsiLayar}</td>
              <td>${l.tindakanSiswa}</td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (type === 'asesmen' && data.asesmenInstrumen) {
      title = `Instrumen_Asesmen_${data.topic.replace(/\s+/g, '_')}`;
      const renderSection = (secTitle: string, secData: any) => `
        <h2>${secTitle}</h2>
        <p><strong>Tujuan:</strong> ${secData.tujuan}</p>
        <p><strong>Instruksi:</strong> ${secData.instruksi}</p>
        <h3>Butir Soal / Tugas:</h3>
        <ol>${secData.butirSoalAtauTugas.map((s: string) => `<li>${s}</li>`).join('')}</ol>
        <h3>Rubrik Penilaian:</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:30px;">
          <tr style="background:#f1f5f9;">
            <th>Kriteria</th>
            <th>Perlu Bimbingan (1)</th>
            <th>Cukup (2)</th>
            <th>Baik (3)</th>
            <th>Sangat Baik (4)</th>
          </tr>
          ${secData.rubrik.map((r: any) => `
            <tr>
              <td><strong>${r.kriteria}</strong></td>
              <td>${r.perluBimbingan}</td>
              <td>${r.cukup}</td>
              <td>${r.baik}</td>
              <td>${r.sangatBaik}</td>
            </tr>
          `).join('')}
        </table>
      `;
      bodyHtml = `
        <h1>Instrumen Asesmen & Rubrik Penilaian</h1>
        <p><strong>Fokus:</strong> ${data.asesmenInstrumen.fokus} | <strong>Jurusan:</strong> ${data.jurusan} | <strong>Topik:</strong> ${data.topic}</p>
        <hr/>
        ${renderSection('A. Asesmen Diagnostik (Awal)', data.asesmenInstrumen.diagnostik)}
        ${renderSection('B. Asesmen Formatif (Proses)', data.asesmenInstrumen.formatif)}
        ${renderSection('C. Asesmen Sumatif (Akhir)', data.asesmenInstrumen.sumatif)}
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; max-width: 850px; margin: 0 auto; padding: 40px; }
            h1, h2, h3 { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; }
          </style>
        </head>
        <body>${bodyHtml}</body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Complete Package
  const handleDownloadPackage = () => {
    if (!data) return;

    const layoutLabel = data.templateLayout === 'pjbl' ? 'Berbasis Proyek (PjBL)' : data.templateLayout === 'ringkas' ? 'Ringkas 1-2 Lembar' : 'Standar Kurikulum Merdeka Lengkap';
    const toneLabel = data.gayaBahasa === 'santai' ? 'Interaktif & Ramah Siswa' : data.gayaBahasa === 'vokasi' ? 'Dunia Kerja Vokasi (Workplace Ready)' : 'Formal Akademik Kedinasan';
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Paket Perangkat Pembelajaran: ${data.topic}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #2D3436; max-width: 900px; margin: 0 auto; padding: 40px; background-color: #FDFBF7; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            h1, h2, h3 { color: #1E4D4D; }
            h1 { text-align: center; border-bottom: 2px solid #E87A5D; padding-bottom: 20px; margin-bottom: 30px; }
            h2 { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; color: #E87A5D; }
            .section { margin-bottom: 40px; }
            .badge { display: inline-block; padding: 4px 12px; background: #1E4D4D; color: white; border-radius: 20px; font-size: 0.9em; margin-right: 8px; margin-bottom: 8px; font-weight: bold; }
            .badge-sub { display: inline-block; padding: 4px 12px; background: #E87A5D; color: white; border-radius: 20px; font-size: 0.9em; margin-right: 8px; margin-bottom: 8px; font-weight: bold; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; margin-bottom: 20px; font-size: 0.9em; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; color: #1E4D4D; font-weight: bold; }
            tr:nth-child(even) { background-color: #fbfbfc; }
            .activity-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .activity-title { font-weight: bold; color: #1E4D4D; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Paket Perangkat Pembelajaran Interaktif SMK</h1>
            <div style="text-align: center; margin-bottom: 40px;">
              <p style="font-size: 1.2em; font-weight: bold; margin-bottom: 15px;">Topik: ${data.topic}</p>
              <div>
                <span class="badge">Kelas ${data.kelas}</span>
                <span class="badge">Semester ${data.semester}</span>
                <span class="badge">${data.jurusan}</span>
                <span class="badge-sub">Layout: ${layoutLabel}</span>
                <span class="badge-sub">Gaya: ${toneLabel}</span>
              </div>
            </div>
    `;

    if (data.modulAjar) {
      htmlContent += `
        <div class="section">
          <h2>1. Modul Ajar</h2>
          <p><strong>Identitas:</strong> ${data.modulAjar.identitas}</p>
          <p><strong>Tujuan Pembelajaran:</strong> ${data.modulAjar.tujuanPembelajaran}</p>
          <p><strong>Pemahaman Bermakna:</strong> ${data.modulAjar.pemahamanBermakna}</p>
          
          <h3>Pertanyaan Pemantik:</h3>
          <ul>
            ${data.modulAjar.pertanyaanPemantik.map(p => `<li>${p}</li>`).join('')}
          </ul>
          
          <h3>Kegiatan Pembelajaran:</h3>
          ${data.modulAjar.kegiatanPembelajaran.map(k => `
            <div class="activity-card">
              <p class="activity-title">Pertemuan ${k.pertemuan}</p>
              <p><strong>Pendahuluan:</strong> ${k.pembuka}</p>
              <p><strong>Inti:</strong> ${k.inti}</p>
              <p><strong>Penutup:</strong> ${k.penutup}</p>
            </div>
          `).join('')}
          
          <p><strong>Refleksi:</strong> ${data.modulAjar.refleksi}</p>
        </div>
      `;
    }

    if (data.lkpd) {
      htmlContent += `
        <div class="section">
          <h2>2. Lembar Kerja Peserta Didik (LKPD)</h2>
          <h3>${data.lkpd.judul}</h3>
          <p><strong>Tujuan:</strong> ${data.lkpd.tujuan}</p>
          <p><strong>Instruksi:</strong> ${data.lkpd.instruksi}</p>
          
          <h3>Aktivitas:</h3>
          <ol>
            ${data.lkpd.aktivitas.map(a => {
              if (a.tipe === 'pilihan_ganda' && a.opsi) {
                return `<li><p><strong>${a.pertanyaan}</strong></p><ul>${a.opsi.map(o => `<li>${o}</li>`).join('')}</ul></li>`;
              }
              return `<li><p><strong>${a.pertanyaan}</strong> <em>[Tipe: ${a.tipe}]</em></p></li>`;
            }).join('')}
          </ol>
        </div>
      `;
    }

    if (data.media) {
      htmlContent += `
        <div class="section">
          <h2>3. Rancangan Media Pembelajaran</h2>
          <h3>${data.media.judulKonsep}</h3>
          <p><span class="badge" style="background:#E87A5D;">${data.media.formatMedia}</span></p>
          <p><strong>Skenario Utama:</strong><br/>${data.media.skenarioUtama}</p>
          
          <h3>Langkah Interaktif:</h3>
          <table>
            <tr>
              <th style="width: 20%">Tahap</th>
              <th style="width: 40%">Situasi Layar / Deskripsi</th>
              <th style="width: 40%">Tindakan Siswa</th>
            </tr>
            ${data.media.langkahInteraktif.map(l => `
              <tr>
                <td><strong>${l.tahap}</strong></td>
                <td>${l.deskripsiLayar}</td>
                <td>${l.tindakanSiswa}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }

    if (data.asesmenInstrumen) {
      const { diagnostik, formatif, sumatif } = data.asesmenInstrumen;
      
      const renderAsesmen = (secTitle: string, asesmen: any) => `
        <h3>${secTitle}</h3>
        <p><strong>Tujuan:</strong> ${asesmen.tujuan}</p>
        <p><strong>Instruksi:</strong> ${asesmen.instruksi}</p>
        
        <h4>Butir Soal / Tugas:</h4>
        <ol>${asesmen.butirSoalAtauTugas.map((s: string) => `<li>${s}</li>`).join('')}</ol>
        
        <h4>Rubrik Penilaian:</h4>
        <table>
          <tr>
            <th style="width: 20%">Kriteria</th>
            <th style="width: 20%">Perlu Bimbingan (1)</th>
            <th style="width: 20%">Cukup (2)</th>
            <th style="width: 20%">Baik (3)</th>
            <th style="width: 20%">Sangat Baik (4)</th>
          </tr>
          ${asesmen.rubrik.map((r: any) => `
            <tr>
              <td><strong>${r.kriteria}</strong></td>
              <td>${r.perluBimbingan}</td>
              <td>${r.cukup}</td>
              <td>${r.baik}</td>
              <td>${r.sangatBaik}</td>
            </tr>
          `).join('')}
        </table>
      `;

      htmlContent += `
        <div class="section">
          <h2>4. Instrumen Asesmen</h2>
          <p><span class="badge" style="background:#E87A5D;">Fokus: ${data.asesmenInstrumen.fokus}</span></p>
          ${renderAsesmen('A. Diagnostik (Awal)', diagnostik)}
          ${renderAsesmen('B. Formatif (Proses)', formatif)}
          ${renderAsesmen('C. Sumatif (Akhir)', sumatif)}
        </div>
      `;
    }

    htmlContent += `
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Perangkat_Ajar_${data.topic.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveRevisionNotes = async (updatedNotes: RevisionNote[]) => {
    if (!data) return;
    await updateModule(data.id, { catatanRevisi: updatedNotes });
    setData({ ...data, catatanRevisi: updatedNotes });
    showToast('Catatan revisi berhasil disimpan!');
  };

  if (!data) return null;

  const tabs = [
    { id: 'modul', label: 'Modul Ajar', icon: FileText, exists: !!data.modulAjar },
    { id: 'lkpd', label: 'LKPD Siswa', icon: Layers, exists: !!data.lkpd },
    { id: 'media', label: 'Media Pembelajaran', icon: MonitorPlay, exists: !!data.media },
    { id: 'asesmen', label: 'Instrumen Asesmen', icon: ClipboardCheck, exists: !!data.asesmenInstrumen },
    { id: 'referensi', label: 'Referensi Industri & SKKNI', icon: Compass, exists: !!data.referensiIndustri },
  ] as const;

  const isLoadingAny = isGeneratingModul || isGeneratingLkpd || isGeneratingMedia || isGeneratingAsesmen || isGeneratingReferensi || isGeneratingBatch;
  let loadingTitle = "Menyusun Perangkat...";
  if (isGeneratingBatch) loadingTitle = "Melengkapi Seluruh Perangkat (LKPD, Media, Asesmen)...";
  else if (isGeneratingModul) loadingTitle = "Menyesuaikan Modul Ajar...";
  else if (isGeneratingLkpd) loadingTitle = "Menyusun LKPD Interaktif Siswa...";
  else if (isGeneratingMedia) loadingTitle = "Merancang Konsep Media Pembelajaran...";
  else if (isGeneratingAsesmen) loadingTitle = "Menyusun Instrumen Asesmen & Rubrik...";
  else if (isGeneratingReferensi) loadingTitle = "Menyelaraskan Standar Industri & SKKNI...";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 pb-16"
    >
      <LoadingOverlay isVisible={isLoadingAny} title={loadingTitle} />

      {/* Notification Toast */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="text-teal-400" size={18} />
          {copiedNotification}
        </div>
      )}
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-brand-primary hover:opacity-80 font-medium mb-3 transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {data.topic}
          </h1>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
              Kelas {data.kelas}
            </span>
            <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full">
              Semester {data.semester}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
              {data.jurusan}
            </span>
            <span className="px-3 py-1 bg-brand-bg text-brand-primary border border-brand-primary/20 text-xs font-bold rounded-full flex items-center gap-1">
              <BookOpen size={12} />
              Layout: {data.templateLayout === 'pjbl' ? 'Berbasis Proyek' : data.templateLayout === 'ringkas' ? 'Ringkas 1-2 Lembar' : 'Standar Lengkap'}
            </span>
            <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 text-xs font-bold rounded-full flex items-center gap-1">
              <Smile size={12} />
              Gaya: {data.gayaBahasa === 'santai' ? 'Interaktif Santai' : data.gayaBahasa === 'vokasi' ? 'Dunia Kerja Vokasi' : 'Formal Kedinasan'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Revision Notes Button */}
          <button 
            onClick={() => setIsRevisionDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium rounded-xl hover:bg-amber-100 transition-colors shadow-sm relative"
          >
            <Edit3 size={16} className="text-amber-600" />
            <span>Catatan Revisi</span>
            {data?.catatanRevisi && data.catatanRevisi.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded-full">
                {data.catatanRevisi.filter(n => n.status === 'perlu_tindakan').length}
              </span>
            )}
          </button>

          {/* Print Preview Button */}
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Printer size={16} className="text-teal-400" />
            <span>Pratinjau Cetak / PDF</span>
          </button>

          {/* Docx Export Button */}
          <button 
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-sm cursor-pointer border border-blue-600 disabled:opacity-50"
            title="Unduh file Microsoft Word (.docx) yang dapat diedit"
          >
            {isExportingDocx ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="text-blue-200" />}
            <span>Ekspor .docx (Word)</span>
          </button>

          {/* Save to Google Drive Button */}
          <button 
            onClick={handleUploadToDrive}
            disabled={isUploadingToDrive}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer border border-emerald-600 disabled:opacity-50"
            title="Simpan file Word (.docx) langsung ke Google Drive Anda"
          >
            {isUploadingToDrive ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} className="text-emerald-200" />}
            <span>Simpan ke Google Drive</span>
          </button>

          {data.status !== 'final' && (
            <button 
              onClick={async () => {
                await updateModule(data.id, { status: 'final' });
                setData({ ...data, status: 'final' });
                showToast('Status perangkat ditandai Final!');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 text-green-700 border border-green-200 text-sm font-medium rounded-xl hover:bg-green-100 transition-colors shadow-sm"
            >
              <CheckCircle2 size={16} /> Jadikan Final
            </button>
          )}

          <button 
            onClick={handleDownloadPackage}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
          >
            <Download size={16} /> Unduh Paket Lengkap
          </button>
        </div>
      </header>

      {/* Missing components banner */}
      {hasMissingComponents && (
        <div className="bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-brand-primary/10 border border-teal-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-teal-600" size={18} />
              Lengkapi Perangkat Pembelajaran Anda
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Beberapa komponen belum dibuat ({!data.lkpd ? 'LKPD, ' : ''}{!data.media ? 'Media, ' : ''}{!data.asesmenInstrumen ? 'Asesmen' : ''}). Anda dapat melengkapinya sekaligus dalam satu klik.
            </p>
          </div>
          <button
            onClick={handleGenerateAllMissing}
            disabled={isGeneratingBatch}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/20 shrink-0"
          >
            {isGeneratingBatch ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            Generate Semua yang Belum Ada
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm text-sm">
          <AlertCircle className="shrink-0" size={18} />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 border-b border-slate-200 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm whitespace-nowrap rounded-t-xl transition-all ${
              activeTab === tab.id 
                ? 'bg-brand-bg text-brand-primary border-b-2 border-brand-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={17} />
            {tab.label}
            {tab.exists ? (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-full font-normal">Belum</span>
            )}
          </button>
        ))}
      </div>

      {/* Main Tab Content Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[500px]">
        
        {/* ===================== TAB 1: MODUL AJAR ===================== */}
        {activeTab === 'modul' && data.modulAjar && (
          <div className="space-y-8 animate-in fade-in">
            {/* Warning Over-Allocation */}
            {data.modulAjar.keselarasan && data.modulAjar.keselarasan.alokasiJamModul > data.modulAjar.keselarasan.alokasiJamProsem && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold">Peringatan Alokasi Waktu</h4>
                  <p className="mt-0.5">Alokasi jam di Modul Ajar ({data.modulAjar.keselarasan.alokasiJamModul} JP) melebihi alokasi yang ditetapkan di Prosem ({data.modulAjar.keselarasan.alokasiJamProsem} JP). Pertimbangkan untuk meringkas kegiatan.</p>
                </div>
              </div>
            )}

            {/* Identitas & Keselarasan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Identitas Modul</h3>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{data.modulAjar.identitas}</p>
              </section>
              
              <section className="bg-brand-bg/50 p-6 rounded-2xl border border-brand-primary/10">
                <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-3">Ringkasan Keselarasan Kurikulum</h3>
                {data.modulAjar.keselarasan && (
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between border-b border-brand-primary/10 pb-1.5">
                      <span className="text-slate-500">Pertemuan Ke</span>
                      <span className="font-bold text-brand-primary">{data.modulAjar.keselarasan.pertemuanKe}</span>
                    </div>
                    <div className="flex justify-between border-b border-brand-primary/10 pb-1.5">
                      <span className="text-slate-500">Alokasi Waktu (Prosem)</span>
                      <span className="font-bold text-brand-primary">{data.modulAjar.keselarasan.alokasiJamProsem} JP</span>
                    </div>
                    <div className="flex justify-between border-b border-brand-primary/10 pb-1.5">
                      <span className="text-slate-500">Fase Capaian</span>
                      <span className="font-bold text-brand-primary">{data.modulAjar.keselarasan.faseCapaian}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{data.modulAjar.keselarasan.penjelasan}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Tujuan & Pemahaman Bermakna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center text-xs font-bold">1</div>
                  Tujuan Pembelajaran
                </h3>
                <p className="text-slate-700 leading-relaxed bg-white border border-slate-200 p-4 rounded-2xl text-sm shadow-sm">
                  {data.modulAjar.tujuanPembelajaran}
                </p>
              </section>
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-2.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center text-xs font-bold">2</div>
                  Pemahaman Bermakna
                </h3>
                <p className="text-slate-700 leading-relaxed bg-white border border-slate-200 p-4 rounded-2xl text-sm shadow-sm">
                  {data.modulAjar.pemahamanBermakna}
                </p>
              </section>
            </div>

            {/* Pertanyaan Pemantik */}
            <section>
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">?</div>
                Pertanyaan Pemantik
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.modulAjar.pertanyaanPemantik?.map((tanya, idx) => (
                  <div key={idx} className="flex gap-3 items-start bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm">
                    <span className="text-brand-primary font-bold shrink-0">Q{idx + 1}.</span>
                    <span className="text-slate-700 font-medium">{tanya}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Kegiatan Pembelajaran per Pertemuan */}
            <section>
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">★</div>
                Kegiatan Pembelajaran (Konteks {data.jurusan})
              </h3>
              <div className="space-y-4">
                {data.modulAjar.kegiatanPembelajaran?.map((kegiatan, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 font-bold text-slate-800 text-sm flex justify-between items-center">
                      <span>Pertemuan {kegiatan.pertemuan}</span>
                      <span className="text-xs font-medium text-slate-500">Fokus Kejuruan: {data.jurusan}</span>
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      <div>
                        <h5 className="font-bold text-brand-primary text-xs uppercase tracking-wider mb-1">A. Pendahuluan</h5>
                        <p className="text-slate-700 whitespace-pre-wrap bg-slate-50/60 p-3 rounded-xl border border-slate-100 leading-relaxed">{kegiatan.pembuka}</p>
                      </div>
                      <div>
                        <h5 className="font-bold text-brand-primary text-xs uppercase tracking-wider mb-1">B. Kegiatan Inti</h5>
                        <p className="text-slate-700 whitespace-pre-wrap bg-slate-50/60 p-3 rounded-xl border border-slate-100 leading-relaxed">{kegiatan.inti}</p>
                      </div>
                      <div>
                        <h5 className="font-bold text-brand-primary text-xs uppercase tracking-wider mb-1">C. Penutup</h5>
                        <p className="text-slate-700 whitespace-pre-wrap bg-slate-50/60 p-3 rounded-xl border border-slate-100 leading-relaxed">{kegiatan.penutup}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Refleksi */}
            <section className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Refleksi Guru & Siswa</h3>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{data.modulAjar.refleksi}</p>
            </section>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(data.modulAjar, null, 2), 'Modul Ajar')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-xl transition-colors"
                >
                  <Copy size={13} /> Salin Teks
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleRegenerateModul(data.gayaBahasa === 'santai' ? 'formal' : 'santai')}
                  disabled={isGeneratingModul}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-primary bg-brand-bg font-semibold rounded-xl hover:bg-brand-primary/20 disabled:opacity-50 transition-colors"
                >
                  {isGeneratingModul ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                  Ganti ke Gaya {data.gayaBahasa === 'santai' ? 'Formal' : 'Santai'}
                </button>
                <button 
                  onClick={() => handleRegenerateModul('vokasi')}
                  disabled={isGeneratingModul}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-accent bg-brand-accent/10 font-semibold rounded-xl hover:bg-brand-accent/20 disabled:opacity-50 transition-colors"
                >
                  <Briefcase size={13} /> Gaya Dunia Kerja Vokasi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: LKPD SISWA ===================== */}
        {activeTab === 'lkpd' && (
          <div className="animate-in fade-in space-y-6">
            {!data.lkpd ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-brand-bg text-brand-primary rounded-full flex items-center justify-center mb-4 border border-brand-primary/10">
                  <Layers size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">LKPD Belum Dibuat</h3>
                <p className="text-slate-500 max-w-sm mb-6 text-sm">
                  Buat Lembar Kerja Peserta Didik interaktif yang disesuaikan secara khusus dengan aktivitas kegiatan modul ajar jurusan {data.jurusan}.
                </p>
                <button
                  onClick={() => handleGenerateLkpd()}
                  disabled={isGeneratingLkpd}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/20 text-sm"
                >
                  {isGeneratingLkpd ? <><Loader2 className="animate-spin" size={16} /> Menyusun LKPD...</> : <><Sparkles size={16} /> Generate LKPD Interaktif</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mode Selector & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setLkpdMode('preview')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${lkpdMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Tampilan Dokumen
                    </button>
                    <button
                      onClick={() => setLkpdMode('interactive')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${lkpdMode === 'interactive' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Play size={12} /> Mode Interaktif Siswa
                    </button>
                    <button
                      onClick={() => setLkpdMode('edit')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${lkpdMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Edit3 size={12} /> Edit Teks
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(data.lkpd, null, 2), 'LKPD')}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Salin LKPD"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDownloadSingleComponent('lkpd')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <Download size={14} /> Unduh LKPD
                    </button>
                  </div>
                </div>

                {/* EDIT MODE */}
                {lkpdMode === 'edit' && editableLkpd && (
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">Mode Edit Guru: Lembar Kerja Peserta Didik</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLkpdMode('preview')}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveEditedLkpd}
                          className="px-4 py-1.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 shadow-sm"
                        >
                          Simpan Perubahan
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Judul LKPD</label>
                      <input
                        type="text"
                        value={editableLkpd.judul}
                        onChange={(e) => setEditableLkpd({ ...editableLkpd, judul: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan LKPD</label>
                      <input
                        type="text"
                        value={editableLkpd.tujuan}
                        onChange={(e) => setEditableLkpd({ ...editableLkpd, tujuan: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Instruksi Guru</label>
                      <textarea
                        value={editableLkpd.instruksi}
                        onChange={(e) => setEditableLkpd({ ...editableLkpd, instruksi: e.target.value })}
                        rows={2}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-700">Daftar Aktivitas / Soal Siswa</label>
                        <button
                          onClick={() => setEditableLkpd({
                            ...editableLkpd,
                            aktivitas: [...editableLkpd.aktivitas, { tipe: 'isian', pertanyaan: 'Tugas/Pertanyaan baru...' }]
                          })}
                          className="flex items-center gap-1 text-xs text-brand-primary font-bold hover:underline"
                        >
                          <Plus size={14} /> Tambah Aktivitas
                        </button>
                      </div>

                      <div className="space-y-3">
                        {editableLkpd.aktivitas.map((act, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-brand-primary">Soal #{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={act.tipe}
                                  onChange={(e) => {
                                    const newActs = [...editableLkpd.aktivitas];
                                    newActs[idx].tipe = e.target.value as any;
                                    setEditableLkpd({ ...editableLkpd, aktivitas: newActs });
                                  }}
                                  className="text-xs p-1 bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                  <option value="isian">Isian Singkat</option>
                                  <option value="checklist">Checklist Praktik</option>
                                  <option value="pilihan_ganda">Pilihan Ganda</option>
                                </select>
                                <button
                                  onClick={() => {
                                    const newActs = editableLkpd.aktivitas.filter((_, i) => i !== idx);
                                    setEditableLkpd({ ...editableLkpd, aktivitas: newActs });
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={act.pertanyaan}
                              onChange={(e) => {
                                const newActs = [...editableLkpd.aktivitas];
                                newActs[idx].pertanyaan = e.target.value;
                                setEditableLkpd({ ...editableLkpd, aktivitas: newActs });
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              placeholder="Tuliskan pertanyaan/tugas..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PREVIEW & INTERACTIVE MODE */}
                {lkpdMode !== 'edit' && (
                  <div className="space-y-6">
                    <div className="bg-brand-primary text-white p-6 rounded-2xl relative overflow-hidden shadow-sm">
                      <div className="relative z-10">
                        <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-2 inline-block">
                          LKPD SMK • {data.jurusan}
                        </span>
                        <h2 className="text-xl font-extrabold mb-1.5">{data.lkpd.judul}</h2>
                        <p className="text-xs text-brand-bg/90">{data.lkpd.tujuan}</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
                      <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-1.5 text-xs">
                        <AlertCircle size={15} /> Instruksi Guru
                      </h4>
                      <p className="text-amber-800 text-xs leading-relaxed">{data.lkpd.instruksi}</p>
                    </div>

                    {/* Interactive Score Bar if in interactive mode */}
                    {lkpdMode === 'interactive' && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">Progres Pengerjaan Siswa:</span>
                          <span className="text-xs font-bold text-brand-primary">
                            {Object.keys(lkpdAnswers).filter(k => lkpdAnswers[k as any] !== '').length} / {data.lkpd.aktivitas.length} Soal
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleResetLkpdAnswers}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <RotateCcw size={13} /> Reset
                          </button>
                          <button
                            onClick={handleCheckLkpdScore}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                          >
                            <CheckCircle2 size={14} /> Selesaikan & Simpan LKPD
                          </button>
                        </div>
                      </div>
                    )}

                    {lkpdScoreResult && (
                      <div className="bg-teal-50 border border-teal-200 text-teal-900 p-4 rounded-2xl flex items-center justify-between animate-in fade-in">
                        <div>
                          <h4 className="font-bold text-sm">Lembar Kerja Terisi Lengkap!</h4>
                          <p className="text-xs text-teal-700 mt-0.5">Siswa telah merespons {lkpdScoreResult.answered} dari {lkpdScoreResult.total} butir aktivitas ({lkpdScoreResult.percentage}% selesai).</p>
                        </div>
                        <div className="text-2xl font-black text-teal-700">{lkpdScoreResult.percentage}%</div>
                      </div>
                    )}

                    {/* Activities List */}
                    <div className="space-y-4">
                      {data.lkpd.aktivitas.map((act, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm transition-all hover:border-brand-primary/30 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-800 text-sm">
                              <span className="text-brand-primary mr-1.5 font-bold">{idx + 1}.</span> 
                              {act.pertanyaan}
                            </p>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
                              {act.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' : act.tipe === 'checklist' ? 'Checklist' : 'Isian'}
                            </span>
                          </div>
                          
                          {act.tipe === 'isian' && (
                            <textarea 
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all resize-y text-xs text-slate-700 placeholder-slate-400"
                              rows={2}
                              placeholder="Ketik jawaban siswa di sini..."
                              value={lkpdAnswers[idx] || ''}
                              onChange={(e) => setLkpdAnswers({ ...lkpdAnswers, [idx]: e.target.value })}
                            />
                          )}

                          {act.tipe === 'checklist' && (
                            <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-brand-bg transition-colors">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 mt-0.5 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                                checked={!!lkpdAnswers[idx]}
                                onChange={(e) => setLkpdAnswers({ ...lkpdAnswers, [idx]: e.target.checked })}
                              />
                              <span className="text-xs text-slate-700 select-none font-medium">Tandai jika langkah kerja/praktik ini telah diselesaikan oleh siswa</span>
                            </label>
                          )}

                          {act.tipe === 'pilihan_ganda' && act.opsi && (
                            <div className="space-y-2">
                              {act.opsi.map((opsi, optIdx) => (
                                <label key={optIdx} className={`flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer transition-colors text-xs ${lkpdAnswers[idx] === opsi ? 'bg-brand-bg border-brand-primary text-brand-primary font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-primary/50'}`}>
                                  <input 
                                    type="radio" 
                                    name={`lkpd-q-${idx}`}
                                    className="w-4 h-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                                    value={opsi}
                                    checked={lkpdAnswers[idx] === opsi}
                                    onChange={(e) => setLkpdAnswers({ ...lkpdAnswers, [idx]: e.target.value })}
                                  />
                                  <span>{opsi}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate Tones Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Ubah format gaya LKPD:</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleGenerateLkpd(data.gayaBahasa === 'santai' ? 'formal' : 'santai')}
                      disabled={isGeneratingLkpd}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-primary bg-brand-bg font-semibold rounded-xl hover:bg-brand-primary/20 disabled:opacity-50 transition-colors"
                    >
                      {isGeneratingLkpd ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                      Ganti ke Gaya {data.gayaBahasa === 'santai' ? 'Formal' : 'Santai'}
                    </button>
                    <button 
                      onClick={() => handleGenerateLkpd('vokasi')}
                      disabled={isGeneratingLkpd}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-accent bg-brand-accent/10 font-semibold rounded-xl hover:bg-brand-accent/20 disabled:opacity-50 transition-colors"
                    >
                      <Briefcase size={13} /> Gaya Dunia Kerja Vokasi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: MEDIA PEMBELAJARAN ===================== */}
        {activeTab === 'media' && (
          <div className="animate-in fade-in space-y-6">
            {!data.media ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-brand-bg text-brand-primary rounded-full flex items-center justify-center mb-4 border border-brand-primary/10">
                  <MonitorPlay size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Rancangan Media Belum Dibuat</h3>
                <p className="text-slate-500 max-w-sm mb-6 text-sm">
                  Buat rancangan konsep media pembelajaran interaktif (simulasi digital, role-play vokasi, atau peraga lab) kontekstual dengan jurusan {data.jurusan}.
                </p>
                <button
                  onClick={() => handleGenerateMedia()}
                  disabled={isGeneratingMedia}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/20 text-sm"
                >
                  {isGeneratingMedia ? <><Loader2 className="animate-spin" size={16} /> Merancang Media...</> : <><Sparkles size={16} /> Generate Rancangan Media</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Action Bar & Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setMediaMode('overview')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mediaMode === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Alur Lengkap
                    </button>
                    <button
                      onClick={() => setMediaMode('simulator')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${mediaMode === 'simulator' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Play size={12} /> Simulator Tahapan
                    </button>
                    <button
                      onClick={() => setMediaMode('edit')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${mediaMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Edit3 size={12} /> Edit Konsep
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(data.media, null, 2), 'Rancangan Media')}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Salin Media"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDownloadSingleComponent('media')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <Download size={14} /> Unduh Media
                    </button>
                  </div>
                </div>

                {/* EDIT MEDIA MODE */}
                {mediaMode === 'edit' && editableMedia && (
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">Edit Konsep Media Pembelajaran</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMediaMode('overview')}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSaveEditedMedia}
                          className="px-4 py-1.5 text-xs font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 shadow-sm"
                        >
                          Simpan Perubahan
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Judul Konsep Media</label>
                      <input
                        type="text"
                        value={editableMedia.judulKonsep}
                        onChange={(e) => setEditableMedia({ ...editableMedia, judulKonsep: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Format Media</label>
                      <input
                        type="text"
                        value={editableMedia.formatMedia}
                        onChange={(e) => setEditableMedia({ ...editableMedia, formatMedia: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Skenario Utama</label>
                      <textarea
                        value={editableMedia.skenarioUtama}
                        onChange={(e) => setEditableMedia({ ...editableMedia, skenarioUtama: e.target.value })}
                        rows={3}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-700">Daftar Langkah Interaktif</label>
                        <button
                          onClick={() => setEditableMedia({
                            ...editableMedia,
                            langkahInteraktif: [...editableMedia.langkahInteraktif, { tahap: 'Tahap Baru', deskripsiLayar: 'Situasi layar...', tindakanSiswa: 'Aksi siswa...' }]
                          })}
                          className="flex items-center gap-1 text-xs text-brand-primary font-bold hover:underline"
                        >
                          <Plus size={14} /> Tambah Tahap
                        </button>
                      </div>

                      <div className="space-y-3">
                        {editableMedia.langkahInteraktif.map((step, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={step.tahap}
                                onChange={(e) => {
                                  const newSteps = [...editableMedia.langkahInteraktif];
                                  newSteps[idx].tahap = e.target.value;
                                  setEditableMedia({ ...editableMedia, langkahInteraktif: newSteps });
                                }}
                                className="font-bold text-brand-primary text-xs p-1 bg-slate-50 border border-slate-200 rounded-lg w-1/2"
                              />
                              <button
                                onClick={() => {
                                  const newSteps = editableMedia.langkahInteraktif.filter((_, i) => i !== idx);
                                  setEditableMedia({ ...editableMedia, langkahInteraktif: newSteps });
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={step.deskripsiLayar}
                              onChange={(e) => {
                                const newSteps = [...editableMedia.langkahInteraktif];
                                newSteps[idx].deskripsiLayar = e.target.value;
                                setEditableMedia({ ...editableMedia, langkahInteraktif: newSteps });
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              placeholder="Deskripsi layar..."
                            />
                            <input
                              type="text"
                              value={step.tindakanSiswa}
                              onChange={(e) => {
                                const newSteps = [...editableMedia.langkahInteraktif];
                                newSteps[idx].tindakanSiswa = e.target.value;
                                setEditableMedia({ ...editableMedia, langkahInteraktif: newSteps });
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              placeholder="Tindakan siswa..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SIMULATOR MODE */}
                {mediaMode === 'simulator' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                          {data.media.formatMedia}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Tahap {activeStepIndex + 1} dari {data.media.langkahInteraktif.length}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold mb-1">{data.media.judulKonsep}</h3>
                      <p className="text-xs text-slate-400">{data.media.skenarioUtama}</p>
                    </div>

                    {/* Step Card Simulation */}
                    {data.media.langkahInteraktif[activeStepIndex] && (
                      <div className="bg-white border-2 border-brand-primary/30 p-6 rounded-2xl shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-900 text-base">
                            Tahap {activeStepIndex + 1}: {data.media.langkahInteraktif[activeStepIndex].tahap}
                          </h4>
                          {stepCompleted[activeStepIndex] && (
                            <span className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={13} /> Selesai
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-brand-bg/60 p-4 rounded-xl border border-brand-primary/10">
                            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block mb-1">
                              Apa yang Dilihat / Didengar Siswa
                            </span>
                            <p className="text-slate-800 text-sm leading-relaxed">
                              {data.media.langkahInteraktif[activeStepIndex].deskripsiLayar}
                            </p>
                          </div>

                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                              Instruksi Aksi / Tindakan Siswa
                            </span>
                            <p className="text-amber-900 text-sm leading-relaxed font-medium">
                              {data.media.langkahInteraktif[activeStepIndex].tindakanSiswa}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => setActiveStepIndex(Math.max(0, activeStepIndex - 1))}
                            disabled={activeStepIndex === 0}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 transition-colors"
                          >
                            <ChevronLeft size={14} /> Tahap Sebelumnya
                          </button>

                          <button
                            onClick={() => {
                              setStepCompleted({ ...stepCompleted, [activeStepIndex]: true });
                              if (activeStepIndex < data.media!.langkahInteraktif.length - 1) {
                                setActiveStepIndex(activeStepIndex + 1);
                              }
                            }}
                            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-primary/20"
                          >
                            {activeStepIndex < data.media.langkahInteraktif.length - 1 ? (
                              <>Lakukan & Lanjut <ChevronRight size={14} /></>
                            ) : (
                              <>Selesaikan Simulasi <CheckCircle2 size={14} /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* OVERVIEW MODE */}
                {mediaMode === 'overview' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-sm">
                      <div className="relative z-10">
                        <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                          {data.media.formatMedia}
                        </span>
                        <h2 className="text-xl font-extrabold mb-1.5">{data.media.judulKonsep}</h2>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{data.media.skenarioUtama}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="text-brand-primary" size={16} /> Rincian Langkah Interaktif
                      </h3>
                      
                      <div className="relative border-l-2 border-brand-primary/20 ml-3 space-y-6 pb-2">
                        {data.media.langkahInteraktif.map((langkah, idx) => (
                          <div key={idx} className="relative pl-6">
                            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-4 border-brand-primary rounded-full" />
                            
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-brand-primary text-xs">
                                Tahap {idx + 1}: {langkah.tahap}
                              </div>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-primary/10">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tampilan Layar</span>
                                  <p className="text-slate-700 leading-relaxed">{langkah.deskripsiLayar}</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tindakan Siswa</span>
                                  <p className="text-amber-900 leading-relaxed font-medium">{langkah.tindakanSiswa}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Regenerate Media Tones Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Ubah format gaya Media:</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleGenerateMedia(data.gayaBahasa === 'santai' ? 'formal' : 'santai')}
                      disabled={isGeneratingMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-primary bg-brand-bg font-semibold rounded-xl hover:bg-brand-primary/20 disabled:opacity-50 transition-colors"
                    >
                      {isGeneratingMedia ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                      Ganti ke Gaya {data.gayaBahasa === 'santai' ? 'Formal' : 'Santai'}
                    </button>
                    <button 
                      onClick={() => handleGenerateMedia('vokasi')}
                      disabled={isGeneratingMedia}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-accent bg-brand-accent/10 font-semibold rounded-xl hover:bg-brand-accent/20 disabled:opacity-50 transition-colors"
                    >
                      <Briefcase size={13} /> Gaya Dunia Kerja Vokasi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 4: INSTRUMEN ASESMEN ===================== */}
        {activeTab === 'asesmen' && (
          <div className="animate-in fade-in space-y-6">
            {!data.asesmenInstrumen ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-brand-bg text-brand-primary rounded-full flex items-center justify-center mb-4 border border-brand-primary/10">
                  <ClipboardCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Instrumen Asesmen Belum Dibuat</h3>
                <p className="text-slate-500 max-w-sm mb-6 text-sm">
                  Buat rancangan asesmen (Diagnostik, Formatif, Sumatif) lengkap dengan rubrik penilaian 4 level untuk jurusan {data.jurusan}.
                </p>

                <div className="w-full max-w-md bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-left">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Fokus Asesmen</label>
                  <select 
                    value={fokusAsesmen}
                    onChange={(e) => setFokusAsesmen(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Tes Tulis & Praktik (Standar)">Tes Tulis & Praktik (Standar)</option>
                    <option value="Praktik Lisan / Role-Play">Praktik Lisan / Role-Play (Cocok untuk Perhotelan/Pariwisata)</option>
                    <option value="Penugasan Proyek / Troubleshooting">Penugasan Proyek / Troubleshooting (Cocok untuk Teknik/IT)</option>
                    <option value="Observasi Kinerja & Presentasi">Observasi Kinerja & Presentasi (Cocok untuk Bisnis/Manajemen)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleGenerateAsesmen()}
                  disabled={isGeneratingAsesmen}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/20 text-sm"
                >
                  {isGeneratingAsesmen ? <><Loader2 className="animate-spin" size={16} /> Menyusun Asesmen...</> : <><Sparkles size={16} /> Generate Instrumen Asesmen</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Asesmen Header & Sub-Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setAsesmenSubTab('diagnostik')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${asesmenSubTab === 'diagnostik' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      A. Diagnostik (Awal)
                    </button>
                    <button
                      onClick={() => setAsesmenSubTab('formatif')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${asesmenSubTab === 'formatif' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      B. Formatif (Proses)
                    </button>
                    <button
                      onClick={() => setAsesmenSubTab('sumatif')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${asesmenSubTab === 'sumatif' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      C. Sumatif (Akhir)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAsesmenMode(asesmenMode === 'calculator' ? 'view' : 'calculator')}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${asesmenMode === 'calculator' ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      <Calculator size={13} /> {asesmenMode === 'calculator' ? 'Tutup Kalkulator' : 'Kalkulator Rubrik'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(data.asesmenInstrumen, null, 2), 'Instrumen Asesmen')}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Salin Asesmen"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDownloadSingleComponent('asesmen')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <Download size={14} /> Unduh Asesmen
                    </button>
                  </div>
                </div>

                {/* Interactive Rubric Calculator Score Card */}
                {asesmenMode === 'calculator' && (
                  <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Calculator className="text-teal-600" size={16} />
                        Simulasi Penilaian Siswa (Rubrik {asesmenSubTab.toUpperCase()})
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Klik level skor (1 - 4) pada setiap baris kriteria rubrik di bawah untuk mengalkulasi nilai akhir siswa secara otomatis.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skor Rubrik</span>
                        <span className="text-lg font-extrabold text-slate-800">{calculateRubricTotal().score} / {calculateRubricTotal().max}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Akhir</span>
                        <span className="text-xl font-black text-teal-600">{calculateRubricTotal().pct}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Predikat</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">{calculateRubricTotal().predicate}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Selected Asesmen Sub-Tab */}
                {(() => {
                  const currentAsesmen = data.asesmenInstrumen[asesmenSubTab];
                  return (
                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          Tujuan: <span className="font-normal text-slate-700">{currentAsesmen.tujuan}</span>
                        </h3>
                        <p className="text-xs text-slate-600">
                          <strong>Instruksi Pelaksanaan:</strong> {currentAsesmen.instruksi}
                        </p>
                      </div>

                      {/* Butir Soal / Tugas */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                          Butir Soal / Tugas Asesmen
                        </h4>
                        <div className="space-y-2">
                          {currentAsesmen.butirSoalAtauTugas.map((soal, sIdx) => (
                            <div key={sIdx} className="flex gap-3 bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm text-xs leading-relaxed">
                              <span className="text-brand-primary font-bold">{sIdx + 1}.</span>
                              <span className="text-slate-700">{soal}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rubrik Penilaian Table */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                          Rubrik Penilaian 4 Level
                        </h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[750px] text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-3.5 font-bold text-slate-800 w-1/5">Kriteria</th>
                                <th className="p-3.5 font-bold text-red-700 w-1/5 bg-red-50/50">Perlu Bimbingan (1)</th>
                                <th className="p-3.5 font-bold text-amber-700 w-1/5 bg-amber-50/50">Cukup (2)</th>
                                <th className="p-3.5 font-bold text-teal-700 w-1/5 bg-teal-50/50">Baik (3)</th>
                                <th className="p-3.5 font-bold text-blue-700 w-1/5 bg-blue-50/50">Sangat Baik (4)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {currentAsesmen.rubrik.map((rubrik, rIdx) => {
                                const criteriaKey = `${asesmenSubTab}_${rIdx}`;
                                const selectedVal = selectedRubricScores[criteriaKey];
                                return (
                                  <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors bg-white">
                                    <td className="p-3.5 font-bold text-slate-800 border-r border-slate-100">{rubrik.kriteria}</td>
                                    
                                    <td 
                                      onClick={() => handleSelectRubricScore(criteriaKey, 1)}
                                      className={`p-3.5 border-r border-slate-100 cursor-pointer transition-all ${selectedVal === 1 ? 'bg-red-100 ring-2 ring-red-500 font-bold text-red-900' : 'text-slate-600 hover:bg-red-50/30'}`}
                                    >
                                      {rubrik.perluBimbingan}
                                    </td>

                                    <td 
                                      onClick={() => handleSelectRubricScore(criteriaKey, 2)}
                                      className={`p-3.5 border-r border-slate-100 cursor-pointer transition-all ${selectedVal === 2 ? 'bg-amber-100 ring-2 ring-amber-500 font-bold text-amber-900' : 'text-slate-600 hover:bg-amber-50/30'}`}
                                    >
                                      {rubrik.cukup}
                                    </td>

                                    <td 
                                      onClick={() => handleSelectRubricScore(criteriaKey, 3)}
                                      className={`p-3.5 border-r border-slate-100 cursor-pointer transition-all ${selectedVal === 3 ? 'bg-teal-100 ring-2 ring-teal-500 font-bold text-teal-900' : 'text-slate-600 hover:bg-teal-50/30'}`}
                                    >
                                      {rubrik.baik}
                                    </td>

                                    <td 
                                      onClick={() => handleSelectRubricScore(criteriaKey, 4)}
                                      className={`p-3.5 cursor-pointer transition-all ${selectedVal === 4 ? 'bg-blue-100 ring-2 ring-blue-500 font-bold text-blue-900' : 'text-slate-600 hover:bg-blue-50/30'}`}
                                    >
                                      {rubrik.sangatBaik}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Regenerate */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Ubah format gaya Asesmen:</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleGenerateAsesmen(data.gayaBahasa === 'santai' ? 'formal' : 'santai')}
                      disabled={isGeneratingAsesmen}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-primary bg-brand-bg font-semibold rounded-xl hover:bg-brand-primary/20 disabled:opacity-50 transition-colors"
                    >
                      {isGeneratingAsesmen ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                      Ganti ke Gaya {data.gayaBahasa === 'santai' ? 'Formal' : 'Santai'}
                    </button>
                    <button 
                      onClick={() => handleGenerateAsesmen('vokasi')}
                      disabled={isGeneratingAsesmen}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-accent bg-brand-accent/10 font-semibold rounded-xl hover:bg-brand-accent/20 disabled:opacity-50 transition-colors"
                    >
                      <Briefcase size={13} /> Gaya Dunia Kerja Vokasi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TAB REFERENSI INDUSTRI & SKKNI */}
        {activeTab === 'referensi' && (
          <div>
            {!data.referensiIndustri ? (
              <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Compass size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Standar Industri & SKKNI Belum Ditarik</h3>
                <p className="text-slate-500 max-w-md mx-auto text-sm mb-6">
                  Tarik acuan unit SKKNI, istilah teknis dunia kerja, dan transkrip skenario dialog otentik untuk topik <strong>"{data.topic}"</strong>.
                </p>
                <button
                  onClick={handleGenerateReferensi}
                  disabled={isGeneratingReferensi}
                  className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingReferensi ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Menyelaraskan Standar Industri...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Tarik Standar SKKNI & Glosarium Industri</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {data.referensiIndustri.jurusan}
                      </span>
                      {data.referensiIndustri.standarKompetensi.skkniCode && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {data.referensiIndustri.standarKompetensi.skkniCode}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Rujukan Kompetensi & Budaya Industri</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateReferensi}
                      disabled={isGeneratingReferensi}
                      className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Sinkron Ulang
                    </button>
                    <button
                      onClick={() => copyToClipboard(
                        `STANDAR SKKNI:\n${data.referensiIndustri?.standarKompetensi.deskripsiUnit}\n\nISTILAH INDUSTRI:\n${data.referensiIndustri?.istilahIndustri.map(i => `- ${i.term}: ${i.artinya}`).join('\n')}`,
                        'Referensi Industri'
                      )}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                      title="Salin Rujukan"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* SKKNI & Performance Criteria */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Standar Kinerja Kompetensi (SKKNI/DUDI)</h4>
                      <p className="text-xs text-slate-500">Kriteria unjuk kerja terukur yang diselaraskan dengan kurikulum</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 font-medium leading-relaxed">
                    {data.referensiIndustri.standarKompetensi.deskripsiUnit}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {data.referensiIndustri.standarKompetensi.kriteriaKinerja.map((kriteria, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-blue-50/40 border border-blue-100 rounded-xl text-xs sm:text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{kriteria}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terminology Glossary */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                      <Tag size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Glosarium Kosakata & Frasa Industri</h4>
                      <p className="text-xs text-slate-500">Terminologi teknis bahasa Inggris otentik di tempat kerja</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {data.referensiIndustri.istilahIndustri.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{item.term}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{item.artinya}</p>
                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                          <span className="text-amber-700 font-bold block mb-0.5">Contoh Vokasi:</span>
                          "{item.contohKalimatVokasi}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workplace Dialogue Scenario */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Skenario Kasus & Transkrip Dialog Nyata</h4>
                      <p className="text-xs text-slate-500">Bahan simulasi dan role-play bebas klise AI</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl mb-4">
                    <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block mb-1">
                      Kasus: {data.referensiIndustri.skenarioDuniaKerja.judulKasus}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {data.referensiIndustri.skenarioDuniaKerja.konteksIndustri}
                    </p>
                  </div>

                  <div className="space-y-2.5 mb-4">
                    {data.referensiIndustri.skenarioDuniaKerja.dialogOtentik.map((turn, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm ${
                          idx % 2 === 0 ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <span className="font-bold text-slate-900 block mb-0.5">{turn.speaker}:</span>
                        <span className="italic text-slate-700">"{turn.text}"</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm">
                    <span className="font-bold text-amber-900 block mb-1">Tantangan Kerja Siswa:</span>
                    <p className="text-amber-800">{data.referensiIndustri.skenarioDuniaKerja.tantanganKerja}</p>
                  </div>
                </div>

                {/* Source Citations & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Dokumen Acuan & Regulasi</h4>
                        <p className="text-xs text-slate-500">Rujukan regulasi dan literatur industri</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {data.referensiIndustri.sumberReferensi.map((src, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{src.title}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {src.sourceType}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{src.snippet}</p>
                          {src.url && (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-accent hover:underline font-semibold mt-1.5"
                            >
                              <span>Buka Sumber</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Saran Aktivitas Praktik Vokasi</h4>
                        <p className="text-xs text-slate-500">Rekomendasi proyek Teaching Factory</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {data.referensiIndustri.rekomendasiMateriAjar.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl text-xs text-slate-800">
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Print Preview & Revision Notes Modals */}
      <PrintPreviewModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={data} 
      />

      <RevisionNotesDrawer 
        isOpen={isRevisionDrawerOpen} 
        onClose={() => setIsRevisionDrawerOpen(false)} 
        notes={data.catatanRevisi || []} 
        onSaveNotes={handleSaveRevisionNotes} 
      />
    </motion.div>
  );
}
