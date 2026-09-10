export interface LkpdActivity {
  tipe: 'isian' | 'checklist' | 'pilihan_ganda';
  pertanyaan: string;
  opsi?: string[];
}

export interface LkpdData {
  judul: string;
  tujuan: string;
  instruksi: string;
  aktivitas: LkpdActivity[];
}

export interface MediaData {
  judulKonsep: string;
  formatMedia: string;
  skenarioUtama: string;
  langkahInteraktif: {
    tahap: string;
    deskripsiLayar: string;
    tindakanSiswa: string;
  }[];
}

export interface RubrikPenilaian {
  kriteria: string;
  perluBimbingan: string;
  cukup: string;
  baik: string;
  sangatBaik: string;
}

export interface InstrumenAsesmen {
  tujuan: string;
  instruksi: string;
  butirSoalAtauTugas: string[];
  rubrik: RubrikPenilaian[];
}

export interface AsesmenData {
  fokus: string;
  diagnostik: InstrumenAsesmen;
  formatif: InstrumenAsesmen;
  sumatif: InstrumenAsesmen;
}

export type GayaBahasaType = 'formal' | 'santai' | 'vokasi';
export type TemplateLayoutType = 'lengkap' | 'ringkas' | 'pjbl';

export interface RevisionNote {
  id: string;
  catatan: string;
  komponen: 'umum' | 'modul' | 'lkpd' | 'media' | 'asesmen';
  status: 'perlu_tindakan' | 'selesai';
  createdAt: number;
}

export interface NonEffectiveWeekEvent {
  id: string;
  namaKegiatan: string;
  jumlahMinggu: number;
  keterangan?: string;
}

export interface AcademicCalendarMonth {
  bulan: string;
  totalMinggu: number;
  mingguTidakEfektif: number;
  kegiatanNonEfektif: string[];
}

export interface AcademicCalendarData {
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  jpPerMinggu: number;
  bulanList: AcademicCalendarMonth[];
  kegiatanKhusus: NonEffectiveWeekEvent[];
  catatanDistribusi?: string;
}

export interface TpItem {
  kodeTp: string;
  elemen: string;
  tujuanPembelajaran: string;
  lingkupMateri: string;
  dimensiPpp: string[];
  alokasiJp: number;
  indikatorKetercapaian: string[];
  ideAsesmen: string;
}

export interface CpToTpMappingResult {
  fase: string;
  kelas: string;
  jurusan: string;
  elemenFokus: string[];
  rasional: string;
  daftarTp: TpItem[];
  rekomendasiUrutanAtp: string[];
}

export interface ReferenceSource {
  title: string;
  url?: string;
  sourceType: 'skkni' | 'dudi' | 'curriculum' | 'industry_article' | 'video_manual';
  snippet: string;
}

export interface VocationalReferenceData {
  query: string;
  jurusan: string;
  topik: string;
  standarKompetensi: {
    skkniCode?: string;
    deskripsiUnit: string;
    kriteriaKinerja: string[];
  };
  istilahIndustri: {
    term: string;
    artinya: string;
    contohKalimatVokasi: string;
  }[];
  skenarioDuniaKerja: {
    judulKasus: string;
    konteksIndustri: string;
    dialogOtentik: { speaker: string; text: string }[];
    tantanganKerja: string;
  };
  sumberReferensi: ReferenceSource[];
  rekomendasiMateriAjar: string[];
}

export interface ModuleData {
  id: string;
  userId: string;
  kelas: string;
  semester: string;
  jurusan: string;
  topic: string;
  status: 'draft' | 'final';
  gayaBahasa?: GayaBahasaType;
  templateLayout?: TemplateLayoutType;
  modulAjar: {
    identitas: string;
    tujuanPembelajaran: string;
    pemahamanBermakna: string;
    pertanyaanPemantik: string[];
    kegiatanPembelajaran: {
      pertemuan: number;
      pembuka: string;
      inti: string;
      penutup: string;
    }[];
    asesmen: string;
    refleksi: string;
    keselarasan: {
      pertemuanKe: string;
      alokasiJamProsem: number;
      alokasiJamModul: number;
      faseCapaian: string;
      penjelasan: string;
    };
  } | null;
  lkpd: LkpdData | null;
  media: MediaData | null;
  asesmenInstrumen: AsesmenData | null;
  referensiIndustri?: VocationalReferenceData | null;
  catatanRevisi?: RevisionNote[];
  createdAt: number;
  updatedAt: number;
}

export interface UserContextData {
  prota: string;
  prosem: string;
  cpAtp: string;
  academicCalendar?: AcademicCalendarData;
}
