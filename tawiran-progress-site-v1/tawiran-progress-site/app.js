const STORAGE_KEY = "tawiranProgressDashboard.v1";

const statusRules = [
  { value: "Not Started", defaultProgress: 0, cap: 0, chip: "bad" },
  { value: "Started / Layout / Preparation", defaultProgress: 20, cap: 25, chip: "info" },
  { value: "Ongoing", defaultProgress: 50, cap: 60, chip: "info" },
  { value: "Mostly Complete", defaultProgress: 75, cap: 80, chip: "warn" },
  { value: "Physically Complete", defaultProgress: 90, cap: 90, chip: "purple" },
  { value: "For Testing", defaultProgress: 90, cap: 90, chip: "purple" },
  { value: "For Punchlist / Minor Defects", defaultProgress: 95, cap: 95, chip: "warn" },
  { value: "Accepted / Turnover Ready", defaultProgress: 100, cap: 100, chip: "good" }
];

const defaultSettings = {
  projectName: "Proposed Two Storey Residential Building",
  location: "Brgy. Tawiran, Calapan City",
  preparedBy: "",
  stage: "Civil finishing / plastering phase + roofing completion",
  areas: [
    "Overall Site",
    "Ground Floor - Commercial Space",
    "Ground Floor - T&B",
    "Ground Floor - Service Area",
    "Second Floor - Common Area",
    "Second Floor - Master Bedroom",
    "Second Floor - T&B",
    "Balcony",
    "Roof Area",
    "Exterior - Front",
    "Exterior - Rear",
    "Exterior - Left Side",
    "Exterior - Right Side",
    "Stairs",
    "Septic / Catch Basin Area"
  ],
  categories: [
    {
      id: "general",
      name: "General Requirements",
      budget: 500000,
      scopes: ["Mobilization", "Temporary Facilities", "Safety / PPE", "Board-up / Site Enclosure", "Scaffolding / Platforms", "Tools / Equipment"]
    },
    {
      id: "site",
      name: "Site Works",
      budget: 366012.50,
      scopes: ["Clearing", "Layouting", "Backfilling", "Compaction", "Soil Poisoning", "Exterior grading"]
    },
    {
      id: "civil",
      name: "Civil / Structural excluding Roof",
      budget: 4687739.12,
      scopes: ["Excavation", "Foundation", "Backfilling / Compaction", "Columns", "Tie Beams", "Second Floor Beams", "Roof Beams", "Ground Floor Slab", "Second Floor Slab", "CHB Laying", "Plastering", "Stiffener Columns", "Bond Beams", "Lintel Beams", "Septic Tank", "Catch Basins", "Concrete Repair / Civil Punchlist"]
    },
    {
      id: "roof",
      name: "Roofing / Metal Works",
      budget: 1343971,
      scopes: ["Roof Framing", "Purlins", "Welding / Alignment", "Anti-rust / Primer", "Roof Sheets", "Roof Insulation", "Ridge Roll", "Flashing", "Gutter", "Downspout", "Fascia", "Sealants / Screws / Rivets", "Leak Test", "Roof Punchlist"]
    },
    {
      id: "architectural",
      name: "Architectural Finishing",
      budget: 1009470.54,
      scopes: ["Tiling", "Tile Grouting", "Hollow Tile Check", "Waterproofing", "Flood Test", "Doors", "Door Jambs", "Hinges / Locksets", "Windows", "Railings", "Wall Cladding", "Architectural Punchlist"]
    },
    {
      id: "plumbing",
      name: "Plumbing Works",
      budget: 1005965.25,
      scopes: ["Waterline Rough-in", "Sanitary Rough-in", "Drainage Line", "Downspout Connection", "Floor Drains", "Water Closet", "Lavatory", "Bidet", "Shower System", "Kitchen Sink / Faucet", "Booster Pump", "Pressure Tank", "Valves", "Pressure Test", "Leak Test", "Drainage Flow Test", "Final Plumbing Inspection"]
    },
    {
      id: "painting",
      name: "Painting Works",
      budget: 513460,
      scopes: ["Surface Preparation", "Crack Repair", "Putty / Skimming", "Primer / Sealer", "First Coat", "Final Coat", "Exterior Painting", "Interior Painting", "Steel Painting", "Door Painting", "Door Jamb Painting", "Touch-up", "Final Paint Acceptance"]
    },
    {
      id: "electrical",
      name: "Electrical Works",
      budget: 423650,
      scopes: ["Conduit Rough-in", "Utility Boxes", "Junction Boxes", "Wire Pulling", "Panel Board", "Breakers", "Switches", "Outlets", "Lighting Fixtures", "AC Outlet Provision", "Exhaust Fan Provision", "Grounding", "Circuit Labeling", "Continuity Test", "Polarity Test", "Final Electrical Testing"]
    }
  ]
};

let state = loadState();
let pendingPhotos = [];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { settings: structuredClone(defaultSettings), records: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      settings: { ...structuredClone(defaultSettings), ...(parsed.settings || {}) },
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (error) {
    console.warn("Failed to parse local state", error);
    return { settings: structuredClone(defaultSettings), records: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value || 0);
}

function percent(value, decimals = 1) {
  return `${Number(value || 0).toFixed(decimals)}%`;
}

function cleanId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getCategory(id) {
  return state.settings.categories.find(cat => cat.id === id);
}

function getStatusRule(value) {
  return statusRules.find(rule => rule.value === value) || statusRules[0];
}

function totalBudget() {
  return state.settings.categories.reduce((sum, cat) => sum + Number(cat.budget || 0), 0);
}

function latestRecords() {
  const map = new Map();
  [...state.records]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(record => {
      const key = `${record.area}|||${record.categoryId}|||${record.scope}`;
      map.set(key, record);
    });
  return [...map.values()];
}

function categoryProgress(categoryId) {
  const records = latestRecords().filter(record => record.categoryId === categoryId);
  if (!records.length) return 0;
  const weighted = records.reduce((sum, record) => sum + Number(record.progress || 0) * Number(record.scopeWeight || 1), 0);
  const weights = records.reduce((sum, record) => sum + Number(record.scopeWeight || 1), 0);
  return weights ? weighted / weights : 0;
}

function overallProgress() {
  const budget = totalBudget();
  if (!budget) return 0;
  return state.settings.categories.reduce((sum, cat) => {
    return sum + (Number(cat.budget || 0) / budget) * categoryProgress(cat.id);
  }, 0);
}

function earnedProjectPercent(cat) {
  const budget = totalBudget();
  if (!budget) return 0;
  return (Number(cat.budget || 0) / budget) * categoryProgress(cat.id);
}

function isPunchOpen(record) {
  const badWork = ["Needs Repair", "Rejected"].includes(record.workmanship);
  const hasIssue = Boolean((record.remarks || "").trim());
  const punchStatus = record.punchStatus || "None";
  return (badWork || hasIssue || punchStatus !== "None") && punchStatus !== "Closed";
}

function isTurnoverReady(record) {
  return record.status === "Accepted / Turnover Ready" && Number(record.progress) >= 100;
}

function getChecklistFromForm() {
  return {
    quantity: document.getElementById("checkQuantity").checked,
    specs: document.getElementById("checkSpecs").checked,
    workmanship: document.getElementById("checkWorkmanship").checked,
    testing: document.getElementById("checkTesting").checked,
    punchClosed: document.getElementById("checkPunchClosed").checked,
    accepted: document.getElementById("checkAccepted").checked
  };
}

function checklistComplete(checklist, hasPhoto) {
  return Boolean(checklist.quantity && checklist.specs && checklist.workmanship && checklist.testing && checklist.punchClosed && checklist.accepted && hasPhoto);
}

function computeProgressCap({ status, categoryId, scope, checklist, hasPhoto }) {
  const statusRule = getStatusRule(status);
  let cap = statusRule.cap;
  const scopeText = String(scope || "").toLowerCase();

  if (categoryId === "plumbing" && scopeText.includes("rough-in")) cap = Math.min(cap, 70);
  if (categoryId === "electrical" && /rough|conduit|box|wire pulling/.test(scopeText)) cap = Math.min(cap, 70);
  if (categoryId === "roof" && /roof sheets|gutter|flashing|ridge|downspout/.test(scopeText) && !checklist.testing) cap = Math.min(cap, 90);
  if (scopeText.includes("waterproofing") && !checklist.testing) cap = Math.min(cap, 90);

  if (status === "Accepted / Turnover Ready" && !checklistComplete(checklist, hasPhoto)) cap = Math.min(cap, 95);
  return cap;
}

function enforceProgress() {
  const status = document.getElementById("status").value;
  const categoryId = document.getElementById("category").value;
  const scope = document.getElementById("scope").value;
  const checklist = getChecklistFromForm();
  const progressInput = document.getElementById("progressInput");
  const warning = document.getElementById("progressWarning");
  const hasPhoto = pendingPhotos.length > 0;
  const cap = computeProgressCap({ status, categoryId, scope, checklist, hasPhoto });
  let current = Number(progressInput.value);
  const messages = [];

  if (current > cap) {
    current = cap;
    progressInput.value = cap;
    messages.push(`Progress capped at ${cap}% based on current status/checklist.`);
  }

  if (status === "Accepted / Turnover Ready" && !checklistComplete(checklist, hasPhoto)) {
    messages.push("100% is allowed only if checklist is complete and at least one photo is attached.");
  }

  if (categoryId === "roof" && Number(progressInput.value) >= 90 && !checklist.testing) {
    messages.push("Roofing should not be 100% until leak test / rain test is passed.");
  }
  if (categoryId === "plumbing" && Number(progressInput.value) >= 90 && !checklist.testing) {
    messages.push("Plumbing should not be 100% until pressure/leak/drainage test is passed.");
  }
  if (categoryId === "electrical" && Number(progressInput.value) >= 90 && !checklist.testing) {
    messages.push("Electrical should not be 100% until continuity/polarity/grounding test is passed.");
  }

  document.getElementById("progressValue").textContent = percent(progressInput.value, 0);
  if (messages.length) {
    warning.classList.remove("hidden");
    warning.textContent = messages.join(" ");
  } else {
    warning.classList.add("hidden");
    warning.textContent = "";
  }
}

function setDefaultDate() {
  const input = document.getElementById("inspectionDate");
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.value = now.toISOString().slice(0, 16);
}

function fillSelect(select, options, selected = "") {
  select.innerHTML = "";
  options.forEach(option => {
    const opt = document.createElement("option");
    if (typeof option === "object") {
      opt.value = option.value;
      opt.textContent = option.label;
    } else {
      opt.value = option;
      opt.textContent = option;
    }
    if (opt.value === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function populateFormOptions() {
  fillSelect(document.getElementById("area"), state.settings.areas);
  fillSelect(document.getElementById("category"), state.settings.categories.map(cat => ({ value: cat.id, label: cat.name })));
  fillSelect(document.getElementById("status"), statusRules.map(rule => rule.value));
  updateScopeOptions();

  fillSelect(document.getElementById("recordCategoryFilter"), [{ value: "", label: "All categories" }, ...state.settings.categories.map(cat => ({ value: cat.id, label: cat.name }))]);
  fillSelect(document.getElementById("recordStatusFilter"), [{ value: "", label: "All statuses" }, ...statusRules.map(rule => rule.value)]);
}

function updateScopeOptions() {
  const categoryId = document.getElementById("category").value;
  const cat = getCategory(categoryId) || state.settings.categories[0];
  fillSelect(document.getElementById("scope"), cat.scopes || []);
  enforceProgress();
}

function updateProgressDefault() {
  const status = document.getElementById("status").value;
  document.getElementById("progressInput").value = getStatusRule(status).defaultProgress;
  enforceProgress();
}

async function compressImage(file, maxSize = 1280, quality = 0.72) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function renderPhotoPreview() {
  const wrap = document.getElementById("photoPreview");
  wrap.innerHTML = "";
  pendingPhotos.forEach((src, index) => {
    const item = document.createElement("div");
    item.className = "photo-thumb";
    item.innerHTML = `<img src="${src}" alt="Inspection photo ${index + 1}"><button type="button" aria-label="Remove photo">×</button>`;
    item.querySelector("button").addEventListener("click", () => {
      pendingPhotos.splice(index, 1);
      renderPhotoPreview();
      enforceProgress();
    });
    wrap.appendChild(item);
  });
}

async function handlePhotoInput(event) {
  const files = [...event.target.files];
  if (!files.length) return;
  for (const file of files) {
    try {
      const compressed = await compressImage(file);
      pendingPhotos.push(compressed);
    } catch (error) {
      alert(`Could not process ${file.name}.`);
    }
  }
  event.target.value = "";
  renderPhotoPreview();
  enforceProgress();
}

function readFormRecord() {
  const categoryId = document.getElementById("category").value;
  const cat = getCategory(categoryId);
  const checklist = getChecklistFromForm();
  const progress = Number(document.getElementById("progressInput").value);

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    date: document.getElementById("inspectionDate").value,
    inspector: document.getElementById("inspector").value.trim(),
    area: document.getElementById("area").value,
    categoryId,
    categoryName: cat ? cat.name : categoryId,
    scope: document.getElementById("scope").value,
    status: document.getElementById("status").value,
    plannedQty: Number(document.getElementById("plannedQty").value || 0),
    actualQty: Number(document.getElementById("actualQty").value || 0),
    unit: document.getElementById("unit").value.trim(),
    scopeWeight: Number(document.getElementById("scopeWeight").value || 1),
    progress,
    checklist,
    workmanship: document.getElementById("workmanship").value,
    responsible: document.getElementById("responsible").value.trim(),
    targetDate: document.getElementById("targetDate").value,
    punchStatus: document.getElementById("punchStatus").value,
    remarks: document.getElementById("remarks").value.trim(),
    photos: [...pendingPhotos],
    createdAt: new Date().toISOString()
  };
}

function resetForm() {
  document.getElementById("inspectionForm").reset();
  pendingPhotos = [];
  renderPhotoPreview();
  setDefaultDate();
  populateFormOptions();
  document.getElementById("scopeWeight").value = 1;
  updateProgressDefault();
}

function saveInspection(event) {
  event.preventDefault();
  enforceProgress();
  const record = readFormRecord();
  state.records.push(record);
  saveState();
  resetForm();
  renderAll();
  switchTab("dashboard");
}

function renderDashboard() {
  const overall = overallProgress();
  document.getElementById("overallProgressText").textContent = percent(overall);
  document.getElementById("overallProgressBar").style.width = `${Math.min(100, overall)}%`;
  document.getElementById("inspectionCount").textContent = state.records.length;
  document.getElementById("turnoverCount").textContent = latestRecords().filter(isTurnoverReady).length;
  document.getElementById("openPunchCount").textContent = state.records.filter(isPunchOpen).length;
  document.getElementById("siteStageBanner").innerHTML = `<strong>Current site stage:</strong> ${escapeHtml(state.settings.stage || "—")}.`;

  renderCategoryRows();
  renderProgressChart();
  renderLatestRecords();
}

function renderCategoryRows() {
  const tbody = document.getElementById("categoryProgressRows");
  const budget = totalBudget();
  tbody.innerHTML = "";

  state.settings.categories.forEach(cat => {
    const progress = categoryProgress(cat.id);
    const weight = budget ? Number(cat.budget || 0) / budget * 100 : 0;
    const earned = earnedProjectPercent(cat);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(cat.name)}</strong><br><small>${peso(cat.budget)}</small></td>
      <td>${percent(weight)}</td>
      <td><strong>${percent(progress)}</strong><div class="mini-progress"><div style="width:${Math.min(100, progress)}%"></div></div></td>
      <td>${percent(earned)}</td>
      <td>${categoryStatusLabel(progress)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function categoryStatusLabel(progress) {
  if (progress >= 100) return `<span class="status-chip good">Turnover-ready</span>`;
  if (progress >= 90) return `<span class="status-chip purple">Physically complete</span>`;
  if (progress >= 70) return `<span class="status-chip warn">Majority complete</span>`;
  if (progress > 0) return `<span class="status-chip info">Ongoing</span>`;
  return `<span class="status-chip bad">Not started</span>`;
}

function renderProgressChart() {
  const canvas = document.getElementById("progressCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const rows = state.settings.categories.map(cat => ({ name: cat.name, progress: categoryProgress(cat.id), weight: totalBudget() ? cat.budget / totalBudget() * 100 : 0 }));
  const margin = { top: 36, right: 40, bottom: 30, left: 210 };
  const barH = 34;
  const gap = 18;

  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Category progress", 24, 26);

  rows.forEach((row, i) => {
    const y = margin.top + i * (barH + gap);
    const x = margin.left;
    const maxW = w - margin.left - margin.right;
    const barW = maxW * Math.min(100, row.progress) / 100;

    ctx.fillStyle = "#374151";
    ctx.font = "bold 17px -apple-system, Segoe UI, sans-serif";
    wrapCanvasText(ctx, row.name, 24, y + 22, 170, 18);

    ctx.fillStyle = "#e5e7eb";
    roundRect(ctx, x, y, maxW, barH, 14, true);

    const grad = ctx.createLinearGradient(x, y, x + maxW, y);
    grad.addColorStop(0, "#1f6feb");
    grad.addColorStop(1, "#22c55e");
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 14, true);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px -apple-system, Segoe UI, sans-serif";
    ctx.fillText(`${row.progress.toFixed(1)}%`, x + maxW - 62, y + 23);

    ctx.fillStyle = "#6b7280";
    ctx.font = "12px -apple-system, Segoe UI, sans-serif";
    ctx.fillText(`Budget wt: ${row.weight.toFixed(1)}%`, x, y + 50);
  });
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  if (width < 0) width = 0;
  if (width < radius * 2) radius = Math.max(0, width / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function createRecordCard(record, { showActions = true } = {}) {
  const template = document.getElementById("recordTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  const cat = getCategory(record.categoryId) || { name: record.categoryName || record.categoryId };
  node.querySelector(".record-title").textContent = `${record.area} — ${record.scope}`;
  node.querySelector(".record-meta").textContent = `${formatDate(record.date)} • ${cat.name} • ${record.inspector || "No inspector"} • ${record.actualQty || 0}/${record.plannedQty || 0} ${record.unit || ""}`;
  const chip = node.querySelector(".status-chip");
  chip.textContent = `${record.status} • ${record.progress}%`;
  chip.classList.add(getStatusRule(record.status).chip);
  node.querySelector(".mini-progress div").style.width = `${Math.min(100, record.progress)}%`;
  node.querySelector(".record-remarks").textContent = record.remarks || "No remarks.";

  const photos = node.querySelector(".record-photos");
  (record.photos || []).slice(0, 8).forEach((photo, index) => {
    const img = document.createElement("img");
    img.src = photo;
    img.alt = `Photo ${index + 1}`;
    photos.appendChild(img);
  });
  if (!(record.photos || []).length) photos.innerHTML = `<span class="pill">No photo</span>`;

  const actions = node.querySelector(".record-actions");
  if (showActions) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-light";
    closeBtn.textContent = "Mark Punchlist Closed";
    closeBtn.addEventListener("click", () => updatePunchStatus(record.id, "Closed"));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteRecord(record.id));

    actions.appendChild(closeBtn);
    actions.appendChild(deleteBtn);
  } else {
    actions.remove();
  }
  return node;
}

function renderLatestRecords() {
  const wrap = document.getElementById("latestRecords");
  const items = [...state.records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  renderRecordList(wrap, items, { empty: "No records yet. Add your first inspection.", showActions: false });
}

function renderRecords() {
  const search = document.getElementById("recordSearch").value.toLowerCase();
  const categoryFilter = document.getElementById("recordCategoryFilter").value;
  const statusFilter = document.getElementById("recordStatusFilter").value;
  const records = [...state.records]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(record => {
      const text = `${record.area} ${record.scope} ${record.categoryName} ${record.remarks} ${record.status}`.toLowerCase();
      return (!search || text.includes(search)) && (!categoryFilter || record.categoryId === categoryFilter) && (!statusFilter || record.status === statusFilter);
    });
  renderRecordList(document.getElementById("recordsList"), records, { empty: "No matching records." });
}

function renderPunchlist() {
  const items = [...state.records]
    .filter(isPunchOpen)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  renderRecordList(document.getElementById("punchlistItems"), items, { empty: "No open punchlist yet." });
}

function renderRecordList(container, records, options = {}) {
  container.classList.remove("empty-state");
  container.innerHTML = "";
  if (!records.length) {
    container.classList.add("empty-state");
    container.textContent = options.empty || "No records.";
    return;
  }
  records.forEach(record => container.appendChild(createRecordCard(record, { showActions: options.showActions !== false })));
}

function updatePunchStatus(id, status) {
  const record = state.records.find(item => item.id === id);
  if (!record) return;
  record.punchStatus = status;
  if (status === "Closed" && !record.remarks.includes("[Punchlist closed]")) {
    record.remarks = `${record.remarks}\n[Punchlist closed]`.trim();
  }
  saveState();
  renderAll();
}

function deleteRecord(id) {
  if (!confirm("Delete this inspection record?")) return;
  state.records = state.records.filter(record => record.id !== id);
  saveState();
  renderAll();
}

function renderReport() {
  const reportDate = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  document.getElementById("reportDateLine").textContent = `Report Date: ${reportDate}`;
  document.getElementById("reportOverallProgress").textContent = percent(overallProgress());

  const categoriesRows = state.settings.categories.map(cat => {
    const progress = categoryProgress(cat.id);
    return `<tr>
      <td><strong>${escapeHtml(cat.name)}</strong></td>
      <td>${peso(cat.budget)}</td>
      <td>${percent(totalBudget() ? cat.budget / totalBudget() * 100 : 0)}</td>
      <td>${percent(progress)}</td>
      <td>${percent(earnedProjectPercent(cat))}</td>
      <td>${stripHtml(categoryStatusLabel(progress))}</td>
    </tr>`;
  }).join("");

  const openIssues = state.records.filter(isPunchOpen).slice(0, 10);
  const latest = [...state.records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const issueRows = openIssues.length ? openIssues.map(item => `<tr>
    <td>${escapeHtml(item.area)}</td>
    <td>${escapeHtml(item.categoryName)}</td>
    <td>${escapeHtml(item.scope)}</td>
    <td>${escapeHtml(item.remarks || item.workmanship)}</td>
    <td>${escapeHtml(item.responsible || "—")}</td>
    <td>${escapeHtml(item.targetDate || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="6">No open punchlist recorded.</td></tr>`;

  const latestRows = latest.length ? latest.map(item => `<tr>
    <td>${formatDate(item.date)}</td>
    <td>${escapeHtml(item.area)}</td>
    <td>${escapeHtml(item.categoryName)}</td>
    <td>${escapeHtml(item.scope)}</td>
    <td>${escapeHtml(item.status)}</td>
    <td>${percent(item.progress, 0)}</td>
  </tr>`).join("") : `<tr><td colspan="6">No inspections recorded yet.</td></tr>`;

  const photoBlocks = latest.filter(item => (item.photos || []).length).slice(0, 4).map(item => `
    <div class="report-photo-block">
      <h4>${escapeHtml(item.area)} — ${escapeHtml(item.scope)}</h4>
      <div class="record-photos">${item.photos.slice(0, 6).map(photo => `<img src="${photo}" alt="Report photo">`).join("")}</div>
    </div>
  `).join("");

  document.getElementById("reportBody").innerHTML = `
    <section class="report-section">
      <h3>1. Executive Summary</h3>
      <p><strong>Project:</strong> ${escapeHtml(state.settings.projectName)}</p>
      <p><strong>Location:</strong> ${escapeHtml(state.settings.location)}</p>
      <p><strong>Prepared by:</strong> ${escapeHtml(state.settings.preparedBy || "—")}</p>
      <p><strong>Current stage:</strong> ${escapeHtml(state.settings.stage)}</p>
      <p><strong>Important note:</strong> Overall progress is cost-weighted from category budgets. 100% means turnover-ready: complete quantity, acceptable workmanship, required tests passed, punchlist closed, photos attached, and accepted.</p>
    </section>

    <section class="report-section">
      <h3>2. Progress by Category</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Category</th><th>Budget</th><th>Budget Weight</th><th>Actual Progress</th><th>Earned Project %</th><th>Status</th></tr></thead>
        <tbody>${categoriesRows}</tbody>
      </table></div>
    </section>

    <section class="report-section">
      <h3>3. Latest Accomplishments / Inspections</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Area</th><th>Category</th><th>Scope</th><th>Status</th><th>Progress</th></tr></thead>
        <tbody>${latestRows}</tbody>
      </table></div>
    </section>

    <section class="report-section">
      <h3>4. Open Issues / Punchlist</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Area</th><th>Category</th><th>Scope</th><th>Issue / Action</th><th>Responsible</th><th>Target</th></tr></thead>
        <tbody>${issueRows}</tbody>
      </table></div>
    </section>

    <section class="report-section">
      <h3>5. Photo Documentation</h3>
      ${photoBlocks || "<p>No photos attached yet.</p>"}
    </section>

    <section class="report-section">
      <h3>6. Recommendation / Next Focus</h3>
      <p>Validate plastering quantities per area, complete roofing accessories, conduct roof leak test, verify plumbing/electrical rough-ins before finishing, and keep architectural finishing and painting at 0% until actual work starts.</p>
    </section>
  `;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSettings() {
  document.getElementById("settingProjectName").value = state.settings.projectName;
  document.getElementById("settingLocation").value = state.settings.location;
  document.getElementById("settingPreparedBy").value = state.settings.preparedBy || "";
  document.getElementById("settingStage").value = state.settings.stage || "";
  document.getElementById("settingAreas").value = state.settings.areas.join("\n");

  const container = document.getElementById("categorySettings");
  container.innerHTML = "";
  state.settings.categories.forEach((cat, index) => {
    const card = document.createElement("div");
    card.className = "settings-card";
    card.innerHTML = `
      <div class="settings-card-grid">
        <label>Category Name<input data-setting="cat-name" data-index="${index}" value="${escapeHtml(cat.name)}"></label>
        <label>Budget / Weight Basis<input data-setting="cat-budget" data-index="${index}" type="number" step="0.01" value="${cat.budget}"></label>
      </div>
      <label>Scope items, one per line<textarea data-setting="cat-scopes" data-index="${index}" rows="5">${escapeHtml((cat.scopes || []).join("\n"))}</textarea></label>
    `;
    container.appendChild(card);
  });
}

function saveSettings() {
  state.settings.projectName = document.getElementById("settingProjectName").value.trim() || defaultSettings.projectName;
  state.settings.location = document.getElementById("settingLocation").value.trim();
  state.settings.preparedBy = document.getElementById("settingPreparedBy").value.trim();
  state.settings.stage = document.getElementById("settingStage").value.trim();
  state.settings.areas = document.getElementById("settingAreas").value.split("\n").map(x => x.trim()).filter(Boolean);

  document.querySelectorAll("[data-setting='cat-name']").forEach(input => {
    const index = Number(input.dataset.index);
    state.settings.categories[index].name = input.value.trim() || state.settings.categories[index].name;
  });
  document.querySelectorAll("[data-setting='cat-budget']").forEach(input => {
    const index = Number(input.dataset.index);
    state.settings.categories[index].budget = Number(input.value || 0);
  });
  document.querySelectorAll("[data-setting='cat-scopes']").forEach(input => {
    const index = Number(input.dataset.index);
    state.settings.categories[index].scopes = input.value.split("\n").map(x => x.trim()).filter(Boolean);
  });

  saveState();
  populateFormOptions();
  renderAll();
  alert("Settings saved.");
}

function renderAll() {
  renderDashboard();
  renderRecords();
  renderPunchlist();
  renderReport();
  renderSettings();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === tabId));
  if (tabId === "report") renderReport();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportJson() {
  downloadFile(`tawiran-progress-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(state, null, 2), "application/json");
}

function exportCsv() {
  const headers = ["Date", "Inspector", "Area", "Category", "Scope", "Status", "Progress", "Planned Qty", "Actual Qty", "Unit", "Workmanship", "Punch Status", "Responsible", "Target Date", "Remarks", "Photo Count"];
  const rows = state.records.map(r => [r.date, r.inspector, r.area, r.categoryName, r.scope, r.status, r.progress, r.plannedQty, r.actualQty, r.unit, r.workmanship, r.punchStatus, r.responsible, r.targetDate, r.remarks, (r.photos || []).length]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile(`tawiran-inspection-records-${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
}

function downloadFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.settings || !Array.isArray(imported.records)) throw new Error("Invalid backup file.");
      state = imported;
      saveState();
      populateFormOptions();
      renderAll();
      alert("Backup imported.");
    } catch (error) {
      alert("Invalid JSON backup.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function loadDemoRecords() {
  const now = new Date();
  const demo = [
    demoRecord(now, "Ground Floor - Commercial Space", "civil", "Plastering", "Ongoing", 55, "Plastering ongoing. Need check flatness and remaining wall areas."),
    demoRecord(now, "Second Floor - Common Area", "civil", "Plastering", "Mostly Complete", 75, "Major plastering ongoing; pending touch-up and hollow/crack inspection."),
    demoRecord(now, "Roof Area", "roof", "Roof Sheets", "Physically Complete", 88, "Roof sheets nearly complete. Pending gutter/flashing/downspout and leak test."),
    demoRecord(now, "Ground Floor - T&B", "plumbing", "Waterline Rough-in", "Mostly Complete", 70, "Rough-in mostly complete; pressure test not yet done."),
    demoRecord(now, "Second Floor - T&B", "electrical", "Conduit Rough-in", "Ongoing", 60, "Conduit and boxes ongoing; devices not yet installed."),
    demoRecord(now, "Overall Site", "architectural", "Tiling", "Not Started", 0, "Architectural finishing not yet started."),
    demoRecord(now, "Overall Site", "painting", "Surface Preparation", "Not Started", 0, "Painting not yet started.")
  ];
  state.records.push(...demo);
  saveState();
  renderAll();
  alert("Sample records loaded.");
}

function demoRecord(date, area, categoryId, scope, status, progress, remarks) {
  const cat = getCategory(categoryId) || defaultSettings.categories.find(c => c.id === categoryId);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    date: date.toISOString().slice(0, 16),
    inspector: state.settings.preparedBy || "Site Inspector",
    area,
    categoryId,
    categoryName: cat.name,
    scope,
    status,
    plannedQty: 0,
    actualQty: 0,
    unit: "",
    scopeWeight: 1,
    progress,
    checklist: { quantity: false, specs: false, workmanship: false, testing: false, punchClosed: false, accepted: false },
    workmanship: progress > 0 ? "Acceptable" : "Good",
    responsible: "",
    targetDate: "",
    punchStatus: remarks ? "Open" : "None",
    remarks,
    photos: [],
    createdAt: new Date().toISOString()
  };
}

function clearAll() {
  if (!confirm("Clear all saved inspections and reset settings? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { settings: structuredClone(defaultSettings), records: [] };
  pendingPhotos = [];
  populateFormOptions();
  resetForm();
  renderAll();
}

function wireEvents() {
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  document.querySelectorAll("[data-tab-target]").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tabTarget)));
  document.getElementById("category").addEventListener("change", updateScopeOptions);
  document.getElementById("status").addEventListener("change", updateProgressDefault);
  document.getElementById("progressInput").addEventListener("input", enforceProgress);
  document.querySelectorAll(".checklist input").forEach(input => input.addEventListener("change", enforceProgress));
  document.getElementById("photoInput").addEventListener("change", handlePhotoInput);
  document.getElementById("inspectionForm").addEventListener("submit", saveInspection);
  document.getElementById("clearFormBtn").addEventListener("click", resetForm);
  document.getElementById("recordSearch").addEventListener("input", renderRecords);
  document.getElementById("recordCategoryFilter").addEventListener("change", renderRecords);
  document.getElementById("recordStatusFilter").addEventListener("change", renderRecords);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  document.getElementById("importJsonInput").addEventListener("change", importJson);
  document.getElementById("loadDemoBtn").addEventListener("click", loadDemoRecords);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
  document.getElementById("printReportBtn").addEventListener("click", () => {
    switchTab("report");
    setTimeout(() => window.print(), 150);
  });
}

function init() {
  setDefaultDate();
  populateFormOptions();
  wireEvents();
  updateProgressDefault();
  renderAll();
}

init();
