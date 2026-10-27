-- ==============================================================================
-- DATABASE SCHEMA: DOCUVALID AJA (Sistem Audit Kelayakan Format Dokumen Mahasiswa)
-- Capstone Terpadu Kelompok 6: CV, DL, PPL & MPTI
-- Database Engine: SQLite 3
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. TABEL PENGGUNA (Users & Roles)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('admin', 'verifikator', 'mahasiswa')),
    institusi TEXT DEFAULT 'Universitas / BEM',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL TEMPLATE & PEDOMAN ATURAN (Rule Presets)
CREATE TABLE IF NOT EXISTS template_pedoman (
    id TEXT PRIMARY KEY,
    nama_instansi TEXT NOT NULL,
    pattern_nomor TEXT NOT NULL,
    wajib_kop INTEGER DEFAULT 1,
    wajib_stempel INTEGER DEFAULT 1,
    min_tanda_tangan INTEGER DEFAULT 2,
    deskripsi TEXT,
    aktif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL UTAMA: RIWAYAT VALIDASI SURAT (Document Validation History)
CREATE TABLE IF NOT EXISTS riwayat_surat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    nomor_surat TEXT,
    judul_perihal TEXT,
    pengirim_instansi TEXT,
    kategori_template TEXT NOT NULL DEFAULT 'bem_univ',
    skor_kelayakan INTEGER NOT NULL CHECK(skor_kelayakan BETWEEN 0 AND 100),
    status_kelayakan TEXT NOT NULL CHECK(status_kelayakan IN ('Lolos Validasi', 'Perlu Revisi', 'Cacat / Ditolak')),
    nama_file TEXT NOT NULL,
    ukuran_file_kb REAL DEFAULT 0,
    resolusi_dokumen TEXT DEFAULT '800x1130',
    latency_ms INTEGER DEFAULT 280,
    ocr_confidence REAL DEFAULT 98.9,
    
    -- Status Tiap Komponen (1 = Memenuhi, 0 = Bermasalah)
    kop_valid INTEGER DEFAULT 1,
    nomor_valid INTEGER DEFAULT 1,
    tanggal_valid INTEGER DEFAULT 1,
    ttd_valid INTEGER DEFAULT 1,
    stempel_valid INTEGER DEFAULT 1,
    ejaan_valid INTEGER DEFAULT 1,
    
    -- Metrik Temuan
    jumlah_temuan INTEGER DEFAULT 0,
    catatan_verifikator TEXT,
    hash_verifikasi TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kategori_template) REFERENCES template_pedoman(id) ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. TABEL RINCIAN TEMUAN & REKOMENDASI (Issue Findings & Recommendations)
CREATE TABLE IF NOT EXISTS detail_temuan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surat_id INTEGER NOT NULL,
    komponen TEXT NOT NULL, -- 'kop', 'nomor', 'tanggal', 'ttd', 'stempel', 'pleonasme', 'ejaan'
    severity TEXT NOT NULL CHECK(severity IN ('pass', 'info', 'warning', 'danger')),
    pesan_temuan TEXT NOT NULL,
    penjelasan TEXT,
    saran_baku TEXT,
    bbox_x INTEGER DEFAULT 0,
    bbox_y INTEGER DEFAULT 0,
    bbox_w INTEGER DEFAULT 0,
    bbox_h INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (surat_id) REFERENCES riwayat_surat(id) ON DELETE CASCADE
);

-- 5. TABEL AUDIT TRAIL / LOG AKTIVITAS (Activity Logs)
CREATE TABLE IF NOT EXISTS log_aktivitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surat_id INTEGER,
    user_id INTEGER,
    aksi TEXT NOT NULL, -- 'SCAN_SURAT', 'EXPORT_PDF', 'UPDATE_STATUS', 'LIVE_TEST'
    rincian TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (surat_id) REFERENCES riwayat_surat(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==============================================================================
-- INDEXES UNTUK OPTIMASI PERFORMA QUERY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_surat_status ON riwayat_surat(status_kelayakan);
CREATE INDEX IF NOT EXISTS idx_surat_created ON riwayat_surat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surat_template ON riwayat_surat(kategori_template);
CREATE INDEX IF NOT EXISTS idx_temuan_surat ON detail_temuan(surat_id);
CREATE INDEX IF NOT EXISTS idx_log_surat ON log_aktivitas(surat_id);

-- ==============================================================================
-- VIEWS UNTUK DASHBOARD & LAPORAN STATISTIK
-- ==============================================================================
CREATE VIEW IF NOT EXISTS v_statistik_audit AS
SELECT 
    COUNT(*) AS total_surat_diaudit,
    SUM(CASE WHEN status_kelayakan = 'Lolos Validasi' THEN 1 ELSE 0 END) AS total_lolos,
    SUM(CASE WHEN status_kelayakan = 'Perlu Revisi' THEN 1 ELSE 0 END) AS total_revisi,
    SUM(CASE WHEN status_kelayakan = 'Cacat / Ditolak' THEN 1 ELSE 0 END) AS total_ditolak,
    ROUND(AVG(skor_kelayakan), 1) AS rata_rata_skor,
    ROUND(AVG(latency_ms), 0) AS rata_rata_latency,
    ROUND(AVG(ocr_confidence), 2) AS rata_rata_ocr_confidence
FROM riwayat_surat;

CREATE VIEW IF NOT EXISTS v_riwayat_lengkap AS
SELECT 
    r.id,
    r.uuid,
    r.nomor_surat,
    r.judul_perihal,
    r.pengirim_instansi,
    t.nama_instansi AS nama_template,
    r.skor_kelayakan,
    r.status_kelayakan,
    r.nama_file,
    r.jumlah_temuan,
    r.hash_verifikasi,
    r.created_at,
    u.nama_lengkap AS nama_pengunggah
FROM riwayat_surat r
LEFT JOIN template_pedoman t ON r.kategori_template = t.id
LEFT JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- ==============================================================================
-- DATA AWAL / SEED DATA
-- ==============================================================================

-- Seed Users
INSERT OR IGNORE INTO users (id, username, nama_lengkap, email, role, institusi) VALUES
(1, 'admin_bem', 'M. Pandu Wiguna', 'admin@bem.univ.ac.id', 'admin', 'BEM Universitas'),
(2, 'verifikator_sekretariat', 'Sekretariat Jenderal BEM', 'sekretariat@bem.univ.ac.id', 'verifikator', 'BEM Universitas'),
(3, 'mahasiswa_hima', 'Ketua Pelaksana Seminar', 'panitia@bem.univ.ac.id', 'mahasiswa', 'Himpunan Mahasiswa');

-- Seed Pedoman Template
INSERT OR IGNORE INTO template_pedoman (id, nama_instansi, pattern_nomor, wajib_kop, wajib_stempel, min_tanda_tangan, deskripsi) VALUES
('bem_univ', 'BEM Universitas (Baku 2026)', '^[0-9]{3}/BEM-UNIV/[A-Z0-9]+/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)/[0-9]{4}$', 1, 1, 2, 'Standar resmi administrasi BEM Universitas sesuai SK Rektorat.'),
('bem_fakultas', 'BEM Fakultas Teknik', '^[0-9]{3}/BEM-FT/[A-Z0-9]+/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)/[0-9]{4}$', 1, 1, 2, 'Standar administrasi BEM Fakultas Teknik.'),
('hima', 'HIMA / HMJ Program Studi', '^[0-9]{3}/(HIMA|HMJ)-[A-Z0-9]+/[A-Z0-9]+/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)/[0-9]{4}$', 1, 1, 2, 'Standar administrasi Himpunan Mahasiswa Program Studi.');

-- Seed 3 Kasus Uji Standar (Sesuai README & Demo Sistem)
INSERT OR IGNORE INTO riwayat_surat (
    id, uuid, nomor_surat, judul_perihal, pengirim_instansi, kategori_template,
    skor_kelayakan, status_kelayakan, nama_file, ukuran_file_kb, resolusi_dokumen,
    latency_ms, ocr_confidence, kop_valid, nomor_valid, tanggal_valid, ttd_valid,
    stempel_valid, ejaan_valid, jumlah_temuan, hash_verifikasi, user_id
) VALUES 
(
    1, '9FA1-2026-VAL-001', '045/BEM-UNIV/UND/X/2026', 'Undangan Rapat Koordinasi Wilayah', 
    'BEM Universitas', 'bem_univ', 96, 'Lolos Validasi', 'surat_undangan_resmi_bem.pdf',
    248.5, '800x1130', 284, 98.9, 1, 1, 1, 1, 1, 1, 1, '#9FA1-2026-VAL', 1
),
(
    2, '9FA2-2026-VAL-002', '021/BEM-FT/PINJAM/2026', 'Permohonan Peminjaman Aula Gedung', 
    'BEM Fakultas Teknik', 'bem_fakultas', 68, 'Perlu Revisi', 'surat_peminjaman_aula.pdf',
    195.2, '800x1130', 312, 97.4, 1, 0, 0, 1, 1, 0, 3, '#9FA2-2026-REV', 2
),
(
    3, '9FA3-2026-VAL-003', '005/SPONSOR-EVENT', 'Permohonan Dana Kerjasama', 
    'Panitia Dies Natalis', 'bem_univ', 42, 'Cacat / Ditolak', 'surat_pengajuan_sponsor.pdf',
    142.8, '800x1130', 265, 94.8, 0, 0, 0, 0, 0, 0, 5, '#9FA3-2026-REJ', 3
);

-- Seed Rincian Temuan untuk Kasus Uji
INSERT OR IGNORE INTO detail_temuan (surat_id, komponen, severity, pesan_temuan, penjelasan, saran_baku, bbox_x, bbox_y, bbox_w, bbox_h) VALUES
(1, 'kop', 'pass', 'Struktur Kop Surat Lengkap', 'Logo instansi, nama lembaga, dan garis pemisah ganda terdeteksi akurat.', 'Pertahankan format kop resmi.', 40, 25, 720, 130),
(1, 'nomor', 'pass', 'Nomor Surat Terverifikasi', 'Pola penomoran mematuhi SK Rektorat dengan klasifikasi dan bulan Romawi.', 'Pola format telah baku.', 70, 175, 300, 75),
(1, 'ejaan', 'info', 'Rekomendasi EYD Minor', 'Penggunaan huruf kapital pada jabatan sudah tepat.', 'Sesuai PUEBI Edisi V.', 70, 370, 660, 220),

(2, 'nomor', 'warning', 'Format Nomor Surat Tidak Lengkap', 'Nomor surat tidak menyertakan angka Romawi untuk penanda bulan berjalan.', 'Gunakan format: [No]/BEM-FT/[Klasifikasi]/[Bulan Romawi]/[Tahun]. Contoh: 021/BEM-FT/PINJAM/X/2026', 70, 175, 300, 75),
(2, 'tanggal', 'warning', 'Penulisan Tanggal Surat Disingkat', 'Bulan disingkat (Okt) dan nama kota administrasi penerbit tidak dicantumkan.', 'Tulis lengkap: Sukabumi, 24 Oktober 2026', 500, 175, 230, 30),
(2, 'pleonasme', 'warning', 'Terdapat Pleonasme Bahasa', 'Frasa "Kepada Yth." tidak efektif menurut kaidah bahasa Indonesia surat dinas.', 'Gunakan salah satu: "Yth. Pimpinan Lembaga" (tanpa kata Kepada).', 70, 270, 350, 40),

(3, 'kop', 'danger', 'Kop Surat Rusak / Tanpa Logo', 'Tidak ditemukan lambang/logo vektor resmi organisasi pada kop surat.', 'Wajib mencantumkan logo resmi instansi beresolusi tinggi.', 40, 25, 720, 130),
(3, 'nomor', 'danger', 'Pola Nomor Tidak Sesuai Standar', 'Struktur nomor tidak memiliki identitas lembaga resmi dan klasifikasi surat.', 'Sesuaikan dengan pola SK Rektorat.', 70, 175, 300, 75),
(3, 'tanggal', 'danger', 'Tanggal Surat Tidak Ditemukan', 'Bagian tanggal dan tempat penerbitan surat kosong.', 'Tambahkan tanggal lengkap di sudut kanan atas surat.', 500, 175, 230, 30),
(3, 'stempel', 'danger', 'Cap Stempel Basah Tidak Terdeteksi', 'Ketiadaan stempel basah resmi membatalkan legalitas dokumen.', 'Bubuhkan stempel resmi berwarna ungu/biru di atas tanda tangan ketua.', 440, 730, 160, 160),
(3, 'ttd', 'warning', 'Tanda Tangan Pejabat Tunggal', 'Surat hanya ditandatangani 1 orang, dibutuhkan minimal 2 pejabat berwenang.', 'Wajib menyertakan tanda tangan Ketua dan Sekretaris.', 120, 750, 560, 140);

-- Seed Log Aktivitas
INSERT OR IGNORE INTO log_aktivitas (surat_id, user_id, aksi, rincian) VALUES
(1, 1, 'SCAN_SURAT', 'Audit otomatis selesai: Lolos Validasi (Skor 96)'),
(2, 2, 'SCAN_SURAT', 'Audit otomatis selesai: Butuh Revisi (Skor 68)'),
(3, 3, 'SCAN_SURAT', 'Audit otomatis selesai: Cacat / Ditolak (Skor 42)');
