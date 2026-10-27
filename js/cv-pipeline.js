/**
 * DOCUVALID-AI | CV & DL PIPELINE SIMULATOR
 * Menangani alur visualisasi pipeline 5 tahap:
 * 1. Ingestion -> 2. OpenCV Preprocessing -> 3. Layout Analysis -> 4. OCR Engine -> 5. Rule Audit
 */

class PipelineVisualizer {
  constructor() {
    this.steps = [
      { id: 'step-1', name: '1. Ingestion & DPI', desc: 'Konversi Dokumen 300 DPI' },
      { id: 'step-2', name: '2. OpenCV Preprocess', desc: 'Deskew & CLAHE Contrast' },
      { id: 'step-3', name: '3. YOLO Layout DL', desc: 'Segmentasi Wilayah Surat' },
      { id: 'step-4', name: '4. PaddleOCR Text', desc: 'Ekstraksi Teks & Bounding Box' },
      { id: 'step-5', name: '5. Rule Audit Engine', desc: 'Pengecekan Pedoman & PUEBI' }
    ];
    this.currentStepIndex = 0;
  }

  /**
   * Menjalankan animasi pipeline seolah-olah inferensi sedang berlangsung
   */
  async runPipelineAnimation(onStepChange, onComplete) {
    const stepDelay = 350; // ms per tahap untuk efek visual interaktif

    for (let i = 0; i < this.steps.length; i++) {
      this.currentStepIndex = i;
      if (onStepChange) onStepChange(i, this.steps[i]);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    if (onComplete) onComplete();
  }
}

/**
 * Overlay Manager untuk Bounding Box Interaktif
 */
class BoundingBoxOverlay {
  constructor(svgId, onBoxClick) {
    this.svg = document.getElementById(svgId);
    this.onBoxClick = onBoxClick;
    this.activeBoxId = null;
    this.visible = true;
  }

  setVisible(visible) {
    this.visible = visible;
    this.svg.style.display = visible ? 'block' : 'none';
  }

  renderBoxes(doc, evaluationResult) {
    if (!this.svg) return;
    this.svg.innerHTML = '';
    if (!this.visible) return;

    // Mapping tingkat keparahan issue ke wilayah layout
    const issues = evaluationResult.issues;
    const layout = doc.layout;

    const regions = [
      { id: 'bbox-kop', label: 'KOP SURAT', data: layout.kop_surat, cat: 'Kop Surat' },
      { id: 'bbox-meta', label: 'NOMOR & HAL', data: layout.meta, cat: 'Nomor Surat' },
      { id: 'bbox-tanggal', label: 'TANGGAL SURAT', data: layout.tanggal, cat: 'Tanggal Surat' },
      { id: 'bbox-tujuan', label: 'TUJUAN SURAT', data: layout.tujuan, cat: 'Tujuan Surat' },
      { id: 'bbox-isi', label: 'ISI / BADAN SURAT', data: layout.isi, cat: 'Isi Surat' },
      { id: 'bbox-ttd', label: 'LEGALITAS & TTD', data: layout.ttd, cat: 'Legalitas & Tanda Tangan' }
    ];

    regions.forEach(reg => {
      if (!reg.data || !reg.data.detected) return;

      // Cari apakah ada error atau warning pada kategori ini
      const relatedIssues = issues.filter(iss => iss.bboxId === reg.id || iss.category.includes(reg.cat));
      const hasError = relatedIssues.some(iss => iss.severity === 'error');
      const hasWarn = relatedIssues.some(iss => iss.severity === 'warning');

      let statusClass = 'status-pass';
      let statusColor = '#10b981';
      if (hasError) {
        statusClass = 'status-fail';
        statusColor = '#ef4444';
      } else if (hasWarn) {
        statusClass = 'status-warn';
        statusColor = '#f59e0b';
      }

      // Buat elemen SVG Group
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', reg.id);
      g.setAttribute('class', 'bbox-group');

      // Kotak Bounding Box
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', reg.data.x);
      rect.setAttribute('y', reg.data.y);
      rect.setAttribute('width', reg.data.width);
      rect.setAttribute('height', reg.data.height);
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', `bbox-rect ${statusClass}`);
      rect.setAttribute('data-id', reg.id);

      // Badge Tag Label di Pojok Kiri Atas Kotak
      const tagBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tagBg.setAttribute('x', reg.data.x);
      tagBg.setAttribute('y', Math.max(0, reg.data.y - 18));
      tagBg.setAttribute('width', reg.label.length * 7 + 16);
      tagBg.setAttribute('height', 18);
      tagBg.setAttribute('rx', '3');
      tagBg.setAttribute('fill', statusColor);

      const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tagText.setAttribute('x', reg.data.x + 8);
      tagText.setAttribute('y', Math.max(12, reg.data.y - 5));
      tagText.setAttribute('class', 'bbox-tag');
      tagText.textContent = reg.label;

      g.appendChild(rect);
      g.appendChild(tagBg);
      g.appendChild(tagText);

      // Event Click
      g.addEventListener('click', () => {
        this.highlightBox(reg.id);
        if (this.onBoxClick) this.onBoxClick(reg.id, relatedIssues);
      });

      this.svg.appendChild(g);
    });
  }

  highlightBox(boxId) {
    this.activeBoxId = boxId;
    const allRects = this.svg.querySelectorAll('.bbox-rect');
    allRects.forEach(r => r.classList.remove('highlighted'));

    const target = this.svg.querySelector(`#${boxId} .bbox-rect`);
    if (target) {
      target.classList.add('highlighted');
    }
  }
}

window.PipelineVisualizer = PipelineVisualizer;
window.BoundingBoxOverlay = BoundingBoxOverlay;
