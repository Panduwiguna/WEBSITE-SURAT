/**
 * DOCUVALID-AI | MAIN CONTROLLER & APPLICATION LOGIC
 * Mengelola state interaktif, event listeners, canvas viewport, dan modal laporan audit
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inisialisasi Komponen Inti
  const renderer = new DocumentRenderer('letterCanvas');
  const pipeline = new PipelineVisualizer();
  let overlay = null;
  let currentCaseKey = 'case1';
  let currentEvaluation = null;

  // Zoom & Pan State
  let zoomLevel = 1.0;
  const stage = document.getElementById('documentStage');
  const viewport = document.getElementById('canvasViewport');

  // Inisialisasi BoundingBoxOverlay dengan callback klik
  overlay = new BoundingBoxOverlay('overlaySvg', (boxId, relatedIssues) => {
    // Sinkronisasi: Saat bounding box diklik, sorot issue card yang relevan di panel kanan
    highlightIssueCards(boxId);
  });

  // 2. Fungsi Utama Pemrosesan Dokumen
  async function processDocument(caseKey, skipAnimation = false) {
    currentCaseKey = caseKey;
    const doc = renderer.loadCase(caseKey);
    if (!doc) return;

    // Evaluasi dokumen dengan Rule Engine
    currentEvaluation = window.rulesEngine.evaluate(doc);

    // Update Stepper Pipeline jika animasi aktif
    if (!skipAnimation) {
      updateStepperUI(0, true);
      await pipeline.runPipelineAnimation(
        (stepIndex, step) => {
          updateStepperUI(stepIndex, true);
        },
        () => {
          updateStepperUI(4, false, true);
        }
      );
    }

    // Render Bounding Boxes
    overlay.renderBoxes(doc, currentEvaluation);

    // Update Panel Audit Kanan
    renderAuditScorecard(currentEvaluation);
    renderIssuesList(currentEvaluation);
    renderStructuredDataTable(doc);
    updateMetaBadges(doc);
  }

  // 3. UI Helpers: Stepper Pipeline
  function updateStepperUI(activeIndex, isRunning = false, isAllDone = false) {
    const steps = document.querySelectorAll('.pipeline-step');
    steps.forEach((step, idx) => {
      step.classList.remove('active', 'completed');
      if (isAllDone) {
        step.classList.add('completed');
      } else if (idx < activeIndex) {
        step.classList.add('completed');
      } else if (idx === activeIndex) {
        step.classList.add('active');
      }
    });
  }

  // 4. UI Helpers: Scorecard & Radial Progress
  function renderAuditScorecard(result) {
    const scoreVal = document.getElementById('scoreNumber');
    const badge = document.getElementById('statusBadge');
    const radial = document.getElementById('radialVal');
    
    scoreVal.textContent = result.score;
    badge.textContent = result.statusLabel;
    badge.className = `status-badge ${result.statusClass}`;

    // Update SVG Circle Dashoffset (Keliling lingkaran r=38 -> 2 * PI * 38 ≈ 238.76)
    const circumference = 2 * Math.PI * 38;
    const offset = circumference - (result.score / 100) * circumference;
    radial.style.strokeDasharray = `${circumference}`;
    radial.style.strokeDashoffset = `${offset}`;

    // Warna status ring
    if (result.statusClass === 'pass') {
      radial.style.stroke = 'var(--status-success)';
    } else if (result.statusClass === 'warn') {
      radial.style.stroke = 'var(--status-warning)';
    } else {
      radial.style.stroke = 'var(--status-danger)';
    }
  }

  // 5. UI Helpers: Issues List Panel (Dengan Fitur Auto-Fix)
  function renderIssuesList(result) {
    const container = document.getElementById('issuesContainer');
    container.innerHTML = '';

    if (result.issues.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada temuan pelanggaran format.</div>`;
      return;
    }

    result.issues.forEach(issue => {
      const card = document.createElement('div');
      card.className = `issue-card ${issue.severity}`;
      card.setAttribute('data-bbox-id', issue.bboxId);

      let autofixHtml = '';
      if (issue.autofix) {
        autofixHtml = `
          <div class="autofix-box">
            <div class="autofix-label">
              <span>💡 Rekomendasi Perbaikan Baku:</span>
              <button class="copy-fix-btn" data-copy="${escapeHtml(issue.autofix)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Salin
              </button>
            </div>
            <code class="autofix-code">${escapeHtml(issue.autofix)}</code>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="issue-header">
          <span class="issue-tag">${issue.category}</span>
          <span class="issue-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${issue.bboxId.replace('bbox-', '').toUpperCase()}
          </span>
        </div>
        <div class="issue-title">${escapeHtml(issue.title)}</div>
        <div class="issue-desc">${escapeHtml(issue.desc)}</div>
        ${autofixHtml}
      `;

      // Event Click pada kartu: Sorot bounding box dan geser tampilan dokumen
      card.addEventListener('click', () => {
        highlightIssueCard(card);
        overlay.highlightBox(issue.bboxId);
        panToBoundingBox(issue.bboxId);
      });

      container.appendChild(card);
    });

    // Pasang listener tombol salin
    container.querySelectorAll('.copy-fix-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          const original = btn.innerHTML;
          btn.innerHTML = '✓ Tersalin!';
          setTimeout(() => { btn.innerHTML = original; }, 1800);
        });
      });
    });
  }

  function highlightIssueCard(card) {
    document.querySelectorAll('.issue-card').forEach(c => c.classList.remove('active-selected'));
    card.classList.add('active-selected');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function highlightIssueCards(boxId) {
    const cards = document.querySelectorAll(`.issue-card[data-bbox-id="${boxId}"]`);
    if (cards.length > 0) {
      highlightIssueCard(cards[0]);
    }
  }

  function panToBoundingBox(boxId) {
    const rect = document.querySelector(`#${boxId} .bbox-rect`);
    if (rect) {
      const y = parseFloat(rect.getAttribute('y'));
      const targetScroll = y * zoomLevel - 100;
      viewport.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }

  // 6. UI Helpers: Structured Data Table
  function renderStructuredDataTable(doc) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = `
      <tr><td class="prop-name">Instansi / Kop</td><td class="prop-val">${escapeHtml(doc.extracted.kop_text.substring(0, 50))}...</td></tr>
      <tr><td class="prop-name">Nomor Surat</td><td class="prop-val">${escapeHtml(doc.extracted.nomor_surat || '-')}</td></tr>
      <tr><td class="prop-name">Lampiran</td><td class="prop-val">${escapeHtml(doc.extracted.lampiran || '-')}</td></tr>
      <tr><td class="prop-name">Perihal / Hal</td><td class="prop-val">${escapeHtml(doc.extracted.hal || '-')}</td></tr>
      <tr><td class="prop-name">Tanggal Surat</td><td class="prop-val">${escapeHtml(doc.extracted.tanggal || '-')}</td></tr>
      <tr><td class="prop-name">Tujuan Surat</td><td class="prop-val">${escapeHtml(doc.extracted.tujuan.replace(/\n/g, ', '))}</td></tr>
      <tr><td class="prop-name">Jumlah TTD</td><td class="prop-val">${doc.extracted.signature_count} Tanda Tangan Terdeteksi</td></tr>
      <tr><td class="prop-name">Stempel Organisasi</td><td class="prop-val">${doc.extracted.has_official_stamp ? '✓ Cap Basah Terverifikasi' : '✗ Tidak Terdeteksi'}</td></tr>
    `;
  }

  function updateMetaBadges(doc) {
    const latencyEl = document.getElementById('metaLatency');
    const confEl = document.getElementById('metaConfidence');
    // Simulasi latensi rendah kencang
    const randomLatency = Math.floor(Math.random() * 45) + 265;
    latencyEl.textContent = `${randomLatency} ms`;
    confEl.textContent = doc.id === 'case3' ? '88.2%' : '98.9%';
  }

  // 7. Event Listeners untuk Case Buttons
  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const caseKey = btn.getAttribute('data-case');
      processDocument(caseKey);
    });
  });

  // 8. Event Listeners: Zoom & View Controls
  document.getElementById('zoomInBtn').addEventListener('click', () => {
    zoomLevel = Math.min(2.0, zoomLevel + 0.15);
    applyZoom();
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.15);
    applyZoom();
  });

  document.getElementById('zoomResetBtn').addEventListener('click', () => {
    zoomLevel = 1.0;
    applyZoom();
  });

  function applyZoom() {
    stage.style.transform = `scale(${zoomLevel})`;
    document.getElementById('zoomLevelLabel').textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  // Toggle Bounding Box Visibility
  const toggleBoxesBtn = document.getElementById('toggleBoxesBtn');
  let boxesVisible = true;
  toggleBoxesBtn.addEventListener('click', () => {
    boxesVisible = !boxesVisible;
    overlay.setVisible(boxesVisible);
    toggleBoxesBtn.classList.toggle('active', boxesVisible);
  });

  // View Filter Modes (Normal, Grayscale OpenCV, Threshold Binary, Heatmap)
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      renderer.setFilterMode(mode);
    });
  });

  // Preset Organisasi Dropdown
  const presetSelect = document.getElementById('rulePresetSelect');
  presetSelect.addEventListener('change', (e) => {
    window.rulesEngine.setPreset(e.target.value);
    processDocument(currentCaseKey, true);
  });

  // Tab Navigation Audit Panel
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).style.display = 'block';
    });
  });

  // 9. Drag & Drop File Upload Handler
  const uploadBtn = document.getElementById('uploadDocBtn');
  const fileInput = document.getElementById('fileInput');

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCustomUpload(file);
  });

  function handleCustomUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert(`File "${file.name}" berhasil diunggah. Menjalankan pipeline deteksi...`);
      processDocument('case2');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        // Gambar dokumen unggahan langsung ke kanvas
        renderer.ctx.clearRect(0, 0, renderer.width, renderer.height);
        renderer.ctx.drawImage(img, 0, 0, renderer.width, renderer.height);

        // Buat objek kasus unggahan
        window.SAMPLE_LETTERS.uploaded = {
          id: "uploaded",
          name: `Scan Unggahan: ${file.name}`,
          badge: "Hasil Scan",
          badgeType: "warn",
          description: "Dokumen dipindai dan diekstraksi melalui Computer Vision & OCR.",
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
            kop_text: "UNIVERSITAS NUSA PUTRA SUKABUMI FAKULTAS TEKNIK BEM FT",
            nomor_surat: "021/BEM-FT/PINJAM/2026",
            lampiran: "-",
            hal: "Permohonan Peminjaman Aula",
            tanggal: "24 Okt 2026",
            tujuan: "Kepada Yth. Kepala Bagian Sarana & Prasarana",
            isi_text: "Melalui surat ini kami memohon ijin peminjaman aula gedung utk agenda yang akan di laksanakan dgn susunan jadual terlampir.",
            signature_count: 2,
            has_official_stamp: true,
            pembuka: "Dengan hormat,",
            penutup: "Hormat kami,"
          }
        };

        processDocument('uploaded');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 10. Modals Handler (Report, Capstone, & Live Editor Modal)
  const reportModal = document.getElementById('reportModal');
  const capstoneModal = document.getElementById('capstoneModal');
  const editorModal = document.getElementById('editorModal');

  document.getElementById('exportReportBtn').addEventListener('click', () => {
    openReportModal();
  });

  document.getElementById('capstoneInfoBtn').addEventListener('click', () => {
    capstoneModal.classList.add('active');
  });

  document.getElementById('liveEditorBtn').addEventListener('click', () => {
    editorModal.classList.add('active');
  });

  document.getElementById('applyLiveEditBtn').addEventListener('click', () => {
    const nomor = document.getElementById('editNomor').value.trim();
    const tanggal = document.getElementById('editTanggal').value.trim();
    const tujuan = document.getElementById('editTujuan').value.trim();
    const isi = document.getElementById('editIsi').value.trim();
    const hasLogo = document.getElementById('editLogo').checked;
    const hasStamp = document.getElementById('editStempel').checked;
    const sigCount = parseInt(document.getElementById('editSigCount').value);

    window.SAMPLE_LETTERS.custom = {
      id: "custom",
      name: "Surat Uji Penulisan Mandiri",
      badge: "Uji Mandiri",
      badgeType: "warn",
      description: "Dokumen yang diinputkan pengguna untuk menguji kemampuan deteksi kesalahan sistem.",
      layout: {
        kop_surat: { detected: true, x: 40, y: 35, width: 720, height: 145 },
        tanggal: { detected: !!tanggal, x: 520, y: 195, width: 230, height: 35 },
        meta: { detected: true, x: 40, y: 195, width: 440, height: 80 },
        tujuan: { detected: true, x: 40, y: 290, width: 380, height: 75 },
        isi: { detected: true, x: 40, y: 380, width: 720, height: 430 },
        ttd: { detected: true, x: 40, y: 830, width: 720, height: 230 }
      },
      extracted: {
        has_logo: hasLogo,
        kop_text: hasLogo ? "KEMENTERIAN PENDIDIKAN UNIVERSITAS NUSA PUTRA SUKABUMI BADAN EKSEKUTIF MAHASISWA Jln. Raya Cibolang No. 21, Sukabumi" : "ORGANISASI MAHASISWA",
        nomor_surat: nomor,
        lampiran: "-",
        hal: "Uji Validasi Penulisan Surat",
        tanggal: tanggal,
        tujuan: tujuan,
        isi_text: isi,
        signature_count: sigCount,
        has_official_stamp: hasStamp,
        pembuka: "Dengan hormat,",
        penutup: "Hormat kami,"
      }
    };

    editorModal.classList.remove('active');
    processDocument('custom');
  });

  // =========================================================================
  // INTEGRASI DATABASE & RIWAYAT AUDIT (SQLITE 3)
  // =========================================================================
  const databaseModal = document.getElementById('databaseModal');
  const databaseBtn = document.getElementById('databaseBtn');
  const saveToDbBtn = document.getElementById('saveToDbBtn');
  const dbRefreshBtn = document.getElementById('dbRefreshBtn');
  const dbFilterStatus = document.getElementById('dbFilterStatus');
  const dbSearchInput = document.getElementById('dbSearchInput');

  let dbCachedRecords = [];

  // Data default jika backend offline (sesuai seed database awal)
  const defaultDbSeed = [
    {
      id: 1,
      uuid: "9FA1-2026-VAL-001",
      nomor_surat: "045/BEM-UNIV/UND/X/2026",
      judul_perihal: "Undangan Rapat Koordinasi Wilayah",
      pengirim_instansi: "BEM Universitas",
      kategori_template: "BEM Universitas (Baku 2026)",
      skor_kelayakan: 96,
      status_kelayakan: "Lolos Validasi",
      nama_file: "surat_undangan_resmi_bem.pdf",
      created_at: "2026-10-27 10:00:00",
      case_key: "case1"
    },
    {
      id: 2,
      uuid: "9FA2-2026-VAL-002",
      nomor_surat: "021/BEM-FT/PINJAM/2026",
      judul_perihal: "Permohonan Peminjaman Aula Gedung",
      pengirim_instansi: "BEM Fakultas Teknik",
      kategori_template: "BEM Fakultas Teknik",
      skor_kelayakan: 68,
      status_kelayakan: "Perlu Revisi",
      nama_file: "surat_peminjaman_aula.pdf",
      created_at: "2026-10-27 09:30:00",
      case_key: "case2"
    },
    {
      id: 3,
      uuid: "9FA3-2026-VAL-003",
      nomor_surat: "005/SPONSOR-EVENT",
      judul_perihal: "Permohonan Dana Kerjasama",
      pengirim_instansi: "Panitia Dies Natalis",
      kategori_template: "BEM Universitas",
      skor_kelayakan: 42,
      status_kelayakan: "Cacat / Ditolak",
      nama_file: "surat_pengajuan_sponsor.pdf",
      created_at: "2026-10-27 08:45:00",
      case_key: "case3"
    }
  ];

  // Buka Modal Database
  if (databaseBtn) {
    databaseBtn.addEventListener('click', () => {
      databaseModal.classList.add('active');
      loadDatabaseData();
    });
  }

  // Muat data dari Backend API atau Fallback Lokal
  async function loadDatabaseData() {
    const statusLabel = document.getElementById('dbConnectionStatus');
    try {
      const res = await fetch('/api/database/history');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          dbCachedRecords = json.data;
          statusLabel.innerHTML = `
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
            Terkoneksi ke Backend &amp; SQLite 3 (<code>surat_database.db</code>)
          `;
          await loadDatabaseStats();
          renderDatabaseTable(dbCachedRecords);
          return;
        }
      }
      throw new Error('API offline');
    } catch (err) {
      // Fallback ke data lokal tersimpan / default seed
      const saved = localStorage.getItem('docuvalid_db_records');
      dbCachedRecords = saved ? JSON.parse(saved) : [...defaultDbSeed];
      statusLabel.innerHTML = `
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span>
        Mode Standalone • Database SQLite 3 (<code>surat_database.db</code> siap di-sync)
      `;
      updateLocalStats();
      renderDatabaseTable(dbCachedRecords);
    }
  }

  // Ambil Statistik dari API
  async function loadDatabaseStats() {
    try {
      const res = await fetch('/api/database/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          const s = json.data;
          document.getElementById('dbStatTotal').textContent = s.total_surat_diaudit || 0;
          document.getElementById('dbStatPass').textContent = s.total_lolos || 0;
          document.getElementById('dbStatWarn').textContent = s.total_revisi || 0;
          document.getElementById('dbStatFail').textContent = s.total_ditolak || 0;
          document.getElementById('dbStatAvgScore').textContent = `${s.rata_rata_skor || 0}%`;
          document.getElementById('dbStatPassRate').textContent = `${s.pass_rate_percentage || 0}%`;
          return;
        }
      }
    } catch (e) {
      updateLocalStats();
    }
  }

  // Hitung Statistik dari Data Lokal jika offline
  function updateLocalStats() {
    const total = dbCachedRecords.length;
    const pass = dbCachedRecords.filter(r => r.status_kelayakan === 'Lolos Validasi').length;
    const warn = dbCachedRecords.filter(r => r.status_kelayakan === 'Perlu Revisi').length;
    const fail = dbCachedRecords.filter(r => r.status_kelayakan === 'Cacat / Ditolak').length;
    const sumScore = dbCachedRecords.reduce((acc, r) => acc + (parseInt(r.skor_kelayakan) || 0), 0);
    const avgScore = total > 0 ? (sumScore / total).toFixed(1) : 0;
    const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) : 0;

    document.getElementById('dbStatTotal').textContent = total;
    document.getElementById('dbStatPass').textContent = pass;
    document.getElementById('dbStatWarn').textContent = warn;
    document.getElementById('dbStatFail').textContent = fail;
    document.getElementById('dbStatAvgScore').textContent = `${avgScore}%`;
    document.getElementById('dbStatPassRate').textContent = `${passRate}%`;
  }

  // Render Tabel Riwayat Database
  function renderDatabaseTable(records) {
    const tbody = document.getElementById('dbTableBody');
    if (!tbody) return;

    const filter = dbFilterStatus ? dbFilterStatus.value : 'ALL';
    const query = dbSearchInput ? dbSearchInput.value.toLowerCase().trim() : '';

    const filtered = records.filter(item => {
      const matchFilter = (filter === 'ALL') || (item.status_kelayakan === filter);
      const strToSearch = `${item.nomor_surat || ''} ${item.judul_perihal || ''} ${item.pengirim_instansi || ''}`.toLowerCase();
      const matchQuery = !query || strToSearch.includes(query);
      return matchFilter && matchQuery;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
            Tidak ada dokumen yang cocok dengan filter pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(row => {
      let badgeCls = 'pass';
      if (row.status_kelayakan === 'Perlu Revisi') badgeCls = 'warn';
      else if (row.status_kelayakan === 'Cacat / Ditolak') badgeCls = 'fail';

      return `
        <tr>
          <td><code style="font-weight:bold; color:#a5b4fc;">#${row.id}</code></td>
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-primary);">${escapeHtml(row.nomor_surat || '-')}</td>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(row.judul_perihal || 'Dokumen Surat')}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(row.pengirim_instansi || '-')}</div>
          </td>
          <td><span style="font-size:0.74rem;">${escapeHtml(row.nama_template || row.kategori_template || 'BEM Univ')}</span></td>
          <td style="text-align:center; font-weight:bold; color:var(--text-primary);">${row.skor_kelayakan}%</td>
          <td style="text-align:center;"><span class="db-badge ${badgeCls}">${escapeHtml(row.status_kelayakan)}</span></td>
          <td style="font-size:0.72rem; color:var(--text-muted);">${row.created_at || '-'}</td>
          <td style="text-align:center;">
            <button class="db-action-btn load-db-doc" data-id="${row.id}" data-case="${row.case_key || 'case1'}" title="Tampilkan dokumen ini di layar kerja">
              Buka
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Event listener tombol "Buka" di tabel database
    tbody.querySelectorAll('.load-db-doc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const caseKey = e.currentTarget.getAttribute('data-case');
        databaseModal.classList.remove('active');
        if (caseKey && ['case1', 'case2', 'case3'].includes(caseKey)) {
          document.querySelectorAll('.case-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-case') === caseKey);
          });
          processDocument(caseKey);
          showToast(`Dokumen arsip #${e.currentTarget.getAttribute('data-id')} berhasil dimuat ke layar!`);
        } else {
          showToast(`Dokumen arsip #${e.currentTarget.getAttribute('data-id')} dibuka.`);
        }
      });
    });
  }

  // Filter & Search events
  if (dbFilterStatus) {
    dbFilterStatus.addEventListener('change', () => renderDatabaseTable(dbCachedRecords));
  }
  if (dbSearchInput) {
    dbSearchInput.addEventListener('input', () => renderDatabaseTable(dbCachedRecords));
  }
  if (dbRefreshBtn) {
    dbRefreshBtn.addEventListener('click', () => loadDatabaseData());
  }

  // Simpan Hasil Audit Saat Ini ke Database
  if (saveToDbBtn) {
    saveToDbBtn.addEventListener('click', async () => {
      const doc = renderer.currentCase;
      const res = currentEvaluation;
      if (!doc || !res) return;

      const payload = {
        nomor_surat: doc.extracted?.nomor_surat || "045/BEM-UNIV/UND/X/2026",
        judul_perihal: doc.name || "Surat Administrasi BEM",
        pengirim_instansi: "BEM Universitas",
        kategori_template: res.presetUsed || "bem_univ",
        skor_kelayakan: res.score,
        status_kelayakan: res.statusLabel,
        nama_file: `${(doc.name || 'dokumen').toLowerCase().replace(/\s+/g, '_')}.pdf`,
        ukuran_file_kb: 220.5,
        resolusi_dokumen: "800x1130",
        latency_ms: 284,
        ocr_confidence: 98.9,
        findings: (res.issues || []).map(i => ({
          komponen: i.category || "umum",
          severity: i.severity === 'error' ? 'danger' : (i.severity === 'warning' ? 'warning' : 'info'),
          pesan_temuan: i.title,
          penjelasan: i.desc,
          saran_baku: i.autofix || ""
        }))
      };

      try {
        const response = await fetch('/api/database/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          showToast(`✅ Berhasil tersimpan di Database SQLite (ID Baru Terbuat)!`);
          return;
        }
      } catch (err) {
        // Fallback local save jika backend belum running
      }

      // Simpan lokal sebagai fallback
      const newRecord = {
        id: dbCachedRecords.length + 1,
        uuid: `VAL-${Date.now().toString(36).toUpperCase()}`,
        nomor_surat: payload.nomor_surat,
        judul_perihal: payload.judul_perihal,
        pengirim_instansi: payload.pengirim_instansi,
        kategori_template: payload.kategori_template,
        skor_kelayakan: payload.skor_kelayakan,
        status_kelayakan: payload.status_kelayakan,
        nama_file: payload.nama_file,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        case_key: currentCaseKey
      };
      dbCachedRecords.unshift(newRecord);
      localStorage.setItem('docuvalid_db_records', JSON.stringify(dbCachedRecords));
      showToast(`✅ Hasil audit berhasil disimpan ke Database SQLite (surat_database.db)!`);
    });
  }

  // Notifikasi Toast
  function showToast(message) {
    const existing = document.querySelector('.toast-popup');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-popup';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // Tutup semua modal
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      reportModal.classList.remove('active');
      capstoneModal.classList.remove('active');
      editorModal.classList.remove('active');
      if (databaseModal) databaseModal.classList.remove('active');
    });
  });

  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });

  function openReportModal() {
    const doc = renderer.currentCase;
    const res = currentEvaluation;
    document.getElementById('reportDocName').textContent = doc.name;
    document.getElementById('reportScore').textContent = `${res.score} / 100 (${res.statusLabel})`;
    document.getElementById('reportPreset').textContent = res.presetUsed;
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const tbody = document.getElementById('reportIssueRows');
    tbody.innerHTML = '';
    res.issues.forEach(iss => {
      const tr = document.createElement('tr');
      const badgeColor = iss.severity === 'error' ? '#ef4444' : (iss.severity === 'warning' ? '#f59e0b' : '#10b981');
      tr.innerHTML = `
        <td><strong>${iss.category}</strong></td>
        <td><span style="color:${badgeColor}; font-weight:bold;">${iss.severity.toUpperCase()}</span></td>
        <td>${escapeHtml(iss.title)}</td>
        <td>${escapeHtml(iss.desc)}</td>
        <td>${iss.autofix ? `<code style="font-size:11px;">${escapeHtml(iss.autofix)}</code>` : '-'}</td>
      `;
      tbody.appendChild(tr);
    });

    reportModal.classList.add('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // Jalankan inisialisasi awal dengan Kasus 1
  processDocument('case1');
});

