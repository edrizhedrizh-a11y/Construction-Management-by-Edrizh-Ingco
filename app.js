(function () {
  "use strict";

  const CFG = window.GOCO_CONFIG || {};
  const PROJECT_NAME = CFG.PROJECT_NAME || "GOCO TAWIRAN";
  const LOCAL_KEY = "goco_tawiran_records_v1";
  const SEQ_KEY = "goco_tawiran_sequence_v1";
  const CREATED_BY_KEY = "goco_tawiran_created_by";

  const LOOKUPS = {
    floorLevels: ["Ground Floor", "Second Floor", "Roof", "Exterior / Facade", "Site / Yard", "General"],
    areas: [
      "Clinic", "Commercial Space 1", "Commercial Space 2", "Bedroom", "T&B / CR", "Stairs",
      "Exterior Stair", "Carport / Frontage", "Unit 1", "Unit 2", "Living / Dining", "Kitchen",
      "Master Bedroom", "Service Area", "Balcony", "Roof Area", "Facade", "Ceiling Area", "General Site"
    ],
    trades: [
      "Structural", "Masonry", "Wall Finishes", "Flooring", "Ceiling", "Door", "Window", "Glass Works",
      "Roofing", "Painting", "Plumbing", "Electrical", "Sanitary", "Cabinetry", "Railings", "Stairs",
      "Facade / Cladding", "Waterproofing", "Design Approval", "Punch List", "Others"
    ],
    categories: [
      "Issue / Concern", "Site Note", "Design Approval", "Punch List", "Progress Photo", "Workmanship",
      "Material Concern", "Schedule Delay", "Cost / Variation", "Safety Concern", "Drawing Clarification", "Owner Decision"
    ],
    statuses: ["Open", "For Action", "In Progress", "For Approval", "For Verification", "Resolved", "Closed", "On Hold", "Cancelled"],
    prioritySeverity: ["Low", "Medium", "High", "Critical"],
    progress: ["0%", "25%", "50%", "75%", "100%"],
    drawingRefs: [
      "A-1 Site Development / Perspective / Location",
      "A-2 Ground Floor and Second Floor Plan",
      "A-3 Elevations",
      "A-4 Sections and Roof Plan",
      "A-5 Reflected Ceiling Plan",
      "Structural Drawing",
      "Electrical Drawing",
      "Plumbing / Sanitary Drawing",
      "Not Applicable"
    ]
  };

  const NAV = [
    { page: "home", href: "index.html", icon: "＋", label: "Add" },
    { page: "photo-board", href: "board.html", icon: "▦", label: "Board" },
    { page: "design-approval", href: "design-approval.html", icon: "✓", label: "Approval" },
    { page: "area-notes", href: "area-notes.html", icon: "⌖", label: "Notes" },
    { page: "dashboard", href: "dashboard.html", icon: "◷", label: "Dash" },
    { page: "records", href: "records.html", icon: "☰", label: "Log" }
  ];

  const DISPLAY_COLUMNS = [
    "Record ID", "Issue ID", "Photo ID", "Date", "Time", "Floor Level", "Area", "Room / Location",
    "Trade / Scope", "Category", "Status", "Priority", "Severity", "Progress %", "Drawing Reference",
    "Responsible Person", "Target Date", "Issue / Concern / Note", "Schedule Impact", "Cost Impact",
    "Photo URL", "Google Drive File ID", "Date Resolved", "Verified By", "Remarks", "Created By", "Timestamp"
  ];

  let activeRecords = [];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    registerServiceWorker();
    renderNavigation();
    updateSyncPill();
    window.addEventListener("online", updateSyncPill);
    window.addEventListener("offline", updateSyncPill);

    const page = document.body.dataset.page;
    document.querySelectorAll("[data-refresh]").forEach(btn => btn.addEventListener("click", () => location.reload()));

    if (page === "home") initFormPage();
    if (["photo-board", "design-approval", "area-notes"].includes(page)) initBoardPage(page);
    if (page === "dashboard") initDashboardPage();
    if (page === "records") initRecordsPage();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  function renderNavigation() {
    const page = document.body.dataset.page;
    const navHtml = NAV.map(item => `
      <a href="${item.href}" class="${item.page === page ? "active" : ""}" aria-label="${escapeHtml(item.label)}">
        <span class="nav-icon">${item.icon}</span><span>${escapeHtml(item.label)}</span>
      </a>
    `).join("");

    document.querySelectorAll("[data-nav], [data-bottom-nav]").forEach(nav => { nav.innerHTML = navHtml; });
  }

  function updateSyncPill(message) {
    const pill = document.querySelector("[data-sync-pill]");
    const label = document.querySelector("[data-sync-label]");
    if (!pill || !label) return;

    const configured = isApiConfigured();
    pill.classList.remove("online", "offline");

    if (!navigator.onLine) {
      pill.classList.add("offline");
      label.textContent = "Offline";
      return;
    }

    if (!configured) {
      pill.classList.add("offline");
      label.textContent = "Setup needed";
      return;
    }

    pill.classList.add("online");
    label.textContent = message || "Online";
  }

  function isApiConfigured() {
    return !!(CFG.APPS_SCRIPT_URL && !CFG.APPS_SCRIPT_URL.includes("PASTE_YOUR"));
  }

  function initFormPage() {
    populateSelects();
    setDefaultFormValues();
    refreshIds();

    const form = document.getElementById("inspectionForm");
    const photoInput = document.getElementById("photoFile");
    const refreshIdsBtn = document.getElementById("refreshIdsBtn");
    const resetBtn = document.getElementById("resetBtn");

    if (photoInput) photoInput.addEventListener("change", showPhotoPreview);
    if (refreshIdsBtn) refreshIdsBtn.addEventListener("click", refreshIds);
    if (resetBtn) resetBtn.addEventListener("click", () => {
      form.reset();
      setDefaultFormValues();
      refreshIds();
      clearPreview();
      showNotice("Form cleared. Ready for the next site record.", "warn");
    });

    if (form) form.addEventListener("submit", handleSubmitRecord);
  }

  function populateSelects() {
    document.querySelectorAll("select[data-options]").forEach(select => {
      const key = select.dataset.options;
      const values = LOOKUPS[key] || [];
      const first = select.required ? '<option value="" disabled selected>Select...</option>' : '<option value="">Select...</option>';
      select.innerHTML = first + values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    });
  }

  function setDefaultFormValues() {
    setValue("status", "Open");
    setValue("priority", "Medium");
    setValue("severity", "Medium");
    setValue("progressPercent", "0%");
    setValue("drawingReference", "Not Applicable");
    setValue("createdBy", localStorage.getItem(CREATED_BY_KEY) || "");
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  function refreshIds() {
    const now = new Date();
    const datePart = formatDateId(now);
    const timePart = formatTimeId(now);
    const sequence = nextSequence();
    setValue("recordId", `GT-${datePart}-${timePart}-${pad(sequence, 3)}`);
    setValue("issueId", `GI-${datePart}-${pad(sequence, 3)}`);
    setValue("photoId", `GP-${datePart}-${pad(sequence, 3)}`);
  }

  function nextSequence() {
    const today = formatDateId(new Date());
    const raw = JSON.parse(localStorage.getItem(SEQ_KEY) || "{}");
    if (raw.date !== today) {
      raw.date = today;
      raw.seq = 0;
    }
    raw.seq = (Number(raw.seq) || 0) + 1;
    localStorage.setItem(SEQ_KEY, JSON.stringify(raw));
    return raw.seq;
  }

  async function showPhotoPreview(event) {
    const file = event.target.files && event.target.files[0];
    const preview = document.getElementById("photoPreview");
    if (!file || !preview) return clearPreview();

    const dataUrl = await fileToDataUrl(file);
    preview.style.display = "block";
    preview.innerHTML = `<img src="${dataUrl}" alt="Site photo preview">`;
  }

  function clearPreview() {
    const preview = document.getElementById("photoPreview");
    if (!preview) return;
    preview.style.display = "none";
    preview.innerHTML = "";
  }

  async function handleSubmitRecord(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveBtn = document.getElementById("saveBtn");
    if (!form.checkValidity()) {
      showNotice("Please complete required fields first.", "error");
      form.reportValidity();
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    try {
      const now = new Date();
      const record = buildRecordFromForm(form, now);
      const photoFile = document.getElementById("photoFile")?.files?.[0] || null;
      const photo = photoFile ? await preparePhotoPayload(photoFile, record["Photo ID"]) : null;

      if (record["Created By"]) localStorage.setItem(CREATED_BY_KEY, record["Created By"]);

      upsertLocalRecord({ ...record, "Local Sync Status": "Pending upload" });

      if (!isApiConfigured()) {
        showNotice("Saved on this device only. Paste your Apps Script Web App URL in config.js to save to Google Sheets and Drive.", "warn");
        form.reset();
        setDefaultFormValues();
        refreshIds();
        clearPreview();
        return;
      }

      const result = await postToAppsScript({ action: "createRecord", record, photo });
      if (!result || result.ok === false) throw new Error(result?.message || "Apps Script did not confirm saving.");

      const savedRecord = {
        ...record,
        "Photo URL": result.photoUrl || record["Photo URL"] || "",
        "Google Drive File ID": result.fileId || record["Google Drive File ID"] || "",
        "Local Sync Status": "Synced"
      };
      upsertLocalRecord(savedRecord);

      showNotice(`Saved successfully: ${record["Record ID"]}`, "ok");
      form.reset();
      setDefaultFormValues();
      refreshIds();
      clearPreview();
    } catch (error) {
      console.error(error);
      showNotice(`Saved locally, but upload failed: ${error.message}. Check internet, Apps Script URL, deployment permission, and Drive folder ID.`, "warn");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Save Site Record";
      }
    }
  }

  function buildRecordFromForm(form, now) {
    const data = new FormData(form);
    const record = {};
    DISPLAY_COLUMNS.forEach(col => record[col] = "");

    for (const [key, value] of data.entries()) {
      if (key !== "photoFile") record[key] = typeof value === "string" ? value.trim() : value;
    }

    record["Project Name"] = PROJECT_NAME;
    record["Date"] = formatInputDate(now);
    record["Time"] = formatInputTime(now);
    record["Week Number"] = getWeekNumber(now);
    record["Timestamp"] = now.toISOString();
    record["Photo URL"] = "";
    record["Google Drive File ID"] = "";
    return record;
  }

  async function preparePhotoPayload(file, photoId) {
    const compressed = await compressImage(file, CFG.PHOTO_MAX_SIZE || 1600, CFG.PHOTO_JPEG_QUALITY || 0.78);
    return {
      fileName: `${photoId || "site-photo"}.jpg`,
      mimeType: "image/jpeg",
      data: compressed.split(",")[1]
    };
  }

  async function postToAppsScript(payload) {
    const response = await fetch(CFG.APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(text || "Invalid Apps Script response.");
    }
  }

  function showNotice(message, type) {
    const el = document.getElementById("formNotice");
    if (!el) return;
    el.textContent = message;
    el.className = `notice show ${type || "ok"}`;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function initBoardPage(page) {
    setupFilterPanel();
    activeRecords = await loadRecords();
    renderBoard(page, activeRecords);
    document.querySelector("[data-filter-panel]")?.addEventListener("input", () => renderBoard(page, activeRecords));
    document.querySelector("[data-filter-panel]")?.addEventListener("change", () => renderBoard(page, activeRecords));
  }

  async function initDashboardPage() {
    activeRecords = await loadRecords();
    renderDashboard(activeRecords);
  }

  async function initRecordsPage() {
    setupFilterPanel();
    activeRecords = await loadRecords();
    renderRecordsTable(activeRecords);
    document.querySelector("[data-filter-panel]")?.addEventListener("input", () => renderRecordsTable(activeRecords));
    document.querySelector("[data-filter-panel]")?.addEventListener("change", () => renderRecordsTable(activeRecords));
    document.getElementById("downloadCsvBtn")?.addEventListener("click", () => downloadCsv(applyFilters(activeRecords), "goco-tawiran-photo-reference-log.csv"));
  }

  function setupFilterPanel() {
    const panel = document.querySelector("[data-filter-panel]");
    if (!panel) return;
    panel.innerHTML = `
      <div class="filter-grid">
        <div class="field"><label>Search</label><input id="filterSearch" placeholder="Issue, area, note, ID..."></div>
        <div class="field"><label>Status</label><select id="filterStatus"><option value="">All statuses</option>${optionsHtml(LOOKUPS.statuses)}</select></div>
        <div class="field"><label>Floor</label><select id="filterFloor"><option value="">All floors</option>${optionsHtml(LOOKUPS.floorLevels)}</select></div>
        <div class="field"><label>Area</label><select id="filterArea"><option value="">All areas</option>${optionsHtml(LOOKUPS.areas)}</select></div>
        <div class="field"><label>Trade</label><select id="filterTrade"><option value="">All trades</option>${optionsHtml(LOOKUPS.trades)}</select></div>
        <div class="field"><label>Category</label><select id="filterCategory"><option value="">All categories</option>${optionsHtml(LOOKUPS.categories)}</select></div>
      </div>
    `;
  }

  function optionsHtml(values) {
    return values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  }

  async function loadRecords() {
    let remoteRecords = [];
    if (isApiConfigured() && navigator.onLine) {
      try {
        remoteRecords = await getRecordsFromApi();
        updateSyncPill("Synced");
      } catch (error) {
        console.warn(error);
        updateSyncPill("Local backup");
      }
    }

    const localRecords = getLocalRecords();
    const merged = mergeRecords(remoteRecords, localRecords);
    return sortRecordsDesc(merged);
  }

  async function getRecordsFromApi() {
    const baseUrl = CFG.APPS_SCRIPT_URL;
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}action=listRecords&sheet=Issue%20Records&t=${Date.now()}`;

    try {
      const response = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow" });
      const text = await response.text();
      const parsed = JSON.parse(text);
      if (parsed.ok === false) throw new Error(parsed.message || "Failed to read records.");
      return parsed.records || [];
    } catch (error) {
      return getRecordsViaJsonp(url);
    }
  }

  function getRecordsViaJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `gocoJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const script = document.createElement("script");
      const src = `${url}&callback=${encodeURIComponent(callbackName)}`;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Apps Script JSONP timeout."));
      }, 12000);

      window[callbackName] = data => {
        cleanup();
        if (data && data.ok === false) reject(new Error(data.message || "Failed to read records."));
        else resolve((data && data.records) || []);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Apps Script JSONP failed."));
      };

      function cleanup() {
        clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      }

      script.src = src;
      document.body.appendChild(script);
    });
  }

  function getLocalRecords() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function upsertLocalRecord(record) {
    if (CFG.ENABLE_LOCAL_BACKUP === false) return;
    const records = getLocalRecords();
    const id = field(record, "Record ID");
    const index = records.findIndex(item => field(item, "Record ID") === id);
    if (index >= 0) records[index] = { ...records[index], ...record };
    else records.push(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(records.slice(-700)));
  }

  function mergeRecords(remote, local) {
    const map = new Map();
    [...local, ...remote].forEach(record => {
      const id = field(record, "Record ID") || `${Math.random()}`;
      map.set(id, { ...(map.get(id) || {}), ...record });
    });
    return Array.from(map.values());
  }

  function sortRecordsDesc(records) {
    return [...records].sort((a, b) => new Date(field(b, "Timestamp") || field(b, "Date") || 0) - new Date(field(a, "Timestamp") || field(a, "Date") || 0));
  }

  function renderBoard(page, records) {
    const container = document.getElementById("recordsContainer");
    if (!container) return;

    const filtered = applyPageFilter(page, applyFilters(records));
    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No records found yet. Add a record from the main form, then refresh this page.</div>`;
      return;
    }

    container.innerHTML = filtered.map(record => {
      const imageUrl = field(record, "Photo URL");
      const cardClass = page === "design-approval" ? "approval-card" : page === "area-notes" ? "note-card" : "issue-card";
      const status = field(record, "Status") || "Open";
      const severity = field(record, "Severity") || "Medium";
      const priority = field(record, "Priority") || "Medium";
      const note = field(record, "Issue / Concern / Note") || field(record, "Note") || "No note entered.";
      const dateText = [formatPrettyDate(field(record, "Date")), field(record, "Time")].filter(Boolean).join(" • ") || "No date";
      const idText = [field(record, "Issue ID"), field(record, "Photo ID")].filter(Boolean).join(" / ") || field(record, "Record ID") || "Pending ID";
      const footerLabel = page === "design-approval" ? "APPROVAL / DECISION NOTE" : page === "area-notes" ? "AREA INSPECTION NOTE" : "CONCERN / ISSUE / NOTE";
      const title = page === "design-approval" ? "DESIGN APPROVAL" : page === "area-notes" ? "AREA NOTES" : "PHOTO ISSUE BOARD";
      const photoHtml = imageUrl
        ? `<a class="report-photo" href="${escapeAttr(imageUrl)}" target="_blank" rel="noopener"><img src="${escapeAttr(imageUrl)}" alt="Site photo"></a>`
        : `<div class="report-photo report-photo-empty">INSERT PHOTO HERE</div>`;

      return `
        <article class="${cardClass} report-card">
          <div class="report-card-title">${escapeHtml(title)}</div>
          <div class="report-meta-grid">
            <div class="report-meta-label">FLOOR LEVEL</div>
            <div class="report-meta-value">${escapeHtml(field(record, "Floor Level") || "—")}</div>
            <div class="report-meta-label">AREA</div>
            <div class="report-meta-value">${escapeHtml(field(record, "Area") || field(record, "Room / Location") || "—")}</div>
            <div class="report-meta-label">TRADE / SCOPE</div>
            <div class="report-meta-value">${escapeHtml(field(record, "Trade / Scope") || "—")}</div>
            <div class="report-meta-label">DATE</div>
            <div class="report-meta-value">${escapeHtml(dateText)}</div>
          </div>
          ${photoHtml}
          <div class="report-status-row">
            <div class="report-progress ${progressClass(field(record, "Progress %"))}">${escapeHtml(field(record, "Progress %") || "0%")}</div>
            <div class="report-status ${slug(status)}">${escapeHtml(status)}</div>
            <div class="report-id">${escapeHtml(idText)}</div>
          </div>
          <div class="report-subrow">
            <span>Priority: <strong>${escapeHtml(priority)}</strong></span>
            <span>Severity: <strong>${escapeHtml(severity)}</strong></span>
            <span>Drawing: <strong>${escapeHtml(field(record, "Drawing Reference") || "N/A")}</strong></span>
            <span>Responsible: <strong>${escapeHtml(field(record, "Responsible Person") || "Unassigned")}</strong></span>
          </div>
          <div class="report-note-block">
            <div class="report-note-label">${escapeHtml(footerLabel)}</div>
            <p>${escapeHtml(note)}</p>
            ${field(record, "Remarks") ? `<p class="report-remarks"><strong>Remarks:</strong> ${escapeHtml(field(record, "Remarks"))}</p>` : ""}
          </div>
          <div class="report-signoff">
            <span>Target: <strong>${escapeHtml(field(record, "Target Date") || "—")}</strong></span>
            <span>Resolved: <strong>${escapeHtml(field(record, "Date Resolved") || "—")}</strong></span>
            <span>Verified by: <strong>${escapeHtml(field(record, "Verified By") || "—")}</strong></span>
          </div>
        </article>
      `;
    }).join("");
  }

  function progressClass(value) {
    return `p-${String(value || "0").replace("%", "")}`;
  }

  function applyPageFilter(page, records) {
    if (page === "design-approval") {
      return records.filter(record => {
        const category = field(record, "Category");
        const trade = field(record, "Trade / Scope");
        const status = field(record, "Status");
        return category === "Design Approval" || trade === "Design Approval" || status === "For Approval" || category === "Owner Decision" || category === "Drawing Clarification";
      });
    }

    if (page === "area-notes") {
      return records.filter(record => {
        const category = field(record, "Category");
        return ["Site Note", "Progress Photo", "Drawing Clarification", "Owner Decision", "Punch List", "Issue / Concern"].includes(category);
      });
    }

    return records;
  }

  function applyFilters(records) {
    const search = (document.getElementById("filterSearch")?.value || "").toLowerCase().trim();
    const status = document.getElementById("filterStatus")?.value || "";
    const floor = document.getElementById("filterFloor")?.value || "";
    const area = document.getElementById("filterArea")?.value || "";
    const trade = document.getElementById("filterTrade")?.value || "";
    const category = document.getElementById("filterCategory")?.value || "";

    return records.filter(record => {
      const matchesSearch = !search || DISPLAY_COLUMNS.some(col => String(field(record, col) || "").toLowerCase().includes(search));
      return matchesSearch
        && (!status || field(record, "Status") === status)
        && (!floor || field(record, "Floor Level") === floor)
        && (!area || field(record, "Area") === area)
        && (!trade || field(record, "Trade / Scope") === trade)
        && (!category || field(record, "Category") === category);
    });
  }

  function buildCardTitle(record) {
    const floor = field(record, "Floor Level") || "General";
    const area = field(record, "Area") || "Area";
    const room = field(record, "Room / Location");
    const trade = field(record, "Trade / Scope") || "Scope";
    return `${floor} · ${area}${room ? " · " + room : ""} · ${trade}`;
  }

  function renderDashboard(records) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unresolvedStatuses = new Set(["Open", "For Action", "In Progress", "For Approval", "For Verification", "On Hold"]);

    const total = records.length;
    const open = countBy(records, r => field(r, "Status") === "Open");
    const forAction = countBy(records, r => field(r, "Status") === "For Action");
    const forApproval = countBy(records, r => field(r, "Status") === "For Approval" || field(r, "Category") === "Design Approval");
    const resolved = countBy(records, r => field(r, "Status") === "Resolved");
    const closed = countBy(records, r => field(r, "Status") === "Closed");
    const critical = countBy(records, r => field(r, "Severity") === "Critical" || field(r, "Priority") === "Critical");
    const overdue = countBy(records, r => {
      const target = parseDateOnly(field(r, "Target Date"));
      return target && target < today && unresolvedStatuses.has(field(r, "Status"));
    });

    const stats = [
      ["Total Records", total],
      ["Open Issues", open],
      ["For Action", forAction],
      ["For Approval", forApproval],
      ["Resolved", resolved],
      ["Closed", closed],
      ["Critical", critical],
      ["Overdue", overdue]
    ];

    const statsEl = document.getElementById("dashboardStats");
    if (statsEl) {
      statsEl.innerHTML = stats.map(([label, value]) => `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-number">${value}</div></div>`).join("");
    }

    renderBars("areaBars", groupCount(records, "Area"));
    renderBars("tradeBars", groupCount(records, "Trade / Scope"));
    renderBars("floorBars", groupCount(records, "Floor Level"));

    const actions = records.filter(r => unresolvedStatuses.has(field(r, "Status"))).slice(0, 8);
    const actionEl = document.getElementById("actionList");
    if (actionEl) {
      actionEl.innerHTML = actions.length ? actions.map(r => `
        <article class="note-card" style="box-shadow:none;margin-bottom:10px;">
          <div class="card-body">
            <div class="card-topline"><span class="badge ${slug(field(r, "Status"))}">${escapeHtml(field(r, "Status"))}</span><span class="badge ${slug(field(r, "Priority"))}">${escapeHtml(field(r, "Priority") || "Medium")}</span></div>
            <h3 class="card-title">${escapeHtml(buildCardTitle(r))}</h3>
            <p class="card-note">${escapeHtml(field(r, "Issue / Concern / Note"))}</p>
          </div>
        </article>
      `).join("") : `<div class="empty-state">No open action items found.</div>`;
    }
  }

  function renderBars(elementId, rows) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = `<div class="empty-state">No data yet.</div>`;
      return;
    }
    const max = Math.max(...rows.map(row => row.count), 1);
    el.innerHTML = rows.slice(0, 12).map(row => {
      const width = Math.round((row.count / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-row-top"><span>${escapeHtml(row.label)}</span><span>${row.count}</span></div>
          <div class="bar-track"><div class="bar-fill" style="--w:${width}%"></div></div>
        </div>
      `;
    }).join("");
  }

  function groupCount(records, key) {
    const map = new Map();
    records.forEach(record => {
      const label = field(record, key) || "Not specified";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function countBy(records, predicate) {
    return records.reduce((sum, record) => sum + (predicate(record) ? 1 : 0), 0);
  }

  function renderRecordsTable(records) {
    const container = document.getElementById("recordsTableContainer");
    if (!container) return;
    const filtered = applyFilters(records);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No records found.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>${DISPLAY_COLUMNS.map(col => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead>
          <tbody>
            ${filtered.map(record => `<tr>${DISPLAY_COLUMNS.map(col => `<td>${renderCell(record, col)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCell(record, col) {
    const value = field(record, col);
    if (col === "Photo URL" && value) return `<a href="${escapeAttr(value)}" target="_blank" rel="noopener">Open Photo</a>`;
    if (col === "Status" && value) return `<span class="badge ${slug(value)}">${escapeHtml(value)}</span>`;
    if (["Priority", "Severity"].includes(col) && value) return `<span class="badge ${slug(value)}">${escapeHtml(value)}</span>`;
    return escapeHtml(value);
  }

  function downloadCsv(records, fileName) {
    const lines = [DISPLAY_COLUMNS.join(",")].concat(records.map(record => DISPLAY_COLUMNS.map(col => csvEscape(field(record, col))).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    const text = String(value || "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function field(record, name) {
    if (!record) return "";
    if (record[name] != null) return record[name];
    const normalized = normalizeKey(name);
    const key = Object.keys(record).find(k => normalizeKey(k) === normalized);
    return key ? record[key] : "";
  }

  function normalizeKey(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  async function compressImage(file, maxSize, quality) {
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image."));
      img.src = src;
    });
  }

  function formatDateId(date) {
    return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
  }

  function formatTimeId(date) {
    return `${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}${pad(date.getSeconds(), 2)}`;
  }

  function formatInputDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
  }

  function formatInputTime(date) {
    return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
  }

  function formatPrettyDate(value) {
    if (!value) return "";
    const date = parseDateOnly(value);
    if (!date) return value;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const parts = String(value).slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function pad(value, size) {
    return String(value).padStart(size, "0");
  }

  function slug(value) {
    return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
