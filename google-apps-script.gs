/*****
 * GOCO TAWIRAN Site Inspection App v5 - Google Apps Script Backend
 * Features:
 * - Google Sheet database
 * - Google Drive photo folders
 * - User login from Users tab
 * - Master / inspector filtering
 * - A4 board JPG upload to Google Drive
 * - Report export log
 *****/

const PROJECT_NAME = 'GOCO TAWIRAN';

// Optional if this script is bound to the Google Sheet. Required for standalone Apps Script.
const SPREADSHEET_ID = '';

// Required: paste your main Google Drive folder ID here.
const DRIVE_FOLDER_ID = '';

const SHARE_PHOTOS_PUBLICLY = true;
const SESSION_DAYS_VALID = 30;

const ISSUE_HEADERS = [
  'Record ID','Issue ID','Photo ID','Project Name','Project Architect','Project In-Charge','Site / Zone',
  'Date','Time','Week Number','Floor Level','Area','Room / Location','Trade / Scope','Category','Status',
  'Priority','Severity','Progress %','Drawing Reference','Responsible Person','Target Date','Issue / Concern / Note',
  'Schedule Impact','Cost Impact','Photo URL','Google Drive File ID','Photo Folder Path','Google Drive Folder ID',
  'Date Resolved','Verified By','Remarks','Created By','Created By Email','User ID','User Role','Timestamp'
];

const PHOTO_HEADERS = [
  'Record ID','Issue ID','Photo ID','Project Name','Project Architect','Project In-Charge','Site / Zone',
  'Date','Time','Week Number','Floor Level','Area','Room / Location','Trade / Scope','Category','Status',
  'Photo URL','Google Drive File ID','Photo Folder Path','Google Drive Folder ID','Caption / Note',
  'Created By','Created By Email','User ID','User Role','Timestamp'
];

const DESIGN_HEADERS = [
  'Record ID','Issue ID','Project Name','Project Architect','Project In-Charge','Site / Zone',
  'Date','Time','Week Number','Floor Level','Area','Room / Location','Trade / Scope','Category','Status',
  'Priority','Severity','Drawing Reference','Responsible Person','Target Date','Approval / Decision Needed',
  'Schedule Impact','Cost Impact','Photo URL','Google Drive File ID','Photo Folder Path','Google Drive Folder ID',
  'Date Resolved','Verified By','Remarks','Created By','Created By Email','User ID','User Role','Timestamp'
];

const AREA_NOTE_HEADERS = [
  'Record ID','Issue ID','Photo ID','Project Name','Project Architect','Project In-Charge','Site / Zone',
  'Date','Time','Week Number','Floor Level','Area','Room / Location','Trade / Scope','Category','Status',
  'Priority','Severity','Progress %','Drawing Reference','Note','Photo URL','Google Drive File ID','Photo Folder Path','Google Drive Folder ID',
  'Created By','Created By Email','User ID','User Role','Timestamp'
];

const USER_HEADERS = [
  'User ID','Full Name','Email','PIN / Access Code','Role','Assigned Site / Zone','Assigned Area','Status','Can View All','Can Export Reports','Created At','Remarks'
];

const SESSION_HEADERS = ['Session Token','User ID','Email','Full Name','Role','Login At','Expires At','Last Used At','User Agent'];

const REPORT_EXPORT_HEADERS = [
  'Report ID','Report Type','File Name','File URL','Google Drive File ID','Google Drive Folder ID','Folder Path','Layout','Page Number','Total Pages','Record Count','Filters','Exported By','Exported By Email','Timestamp'
];

const LOOKUPS = {
  'Floor Level': ['Ground Floor', 'Second Floor', 'Roof', 'Exterior / Facade', 'Site / Yard', 'General'],
  'Area': ['Clinic','Commercial Space 1','Commercial Space 2','Bedroom','T&B / CR','Stairs','Exterior Stair','Carport / Frontage','Unit 1','Unit 2','Living / Dining','Kitchen','Master Bedroom','Service Area','Balcony','Roof Area','Facade','Ceiling Area','General Site'],
  'Trade / Scope': ['Structural','Masonry','Wall Finishes','Flooring','Ceiling','Door','Window','Glass Works','Roofing','Painting','Plumbing','Electrical','Sanitary','Cabinetry','Railings','Stairs','Facade / Cladding','Waterproofing','Design Approval','Punch List','Others'],
  'Category': ['Issue / Concern','Site Note','Design Approval','Punch List','Progress Photo','Workmanship','Material Concern','Schedule Delay','Cost / Variation','Safety Concern','Drawing Clarification','Owner Decision'],
  'Status': ['Open','For Action','In Progress','For Approval','For Verification','Resolved','Closed','On Hold','Cancelled'],
  'Priority / Severity': ['Low','Medium','High','Critical'],
  'Progress %': ['0%','25%','50%','75%','100%'],
  'Drawing Reference': ['A-1 Site Development / Perspective / Location','A-2 Ground Floor and Second Floor Plan','A-3 Elevations','A-4 Sections and Roof Plan','A-5 Reflected Ceiling Plan','Structural Drawing','Electrical Drawing','Plumbing / Sanitary Drawing','Not Applicable']
};

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    const action = payload.action || 'createRecord';

    if (action === 'login') return jsonOutput_(login_(payload, e));
    if (action === 'setup') { setupGocoTawiranSheet(); return jsonOutput_({ ok: true, message: 'Setup completed.' }); }

    const user = validateSession_(payload.sessionToken, false);

    if (action === 'createRecord') return jsonOutput_(saveRecord_(payload, user));
    if (action === 'getImageData') return jsonOutput_(getImageData_(payload.fileId, user));
    if (action === 'uploadReport') return jsonOutput_(uploadReport_(payload.report, user));

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
      const user = validateSession_(params.sessionToken, true);
      output = listRecords_(params.sheet || 'Issue Records', user);
    } else if (action === 'dashboard') {
      const user = validateSession_(params.sessionToken, true);
      output = getDashboardData_(user);
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
  ensureSheetWithHeaders_(ss, 'Users', USER_HEADERS);
  ensureSheetWithHeaders_(ss, 'User Sessions', SESSION_HEADERS);
  ensureSheetWithHeaders_(ss, 'Report Exports', REPORT_EXPORT_HEADERS);
  ensureSheetWithHeaders_(ss, 'Lookups', ['Type', 'Value']);
  ensureSheetWithHeaders_(ss, 'Dashboard Export', ['Metric', 'Value', 'Updated At']);
  seedDefaultAdmin_(ss.getSheetByName('Users'));
  writeLookups_(ss.getSheetByName('Lookups'));
  updateDashboardExport_();
}

function login_(payload, e) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);
  const email = normalizeEmail_(payload.email);
  const pin = String(payload.pin || '').trim();
  if (!email || !pin) return { ok: false, message: 'Enter email and PIN.' };

  const usersSheet = ss.getSheetByName('Users');
  const users = readSheetObjects_(usersSheet);
  const user = users.find(u => normalizeEmail_(u['Email']) === email && String(u['PIN / Access Code']).trim() === pin && String(u['Status']).toLowerCase() === 'active');
  if (!user) return { ok: false, message: 'Invalid login. Check Users tab email/PIN/status.' };

  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS_VALID * 24 * 60 * 60 * 1000);
  const userObj = userObject_(user);
  const ua = e && e.parameter && e.parameter.userAgent ? e.parameter.userAgent : '';
  appendMappedRow_(ss.getSheetByName('User Sessions'), SESSION_HEADERS, {
    'Session Token': token,
    'User ID': userObj.userId,
    'Email': userObj.email,
    'Full Name': userObj.fullName,
    'Role': userObj.role,
    'Login At': now.toISOString(),
    'Expires At': expires.toISOString(),
    'Last Used At': now.toISOString(),
    'User Agent': ua
  });
  return { ok: true, message: 'Login successful.', sessionToken: token, user: userObj };
}

function validateSession_(token, allowGuest) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);
  if (!token) {
    if (allowGuest) return null;
    throw new Error('Login required. Missing session token.');
  }
  const sessions = readSheetObjects_(ss.getSheetByName('User Sessions'));
  const session = sessions.reverse().find(s => String(s['Session Token']) === String(token));
  if (!session) throw new Error('Session expired or invalid. Login again.');
  const expires = new Date(session['Expires At']);
  if (expires && expires < new Date()) throw new Error('Session expired. Login again.');

  const users = readSheetObjects_(ss.getSheetByName('Users'));
  const user = users.find(u => String(u['User ID']) === String(session['User ID']) && String(u['Status']).toLowerCase() === 'active');
  if (!user) throw new Error('User account is inactive or missing.');
  touchSession_(ss.getSheetByName('User Sessions'), token);
  return userObject_(user);
}

function userObject_(row) {
  return {
    userId: String(row['User ID'] || ''),
    fullName: String(row['Full Name'] || ''),
    email: normalizeEmail_(row['Email']),
    role: String(row['Role'] || 'User'),
    assignedSite: String(row['Assigned Site / Zone'] || 'All'),
    assignedArea: String(row['Assigned Area'] || 'All'),
    canViewAll: parseYes_(row['Can View All']),
    canExportReports: parseYes_(row['Can Export Reports'])
  };
}

function saveRecord_(payload, user) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);

  const record = payload.record || {};
  const now = new Date();

  record['Project Name'] = record['Project Name'] || PROJECT_NAME;
  record['Site / Zone'] = record['Site / Zone'] || (user && user.assignedSite !== 'All' ? user.assignedSite : 'Brgy. Tawiran, Calapan City');
  record['Record ID'] = record['Record ID'] || makeId_('GT');
  record['Issue ID'] = record['Issue ID'] || makeId_('GI');
  record['Photo ID'] = record['Photo ID'] || makeId_('GP');
  record['Timestamp'] = record['Timestamp'] || now.toISOString();
  record['Date'] = record['Date'] || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  record['Time'] = record['Time'] || Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
  record['Week Number'] = record['Week Number'] || getIsoWeek_(now);

  if (user) {
    record['Created By'] = record['Created By'] || user.fullName;
    record['Created By Email'] = user.email;
    record['User ID'] = user.userId;
    record['User Role'] = user.role;
    record['Project In-Charge'] = record['Project In-Charge'] || user.fullName;
  }

  if (payload.photo && payload.photo.data) {
    const fileInfo = savePhoto_(payload.photo, record);
    record['Photo URL'] = fileInfo.url;
    record['Google Drive File ID'] = fileInfo.id;
    record['Photo Folder Path'] = fileInfo.folderPath || '';
    record['Google Drive Folder ID'] = fileInfo.folderId || '';
  }

  appendMappedRow_(ss.getSheetByName('Issue Records'), ISSUE_HEADERS, record);

  if (record['Photo URL']) appendMappedRow_(ss.getSheetByName('Photo Records'), PHOTO_HEADERS, { ...record, 'Caption / Note': record['Issue / Concern / Note'] || '' });
  if (isDesignRecord_(record)) appendMappedRow_(ss.getSheetByName('Design Approvals'), DESIGN_HEADERS, { ...record, 'Approval / Decision Needed': record['Issue / Concern / Note'] || '' });
  if (isAreaNoteRecord_(record)) appendMappedRow_(ss.getSheetByName('Area Notes'), AREA_NOTE_HEADERS, { ...record, 'Note': record['Issue / Concern / Note'] || '' });

  updateDashboardExport_();

  return {
    ok: true,
    message: 'Record saved.',
    recordId: record['Record ID'],
    issueId: record['Issue ID'],
    photoId: record['Photo ID'],
    photoUrl: record['Photo URL'] || '',
    fileId: record['Google Drive File ID'] || '',
    folderPath: record['Photo Folder Path'] || '',
    folderId: record['Google Drive Folder ID'] || '',
    viewUrl: record['Google Drive File ID'] ? `https://drive.google.com/file/d/${record['Google Drive File ID']}/view?usp=sharing` : ''
  };
}

function listRecords_(sheetName, user) {
  const ss = getSpreadsheet_();
  setupIfMissing_(ss);
  const allowed = ['Issue Records','Photo Records','Design Approvals','Area Notes','Dashboard Export','Lookups','Report Exports'];
  if (allowed.indexOf(sheetName) === -1) sheetName = 'Issue Records';
  const sheet = ss.getSheetByName(sheetName);
  let records = readSheetObjects_(sheet).reverse();

  if (user && !user.canViewAll && ['Issue Records','Photo Records','Design Approvals','Area Notes'].indexOf(sheetName) !== -1) {
    records = records.filter(r => canUserSeeRecord_(user, r));
  }
  if (user && !user.canViewAll && sheetName === 'Report Exports') {
    records = records.filter(r => normalizeEmail_(r['Exported By Email']) === user.email);
  }

  return { ok: true, sheet: sheetName, records: records, user: user || null };
}

function canUserSeeRecord_(user, r) {
  if (!user) return true;
  if (user.canViewAll) return true;
  const email = normalizeEmail_(r['Created By Email']);
  const created = String(r['Created By'] || '').toLowerCase();
  const inCharge = String(r['Project In-Charge'] || r['Responsible Person'] || '').toLowerCase();
  const site = String(r['Site / Zone'] || '').toLowerCase();
  const area = String(r['Area'] || '').toLowerCase();
  if (email && email === user.email) return true;
  if (created && created === user.fullName.toLowerCase()) return true;
  if (inCharge && inCharge === user.fullName.toLowerCase()) return true;
  const siteOk = !user.assignedSite || user.assignedSite === 'All' || site === String(user.assignedSite).toLowerCase();
  const areaOk = !user.assignedArea || user.assignedArea === 'All' || area === String(user.assignedArea).toLowerCase();
  return siteOk && areaOk;
}

function getImageData_(fileId, user) {
  if (!fileId) return { ok: false, message: 'Missing fileId.' };
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const mime = blob.getContentType() || 'image/jpeg';
  const base64 = Utilities.base64Encode(blob.getBytes());
  return { ok: true, fileId: fileId, mimeType: mime, dataUrl: `data:${mime};base64,${base64}` };
}

function uploadReport_(report, user) {
  if (!user) throw new Error('Login required to upload reports.');
  if (user.canExportReports === false) throw new Error('This user is not allowed to export reports.');
  if (!DRIVE_FOLDER_ID) throw new Error('DRIVE_FOLDER_ID is empty.');
  if (!report || !report.data) throw new Error('Missing report JPG data.');

  const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const now = new Date();
  const datePart = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const reportType = report.reportType || 'Photo Issue Board';
  const extFolder = report.mimeType === 'application/pdf' ? 'PDF' : 'JPG';
  const targetFolder = getOrCreateNestedFolder_(root, [
    sanitizeFolderName_(PROJECT_NAME + ' PROJECT DOCUMENTATION'),
    '02_PHOTO ISSUE BOARDS',
    datePart,
    extFolder
  ]);
  const bytes = Utilities.base64Decode(String(report.data).replace(/^data:[^;]+;base64,/, ''));
  const fileName = sanitizeFileName_(report.fileName || makeId_('GOCO_REPORT') + '.jpg');
  const blob = Utilities.newBlob(bytes, report.mimeType || 'image/jpeg', fileName);
  const file = targetFolder.createFile(blob);
  if (SHARE_PHOTOS_PUBLICLY) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const folderPath = [PROJECT_NAME + ' PROJECT DOCUMENTATION','02_PHOTO ISSUE BOARDS',datePart,extFolder].join(' / ');
  const row = {
    'Report ID': makeId_('GR'),
    'Report Type': reportType,
    'File Name': fileName,
    'File URL': file.getUrl(),
    'Google Drive File ID': file.getId(),
    'Google Drive Folder ID': targetFolder.getId(),
    'Folder Path': folderPath,
    'Layout': report.layout || '',
    'Page Number': report.pageNumber || '',
    'Total Pages': report.totalPages || '',
    'Record Count': report.recordCount || '',
    'Filters': report.filters || '',
    'Exported By': user.fullName,
    'Exported By Email': user.email,
    'Timestamp': now.toISOString()
  };
  appendMappedRow_(getSpreadsheet_().getSheetByName('Report Exports'), REPORT_EXPORT_HEADERS, row);
  return { ok: true, message: 'Report uploaded.', fileName: fileName, fileUrl: file.getUrl(), fileId: file.getId(), folderId: targetFolder.getId(), folderPath: folderPath };
}

function savePhoto_(photo, record) {
  if (!DRIVE_FOLDER_ID) throw new Error('DRIVE_FOLDER_ID is empty. Paste your Google Drive folder ID in google-apps-script.gs.');

  const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const rawBase64 = String(photo.data).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(rawBase64);

  const datePart = sanitizeFilePart_(record['Date'] || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  const projectFolderName = sanitizeFolderName_(record['Project Name'] || PROJECT_NAME);
  const siteFolderName = sanitizeFolderName_(record['Site / Zone'] || 'Brgy. Tawiran, Calapan City');
  const floorFolderName = sanitizeFolderName_(record['Floor Level'] || 'General');
  const areaFolderName = sanitizeFolderName_(record['Area'] || record['Room / Location'] || 'General Area');
  const tradeFolderName = sanitizeFolderName_(record['Trade / Scope'] || record['Category'] || 'General Scope');

  const targetFolder = getOrCreateNestedFolder_(root, [
    projectFolderName,
    '01_SITE PHOTOS',
    datePart,
    siteFolderName,
    floorFolderName,
    areaFolderName,
    tradeFolderName
  ]);

  const safeArea = sanitizeFilePart_(record['Area'] || 'Area');
  const safeTrade = sanitizeFilePart_(record['Trade / Scope'] || 'Scope');
  const safeStatus = sanitizeFilePart_(record['Status'] || 'Status');
  const safeId = sanitizeFilePart_(record['Photo ID'] || makeId_('GP'));
  const safeUser = sanitizeFilePart_(record['Created By'] || 'User');
  const fileName = `${safeId}_${safeArea}_${safeTrade}_${safeStatus}_${safeUser}.jpg`;
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', fileName);
  const file = targetFolder.createFile(blob);

  if (SHARE_PHOTOS_PUBLICLY) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const folderId = targetFolder.getId();
  const folderPath = [projectFolderName,'01_SITE PHOTOS',datePart,siteFolderName,floorFolderName,areaFolderName,tradeFolderName].join(' / ');
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  return { id: fileId, url: thumbnailUrl, viewUrl: file.getUrl(), folderId: folderId, folderPath: folderPath };
}

function getDashboardData_(user) {
  const data = listRecords_('Issue Records', user).records;
  const openStatuses = ['Open','For Action','In Progress','For Approval','For Verification','On Hold'];
  const today = new Date();
  today.setHours(0,0,0,0);
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
      d.setHours(0,0,0,0);
      return d < today;
    }).length
  };
  return { ok: true, metrics: metrics };
}

function setupIfMissing_(ss) {
  ensureSheetWithHeaders_(ss, 'Issue Records', ISSUE_HEADERS);
  ensureSheetWithHeaders_(ss, 'Photo Records', PHOTO_HEADERS);
  ensureSheetWithHeaders_(ss, 'Design Approvals', DESIGN_HEADERS);
  ensureSheetWithHeaders_(ss, 'Area Notes', AREA_NOTE_HEADERS);
  ensureSheetWithHeaders_(ss, 'Users', USER_HEADERS);
  ensureSheetWithHeaders_(ss, 'User Sessions', SESSION_HEADERS);
  ensureSheetWithHeaders_(ss, 'Report Exports', REPORT_EXPORT_HEADERS);
  ensureSheetWithHeaders_(ss, 'Lookups', ['Type', 'Value']);
  ensureSheetWithHeaders_(ss, 'Dashboard Export', ['Metric', 'Value', 'Updated At']);
  seedDefaultAdmin_(ss.getSheetByName('Users'));
}

function ensureSheetWithHeaders_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const current = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn() || 1)).getValues()[0];
  const isBlank = current.every(cell => cell === '');
  if (isBlank) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    const existing = current.filter(String);
    const missing = headers.filter(h => existing.indexOf(h) === -1);
    if (missing.length) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  const lastCol = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(lastCol, 12));
}

function seedDefaultAdmin_(sheet) {
  const rows = readSheetObjects_(sheet);
  const hasActive = rows.some(r => String(r['Status']).toLowerCase() === 'active');
  if (hasActive) return;
  appendMappedRow_(sheet, USER_HEADERS, {
    'User ID': 'U-001',
    'Full Name': 'Master Admin',
    'Email': 'admin@goco.local',
    'PIN / Access Code': '1234',
    'Role': 'Master Admin',
    'Assigned Site / Zone': 'All',
    'Assigned Area': 'All',
    'Status': 'Active',
    'Can View All': 'Yes',
    'Can Export Reports': 'Yes',
    'Created At': new Date().toISOString(),
    'Remarks': 'Change this default email/PIN immediately.'
  });
}

function appendMappedRow_(sheet, headers, record) {
  const liveHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const allHeaders = liveHeaders.length ? liveHeaders : headers;
  const row = allHeaders.map(header => record[header] == null ? '' : record[header]);
  sheet.appendRow(row);
}

function readSheetObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const headers = values[0];
  return values.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
    const obj = {};
    headers.forEach((header, index) => { if (header) obj[header] = row[index] || ''; });
    return obj;
  });
}

function touchSession_(sheet, token) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenCol = headers.indexOf('Session Token') + 1;
  const usedCol = headers.indexOf('Last Used At') + 1;
  if (tokenCol < 1 || usedCol < 1) return;
  for (let r = 2; r <= data.length; r++) {
    if (String(data[r - 1][tokenCol - 1]) === String(token)) {
      sheet.getRange(r, usedCol).setValue(new Date().toISOString());
      return;
    }
  }
}

function writeLookups_(sheet) {
  const rows = [];
  Object.keys(LOOKUPS).forEach(type => LOOKUPS[type].forEach(value => rows.push([type, value])));
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['Type','Value']]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
}

function updateDashboardExport_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('Dashboard Export') || ss.insertSheet('Dashboard Export');
  const dashboard = getDashboardData_(null);
  const updatedAt = new Date().toISOString();
  const rows = [
    ['Metric','Value','Updated At'],
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
  return record['Category'] === 'Design Approval' || record['Category'] === 'Owner Decision' || record['Category'] === 'Drawing Clarification' || record['Trade / Scope'] === 'Design Approval' || record['Status'] === 'For Approval';
}

function isAreaNoteRecord_(record) {
  return ['Site Note','Progress Photo','Punch List','Issue / Concern','Drawing Clarification','Owner Decision'].indexOf(record['Category']) !== -1;
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('No active spreadsheet. Fill SPREADSHEET_ID if this is standalone.');
  return active;
}

function parsePostPayload_(e) {
  const content = e && e.postData && e.postData.contents;
  if (!content) return {};
  try { return JSON.parse(content); }
  catch (err) { throw new Error('Could not parse JSON payload. ' + err.message); }
}

function jsonOutput_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    const safeCallback = String(callback).replace(/[^a-zA-Z0-9_.$]/g, '');
    return ContentService.createTextOutput(`${safeCallback}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function normalizeEmail_(value) { return String(value || '').trim().toLowerCase(); }
function parseYes_(value) { return ['yes','true','1','y'].indexOf(String(value || '').trim().toLowerCase()) !== -1; }

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

function getOrCreateNestedFolder_(rootFolder, names) { return names.reduce((folder, name) => getOrCreateFolder_(folder, name), rootFolder); }
function getOrCreateFolder_(parent, name) {
  const safeName = sanitizeFolderName_(name);
  const existing = parent.getFoldersByName(safeName);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(safeName);
}
function sanitizeFolderName_(value) { return String(value || 'General').replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'General'; }
function sanitizeFilePart_(value) { return String(value || '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item'; }
function sanitizeFileName_(value) { return String(value || 'file').replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, '_').slice(0, 140); }
