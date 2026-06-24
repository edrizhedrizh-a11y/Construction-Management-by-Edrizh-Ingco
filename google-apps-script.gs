/*****
 * GOCO TAWIRAN Site Inspection App - Google Apps Script Backend
 *
 * Setup:
 * 1. Create/open your Google Sheet.
 * 2. Extensions > Apps Script.
 * 3. Paste this entire file.
 * 4. Fill DRIVE_FOLDER_ID. If this script is not bound to your Sheet, fill SPREADSHEET_ID too.
 * 5. Run setupGocoTawiranSheet() once from the Apps Script editor.
 * 6. Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone / Anyone with the link
 * 7. Copy the Web App URL into config.js.
 *****/

const PROJECT_NAME = 'GOCO TAWIRAN';

// Optional when this script is bound to the Google Sheet. Required for standalone Apps Script projects.
const SPREADSHEET_ID = '';

// Required: paste your Google Drive folder ID for uploaded site photos.
const DRIVE_FOLDER_ID = '';

// Set true if you want all photo files to be viewable by anyone with the link.
const SHARE_PHOTOS_PUBLICLY = true;

const ISSUE_HEADERS = [
  'Record ID',
  'Issue ID',
  'Photo ID',
  'Project Name',
  'Date',
  'Time',
  'Week Number',
  'Floor Level',
  'Area',
  'Room / Location',
  'Trade / Scope',
  'Category',
  'Status',
  'Priority',
  'Severity',
  'Progress %',
  'Drawing Reference',
  'Responsible Person',
  'Target Date',
  'Issue / Concern / Note',
  'Schedule Impact',
  'Cost Impact',
  'Photo URL',
  'Google Drive File ID',
  'Date Resolved',
  'Verified By',
  'Remarks',
  'Created By',
  'Timestamp'
];

const PHOTO_HEADERS = [
  'Record ID', 'Issue ID', 'Photo ID', 'Project Name', 'Date', 'Time', 'Week Number',
  'Floor Level', 'Area', 'Room / Location', 'Trade / Scope', 'Category', 'Status',
  'Photo URL', 'Google Drive File ID', 'Caption / Note', 'Created By', 'Timestamp'
];

const DESIGN_HEADERS = [
  'Record ID', 'Issue ID', 'Project Name', 'Date', 'Time', 'Week Number', 'Floor Level',
  'Area', 'Room / Location', 'Trade / Scope', 'Category', 'Status', 'Priority', 'Severity',
  'Drawing Reference', 'Responsible Person', 'Target Date', 'Approval / Decision Needed',
  'Schedule Impact', 'Cost Impact', 'Photo URL', 'Google Drive File ID', 'Date Resolved',
  'Verified By', 'Remarks', 'Created By', 'Timestamp'
];

const AREA_NOTE_HEADERS = [
  'Record ID', 'Issue ID', 'Photo ID', 'Project Name', 'Date', 'Time', 'Week Number',
  'Floor Level', 'Area', 'Room / Location', 'Trade / Scope', 'Category', 'Status',
  'Priority', 'Severity', 'Progress %', 'Drawing Reference', 'Note', 'Photo URL',
  'Google Drive File ID', 'Created By', 'Timestamp'
];

const LOOKUPS = {
  'Floor Level': ['Ground Floor', 'Second Floor', 'Roof', 'Exterior / Facade', 'Site / Yard', 'General'],
  'Area': [
    'Clinic', 'Commercial Space 1', 'Commercial Space 2', 'Bedroom', 'T&B / CR', 'Stairs',
    'Exterior Stair', 'Carport / Frontage', 'Unit 1', 'Unit 2', 'Living / Dining', 'Kitchen',
    'Master Bedroom', 'Service Area', 'Balcony', 'Roof Area', 'Facade', 'Ceiling Area', 'General Site'
  ],
  'Trade / Scope': [
    'Structural', 'Masonry', 'Wall Finishes', 'Flooring', 'Ceiling', 'Door', 'Window', 'Glass Works',
    'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Sanitary', 'Cabinetry', 'Railings', 'Stairs',
    'Facade / Cladding', 'Waterproofing', 'Design Approval', 'Punch List', 'Others'
  ],
  'Category': [
    'Issue / Concern', 'Site Note', 'Design Approval', 'Punch List', 'Progress Photo', 'Workmanship',
    'Material Concern', 'Schedule Delay', 'Cost / Variation', 'Safety Concern', 'Drawing Clarification', 'Owner Decision'
  ],
  'Status': ['Open', 'For Action', 'In Progress', 'For Approval', 'For Verification', 'Resolved', 'Closed', 'On Hold', 'Cancelled'],
  'Priority / Severity': ['Low', 'Medium', 'High', 'Critical'],
  'Progress %': ['0%', '25%', '50%', '75%', '100%'],
  'Drawing Reference': [
    'A-1 Site Development / Perspective / Location',
    'A-2 Ground Floor and Second Floor Plan',
    'A-3 Elevations',
    'A-4 Sections and Roof Plan',
    'A-5 Reflected Ceiling Plan',
    'Structural Drawing',
    'Electrical Drawing',
    'Plumbing / Sanitary Drawing',
    'Not Applicable'
  ]
};

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    const action = payload.action || 'createRecord';

    if (action === 'createRecord') {
      return jsonOutput_(saveRecord_(payload));
    }

    if (action === 'setup') {
      setupGocoTawiranSheet();
      return jsonOutput_({ ok: true, message: 'Setup completed.' });
    }

    return jsonOutput_({ ok: false, message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, message: err.message, stack: err.stack });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'listRecords';
    let output;

    if (action === 'listRecords') {
      output = listRecords_(params.sheet || 'Issue Records');
    } else if (action === 'dashboard') {
      output = getDashboardData_();
    } else if (action === 'setup') {
      setupGocoTawiranSheet();
      output = { ok: true, message: 'Setup completed.' };
    } else {
      output = { ok: false, message: 'Unknown action: ' + action };
    }

    return jsonOutput_(output, params.callback);
  } catch (err) {
    const params = (e && e.parameter) || {};
    return jsonOutput_({ ok: false, message: err.message, stack: err.stack }, params.callback);
  }
}

function setupGocoTawiranSheet() {
  const ss = getSpreadsheet_();
  ensureSheetWithHeaders_(ss, 'Issue Records', ISSUE_HEADERS);
  ensureSheetWithHeaders_(ss, 'Photo Records', PHOTO_HEADERS);
  ensureSheetWithHeaders_(ss, 'Design Approvals', DESIGN_HEADERS);
  ensureSheetWithHeaders_(ss, 'Area Notes', AREA_NOTE_HEADERS);
  ensureSheetWithHeaders_(ss, 'Lookups', ['Type', 'Value']);
  ensureSheetWithHeaders_(ss, 'Dashboard Export', ['Metric', 'Value', 'Updated At']);
  writeLookups_(ss.getSheetByName('Lookups'));
  updateDashboardExport_();
}

function saveRecord_(payload) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);

  const record = payload.record || {};
  const now = new Date();

  record['Project Name'] = record['Project Name'] || PROJECT_NAME;
  record['Record ID'] = record['Record ID'] || makeId_('GT');
  record['Issue ID'] = record['Issue ID'] || makeId_('GI');
  record['Photo ID'] = record['Photo ID'] || makeId_('GP');
  record['Timestamp'] = record['Timestamp'] || now.toISOString();
  record['Date'] = record['Date'] || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  record['Time'] = record['Time'] || Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
  record['Week Number'] = record['Week Number'] || getIsoWeek_(now);

  if (payload.photo && payload.photo.data) {
    const fileInfo = savePhoto_(payload.photo, record);
    record['Photo URL'] = fileInfo.url;
    record['Google Drive File ID'] = fileInfo.id;
  }

  appendMappedRow_(ss.getSheetByName('Issue Records'), ISSUE_HEADERS, record);

  if (record['Photo URL']) {
    appendMappedRow_(ss.getSheetByName('Photo Records'), PHOTO_HEADERS, {
      ...record,
      'Caption / Note': record['Issue / Concern / Note'] || ''
    });
  }

  if (isDesignRecord_(record)) {
    appendMappedRow_(ss.getSheetByName('Design Approvals'), DESIGN_HEADERS, {
      ...record,
      'Approval / Decision Needed': record['Issue / Concern / Note'] || ''
    });
  }

  if (isAreaNoteRecord_(record)) {
    appendMappedRow_(ss.getSheetByName('Area Notes'), AREA_NOTE_HEADERS, {
      ...record,
      'Note': record['Issue / Concern / Note'] || ''
    });
  }

  updateDashboardExport_();

  return {
    ok: true,
    message: 'Record saved.',
    recordId: record['Record ID'],
    issueId: record['Issue ID'],
    photoId: record['Photo ID'],
    photoUrl: record['Photo URL'] || '',
    fileId: record['Google Drive File ID'] || ''
  };
}

function listRecords_(sheetName) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);
  const allowed = ['Issue Records', 'Photo Records', 'Design Approvals', 'Area Notes', 'Dashboard Export', 'Lookups'];
  if (allowed.indexOf(sheetName) === -1) sheetName = 'Issue Records';

  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { ok: true, sheet: sheetName, records: [] };

  const headers = values[0];
  const records = values.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
    const obj = {};
    headers.forEach((header, index) => obj[header] = row[index] || '');
    return obj;
  }).reverse();

  return { ok: true, sheet: sheetName, records: records };
}

function getDashboardData_() {
  const data = listRecords_('Issue Records').records;
  const openStatuses = ['Open', 'For Action', 'In Progress', 'For Approval', 'For Verification', 'On Hold'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metrics = {
    totalRecords: data.length,
    openIssues: data.filter(r => r['Status'] === 'Open').length,
    forAction: data.filter(r => r['Status'] === 'For Action').length,
    forApproval: data.filter(r => r['Status'] === 'For Approval' || r['Category'] === 'Design Approval').length,
    resolved: data.filter(r => r['Status'] === 'Resolved').length,
    closed: data.filter(r => r['Status'] === 'Closed').length,
    critical: data.filter(r => r['Priority'] === 'Critical' || r['Severity'] === 'Critical').length,
    overdue: data.filter(r => {
      if (!r['Target Date'] || openStatuses.indexOf(r['Status']) === -1) return false;
      const d = new Date(r['Target Date']);
      d.setHours(0, 0, 0, 0);
      return d < today;
    }).length
  };

  return { ok: true, metrics: metrics };
}

function parsePostPayload_(e) {
  const content = e && e.postData && e.postData.contents;
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error('Could not parse JSON payload. ' + err.message);
  }
}

function savePhoto_(photo, record) {
  if (!DRIVE_FOLDER_ID) {
    throw new Error('DRIVE_FOLDER_ID is empty. Paste your Google Drive folder ID in google-apps-script.gs.');
  }

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const rawBase64 = String(photo.data).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(rawBase64);
  const safeArea = sanitizeFilePart_(record['Area'] || 'Area');
  const safeTrade = sanitizeFilePart_(record['Trade / Scope'] || 'Scope');
  const safeId = sanitizeFilePart_(record['Photo ID'] || makeId_('GP'));
  const fileName = `${safeId}_${safeArea}_${safeTrade}.jpg`;
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);

  if (SHARE_PHOTOS_PUBLICLY) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return { id: file.getId(), url: file.getUrl() };
}

function setupIfMissing_(ss) {
  if (!ss.getSheetByName('Issue Records')) setupGocoTawiranSheet();
}

function ensureSheetWithHeaders_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn() || 1)).getValues()[0];
  const isBlank = current.every(cell => cell === '');

  if (isBlank) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = current.filter(String);
    const missing = headers.filter(h => existing.indexOf(h) === -1);
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
  }

  const lastCol = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(lastCol, 12));
}

function appendMappedRow_(sheet, headers, record) {
  const liveHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const allHeaders = liveHeaders.length ? liveHeaders : headers;
  const row = allHeaders.map(header => record[header] == null ? '' : record[header]);
  sheet.appendRow(row);
}

function writeLookups_(sheet) {
  const rows = [];
  Object.keys(LOOKUPS).forEach(type => {
    LOOKUPS[type].forEach(value => rows.push([type, value]));
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['Type', 'Value']]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
}

function updateDashboardExport_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('Dashboard Export') || ss.insertSheet('Dashboard Export');
  const dashboard = getDashboardData_();
  const updatedAt = new Date().toISOString();
  const rows = [
    ['Metric', 'Value', 'Updated At'],
    ['Total Records', dashboard.metrics.totalRecords, updatedAt],
    ['Open Issues', dashboard.metrics.openIssues, updatedAt],
    ['For Action', dashboard.metrics.forAction, updatedAt],
    ['For Approval', dashboard.metrics.forApproval, updatedAt],
    ['Resolved', dashboard.metrics.resolved, updatedAt],
    ['Closed', dashboard.metrics.closed, updatedAt],
    ['Critical', dashboard.metrics.critical, updatedAt],
    ['Overdue', dashboard.metrics.overdue, updatedAt]
  ];
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

function isDesignRecord_(record) {
  return record['Category'] === 'Design Approval'
    || record['Category'] === 'Owner Decision'
    || record['Category'] === 'Drawing Clarification'
    || record['Trade / Scope'] === 'Design Approval'
    || record['Status'] === 'For Approval';
}

function isAreaNoteRecord_(record) {
  return ['Site Note', 'Progress Photo', 'Punch List', 'Issue / Concern', 'Drawing Clarification', 'Owner Decision'].indexOf(record['Category']) !== -1;
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('No active spreadsheet. Fill SPREADSHEET_ID if this is a standalone Apps Script project.');
  return active;
}

function jsonOutput_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    const safeCallback = String(callback).replace(/[^a-zA-Z0-9_.$]/g, '');
    return ContentService
      .createTextOutput(`${safeCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function makeId_(prefix) {
  const now = new Date();
  const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${stamp}-${random}`;
}

function getIsoWeek_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function sanitizeFilePart_(value) {
  return String(value || '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
}
