import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, BorderStyle, HeadingLevel, AlignmentType, ShadingType 
} from 'docx';
import { ModuleData } from '../types';

export async function generateModuleDocxBlob(data: ModuleData): Promise<Blob> {
  const children: any[] = [];

  // Title Section
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'PERANGKAT PEMBELAJARAN BAHASA INGGRIS VOKASI SMK',
          bold: true,
          size: 28, // 14pt
          color: '1E4D4D',
          font: 'Arial'
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Topik Pembelajaran: ${data.topic}`,
          bold: true,
          size: 24, // 12pt
          color: 'E87A5D',
          font: 'Arial'
        }),
      ],
    })
  );

  // Identity Table
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Kelas / Semester: Kelas ${data.kelas} / Semester ${data.semester}`, bold: true, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Program/Konsentrasi Keahlian: ${data.jurusan}`, size: 20 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Model/Layout: ${data.templateLayout || 'Standar Lengkap'}`, size: 20 })] }),
              new Paragraph({ children: [new TextRun({ text: `Gaya Bahasa: ${data.gayaBahasa || 'Dunia Kerja Vokasi'}`, size: 20 })] }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(identityTable, new Paragraph({ spacing: { after: 300 } }));

  // Helper for Section Titles
  const addHeading = (text: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 24,
            color: '1E4D4D',
            font: 'Arial'
          }),
        ],
      })
    );
  };

  const addSubHeading = (text: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 22,
            color: 'E87A5D',
            font: 'Arial'
          }),
        ],
      })
    );
  };

  // 1. MODUL AJAR
  if (data.modulAjar) {
    addHeading('1. MODUL AJAR VOKASI');

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Identitas & Informasi Umum: ', bold: true, size: 20 }),
          new TextRun({ text: data.modulAjar.identitas, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Tujuan Pembelajaran (TP): ', bold: true, size: 20 }),
          new TextRun({ text: data.modulAjar.tujuanPembelajaran, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Pemahaman Bermakna (Essential Understanding): ', bold: true, size: 20 }),
          new TextRun({ text: data.modulAjar.pemahamanBermakna, size: 20 }),
        ],
      })
    );

    addSubHeading('Pertanyaan Pemantik (Essential Questions):');
    data.modulAjar.pertanyaanPemantik.forEach((p, idx) => {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: `${idx + 1}. ${p}`, size: 20 })],
        })
      );
    });

    addSubHeading('Skenario Kegiatan Pembelajaran:');
    data.modulAjar.kegiatanPembelajaran.forEach((k) => {
      children.push(
        new Paragraph({
          spacing: { before: 150, after: 60 },
          children: [new TextRun({ text: `Pertemuan ${k.pertemuan}`, bold: true, size: 21, color: '1E4D4D' })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: '• Pendahuluan: ', bold: true, size: 20 }),
            new TextRun({ text: k.pembuka, size: 20 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: '• Kegiatan Inti (Praktik Vokasi): ', bold: true, size: 20 }),
            new TextRun({ text: k.inti, size: 20 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: '• Penutup & Refleksi: ', bold: true, size: 20 }),
            new TextRun({ text: k.penutup, size: 20 }),
          ],
        })
      );
    });

    children.push(
      new Paragraph({
        spacing: { before: 150, after: 200 },
        children: [
          new TextRun({ text: 'Refleksi Guru & Peserta Didik: ', bold: true, size: 20 }),
          new TextRun({ text: data.modulAjar.refleksi, size: 20 }),
        ],
      })
    );
  }

  // 2. LKPD
  if (data.lkpd) {
    addHeading('2. LEMBAR KERJA PESERTA DIDIK (LKPD)');

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `Judul Lembar Kerja: `, bold: true, size: 20 }),
          new TextRun({ text: data.lkpd.judul, bold: true, size: 20, color: 'E87A5D' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Tujuan Tugas: ', bold: true, size: 20 }),
          new TextRun({ text: data.lkpd.tujuan, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({ text: 'Instruksi Kerja: ', bold: true, size: 20 }),
          new TextRun({ text: data.lkpd.instruksi, size: 20 }),
        ],
      })
    );

    addSubHeading('Aktivitas Siswa:');
    data.lkpd.aktivitas.forEach((a, idx) => {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [new TextRun({ text: `${idx + 1}. ${a.pertanyaan}`, bold: true, size: 20 })],
        })
      );

      if (a.tipe === 'pilihan_ganda' && a.opsi) {
        a.opsi.forEach((o) => {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: 360 },
              children: [new TextRun({ text: o, size: 19 })],
            })
          );
        });
      } else if (a.tipe === 'isian') {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            indent: { left: 360 },
            children: [new TextRun({ text: 'Jawaban Siswa: __________________________________________________________________________', italics: true, size: 18, color: '64748B' })],
          })
        );
      }
    });
  }

  // 3. MEDIA PEMBELAJARAN
  if (data.media) {
    addHeading('3. RANCANGAN MEDIA PEMBELAJARAN INTERAKTIF');

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Judul Konsep Media: ', bold: true, size: 20 }),
          new TextRun({ text: data.media.judulKonsep, bold: true, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Format Media: ', bold: true, size: 20 }),
          new TextRun({ text: data.media.formatMedia, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'Skenario Utama: ', bold: true, size: 20 }),
          new TextRun({ text: data.media.skenarioUtama, size: 20 }),
        ],
      })
    );

    addSubHeading('Langkah Interaktif Simulasi Visual:');

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '1E4D4D', type: ShadingType.CLEAR, color: 'auto' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tahap', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E4D4D', type: ShadingType.CLEAR, color: 'auto' }, children: [new Paragraph({ children: [new TextRun({ text: 'Deskripsi Layar / Tampilan', bold: true, color: 'FFFFFF', size: 19 })] })] }),
          new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '1E4D4D', type: ShadingType.CLEAR, color: 'auto' }, children: [new Paragraph({ children: [new TextRun({ text: 'Tindakan Interaktif Siswa', bold: true, color: 'FFFFFF', size: 19 })] })] }),
        ]
      })
    ];

    data.media.langkahInteraktif.forEach((l) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.tahap, bold: true, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.deskripsiLayar, size: 19 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.tindakanSiswa, size: 19 })] })] }),
          ]
        })
      );
    });

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }), new Paragraph({ spacing: { after: 200 } }));
  }

  // 4. INSTRUMEN ASESMEN & RUBRIK
  if (data.asesmenInstrumen) {
    addHeading('4. INSTRUMEN ASESMEN & RUBRIK PENILAIAN');

    children.push(
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({ text: 'Fokus Asesmen: ', bold: true, size: 20 }),
          new TextRun({ text: data.asesmenInstrumen.fokus, bold: true, size: 20, color: 'E87A5D' }),
        ],
      })
    );

    const renderAsesmenDocx = (title: string, sec: any) => {
      addSubHeading(title);
      children.push(
        new Paragraph({ children: [new TextRun({ text: 'Tujuan Asesmen: ', bold: true, size: 19 }), new TextRun({ text: sec.tujuan, size: 19 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Instruksi: ', bold: true, size: 19 }), new TextRun({ text: sec.instruksi, size: 19 })] })
      );

      children.push(new Paragraph({ children: [new TextRun({ text: 'Butir Soal / Tugas:', bold: true, size: 19 })] }));
      sec.butirSoalAtauTugas.forEach((b: string, idx: number) => {
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${idx + 1}. ${b}`, size: 19 })] }));
      });

      children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Rubrik Penilaian:', bold: true, size: 19 })] }));

      const rubricRows = [
        new TableRow({
          children: [
            new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Kriteria', bold: true, size: 18 })] })] }),
            new TableCell({ width: { size: 19, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Perlu Bimbingan (1)', bold: true, size: 18 })] })] }),
            new TableCell({ width: { size: 19, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Cukup (2)', bold: true, size: 18 })] })] }),
            new TableCell({ width: { size: 19, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Baik (3)', bold: true, size: 18 })] })] }),
            new TableCell({ width: { size: 19, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, children: [new Paragraph({ children: [new TextRun({ text: 'Sangat Baik (4)', bold: true, size: 18 })] })] }),
          ]
        })
      ];

      sec.rubrik.forEach((r: any) => {
        rubricRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.kriteria, bold: true, size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.perluBimbingan, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.cukup, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.baik, size: 17 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.sangatBaik, size: 17 })] })] }),
            ]
          })
        );
      });

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rubricRows }), new Paragraph({ spacing: { after: 150 } }));
    };

    renderAsesmenDocx('A. Asesmen Diagnostik (Awal)', data.asesmenInstrumen.diagnostik);
    renderAsesmenDocx('B. Asesmen Formatif (Proses)', data.asesmenInstrumen.formatif);
    renderAsesmenDocx('C. Asesmen Sumatif (Akhir)', data.asesmenInstrumen.sumatif);
  }

  // Create Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function exportModuleToDocx(data: ModuleData) {
  const blob = await generateModuleDocxBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Perangkat_Ajar_${data.topic.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
