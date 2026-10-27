"""
==============================================================================
DATABASE MODULE: DOCUVALID AJA
Sistem Audit Kelayakan Format Dokumen Surat BEM
Kelompok 6 - Capstone CV, DL, PPL & MPTI
==============================================================================
Mengelola koneksi SQLite, eksekusi skema, operasi CRUD data validasi surat,
serta agregasi statistik kepatuhan standar organisasi.
"""

import os
import sqlite3
import json
import uuid
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "surat_database.db")
SCHEMA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

def get_connection() -> sqlite3.Connection:
    """Membuka koneksi ke database SQLite dengan row_factory dictionary."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(force: bool = False):
    """
    Menginisialisasi tabel-tabel database dan memasukkan seed data awal
    jika file schema.sql ada.
    """
    if force and os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
            print(f"[INFO] Database lama ({DB_FILE}) dihapus untuk re-inisialisasi.")
        except Exception as e:
            print(f"[WARN] Gagal menghapus database lama: {e}")

    with get_connection() as conn:
        if os.path.exists(SCHEMA_FILE):
            with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            conn.executescript(schema_sql)
            conn.commit()
            print(f"[SUCCESS] Database berhasil diinisialisasi: {DB_FILE}")
        else:
            print(f"[ERROR] File skema {SCHEMA_FILE} tidak ditemukan!")

# ============================================================================
# STATISTIK & METRIK AUDIT (DASHBOARD)
# ============================================================================

def get_statistics() -> Dict[str, Any]:
    """Mengambil ringkasan metrik statistik audit untuk dashboard & FURPS."""
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM v_statistik_audit").fetchone()
        stats = dict(row) if row else {
            "total_surat_diaudit": 0,
            "total_lolos": 0,
            "total_revisi": 0,
            "total_ditolak": 0,
            "rata_rata_skor": 0.0,
            "rata_rata_latency": 0,
            "rata_rata_ocr_confidence": 0.0
        }
        
        # Hitung persentase lolos validasi
        total = stats.get("total_surat_diaudit") or 0
        lolos = stats.get("total_lolos") or 0
        stats["pass_rate_percentage"] = round((lolos / total * 100), 1) if total > 0 else 0.0
        return stats

# ============================================================================
# OPERASI CRUD: RIWAYAT VALIDASI SURAT
# ============================================================================

def get_all_validations(limit: int = 50, offset: int = 0, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Mengambil daftar riwayat surat yang diaudit."""
    query = """
        SELECT r.*, t.nama_instansi AS nama_template, u.nama_lengkap AS nama_pengunggah
        FROM riwayat_surat r
        LEFT JOIN template_pedoman t ON r.kategori_template = t.id
        LEFT JOIN users u ON r.user_id = u.id
    """
    params = []
    if status_filter:
        query += " WHERE r.status_kelayakan = ?"
        params.append(status_filter)
        
    query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

def get_validation_by_id(surat_id: int) -> Optional[Dict[str, Any]]:
    """Mengambil detail surat berdasarkan ID beserta seluruh rincian temuannya."""
    with get_connection() as conn:
        surat_row = conn.execute("""
            SELECT r.*, t.nama_instansi AS nama_template, u.nama_lengkap AS nama_pengunggah
            FROM riwayat_surat r
            LEFT JOIN template_pedoman t ON r.kategori_template = t.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        """, (surat_id,)).fetchone()

        if not surat_row:
            return None

        surat = dict(surat_row)

        findings_rows = conn.execute("""
            SELECT * FROM detail_temuan
            WHERE surat_id = ?
            ORDER BY 
                CASE severity 
                    WHEN 'danger' THEN 1 
                    WHEN 'warning' THEN 2 
                    WHEN 'info' THEN 3 
                    ELSE 4 
                END
        """, (surat_id,)).fetchall()
        surat["findings"] = [dict(f) for f in findings_rows]

        return surat

def save_validation_result(data: Dict[str, Any]) -> int:
    """
    Menyimpan hasil audit dokumen surat baru ke tabel riwayat_surat
    dan memasukkan detail temuan masalah ke tabel detail_temuan.
    """
    with get_connection() as conn:
        cur = conn.cursor()
        
        doc_uuid = data.get("uuid") or f"DOC-{uuid.uuid4().hex[:8].upper()}-2026"
        hash_val = data.get("hash_verifikasi") or f"#{doc_uuid[:8]}-VAL"
        
        cur.execute("""
            INSERT INTO riwayat_surat (
                uuid, nomor_surat, judul_perihal, pengirim_instansi, kategori_template,
                skor_kelayakan, status_kelayakan, nama_file, ukuran_file_kb, resolusi_dokumen,
                latency_ms, ocr_confidence, kop_valid, nomor_valid, tanggal_valid,
                ttd_valid, stempel_valid, ejaan_valid, jumlah_temuan, hash_verifikasi, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_uuid,
            data.get("nomor_surat", "-"),
            data.get("judul_perihal", "Surat Administrasi Organisasi"),
            data.get("pengirim_instansi", "BEM Universitas"),
            data.get("kategori_template", "bem_univ"),
            int(data.get("skor_kelayakan", 0)),
            data.get("status_kelayakan", "Perlu Revisi"),
            data.get("nama_file", "dokumen_surat.pdf"),
            float(data.get("ukuran_file_kb", 150.0)),
            data.get("resolusi_dokumen", "800x1130"),
            int(data.get("latency_ms", 280)),
            float(data.get("ocr_confidence", 98.5)),
            1 if data.get("kop_valid", True) else 0,
            1 if data.get("nomor_valid", True) else 0,
            1 if data.get("tanggal_valid", True) else 0,
            1 if data.get("ttd_valid", True) else 0,
            1 if data.get("stempel_valid", True) else 0,
            1 if data.get("ejaan_valid", True) else 0,
            len(data.get("findings", [])),
            hash_val,
            data.get("user_id", 1)
        ))
        
        new_surat_id = cur.lastrowid

        # Simpan setiap temuan masalah / rekomendasi
        findings = data.get("findings", [])
        for f in findings:
            cur.execute("""
                INSERT INTO detail_temuan (
                    surat_id, komponen, severity, pesan_temuan, penjelasan, saran_baku,
                    bbox_x, bbox_y, bbox_w, bbox_h
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_surat_id,
                f.get("komponen", "umum"),
                f.get("severity", "info"),
                f.get("pesan_temuan", f.get("title", "Temuan Audit")),
                f.get("penjelasan", f.get("desc", "")),
                f.get("saran_baku", f.get("fix", "")),
                f.get("bbox_x", 0),
                f.get("bbox_y", 0),
                f.get("bbox_w", 0),
                f.get("bbox_h", 0)
            ))

        # Catat log audit trail
        cur.execute("""
            INSERT INTO log_aktivitas (surat_id, user_id, aksi, rincian)
            VALUES (?, ?, ?, ?)
        """, (
            new_surat_id,
            data.get("user_id", 1),
            "AUDIT_SELESAI",
            f"Dokumen {data.get('nama_file')} diaudit dengan skor {data.get('skor_kelayakan')}% ({data.get('status_kelayakan')})"
        ))

        conn.commit()
        return new_surat_id

def delete_validation(surat_id: int) -> bool:
    """Menghapus catatan validasi surat dan relasinya."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM riwayat_surat WHERE id = ?", (surat_id,))
        conn.commit()
        return cur.rowcount > 0

# ============================================================================
# TEMPLATE PEDOMAN
# ============================================================================

def get_templates() -> List[Dict[str, Any]]:
    """Mengambil semua template pedoman aturan penulisan surat."""
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM template_pedoman WHERE aktif = 1").fetchall()
        return [dict(r) for r in rows]

# ============================================================================
# PENGUJIAN & CLI RUNNER
# ============================================================================

if __name__ == "__main__":
    import sys
    # Pastikan stdout mendukung UTF-8 di Windows terminal
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("=" * 60)
    print("DOCUVALID AJA - Database Manager (SQLite3)")
    print("=" * 60)

    # Inisialisasi Database
    init_db(force=True)

    # Ambil dan tampilkan statistik
    stats = get_statistics()
    print("\n[STATISTIK AUDIT SISTEM]")
    print(f"Total Surat Diaudit  : {stats['total_surat_diaudit']} dokumen")
    print(f"Surat Lolos Validasi : {stats['total_lolos']}")
    print(f"Surat Perlu Revisi   : {stats['total_revisi']}")
    print(f"Surat Cacat / Ditolak: {stats['total_ditolak']}")
    print(f"Rata-rata Skor       : {stats['rata_rata_skor']}%")
    print(f"Rasio Kelulusan      : {stats['pass_rate_percentage']}%")

    # Ambil dan tampilkan riwayat
    validations = get_all_validations()
    print(f"\n[DAFTAR RIWAYAT DOKUMEN TERSIMPAN ({len(validations)})]")
    for item in validations:
        print(f" - [ID:{item['id']}] {item['nomor_surat']} | {item['judul_perihal']} | Skor: {item['skor_kelayakan']}% ({item['status_kelayakan']})")

    print("\n[OK] Database siap digunakan dengan aman dan optimal!")
