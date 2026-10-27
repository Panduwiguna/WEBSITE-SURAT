"""
==============================================================================
BACKEND API: DOCUVALID AJA
Sistem Deteksi & Audit Struktur Dokumen Surat BEM
FastAPI + OpenCV + SQLite3 Database Integration
Kelompok 6 - Capstone CV, DL, PPL & MPTI
==============================================================================
"""

import os
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database

app = FastAPI(
    title="DocuValid-AI API",
    description="REST API Pengecekan Format Surat Mahasiswa & Manajemen Database Audit",
    version="2.4.0"
)

# Mengizinkan frontend mengakses backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model Validasi Pydantic
class FindingItem(BaseModel):
    komponen: str = "umum"
    severity: str = "info"
    pesan_temuan: str
    penjelasan: Optional[str] = ""
    saran_baku: Optional[str] = ""
    bbox_x: Optional[int] = 0
    bbox_y: Optional[int] = 0
    bbox_w: Optional[int] = 0
    bbox_h: Optional[int] = 0

class SaveValidationRequest(BaseModel):
    nomor_surat: Optional[str] = "-"
    judul_perihal: Optional[str] = "Surat Administrasi Mahasiswa"
    pengirim_instansi: Optional[str] = "BEM Universitas"
    kategori_template: Optional[str] = "bem_univ"
    skor_kelayakan: int
    status_kelayakan: str
    nama_file: str
    ukuran_file_kb: Optional[float] = 0.0
    resolusi_dokumen: Optional[str] = "800x1130"
    latency_ms: Optional[int] = 280
    ocr_confidence: Optional[float] = 98.9
    kop_valid: Optional[bool] = True
    nomor_valid: Optional[bool] = True
    tanggal_valid: Optional[bool] = True
    ttd_valid: Optional[bool] = True
    stempel_valid: Optional[bool] = True
    ejaan_valid: Optional[bool] = True
    findings: List[FindingItem] = []
    user_id: Optional[int] = 1

# ==============================================================================
# ENDPOINTS UTAMA
# ==============================================================================

@app.on_event("startup")
def startup_event():
    """Inisialisasi database jika belum ada."""
    if not os.path.exists(database.DB_FILE):
        database.init_db()

@app.get("/")
def root():
    return {
        "app": "DOCUVALID AJA - API",
        "status": "online",
        "version": "2.4.0",
        "database": "SQLite 3",
        "docs_url": "/docs"
    }

# ==============================================================================
# ENDPOINTS DATABASE & RIWAYAT AUDIT
# ==============================================================================

@app.get("/api/database/stats")
def get_stats():
    """Mengambil metrik statistik keseluruhan validasi surat di database."""
    try:
        return {"status": "success", "data": database.get_statistics()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/database/history")
def get_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None
):
    """Mengambil riwayat dokumen yang telah diaudit dan tersimpan di database."""
    try:
        data = database.get_all_validations(limit=limit, offset=offset, status_filter=status)
        return {
            "status": "success",
            "count": len(data),
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/database/history/{surat_id}")
def get_history_detail(surat_id: int):
    """Mengambil detail lengkap hasil audit surat beserta seluruh temuannya."""
    surat = database.get_validation_by_id(surat_id)
    if not surat:
        raise HTTPException(status_code=404, detail="Data surat tidak ditemukan")
    return {"status": "success", "data": surat}

@app.post("/api/database/save")
def save_validation(req: SaveValidationRequest):
    """Menyimpan hasil audit baru ke database SQLite."""
    try:
        surat_id = database.save_validation_result(req.model_dump())
        return {
            "status": "success",
            "message": "Hasil audit berhasil disimpan ke database",
            "surat_id": surat_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/database/history/{surat_id}")
def delete_history_item(surat_id: int):
    """Menghapus catatan riwayat audit dari database."""
    success = database.delete_validation(surat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Data surat tidak ditemukan atau gagal dihapus")
    return {"status": "success", "message": f"Data surat ID {surat_id} berhasil dihapus"}

@app.get("/api/database/templates")
def get_templates():
    """Mengambil daftar template pedoman format surat dari database."""
    try:
        return {"status": "success", "data": database.get_templates()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# ENDPOINT SCAN SURAT (OPENCV / INFERENCE)
# ==============================================================================

@app.post("/api/scan-surat")
async def scan_surat(file: UploadFile = File(...)):
    """
    Endpoint pemrosesan berkas gambar/PDF surat.
    Mengekstraksi resolusi dan mensimulasikan inferensi CV/DL,
    lalu otomatis menyimpan rekaman awal ke database.
    """
    try:
        contents = await file.read()
        file_size_kb = round(len(contents) / 1024, 2)
        
        # Coba decode gambar jika opencv terpasang
        width, height = 800, 1130
        try:
            import cv2
            import numpy as np
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                height, width, _ = img.shape
        except Exception:
            pass

        # Data hasil analisis standar
        result_data = {
            "nomor_surat": "045/BEM-UNIV/UND/X/2026",
            "judul_perihal": f"Audit Dokumen: {file.filename}",
            "pengirim_instansi": "Organisasi Mahasiswa",
            "kategori_template": "bem_univ",
            "skor_kelayakan": 92,
            "status_kelayakan": "Lolos Validasi",
            "nama_file": file.filename,
            "ukuran_file_kb": file_size_kb,
            "resolusi_dokumen": f"{width}x{height}",
            "latency_ms": 284,
            "ocr_confidence": 98.9,
            "kop_valid": True,
            "nomor_valid": True,
            "tanggal_valid": True,
            "ttd_valid": True,
            "stempel_valid": True,
            "ejaan_valid": True,
            "findings": [
                {
                    "komponen": "kop",
                    "severity": "pass",
                    "title": "Struktur Kop Surat Lengkap",
                    "desc": "Logo instansi dan garis ganda terdeteksi baik.",
                    "fix": "Format kop surat telah memenuhi standar."
                },
                {
                    "komponen": "tanggal",
                    "severity": "info",
                    "title": "Kaidah Tanggal PUEBI",
                    "desc": "Penulisan tanggal sudah sesuai kaidah EYD.",
                    "fix": "Pertahankan penulisan tanggal lengkap."
                }
            ]
        }

        # Simpan otomatis ke database SQLite
        surat_id = database.save_validation_result(result_data)

        return {
            "status": "success",
            "surat_id": surat_id,
            "filename": file.filename,
            "resolution": f"{width}x{height}",
            "score": result_data["skor_kelayakan"],
            "findings": result_data["findings"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)