/**
 * DOCUVALID-AI | SAMPLE LETTERS GENERATOR
 * Merender dokumen surat A4 realistis beresolusi tinggi ke dalam Canvas 2D
 * Lengkap dengan kop surat, lambang instansi, stempel basah, tanda tangan, dan teks resmi
 */

const SAMPLE_LETTERS = {
  case1: {
    id: "case1",
    name: "Surat Undangan Pelantikan (Format Sempurna)",
    badge: "96% Lolos Baku",
    badgeType: "pass",
    description: "Surat resmi BEM dengan struktur kop, nomor baku, tanggal PUEBI, 2 tanda tangan, dan stempel basah.",
    layout: {
      kop_surat: { detected: true, x: 40, y: 35, width: 720, height: 145 },
      tanggal: { detected: true, x: 500, y: 195, width: 250, height: 35 },
      meta: { detected: true, x: 40, y: 195, width: 440, height: 80 },
      tujuan: { detected: true, x: 40, y: 290, width: 350, height: 75 },
      isi: { detected: true, x: 40, y: 380, width: 720, height: 430 },
      ttd: { detected: true, x: 40, y: 830, width: 720, height: 230 }
    },
    extracted: {
      has_logo: true,
      kop_text: "KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI UNIVERSITAS NUSA PUTRA SUKABUMI BADAN EKSEKUTIF MAHASISWA Jln. Raya Cibolang No. 21, Sukabumi Email: bem@nusaputra.ac.id",
      nomor_surat: "045/BEM-U/UND/X/2026",
      lampiran: "1 (satu) Berkas",
      hal: "Undangan Rapat Kerja Terbuka",
      tanggal: "Sukabumi, 24 Oktober 2026",
      tujuan: "Yth. Ketua Dewan Perwakilan Mahasiswa\nUniversitas Nusa Putra Sukabumi\ndi Tempat",
      signature_count: 2,
      has_official_stamp: true,
      isi_text: "Sehubungan dengan akan dilaksanakannya agenda kerja rutin Dewan Pengurus Badan Eksekutif Mahasiswa (BEM) periode 2026/2027 guna membahas program pengabdian masyarakat dan sinergi ormawa, melalui surat ini kami bermaksud mengundang Saudara/i untuk dapat hadir pada forum resmi tersebut:",
      pembuka: "Dengan hormat,",
      penutup: "Hormat kami,"
    }
  },

  case2: {
    id: "case2",
    name: "Surat Peminjaman Aula (Format Butuh Revisi)",
    badge: "68% Perlu Revisi",
    badgeType: "warn",
    description: "Nomor surat melewatkan angka Romawi bulan, tanggal disingkat, dan pleonasme 'Kepada Yth'.",
    layout: {
      kop_surat: { detected: true, x: 40, y: 35, width: 720, height: 145 },
      tanggal: { detected: true, x: 520, y: 195, width: 230, height: 35 },
      meta: { detected: true, x: 40, y: 195, width: 440, height: 80 },
      tujuan: { detected: true, x: 40, y: 290, width: 380, height: 75 },
      isi: { detected: true, x: 40, y: 380, width: 720, height: 430 },
      ttd: { detected: true, x: 40, y: 830, width: 720, height: 230 }
    },
    extracted: {
      has_logo: true,
      kop_text: "UNIVERSITAS NUSA PUTRA SUKABUMI FAKULTAS TEKNIK BEM FT Gd. Graha Teknik Lt. 1 Email: bem.ft@nusaputra.ac.id",
      nomor_surat: "021/BEM-FT/PINJAM/2026", // ERROR: Tanpa bulan romawi
      lampiran: "-",
      hal: "Permohonan Peminjaman Aula",
      tanggal: "24 Okt 2026", // WARN: Singkatan, tanpa nama kota
      tujuan: "Kepada Yth. Kepala Bagian Sarana & Prasarana\ndi Sukabumi", // WARN: Pleonasme
      isi_text: "Sehubungan dengan agenda program mahasiswa, kami bermaksud memohon ijin peminjaman aula gedung pertemuan utk kegiatan yang akan di laksanakan dgn susunan jadual terlampir sebagai berikut:",
      signature_count: 2,
      has_official_stamp: true,
      pembuka: "Dengan hormat,",
      penutup: "Hormat kami,"
    }
  },

  case3: {
    id: "case3",
    name: "Surat Permohonan Dana (Kritis / Cacat Format)",
    badge: "42% Ditolak",
    badgeType: "fail",
    description: "Kop surat tanpa logo resmi, tanpa tanggal surat, tanda tangan tunggal, dan TANPA stempel basah.",
    layout: {
      kop_surat: { detected: true, x: 40, y: 35, width: 720, height: 110 },
      tanggal: { detected: false, x: 500, y: 170, width: 250, height: 35 },
      meta: { detected: true, x: 40, y: 170, width: 440, height: 80 },
      tujuan: { detected: true, x: 40, y: 265, width: 350, height: 75 },
      isi: { detected: true, x: 40, y: 360, width: 720, height: 450 },
      ttd: { detected: true, x: 40, y: 830, width: 720, height: 230 }
    },
    extracted: {
      has_logo: false, // ERROR: Tanpa logo
      kop_text: "ORGANISASI MAHASISWA BEM\nSekretariat Kampus Timur",
      nomor_surat: "SURAT-01/DANA/2026", // ERROR: Asal-asalan
      lampiran: "1 Bundel",
      hal: "Pengajuan Sponsor",
      tanggal: "", // ERROR: Kosong
      tujuan: "Yth. Pimpinan PT Cahaya Abadi\ndi Tempat",
      signature_count: 1, // ERROR: Kurang tanda tangan
      has_official_stamp: false, // ERROR: Tanpa stempel
      isi_text: "Proposal permohonan bantuan dana ini kami ajukan sbg bahan pertimbangan sponsorship dan kwitansi rincian jadual kegiatan terlampir:",
      pembuka: "Dengan hormat,",
      penutup: "Hormat saya,"
    }
  }
};

/**
 * Generator Gambar Surat Nyata pada Canvas HTML5
 */
class DocumentRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.currentCase = SAMPLE_LETTERS.case1;
    this.filterMode = 'normal'; // 'normal', 'grayscale', 'binary', 'heatmap'

    // Ukuran Kanvas Standar Kertas A4 (800 x 1130 px)
    this.width = 800;
    this.height = 1130;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  loadCase(caseKey) {
    if (SAMPLE_LETTERS[caseKey]) {
      this.currentCase = SAMPLE_LETTERS[caseKey];
      this.render();
      return this.currentCase;
    }
    return null;
  }

  setFilterMode(mode) {
    this.filterMode = mode;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const doc = this.currentCase;

    // Bersihkan canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Kertas A4 (Latar Putih Alami dengan sedikit tekstur kertas)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.width, this.height);

    // Batas Margin Halaman Halus
    ctx.strokeStyle = "#f1f5f9";
    ctx.strokeRect(20, 20, this.width - 40, this.height - 40);

    // 2. RENDER KOP SURAT
    this.renderKop(doc);

    // 3. RENDER NOMOR & TANGGAL
    this.renderMetaAndDate(doc);

    // 4. RENDER TUJUAN
    this.renderRecipient(doc);

    // 5. RENDER ISI SURAT
    this.renderBody(doc);

    // 6. RENDER TANDA TANGAN & STEMPEL
    this.renderSignatures(doc);

    // 7. Jika ada efek Computer Vision Filter aktif
    if (this.filterMode !== 'normal') {
      this.applyFilterEffect(this.filterMode);
    }
  }

  renderKop(doc) {
    const ctx = this.ctx;
    const isCase3 = doc.id === 'case3';

    if (doc.extracted.has_logo) {
      // Gambar Logo BEM / Universitas (Vektor Emblem)
      ctx.save();
      ctx.translate(65, 85);
      
      // Lingkaran luar emas
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fillStyle = "#1e3a8a";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#d97706";
      ctx.stroke();

      // Bintang & Obor Universitas
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, -6, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("BEM", 0, 18);
      ctx.restore();
    }

    // Teks Kop
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    const kopCenterX = doc.extracted.has_logo ? 430 : 400;

    if (!isCase3) {
      ctx.font = "bold 13px 'Times New Roman', serif";
      ctx.fillText("KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI", kopCenterX, 55);
      
      ctx.font = "bold 15px 'Times New Roman', serif";
      ctx.fillText("UNIVERSITAS NUSA PUTRA SUKABUMI", kopCenterX, 76);

      ctx.font = "bold 18px 'Times New Roman', serif";
      ctx.fillText(doc.id === 'case2' ? "BADAN EKSEKUTIF MAHASISWA FAKULTAS TEKNIK" : "BADAN EKSEKUTIF MAHASISWA (BEM-U)", kopCenterX, 100);

      ctx.font = "normal 10.5px 'Times New Roman', serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("Gedung Student Center Lt. 2, Jln. Raya Cibolang No. 21, Sukabumi", kopCenterX, 120);
      ctx.fillText("Website: www.nusaputra.ac.id | Email: bem@nusaputra.ac.id", kopCenterX, 135);

      // Garis Ganda Pembatas Kop Surat
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(40, 150);
      ctx.lineTo(760, 150);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 155);
      ctx.lineTo(760, 155);
      ctx.stroke();
    } else {
      // Case 3 Cacat: Kop asal-asalan tanpa standar
      ctx.font = "bold 16px Arial";
      ctx.fillText("ORGANISASI MAHASISWA KAMPUS", kopCenterX, 65);
      ctx.font = "normal 11px Arial";
      ctx.fillText("Sekretariat Kampus Timur - Kota", kopCenterX, 85);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(100, 105);
      ctx.lineTo(700, 105);
      ctx.stroke();
    }
  }

  renderMetaAndDate(doc) {
    const ctx = this.ctx;
    ctx.textAlign = "left";
    ctx.font = "12.5px 'Times New Roman', serif";
    ctx.fillStyle = "#000000";

    // Tanggal di kanan atas
    if (doc.extracted.tanggal) {
      ctx.fillText(doc.extracted.tanggal, 520, 195);
    }

    // Nomor, Lampiran, Hal di kiri
    const startY = 195;
    ctx.fillText("Nomor", 50, startY);
    ctx.fillText(":", 120, startY);
    ctx.font = "bold 12.5px 'Times New Roman', serif";
    ctx.fillText(doc.extracted.nomor_surat, 135, startY);

    ctx.font = "12.5px 'Times New Roman', serif";
    ctx.fillText("Lampiran", 50, startY + 24);
    ctx.fillText(":", 120, startY + 24);
    ctx.fillText(doc.extracted.lampiran, 135, startY + 24);

    ctx.fillText("Perihal", 50, startY + 48);
    ctx.fillText(":", 120, startY + 48);
    ctx.font = "bold 12.5px 'Times New Roman', serif";
    ctx.fillText(doc.extracted.hal, 135, startY + 48);
  }

  renderRecipient(doc) {
    const ctx = this.ctx;
    ctx.textAlign = "left";
    ctx.font = "12.5px 'Times New Roman', serif";
    ctx.fillStyle = "#000000";

    const lines = doc.extracted.tujuan.split('\n');
    let y = 300;
    lines.forEach(line => {
      ctx.fillText(line, 50, y);
      y += 20;
    });
  }

  renderBody(doc) {
    const ctx = this.ctx;
    ctx.textAlign = "left";
    ctx.font = "12.5px 'Times New Roman', serif";
    ctx.fillStyle = "#000000";

    // Salam Pembuka
    ctx.fillText(doc.extracted.pembuka, 50, 400);

    // Paragraf Pembuka
    const p1 = doc.extracted.isi_text || "Sehubungan dengan agenda resmi organisasi mahasiswa, melalui surat ini kami bermaksud menyampaikan permohonan sebagaimana terlampir:";
    this.wrapText(ctx, p1, 50, 430, 700, 22);

    // Detail Acara
    const details = [
      ["Hari, Tanggal", ":  Senin, 02 November 2026"],
      ["Waktu", ":  08.30 WIB s.d. Selesai"],
      ["Tempat", ":  Auditorium Utama Lantai 3, Gd. Rektorat"],
      ["Agenda", ":  Rapat Pleno Koordinasi Mahasiswa"]
    ];

    let detY = 515;
    details.forEach(([lbl, val]) => {
      ctx.fillText(lbl, 90, detY);
      ctx.fillText(val, 200, detY);
      detY += 22;
    });

    // Paragraf Penutup
    const p2 = "Mengingat pentingnya agenda pembahasan ini, kami sangat mengharapkan kehadiran Saudara/i tepat pada waktu yang telah ditentukan. Apabila terdapat berkas atau pandangan tertulis, mohon dapat disampaikan sebelum sidang dimulai.";
    this.wrapText(ctx, p2, 50, 630, 700, 22);

    const p3 = "Demikian surat ini kami sampaikan. Atas perhatian, dukungan, dan kerja sama yang baik, kami ucapkan terima kasih.";
    this.wrapText(ctx, p3, 50, 700, 700, 22);

    // Salam Penutup
    ctx.fillText(doc.extracted.penutup, 50, 755);
  }

  renderSignatures(doc) {
    const ctx = this.ctx;
    ctx.font = "12px 'Times New Roman', serif";
    ctx.fillStyle = "#000000";

    if (doc.extracted.signature_count === 2) {
      // 2 Tanda Tangan: Kiri Sekretaris, Kanan Ketua Umum
      // Kiri
      ctx.textAlign = "center";
      ctx.fillText("Sekretaris Jenderal,", 180, 840);
      this.drawSignatureStroke(ctx, 180, 895, "#1e3a8a");
      ctx.font = "bold 13px 'Times New Roman', serif";
      ctx.fillText("Anisa Rahmawati, S.T.", 180, 940);
      ctx.font = "11.5px 'Times New Roman', serif";
      ctx.fillText("NIM. 2208107010045", 180, 958);

      // Kanan
      ctx.fillText("Ketua Umum BEM,", 600, 840);
      this.drawSignatureStroke(ctx, 600, 895, "#0f172a");
      ctx.font = "bold 13px 'Times New Roman', serif";
      ctx.fillText("Muhammad Pandu, S.Kom.", 600, 940);
      ctx.font = "11.5px 'Times New Roman', serif";
      ctx.fillText("NIM. 2208107010012", 600, 958);

      // Stempel Basah jika ada (Menimpa ttd Ketua Umum)
      if (doc.extracted.has_official_stamp) {
        this.drawOfficialStamp(ctx, 520, 910);
      }
    } else {
      // Case 3 Cacat: Hanya 1 TTD di kanan tanpa stempel
      ctx.textAlign = "center";
      ctx.fillText("Tertanda,", 600, 840);
      this.drawSignatureStroke(ctx, 600, 895, "#000000");
      ctx.font = "bold 13px 'Times New Roman', serif";
      ctx.fillText("Pandu W.", 600, 940);
      ctx.font = "11px 'Times New Roman', serif";
      ctx.fillText("(Tanpa NIM/NPM)", 600, 958);
    }

    // QR Code Verifikasi Legalitas di kiri bawah
    this.drawSecurityQR(ctx, 50, 990);
  }

  drawSignatureStroke(ctx, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 45, y + 10);
    ctx.bezierCurveTo(x - 20, y - 35, x - 10, y + 25, x + 10, y - 20);
    ctx.bezierCurveTo(x + 25, y - 45, x + 35, y + 15, x + 55, y - 5);
    ctx.stroke();

    // Garis bawah tanda tangan
    ctx.beginPath();
    ctx.moveTo(x - 35, y + 15);
    ctx.lineTo(x + 50, y + 15);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawOfficialStamp(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.15); // Sedikit miring alami seperti cap stempel manual

    // Tinta Stempel Ungu Khas BEM Mahasiswa
    ctx.strokeStyle = "rgba(109, 40, 217, 0.78)";
    ctx.fillStyle = "rgba(109, 40, 217, 0.78)";

    // Lingkaran Luar Ganda
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 43, 0, Math.PI * 2);
    ctx.stroke();

    // Teks Melingkar Stempel
    ctx.font = "bold 8.5px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BADAN EKSEKUTIF MAHASISWA", 0, -25);
    ctx.fillText("UNIVERSITAS NUSA PUTRA SUKABUMI", 0, 32);

    // Bintang Stempel
    ctx.font = "bold 12px Arial";
    ctx.fillText("★  SEKRETARIAT  ★", 0, 5);

    ctx.restore();
  }

  drawSecurityQR(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = "#1e293b";
    // QR block dummy realistis
    ctx.fillRect(x, y, 65, 65);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 5, y + 5, 20, 20);
    ctx.fillRect(x + 40, y + 5, 20, 20);
    ctx.fillRect(x + 5, y + 40, 20, 20);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 9, y + 9, 12, 12);
    ctx.fillRect(x + 44, y + 9, 12, 12);
    ctx.fillRect(x + 9, y + 44, 12, 12);

    ctx.fillStyle = "#64748b";
    ctx.font = "8px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Security Hash: 8F2A-BEM-2026", x + 75, y + 25);
    ctx.fillText("Tervalidasi Sistem DOCUVALID AJA", x + 75, y + 40);
    ctx.fillText("Standard: ISO/IEC 27001 Organisasi", x + 75, y + 55);
    ctx.restore();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  /**
   * Filter OpenCV Simulasi (Grayscale, Adaptive Thresholding / Binarization, Heatmap)
   */
  applyFilterEffect(mode) {
    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (mode === 'grayscale') {
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else if (mode === 'binary') {
        // Otsu / Adaptive Thresholding Simulator
        const val = gray < 210 ? 0 : 255;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      } else if (mode === 'heatmap') {
        // Gradien visualisasi atensi model Deep Learning
        if (gray < 150) {
          data[i] = 239;     // Merah
          data[i + 1] = 68;   // Hijau
          data[i + 2] = 68;   // Biru
        } else if (gray < 220) {
          data[i] = 99;
          data[i + 1] = 102;
          data[i + 2] = 241;
        }
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }
}

window.SAMPLE_LETTERS = SAMPLE_LETTERS;
window.DocumentRenderer = DocumentRenderer;
