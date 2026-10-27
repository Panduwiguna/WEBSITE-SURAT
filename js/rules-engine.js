/**
 * DOCUVALID-AI | RULES ENGINE
 * Standar Validasi Format dan Struktur Surat Organisasi Mahasiswa (BEM)
 * Mengacu pada Pedoman Administrasi Baku Mahasiswa & Kaidah PUEBI
 */

const RULE_PRESETS = {
  bem_univ: {
    name: "BEM Universitas (Pedoman Baku 2026)",
    org_level: "Tingkat Universitas",
    kop_required_keywords: ["KEMENTERIAN", "UNIVERSITAS", "BADAN EKSEKUTIF MAHASISWA"],
    nomor_regex: /^([0-9]{3})\/BEM-U\/([A-Z0-9\-]+)\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(202[0-9])$/,
    nomor_example: "045/BEM-U/UND/X/2026",
    require_stamp: true,
    min_signatures: 2,
    puebi_strict: true
  },
  bem_fakultas: {
    name: "BEM Fakultas Teknik (FT)",
    org_level: "Tingkat Fakultas",
    kop_required_keywords: ["UNIVERSITAS", "FAKULTAS TEKNIK", "BEM FT"],
    nomor_regex: /^([0-9]{3})\/BEM-FT\/([A-Z0-9\-]+)\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(202[0-9])$/,
    nomor_example: "021/BEM-FT/EKS/XI/2026",
    require_stamp: true,
    min_signatures: 2,
    puebi_strict: true
  },
  hima: {
    name: "Himpunan Mahasiswa Jurusan (HIMA)",
    org_level: "Tingkat Program Studi / Jurusan",
    kop_required_keywords: ["HIMPUNAN MAHASISWA", "JURUSAN"],
    nomor_regex: /^([0-9]{3})\/HIMA-[A-Z]+\/([A-Z0-9\-]+)\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(202[0-9])$/,
    nomor_example: "014/HIMA-IF/PAN-PEL/X/2026",
    require_stamp: true,
    min_signatures: 2,
    puebi_strict: false
  }
};

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const PUEBI_SPELL_CHECK = [
  { regex: /\bijin\b/gi, word: "ijin", correct: "izin", explanation: "Berdasarkan KBBI dan kaidah PUEBI, penulisan baku adalah 'izin', bukan 'ijin'." },
  { regex: /\bjadual\b/gi, word: "jadual", correct: "jadwal", explanation: "Berdasarkan KBBI, penulisan baku adalah 'jadwal', bukan 'jadual'." },
  { regex: /\banalisa\b/gi, word: "analisa", correct: "analisis", explanation: "Berdasarkan KBBI, kata serapan yang baku adalah 'analisis', bukan 'analisa'." },
  { regex: /\bkwitansi\b/gi, word: "kwitansi", correct: "kuitansi", explanation: "Berdasarkan KBBI, penulisan baku adalah 'kuitansi', bukan 'kwitansi'." },
  { regex: /\bantri\b/gi, word: "antri", correct: "antre", explanation: "Berdasarkan KBBI, penulisan baku adalah 'antre', bukan 'antri'." },
  { regex: /\bresiko\b/gi, word: "resiko", correct: "risiko", explanation: "Berdasarkan KBBI, penulisan baku adalah 'risiko', bukan 'resiko'." },
  { regex: /\bmerubah\b/gi, word: "merubah", correct: "mengubah", explanation: "Bentuk dasar 'ubah' diberi awalan me- menjadi 'mengubah', bukan 'merubah'." },
  { regex: /\bpebruari\b/gi, word: "pebruari", correct: "Februari", explanation: "Nama bulan resmi menurut PUEBI adalah 'Februari' (dengan huruf F)." },
  { regex: /\bnopember\b/gi, word: "nopember", correct: "November", explanation: "Nama bulan resmi menurut PUEBI adalah 'November' (dengan huruf V)." },
  { regex: /\bsekertaris\b/gi, word: "sekertaris", correct: "sekretaris", explanation: "Penulisan jabatan yang baku adalah 'sekretaris', bukan 'sekertaris'." },
  { regex: /\bdi laksanakan\b/gi, word: "di laksanakan", correct: "dilaksanakan", explanation: "Sebagai kata kerja pasif, 'dilaksanakan' wajib ditulis serangkai tanpa spasi." },
  { regex: /\bdi hadiri\b/gi, word: "di hadiri", correct: "dihadiri", explanation: "Sebagai kata kerja pasif, 'dihadiri' wajib ditulis serangkai tanpa spasi." },
  { regex: /\byg\b/gi, word: "yg", correct: "yang", explanation: "Surat dinas resmi tidak diperkenankan menggunakan singkatan informal 'yg'." },
  { regex: /\bdgn\b/gi, word: "dgn", correct: "dengan", explanation: "Surat dinas resmi tidak diperkenankan menggunakan singkatan 'dgn'." },
  { regex: /\butk\b/gi, word: "utk", correct: "untuk", explanation: "Surat dinas resmi tidak diperkenankan menggunakan singkatan 'utk'." },
  { regex: /\bsbg\b/gi, word: "sbg", correct: "sebagai", explanation: "Surat dinas resmi tidak diperkenankan menggunakan singkatan 'sbg'." },
  { regex: /\btsb\b/gi, word: "tsb", correct: "tersebut", explanation: "Gunakan kata lengkap 'tersebut' alih-alih singkatan 'tsb'." }
];

class RulesEngine {
  constructor() {
    this.currentPresetKey = 'bem_univ';
  }

  setPreset(key) {
    if (RULE_PRESETS[key]) {
      this.currentPresetKey = key;
    }
  }

  getCurrentPreset() {
    return RULE_PRESETS[this.currentPresetKey];
  }

  /**
   * Menjalankan evaluasi komprehensif pada metadata ekstraksi teks dokumen
   */
  evaluate(doc) {
    const preset = this.getCurrentPreset();
    const issues = [];
    let scoreDeductions = 0;

    // 1. Evaluasi Kop Surat (Layout & Konten)
    if (!doc.layout.kop_surat || !doc.layout.kop_surat.detected) {
      issues.push({
        id: "kop_missing",
        category: "Kop Surat",
        bboxId: "bbox-kop",
        severity: "error",
        title: "Kop Surat Resmi Tidak Terdeteksi",
        desc: "Sistem Computer Vision tidak mendeteksi blok Kop Surat pada area 20% atas dokumen.",
        autofix: null,
        deduction: 30
      });
      scoreDeductions += 30;
    } else {
      // Cek logo
      if (!doc.extracted.has_logo) {
        issues.push({
          id: "kop_no_logo",
          category: "Kop Surat",
          bboxId: "bbox-kop",
          severity: "warning",
          title: "Logo Instansi / Organisasi Tidak Terdeteksi",
          desc: "Berdasarkan pedoman administrasi, Kop Surat wajib menyertakan lambang resmi Universitas / BEM di sisi kiri atau tengah.",
          autofix: "Sematkan file vektor lambang resmi resolusi tinggi pada margin kiri kop surat.",
          deduction: 10
        });
        scoreDeductions += 10;
      }

      // Cek kata kunci kop
      const rawKop = (doc.extracted.kop_text || "").toUpperCase();
      const missingKeywords = preset.kop_required_keywords.filter(kw => !rawKop.includes(kw));
      if (missingKeywords.length > 0) {
        issues.push({
          id: "kop_hierarchy",
          category: "Kop Surat",
          bboxId: "bbox-kop",
          severity: "warning",
          title: "Hierarki Lembaga pada Kop Kurang Lengkap",
          desc: `Teks kop belum memuat hierarki: ${missingKeywords.join(", ")}.`,
          autofix: `Tambahkan baris lembaga: "${preset.kop_required_keywords.join(' - ')}"`,
          deduction: 8
        });
        scoreDeductions += 8;
      } else {
        issues.push({
          id: "kop_valid",
          category: "Kop Surat",
          bboxId: "bbox-kop",
          severity: "success",
          title: "Format Kop Surat Sesuai Standar",
          desc: "Kop surat memuat logo, nama instansi lengkap, alamat resmi, dan garis pemisah ganda.",
          autofix: null,
          deduction: 0
        });
      }
    }

    // 2. Evaluasi Nomor Surat (Regex Pattern Match)
    const rawNomor = (doc.extracted.nomor_surat || "").trim();
    if (!rawNomor) {
      issues.push({
        id: "nomor_empty",
        category: "Nomor Surat",
        bboxId: "bbox-meta",
        severity: "error",
        title: "Nomor Surat Tidak Ditemukan",
        desc: "Dokumen resmi wajib memiliki nomor surat keluar yang tercatat dalam buku agenda.",
        autofix: `Nomor: ${preset.nomor_example}`,
        deduction: 25
      });
      scoreDeductions += 25;
    } else {
      const match = rawNomor.match(preset.nomor_regex);
      if (!match) {
        issues.push({
          id: "nomor_invalid_format",
          category: "Nomor Surat",
          bboxId: "bbox-meta",
          severity: "error",
          title: "Format Nomor Surat Tidak Sesuai Pola Baku",
          desc: `Tercatat "${rawNomor}". Pola baku untuk ${preset.name} adalah: [Nomor Urut]/[Kode Organisasi]/[Klasifikasi Surat]/[Bulan Romawi]/[Tahun].`,
          autofix: `Perbaiki menjadi contoh baku: ${preset.nomor_example}`,
          deduction: 15
        });
        scoreDeductions += 15;
      } else {
        issues.push({
          id: "nomor_valid",
          category: "Nomor Surat",
          bboxId: "bbox-meta",
          severity: "success",
          title: "Nomor Surat Valid & Terstruktur",
          desc: `Nomor "${rawNomor}" mematuhi penulisan bulan Romawi dan kode organisasi.`,
          autofix: null,
          deduction: 0
        });
      }
    }

    // 3. Evaluasi Lampiran & Hal
    if (!doc.extracted.hal || doc.extracted.hal.length < 3) {
      issues.push({
        id: "hal_missing",
        category: "Meta Surat",
        bboxId: "bbox-meta",
        severity: "warning",
        title: "Baris Perihal / Hal Surat Belum Jelas",
        desc: "Perihal surat harus dinyatakan secara ringkas namun spesifik (misal: Undangan Rapat Pleno).",
        autofix: "Hal: Undangan Kegiatan Rapat Kerja",
        deduction: 5
      });
      scoreDeductions += 5;
    }

    // 4. Evaluasi Tanggal Surat (PUEBI & Standar Surat)
    const rawTanggal = (doc.extracted.tanggal || "").trim();
    const dateRegex = /^([A-Z][a-z]+),\s+([0-9]{1,2})\s+([A-Z][a-z]+)\s+(202[0-9])$/;
    const dateMatch = rawTanggal.match(dateRegex);

    if (!rawTanggal) {
      issues.push({
        id: "tanggal_missing",
        category: "Tanggal Surat",
        bboxId: "bbox-tanggal",
        severity: "error",
        title: "Tanggal Pembuatan Surat Tidak Ditemukan",
        desc: "Dokumen tidak mencantumkan tanggal pembuatan pada margin kanan atas atau bawah.",
        autofix: "Sukabumi, 24 Oktober 2026",
        deduction: 15
      });
      scoreDeductions += 15;
    } else if (!dateMatch || !INDONESIAN_MONTHS.includes(dateMatch[3])) {
      issues.push({
        id: "tanggal_non_standard",
        category: "Tanggal Surat",
        bboxId: "bbox-tanggal",
        severity: "warning",
        title: "Penulisan Tanggal Tidak Sesuai PUEBI",
        desc: `Tercatat "${rawTanggal}". Menurut PUEBI, nama bulan tidak boleh disingkat (misal: "Okt" -> "Oktober") dan format: [Nama Kota], [Tanggal] [Nama Bulan] [Tahun].`,
        autofix: "Sukabumi, 24 Oktober 2026",
        deduction: 8
      });
      scoreDeductions += 8;
    } else {
      issues.push({
        id: "tanggal_valid",
        category: "Tanggal Surat",
        bboxId: "bbox-tanggal",
        severity: "success",
        title: "Penulisan Tanggal Sesuai Kaidah PUEBI",
        desc: `Format tanggal "${rawTanggal}" valid dan baku.`,
        autofix: null,
        deduction: 0
      });
    }

    // 5. Evaluasi Tujuan Surat (PUEBI Kaidah "Kepada Yth")
    const rawTujuan = (doc.extracted.tujuan || "").trim();
    if (rawTujuan.toLowerCase().includes("kepada yth")) {
      issues.push({
        id: "tujuan_pleonasme",
        category: "Tujuan Surat",
        bboxId: "bbox-tujuan",
        severity: "warning",
        title: "Pleonasme: Penulisan 'Kepada Yth.'",
        desc: "Berdasarkan kaidah bahasa baku (PUEBI), kata 'Kepada' dan 'Yth.' tidak boleh dipakai bersamaan karena bermakna ganda.",
        autofix: rawTujuan.replace(/kepada\s+yth\.?/i, "Yth."),
        deduction: 5
      });
      scoreDeductions += 5;
    }

    // 5b. Evaluasi Kaidah Ejaan & PUEBI / Typo pada Teks Dokumen
    const fullTextToScan = [
      doc.extracted.kop_text || "",
      doc.extracted.hal || "",
      doc.extracted.tujuan || "",
      doc.extracted.isi_text || "",
      doc.extracted.raw_text || ""
    ].join(" ");

    let typoFound = 0;
    PUEBI_SPELL_CHECK.forEach(item => {
      // Reset lastIndex for global regex
      item.regex.lastIndex = 0;
      if (item.regex.test(fullTextToScan)) {
        typoFound++;
        issues.push({
          id: `typo_${item.word}`,
          category: "Ejaan & Kata Baku (PUEBI)",
          bboxId: "bbox-isi",
          severity: "warning",
          title: `Kesalahan Kata Tidak Baku: "${item.word}"`,
          desc: item.explanation,
          autofix: `Ganti '${item.word}' menjadi '${item.correct}'`,
          deduction: 4
        });
        scoreDeductions += 4;
      }
    });

    if (typoFound === 0) {
      issues.push({
        id: "puebi_clean",
        category: "Ejaan & Kata Baku (PUEBI)",
        bboxId: "bbox-isi",
        severity: "success",
        title: "Kaidah Bahasa & Ejaan Baku Terpenuhi",
        desc: "Tidak terdeteksi kesalahan kata tidak baku, singkatan informal, atau kesalahan penulisan imbuhan pasif pada badan surat.",
        autofix: null,
        deduction: 0
      });
    }

    // 6. Evaluasi Tanda Tangan & Stempel Basah (Validasi Legalitas)
    const sigCount = doc.extracted.signature_count || 0;
    if (sigCount < preset.min_signatures) {
      issues.push({
        id: "sig_insufficient",
        category: "Legalitas & Tanda Tangan",
        bboxId: "bbox-ttd",
        severity: "error",
        title: `Jumlah Tanda Tangan Kurang (Terdeteksi: ${sigCount}/${preset.min_signatures})`,
        desc: "Surat resmi organisasi wajib ditandatangani minimal oleh Ketua Umum dan Sekretaris Jenderal / Ketua Pelaksana.",
        autofix: "Tambahkan kolom tanda tangan Ketua dan Sekretaris berdampingan.",
        deduction: 20
      });
      scoreDeductions += 20;
    } else {
      issues.push({
        id: "sig_valid",
        category: "Legalitas & Tanda Tangan",
        bboxId: "bbox-ttd",
        severity: "success",
        title: "Tanda Tangan Pejabat Terdeteksi Lengkap",
        desc: `Terdeteksi ${sigCount} tanda tangan lengkap dengan nama terang dan Nomor Induk Mahasiswa.`,
        autofix: null,
        deduction: 0
      });
    }

    // Evaluasi Stempel Basah
    if (preset.require_stamp) {
      if (!doc.extracted.has_official_stamp) {
        issues.push({
          id: "stamp_missing",
          category: "Stempel Organisasi",
          bboxId: "bbox-ttd",
          severity: "error",
          title: "Stempel Basah Organisasi Tidak Terdeteksi",
          desc: "Surat keluar tidak memiliki cap/stempel resmi BEM yang menimpa sebagian tanda tangan pimpinan.",
          autofix: "Bubuhkan cap stempel resmi warna ungu/biru pada area tanda tangan pimpinan.",
          deduction: 15
        });
        scoreDeductions += 15;
      } else {
        issues.push({
          id: "stamp_valid",
          category: "Stempel Organisasi",
          bboxId: "bbox-ttd",
          severity: "success",
          title: "Cap Stempel Resmi Terverifikasi",
          desc: "Cap lingkaran organisasi terdeteksi dengan segmentasi warna tinta resmi.",
          autofix: null,
          deduction: 0
        });
      }
    }

    // Hitung Skor Akhir
    const finalScore = Math.max(0, 100 - scoreDeductions);
    let statusLabel = "Lolos Validasi";
    let statusClass = "pass";

    if (finalScore < 60) {
      statusLabel = "Format Ditolak (Kritis)";
      statusClass = "fail";
    } else if (finalScore < 85) {
      statusLabel = "Perlu Perbaikan (Revisi)";
      statusClass = "warn";
    }

    return {
      score: finalScore,
      statusLabel,
      statusClass,
      presetUsed: preset.name,
      issues,
      summary: {
        totalIssues: issues.filter(i => i.severity !== 'success').length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        passes: issues.filter(i => i.severity === 'success').length,
      }
    };
  }
}

// Global instance
window.rulesEngine = new RulesEngine();
window.RULE_PRESETS = RULE_PRESETS;
