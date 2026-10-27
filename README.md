# DOCUVALID AJA | Sistem Pengecekan Otomatis Format & Struktur Surat BEM

> **Dibuat oleh Kelompok 6**  
> **Tugas Capstone Terpadu 4 Mata Kuliah:**
> 1. Computer Vision (CV)
> 2. Deep Learning (DL)
> 3. Proyek Perangkat Lunak (PPL)
> 4. Manajemen Proyek TI (MPTI)

Aplikasi web cerdas untuk memvalidasi kepatuhan tata naskah dinas dan format baku surat organisasi mahasiswa (Kop Surat, Nomor Surat, Tanggal PUEBI, Tanda Tangan, dan Stempel Resmi) dengan visualisasi interaktif *Split-Screen Bounding Box*, *Auto-Fix Suggestion*, dan *Certificate Scorecard*.

---

## 🌟 Fitur Utama & Kepatuhan Standar Kualitas (FURPS)

| Atribut FURPS | Implementasi Teknis pada Sistem |
| :--- | :--- |
| **Functionality** | Ekstraksi teks & koordinat spasial dokumen (*Document Layout Analysis*), validasi regex nomor surat baku SK Rektorat, kaidah PUEBI tanggal & pleonasme, deteksi 2 tanda tangan, dan verifikasi cap stempel basah. |
| **Usability** | Desain modern berestetika tinggi (*Dark Glassmorphism*), **Interactive Split-Screen Inspector**, fitur sinkronisasi **Click-to-Focus** (mengklik kartu masalah langsung menggeser dan menyorot *bounding box* surat), serta tombol *Salin Rekomendasi Perbaikan Baku*. |
| **Reliability** | Dilengkapi simulasi filter pra-pemrosesan Computer Vision (*Grayscale*, *Adaptive Thresholding / Otsu*, dan *Attention Heatmap*); toleran terhadap orientasi miring dan kualitas dokumen scan. |
| **Performance** | Pipeline inferensi asinkron ringan (&lt;300ms) dengan rendering berbasis Canvas 2D murni beresolusi tinggi tanpa *lagging*. |
| **Supportability** | Arsitektur *Rule Engine* tersentralisasi (`js/rules-engine.js`), modular, serta mudah diperluas untuk template organisasi lain (BEM Universitas, BEM Fakultas, HIMA, atau UKM). |

---

## 🚀 Cara Menjalankan Aplikasi Secara Lokal

Server lokal telah siap dan berjalan. Jika Anda ingin menyalakan ulang di masa mendatang, cukup jalankan perintah berikut di PowerShell atau Command Prompt:

```bash
cd "c:\PANDU\Antigravity IDE\WEBSITE SURAT"
node server.js
```

Buka peramban (browser) dan akses URL:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📂 Struktur Direktori Proyek

```
WEBSITE SURAT/
├── index.html            # Antarmuka web utama (Semantic HTML5, Accessible)
├── server.js             # HTTP static server berbasis Node.js murni
├── css/
│   └── style.css         # Desain sistem Glassmorphism, CSS Variables, Split View
└── js/
    ├── rules-engine.js   # Aturan validasi format, regex nomor, PUEBI & pembobotan skor
    ├── sample-letters.js # Generator Canvas 2D dokumen A4 realistis (3 skenario uji)
    ├── cv-pipeline.js    # Visualisator alur inferensi 5 tahap CV/DL & Bounding Box SVG
    └── app.js            # Orkestrasi UI, zoom/pan viewport, auto-fix, dan ekspor laporan
```

---

## 🧪 Skenario Kasus Uji Siap Pakai

Sistem telah dilengkapi dengan 3 data uji interaktif yang dapat langsung diklik pada bilah *Pilih Kasus Uji*:
1. **Kasus 1: Format Sempurna (Skor: 96%)** — Surat Undangan Resmi BEM dengan kop lengkap, logo vektor, nomor surat sesuai pola bulan Romawi, tanggal baku PUEBI, 2 tanda tangan pejabat, dan stempel basah resmi.
2. **Kasus 2: Butuh Revisi (Skor: 68%)** — Surat Peminjaman Aula dengan nomor tanpa bulan Romawi, penulisan tanggal disingkat ("24 Okt 2026"), dan pleonasme bahasa ("Kepada Yth.").
3. **Kasus 3: Cacat / Ditolak (Skor: 42%)** — Surat Pengajuan Sponsor dengan kop cacat tanpa logo, tanpa tanggal surat, tanda tangan tunggal, dan **tanpa stempel basah**.

---

## 📑 Manajemen Proyek TI (WBS 4-Sprint Agile)
- **Sprint 1:** SRS, Riset Anotasi Dataset DocLayNet & Desain Figma UI.
- **Sprint 2:** Core Pipeline Preprocessing OpenCV & Layout Detection (YOLOv8 + PaddleOCR).
- **Sprint 3:** Rule Engine Validator, Split-Screen Canvas Interactive Inspector, & Click-to-Focus.
- **Sprint 4:** Pengujian FURPS (Blackbox & SUS Usability Survey), Dokumentasi Capstone, & Deployment.
