(function () {
  "use strict";

  const CFG = window.GOCO_CONFIG || {};
  const PROJECT_NAME = CFG.PROJECT_NAME || "GOCO TAWIRAN";
  const LOCAL_KEY = "goco_tawiran_records_v1";
  const SEQ_KEY = "goco_tawiran_sequence_v1";
  const CREATED_BY_KEY = "goco_tawiran_created_by";
  const PROJECT_ARCHITECT_KEY = "goco_tawiran_project_architect";
  const PROJECT_IN_CHARGE_KEY = "goco_tawiran_project_in_charge";
  const SITE_ZONE_KEY = "goco_tawiran_site_zone";
  const USER_SESSION_KEY = "goco_tawiran_user_session_v5";
  const IMAGE_CACHE_KEY = "goco_tawiran_image_cache_v1";


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
    { page: "report", href: "report.html", icon: "▣", label: "Report" },
    { page: "design-approval", href: "design-approval.html", icon: "✓", label: "Approval" },
    { page: "area-notes", href: "area-notes.html", icon: "⌖", label: "Notes" },
    { page: "dashboard", href: "dashboard.html", icon: "◷", label: "Dash" },
    { page: "records", href: "records.html", icon: "☰", label: "Log" },
    { page: "admin", href: "admin.html", icon: "◎", label: "Admin" },
    { page: "login", href: "login.html", icon: "👤", label: "User" }
  ];

  const DISPLAY_COLUMNS = [
    "Record ID", "Issue ID", "Photo ID", "Date", "Time", "Project Architect", "Project In-Charge", "Site / Zone",
    "Floor Level", "Area", "Room / Location", "Trade / Scope", "Category", "Status", "Priority", "Severity",
    "Progress %", "Drawing Reference", "Responsible Person", "Target Date", "Issue / Concern / Note",
    "Schedule Impact", "Cost Impact", "Photo URL", "Google Drive File ID", "Photo Folder Path", "Google Drive Folder ID",
    "Date Resolved", "Verified By", "Remarks", "Created By", "Created By Email", "User ID", "User Role", "Timestamp"
  ];

  let activeRecords = [];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    registerServiceWorker();
    renderNavigation();
    renderUserPill();
    updateSyncPill();
    window.addEventListener("online", updateSyncPill);
    window.addEventListener("offline", updateSyncPill);

    const page = document.body.dataset.page;
    document.querySelectorAll("[data-refresh]").forEach(btn => btn.addEventListener("click", () => location.reload()));

    if (!ensureLoginForPage(page)) return;

    if (page === "login") initLoginPage();
    if (page === "home") initFormPage();
    if (["photo-board", "design-approval", "area-notes"].includes(page)) initBoardPage(page);
    if (page === "report") initReportPage();
    if (page === "dashboard") initDashboardPage();
    if (page === "records") initRecordsPage();
    if (page === "admin") initAdminPage();
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

  function renderUserPill() {
    const topbar = document.querySelector(".topbar-inner");
    if (!topbar || topbar.querySelector(".user-pill")) return;
    const user = getCurrentUser();
    const href = user ? "login.html" : "login.html";
    const label = user ? `${user.fullName || user.email || "User"}` : "Login";
    const role = user ? (user.role || "User") : "Required";
    const link = document.createElement("a");
    link.className = "user-pill no-print";
    link.href = href;
    link.innerHTML = `<span class="user-avatar">${escapeHtml(getInitials(label))}</span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(role)}</small></span>`;
    topbar.appendChild(link);
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
    setValue("projectArchitect", localStorage.getItem(PROJECT_ARCHITECT_KEY) || CFG.PROJECT_ARCHITECT || "");
    setValue("projectInCharge", localStorage.getItem(PROJECT_IN_CHARGE_KEY) || CFG.PROJECT_IN_CHARGE || "");
    const user = getCurrentUser();
    setValue("siteZone", localStorage.getItem(SITE_ZONE_KEY) || user?.assignedSite || CFG.DEFAULT_SITE_ZONE || CFG.PROJECT_LOCATION || "Brgy. Tawiran, Calapan City");
    setValue("createdBy", user?.fullName || localStorage.getItem(CREATED_BY_KEY) || "");
    setValue("projectInCharge", localStorage.getItem(PROJECT_IN_CHARGE_KEY) || user?.fullName || CFG.PROJECT_IN_CHARGE || "");
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
      if (record["Project Architect"]) localStorage.setItem(PROJECT_ARCHITECT_KEY, record["Project Architect"]);
      if (record["Project In-Charge"]) localStorage.setItem(PROJECT_IN_CHARGE_KEY, record["Project In-Charge"]);
      if (record["Site / Zone"]) localStorage.setItem(SITE_ZONE_KEY, record["Site / Zone"]);

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
        "Photo Folder Path": result.folderPath || record["Photo Folder Path"] || "",
        "Google Drive Folder ID": result.folderId || record["Google Drive Folder ID"] || "",
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
    record["Photo Folder Path"] = record["Photo Folder Path"] || "";
    record["Google Drive Folder ID"] = record["Google Drive Folder ID"] || "";
    const user = getCurrentUser();
    if (user) {
      record["Created By"] = record["Created By"] || user.fullName || "";
      record["Created By Email"] = user.email || "";
      record["User ID"] = user.userId || "";
      record["User Role"] = user.role || "";
      record["Project In-Charge"] = record["Project In-Charge"] || user.fullName || "";
      record["Site / Zone"] = record["Site / Zone"] || user.assignedSite || "";
    }
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
    const bodyPayload = { ...payload };
    const token = getSessionToken();
    if (token && bodyPayload.action !== "login") bodyPayload.sessionToken = token;

    const response = await fetch(CFG.APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyPayload)
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
        <div class="field"><label>Search</label><input id="filterSearch" placeholder="Issue, area, note, ID, user..."></div>
        <div class="field"><label>Status</label><select id="filterStatus"><option value="">All statuses</option>${optionsHtml(LOOKUPS.statuses)}</select></div>
        <div class="field"><label>Floor</label><select id="filterFloor"><option value="">All floors</option>${optionsHtml(LOOKUPS.floorLevels)}</select></div>
        <div class="field"><label>Area</label><select id="filterArea"><option value="">All areas</option>${optionsHtml(LOOKUPS.areas)}</select></div>
        <div class="field"><label>Trade</label><select id="filterTrade"><option value="">All trades</option>${optionsHtml(LOOKUPS.trades)}</select></div>
        <div class="field"><label>Category</label><select id="filterCategory"><option value="">All categories</option>${optionsHtml(LOOKUPS.categories)}</select></div>
        <div class="field"><label>In-Charge / Created By</label><input id="filterUser" placeholder="Name or email"></div>
      </div>
    `;
  }

  function optionsHtml(values) {
    return values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  }

  async function loadRecords(sheetName = "Issue Records") {
    let remoteRecords = [];
    if (isApiConfigured() && navigator.onLine) {
      try {
        remoteRecords = await getRecordsFromApi(sheetName);
        updateSyncPill("Synced");
      } catch (error) {
        console.warn(error);
        updateSyncPill("Local backup");
      }
    }

    if (sheetName !== "Issue Records") return sortRecordsDesc(remoteRecords);
    const localRecords = getLocalRecords();
    const merged = mergeRecords(remoteRecords, localRecords);
    return sortRecordsDesc(merged);
  }

  async function getRecordsFromApi(sheetName = "Issue Records") {
    const baseUrl = CFG.APPS_SCRIPT_URL;
    const token = getSessionToken();
    const params = new URLSearchParams({ action: "listRecords", sheet: sheetName, t: Date.now().toString() });
    if (token) params.set("sessionToken", token);
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${params.toString()}`;

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
      const imageUrl = getDisplayPhotoUrl(record);
      const photoLinkUrl = getPhotoLinkUrl(record);
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
        ? `<a class="report-photo" href="${escapeAttr(photoLinkUrl || imageUrl)}" target="_blank" rel="noopener"><img src="${escapeAttr(imageUrl)}" alt="Site photo" loading="lazy" referrerpolicy="no-referrer"></a>`
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
            <span>Site: <strong>${escapeHtml(field(record, "Site / Zone") || CFG.PROJECT_LOCATION || "Brgy. Tawiran")}</strong></span>
            <span>Priority: <strong>${escapeHtml(priority)}</strong></span>
            <span>Severity: <strong>${escapeHtml(severity)}</strong></span>
            <span>Drawing: <strong>${escapeHtml(field(record, "Drawing Reference") || "N/A")}</strong></span>
            <span>Responsible: <strong>${escapeHtml(field(record, "Responsible Person") || "Unassigned")}</strong></span>
            <span>Folder: <strong>${escapeHtml(field(record, "Photo Folder Path") || "Auto-foldered in Drive")}</strong></span>
          </div>
          <div class="report-note-block">
            <div class="report-note-label">${escapeHtml(footerLabel)}</div>
            <p>${escapeHtml(note)}</p>
            ${field(record, "Remarks") ? `<p class="report-remarks"><strong>Remarks:</strong> ${escapeHtml(field(record, "Remarks"))}</p>` : ""}
          </div>
          <div class="report-signoff">
            <span>Architect: <strong>${escapeHtml(field(record, "Project Architect") || "—")}</strong></span>
            <span>In-Charge: <strong>${escapeHtml(field(record, "Project In-Charge") || field(record, "Created By") || "—")}</strong></span>
            <span>Verified by: <strong>${escapeHtml(field(record, "Verified By") || "—")}</strong></span>
          </div>
        </article>
      `;
    }).join("");
  }


  function requiresLogin() {
    return CFG.REQUIRE_LOGIN !== false;
  }

  function getCurrentUser() {
    try {
      const session = JSON.parse(localStorage.getItem(USER_SESSION_KEY) || "null");
      return session && session.user ? session.user : null;
    } catch {
      return null;
    }
  }

  function getCurrentSession() {
    try {
      return JSON.parse(localStorage.getItem(USER_SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function getSessionToken() {
    return getCurrentSession()?.sessionToken || "";
  }

  function ensureLoginForPage(page) {
    if (!requiresLogin() || page === "login") return true;
    if (!isApiConfigured()) return true;
    if (getCurrentUser()) return true;
    const next = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
    location.href = `login.html?next=${next}`;
    return false;
  }

  function getInitials(value) {
    const parts = String(value || "GT").trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "G").toUpperCase() + (parts[1]?.[0] || "T").toUpperCase();
  }

  function initLoginPage() {
    const session = getCurrentSession();
    const form = document.getElementById("loginForm");
    const notice = document.getElementById("loginNotice");
    const currentBox = document.getElementById("currentUserBox");
    const logoutBtn = document.getElementById("logoutBtn");

    if (currentBox) {
      const user = session?.user;
      currentBox.innerHTML = user ? `
        <div class="current-user-card">
          <div class="user-avatar big">${escapeHtml(getInitials(user.fullName || user.email))}</div>
          <div>
            <h3>${escapeHtml(user.fullName || user.email)}</h3>
            <p>${escapeHtml(user.role || "User")} · ${escapeHtml(user.email || "")}</p>
            <p>Site: <strong>${escapeHtml(user.assignedSite || "All")}</strong> · Area: <strong>${escapeHtml(user.assignedArea || "All")}</strong></p>
          </div>
        </div>` : `<div class="empty-state">No active user session. Login using the Users tab credentials from Google Sheet.</div>`;
    }

    if (logoutBtn) logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(USER_SESSION_KEY);
      showLoginNotice("Logged out. You can login again below.", "warn");
      setTimeout(() => location.reload(), 400);
    });

    if (form) form.addEventListener("submit", async event => {
      event.preventDefault();
      const btn = document.getElementById("loginBtn");
      if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
      try {
        if (!isApiConfigured()) throw new Error("Apps Script URL is not configured yet.");
        const email = document.getElementById("loginEmail")?.value.trim();
        const pin = document.getElementById("loginPin")?.value.trim();
        const result = await postToAppsScript({ action: "login", email, pin });
        if (!result || result.ok === false) throw new Error(result?.message || "Login failed.");
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify({ sessionToken: result.sessionToken, user: result.user, loginAt: new Date().toISOString() }));
        showLoginNotice(`Welcome, ${result.user.fullName || result.user.email}.`, "ok");
        const next = new URLSearchParams(location.search).get("next") || "index.html";
        setTimeout(() => { location.href = next; }, 500);
      } catch (error) {
        showLoginNotice(error.message, "error");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Login"; }
      }
    });

    function showLoginNotice(message, type) {
      if (!notice) return;
      notice.textContent = message;
      notice.className = `notice show ${type || "ok"}`;
    }
  }

  async function initAdminPage() {
    activeRecords = await loadRecords();
    renderAdminPage(activeRecords);
    try {
      const exports = await loadRecords("Report Exports");
      renderReportExportLog(exports);
    } catch (error) {
      const el = document.getElementById("reportExportLog");
      if (el) el.innerHTML = `<div class="empty-state">Report export log not available yet.</div>`;
    }
  }

  function renderAdminPage(records) {
    const user = getCurrentUser();
    const box = document.getElementById("adminUserBox");
    if (box) {
      box.innerHTML = user ? `
        <div class="current-user-card">
          <div class="user-avatar big">${escapeHtml(getInitials(user.fullName || user.email))}</div>
          <div>
            <h3>${escapeHtml(user.fullName || user.email)}</h3>
            <p>${escapeHtml(user.role || "User")} · ${escapeHtml(user.email || "")}</p>
            <p>View all: <strong>${user.canViewAll ? "Yes" : "No"}</strong> · Export reports: <strong>${user.canExportReports ? "Yes" : "No"}</strong></p>
          </div>
        </div>` : `<div class="empty-state">No user session found.</div>`;
    }

    renderBars("adminUserBars", groupCountMulti(records, ["Created By", "Project In-Charge", "Responsible Person"]));
    renderBars("adminStatusBars", groupCount(records, "Status"));
    renderBars("adminAreaBars", groupCount(records, "Area"));
  }

  function groupCountMulti(records, keys) {
    const map = new Map();
    records.forEach(record => {
      const label = keys.map(k => field(record, k)).find(Boolean) || "Not specified";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function renderReportExportLog(records) {
    const el = document.getElementById("reportExportLog");
    if (!el) return;
    if (!records.length) {
      el.innerHTML = `<div class="empty-state">No report exports yet. Export a JPG from the Report page.</div>`;
      return;
    }
    const rows = records.slice(0, 20).map(r => `
      <tr>
        <td>${escapeHtml(field(r, "Timestamp") || field(r, "Date"))}</td>
        <td>${escapeHtml(field(r, "Report Type") || "Board")}</td>
        <td>${field(r, "File URL") ? `<a href="${escapeAttr(field(r, "File URL"))}" target="_blank" rel="noopener">${escapeHtml(field(r, "File Name") || "Open JPG")}</a>` : escapeHtml(field(r, "File Name"))}</td>
        <td>${escapeHtml(field(r, "Exported By"))}</td>
        <td>${escapeHtml(field(r, "Layout"))}</td>
      </tr>`).join("");
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>File</th><th>Exported By</th><th>Layout</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  async function initReportPage() {
    setupFilterPanel();
    activeRecords = await loadRecords();
    updateReportCount();
    const panel = document.querySelector("[data-filter-panel]");
    panel?.addEventListener("input", updateReportCount);
    panel?.addEventListener("change", updateReportCount);
    document.getElementById("generateReportBtn")?.addEventListener("click", generateReportPreview);
    document.getElementById("uploadReportBtn")?.addEventListener("click", uploadGeneratedReports);
  }

  function getReportRecords() {
    const type = document.getElementById("reportType")?.value || "photo-board";
    return applyPageFilter(type, applyFilters(activeRecords));
  }

  function updateReportCount() {
    const el = document.getElementById("reportCount");
    if (!el) return;
    const count = getReportRecords().length;
    el.textContent = `${count} record${count === 1 ? "" : "s"} ready for report export.`;
  }

  async function generateReportPreview() {
    const btn = document.getElementById("generateReportBtn");
    const uploadBtn = document.getElementById("uploadReportBtn");
    const output = document.getElementById("reportPreview");
    if (!output) return;
    const user = getCurrentUser();
    if (requiresLogin() && !user) {
      output.innerHTML = `<div class="empty-state">Login first before exporting reports.</div>`;
      return;
    }
    const records = getReportRecords();
    if (!records.length) {
      output.innerHTML = `<div class="empty-state">No records matched your report filters.</div>`;
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Generating JPG..."; }
    output.innerHTML = `<div class="empty-state">Preparing A4 board JPG pages. Loading Drive images...</div>`;
    try {
      const perPage = Number(document.getElementById("cardsPerPage")?.value || 4);
      const title = document.getElementById("reportTitle")?.value || "GOCO TAWIRAN SITE INSPECTION REPORT";
      const pages = await createReportCanvases(records, { perPage, title });
      window.gocoGeneratedReports = pages;
      output.innerHTML = pages.map((page, index) => {
        const url = page.canvas.toDataURL("image/jpeg", 0.92);
        page.dataUrl = url;
        return `
          <article class="report-output-card">
            <div class="report-output-head"><strong>Page ${index + 1}</strong><span>${escapeHtml(page.fileName)}</span></div>
            <img class="report-page-img" src="${url}" alt="A4 report page ${index + 1}">
            <button class="btn secondary" type="button" data-download-report="${index}">Download JPG Page ${index + 1}</button>
          </article>`;
      }).join("");
      output.querySelectorAll("[data-download-report]").forEach(button => {
        button.addEventListener("click", () => downloadDataUrl(pages[Number(button.dataset.downloadReport)].dataUrl, pages[Number(button.dataset.downloadReport)].fileName));
      });
      if (uploadBtn) uploadBtn.disabled = false;
    } catch (error) {
      console.error(error);
      output.innerHTML = `<div class="empty-state error-text">Could not generate report: ${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Generate A4 JPG"; }
    }
  }

  async function createReportCanvases(records, opts) {
    const perPage = Number(opts.perPage || 4);
    const title = opts.title || "GOCO TAWIRAN SITE INSPECTION REPORT";
    const pages = [];
    const width = 1240;
    const height = 1754;
    const now = new Date();
    const exportedBy = getCurrentUser()?.fullName || localStorage.getItem(CREATED_BY_KEY) || "";
    const type = document.getElementById("reportType")?.value || "photo-board";
    const chunks = chunk(records, perPage);

    for (let p = 0; p < chunks.length; p++) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, width, 92);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px Arial";
      ctx.fillText(title.toUpperCase(), 42, 40);
      ctx.font = "18px Arial";
      ctx.fillText(`${PROJECT_NAME} · ${CFG.PROJECT_LOCATION || "Brgy. Tawiran, Calapan City"}`, 42, 68);
      ctx.textAlign = "right";
      ctx.fillText(`Page ${p + 1} of ${chunks.length}`, width - 42, 40);
      ctx.fillText(`Generated: ${formatPrettyDate(formatInputDate(now))} ${formatInputTime(now)}`, width - 42, 68);
      ctx.textAlign = "left";

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 92, width, 54);
      ctx.fillStyle = "#111827";
      ctx.font = "bold 17px Arial";
      ctx.fillText(`Report Type: ${typeLabel(type)}  |  Cards per A4: ${perPage}  |  Exported by: ${exportedBy || "—"}`, 42, 126);

      const margin = 34;
      const top = 164;
      const gap = 18;
      const cols = perPage === 1 ? 1 : 2;
      const rows = Math.ceil(perPage / cols);
      const cardW = (width - margin * 2 - gap * (cols - 1)) / cols;
      const cardH = (height - top - 44 - gap * (rows - 1)) / rows;

      for (let i = 0; i < chunks[p].length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cardW + gap);
        const y = top + row * (cardH + gap);
        const imageData = await getRecordImageData(chunks[p][i]);
        await drawReportCard(ctx, chunks[p][i], x, y, cardW, cardH, imageData, type);
      }

      const safeDate = formatDateId(now);
      const fileName = `GOCO_TAWIRAN_${typeLabel(type).replace(/\s+/g, "_")}_${safeDate}_PAGE_${String(p + 1).padStart(2, "0")}.jpg`;
      pages.push({ canvas, fileName, recordCount: chunks[p].length, pageNumber: p + 1, totalPages: chunks.length, layout: `${perPage} cards per A4`, reportType: typeLabel(type) });
    }
    return pages;
  }

  async function drawReportCard(ctx, record, x, y, w, h, imageData, type) {
    ctx.save();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x, y, w, 38);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(typeLabel(type).toUpperCase(), x + w / 2, y + 25);
    ctx.textAlign = "left";

    const metaY = y + 38;
    const labelW = w * 0.28;
    const valueW = w * 0.22;
    const rowH = 50;
    drawMetaCell(ctx, x, metaY, labelW, rowH, "FLOOR LEVEL", true);
    drawMetaCell(ctx, x + labelW, metaY, valueW, rowH, field(record, "Floor Level") || "—", false);
    drawMetaCell(ctx, x + labelW + valueW, metaY, labelW, rowH, "AREA", true);
    drawMetaCell(ctx, x + labelW + valueW + labelW, metaY, w - labelW * 2 - valueW, rowH, field(record, "Area") || "—", false);
    drawMetaCell(ctx, x, metaY + rowH, labelW, rowH, "TRADE / SCOPE", true);
    drawMetaCell(ctx, x + labelW, metaY + rowH, valueW, rowH, field(record, "Trade / Scope") || "—", false);
    drawMetaCell(ctx, x + labelW + valueW, metaY + rowH, labelW, rowH, "DATE", true);
    drawMetaCell(ctx, x + labelW + valueW + labelW, metaY + rowH, w - labelW * 2 - valueW, rowH, [formatPrettyDate(field(record, "Date")), field(record, "Time")].filter(Boolean).join(" · ") || "—", false);

    const imageY = metaY + rowH * 2;
    const imageH = Math.max(120, h * 0.43);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x, imageY, w, imageH);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, imageY, w, imageH);
    if (imageData) {
      try {
        const img = await loadImage(imageData);
        drawCoverImage(ctx, img, x + 2, imageY + 2, w - 4, imageH - 4);
      } catch {
        drawPlaceholder(ctx, x, imageY, w, imageH, "PHOTO NOT AVAILABLE");
      }
    } else {
      drawPlaceholder(ctx, x, imageY, w, imageH, "INSERT PHOTO HERE");
    }

    const statY = imageY + imageH;
    const statH = 48;
    drawStatusCell(ctx, x, statY, w * 0.33, statH, field(record, "Progress %") || "0%", "#fee2e2", "#b91c1c");
    drawStatusCell(ctx, x + w * 0.33, statY, w * 0.34, statH, field(record, "Status") || "OPEN", "#fef3c7", "#92400e");
    drawStatusCell(ctx, x + w * 0.67, statY, w * 0.33, statH, [field(record, "Issue ID"), field(record, "Photo ID")].filter(Boolean).join(" / ") || field(record, "Record ID"), "#e5e7eb", "#111827");

    const infoY = statY + statH + 18;
    ctx.fillStyle = "#374151";
    ctx.font = "14px Arial";
    wrapCanvasText(ctx, `Priority: ${field(record, "Priority") || "Medium"}    Severity: ${field(record, "Severity") || "Medium"}    Drawing: ${field(record, "Drawing Reference") || "N/A"}`, x + 14, infoY, w - 28, 18, 2);
    wrapCanvasText(ctx, `In-Charge: ${field(record, "Project In-Charge") || field(record, "Responsible Person") || field(record, "Created By") || "—"}`, x + 14, infoY + 36, w - 28, 18, 2);

    const noteY = infoY + 74;
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 14px Arial";
    ctx.fillText(type === "design-approval" ? "APPROVAL / DECISION NOTE" : type === "area-notes" ? "AREA INSPECTION NOTE" : "CONCERN / ISSUE / NOTE", x + 14, noteY);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 14, noteY + 8); ctx.lineTo(x + w - 14, noteY + 8); ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "15px Arial";
    wrapCanvasText(ctx, field(record, "Issue / Concern / Note") || "No note entered.", x + 14, noteY + 32, w - 28, 20, 5);

    ctx.fillStyle = "#374151";
    ctx.font = "12px Arial";
    ctx.fillText(`Architect: ${field(record, "Project Architect") || "—"}`, x + 14, y + h - 42);
    ctx.fillText(`Created by: ${field(record, "Created By") || "—"}`, x + 14, y + h - 24);
    ctx.restore();
  }

  function drawMetaCell(ctx, x, y, w, h, text, isLabel) {
    ctx.fillStyle = isLabel ? "#374151" : "#ffffff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = isLabel ? "#ffffff" : "#111827";
    ctx.font = isLabel ? "bold 14px Arial" : "bold 14px Arial";
    ctx.textAlign = "center";
    wrapCanvasText(ctx, String(text || "—"), x + 6, y + 18, w - 12, 16, 2, true);
    ctx.textAlign = "left";
  }

  function drawStatusCell(ctx, x, y, w, h, text, bg, fg) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#d1d5db";
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    wrapCanvasText(ctx, String(text || "—").toUpperCase(), x + 8, y + 19, w - 16, 17, 2, true);
    ctx.textAlign = "left";
  }

  function drawPlaceholder(ctx, x, y, w, h, text) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = "left";
  }

  function drawCoverImage(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines, centered) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let lineNo = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line ? line + " " + words[n] : words[n];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(lineNo === maxLines - 1 && n < words.length ? line + "…" : line, centered ? x + maxWidth / 2 : x, y + lineNo * lineHeight);
        line = words[n];
        lineNo++;
        if (lineNo >= maxLines) return;
      } else {
        line = testLine;
      }
    }
    if (lineNo < maxLines) ctx.fillText(line, centered ? x + maxWidth / 2 : x, y + lineNo * lineHeight);
  }

  function chunk(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
  }

  function typeLabel(type) {
    if (type === "design-approval") return "Design Approval Board";
    if (type === "area-notes") return "Area Notes Board";
    return "Photo Issue Board";
  }

  async function getRecordImageData(record) {
    const fileId = field(record, "Google Drive File ID") || extractDriveFileId(field(record, "Photo URL"));
    if (!fileId) return "";
    const cacheKey = `img_${fileId}`;
    try {
      const cache = JSON.parse(sessionStorage.getItem(IMAGE_CACHE_KEY) || "{}");
      if (cache[cacheKey]) return cache[cacheKey];
    } catch {}
    if (isApiConfigured()) {
      try {
        const result = await postToAppsScript({ action: "getImageData", fileId });
        if (result && result.ok && result.dataUrl) {
          try {
            const cache = JSON.parse(sessionStorage.getItem(IMAGE_CACHE_KEY) || "{}");
            cache[cacheKey] = result.dataUrl;
            sessionStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
          } catch {}
          return result.dataUrl;
        }
      } catch (error) {
        console.warn("Image proxy failed", error);
      }
    }
    return getDisplayPhotoUrl(record);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) return reject(new Error("No image source"));
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
      img.src = src;
    });
  }

  function downloadDataUrl(dataUrl, fileName) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function uploadGeneratedReports() {
    const pages = window.gocoGeneratedReports || [];
    const btn = document.getElementById("uploadReportBtn");
    const status = document.getElementById("reportUploadStatus");
    const user = getCurrentUser();
    if (!pages.length) {
      if (status) status.innerHTML = `<div class="notice show warn">Generate the JPG report first.</div>`;
      return;
    }
    if (user && user.canExportReports === false) {
      if (status) status.innerHTML = `<div class="notice show error">Your account is not allowed to export reports.</div>`;
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Uploading to Drive..."; }
    const links = [];
    try {
      for (const page of pages) {
        const dataUrl = page.dataUrl || page.canvas.toDataURL("image/jpeg", 0.92);
        const result = await postToAppsScript({
          action: "uploadReport",
          report: {
            reportType: page.reportType,
            layout: page.layout,
            fileName: page.fileName,
            mimeType: "image/jpeg",
            data: dataUrl.split(",")[1],
            recordCount: page.recordCount,
            pageNumber: page.pageNumber,
            totalPages: page.totalPages,
            filters: collectFilterSummary()
          }
        });
        if (!result || result.ok === false) throw new Error(result?.message || "Report upload failed.");
        links.push(`<a href="${escapeAttr(result.fileUrl)}" target="_blank" rel="noopener">${escapeHtml(result.fileName)}</a>`);
      }
      if (status) status.innerHTML = `<div class="notice show ok">Uploaded to Google Drive: ${links.join(" · ")}</div>`;
    } catch (error) {
      if (status) status.innerHTML = `<div class="notice show error">Upload failed: ${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Upload JPG to Google Drive"; }
    }
  }

  function collectFilterSummary() {
    const ids = ["filterSearch", "filterStatus", "filterFloor", "filterArea", "filterTrade", "filterCategory", "filterUser", "cardsPerPage", "reportType"];
    return ids.map(id => `${id}:${document.getElementById(id)?.value || ""}`).join(" | ");
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
    const userFilter = (document.getElementById("filterUser")?.value || "").toLowerCase().trim();

    return records.filter(record => {
      const matchesSearch = !search || DISPLAY_COLUMNS.some(col => String(field(record, col) || "").toLowerCase().includes(search));
      const userHaystack = [field(record, "Created By"), field(record, "Created By Email"), field(record, "Project In-Charge"), field(record, "Responsible Person"), field(record, "User Role")].join(" ").toLowerCase();
      return matchesSearch
        && (!status || field(record, "Status") === status)
        && (!floor || field(record, "Floor Level") === floor)
        && (!area || field(record, "Area") === area)
        && (!trade || field(record, "Trade / Scope") === trade)
        && (!category || field(record, "Category") === category)
        && (!userFilter || userHaystack.includes(userFilter));
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


  function getDisplayPhotoUrl(record) {
    const photoUrl = field(record, "Photo URL");
    const fileId = field(record, "Google Drive File ID") || extractDriveFileId(photoUrl);
    if (fileId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`;
    return photoUrl || "";
  }

  function getPhotoLinkUrl(record) {
    const photoUrl = field(record, "Photo URL");
    const fileId = field(record, "Google Drive File ID") || extractDriveFileId(photoUrl);
    if (fileId) return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view?usp=sharing`;
    return photoUrl || "";
  }

  function extractDriveFileId(value) {
    const text = String(value || "");
    if (!text) return "";
    let match = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = text.match(/uc\?export=(?:view|download)&id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return "";
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
    if (col === "Photo URL" && (value || field(record, "Google Drive File ID"))) return `<a href="${escapeAttr(getPhotoLinkUrl(record))}" target="_blank" rel="noopener">Open Photo</a>`;
    if (col === "Google Drive Folder ID" && value) return `<a href="https://drive.google.com/drive/folders/${escapeAttr(value)}" target="_blank" rel="noopener">Open Folder</a>`;
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
