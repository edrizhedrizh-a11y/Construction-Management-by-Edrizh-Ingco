# GOCO TAWIRAN Site Inspection App

Mobile-first site inspection and project documentation web app for **GOCO TAWIRAN**, a two-storey residential/commercial building in Brgy. Tawiran, Calapan City.

The app is designed for iPhone/iPad site use. It lets the project architect/site inspector capture photos, record issues, concerns, design approvals, area notes, punch list items, and progress documentation per area.

## Included files

- `index.html` — mobile site record form with camera/photo upload
- `board.html` — printable Photo Issue Board
- `design-approval.html` — Design Approval Board
- `area-notes.html` — room/area-based notes board
- `dashboard.html` — project status dashboard
- `records.html` — Photo Reference Log table + CSV export
- `style.css` — responsive mobile-first UI
- `app.js` — frontend logic, IDs, photo compression, submit/fetch, dashboard rendering
- `config.js` — project config and Apps Script Web App URL
- `manifest.json` — PWA manifest for Add to Home Screen
- `service-worker.js` — offline app shell cache
- `icon-192.png` and `icon-512.png` — PWA icons
- `google-apps-script.gs` — Google Sheets + Google Drive backend
- `GOCO_TAWIRAN_Google_Sheet_Template_v2.xlsx` — Google Sheet/Excel database template with printable report card sheet
- `README.md` — setup guide

## What the app saves

Every record can include:

- Record ID
- Issue ID
- Photo ID
- Project Name
- Date
- Time
- Week Number
- Floor Level
- Area
- Room / Location
- Trade / Scope
- Category
- Status
- Priority
- Severity
- Progress %
- Drawing Reference
- Responsible Person
- Target Date
- Issue / Concern / Note
- Schedule Impact
- Cost Impact
- Photo URL
- Google Drive File ID
- Date Resolved
- Verified By
- Remarks
- Created By
- Timestamp

## Required Google Sheet tabs

Create a Google Sheet with these tabs, or run `setupGocoTawiranSheet()` from Apps Script to create them automatically:

1. `Issue Records`
2. `Photo Records`
3. `Design Approvals`
4. `Area Notes`
5. `Lookups`
6. `Dashboard Export`
7. `Report Card Template` optional printable backup layout

### Required columns for `Issue Records`

```text
Record ID
Issue ID
Photo ID
Project Name
Date
Time
Week Number
Floor Level
Area
Room / Location
Trade / Scope
Category
Status
Priority
Severity
Progress %
Drawing Reference
Responsible Person
Target Date
Issue / Concern / Note
Schedule Impact
Cost Impact
Photo URL
Google Drive File ID
Date Resolved
Verified By
Remarks
Created By
Timestamp
```

## Setup instructions

### 1. Create the Google Sheet

Create a new Google Sheet named something like:

```text
GOCO TAWIRAN - Site Inspection Database
```

You may upload `GOCO_TAWIRAN_Google_Sheet_Template_v2.xlsx` to Google Drive and open/convert it with Google Sheets. It already includes the required tabs plus a `Report Card Template` sheet. You can also manually create the required tabs, or let the Apps Script create them.

### 2. Create the Google Drive folder for photos

Create a Google Drive folder named:

```text
GOCO TAWIRAN - Site Photos
```

Open the folder and copy the folder ID from the URL. The folder ID is the long text after `/folders/`.

Example only:

```text
https://drive.google.com/drive/folders/PASTE_THIS_FOLDER_ID
```

### 3. Add the Google Apps Script backend

Open your Google Sheet, then go to:

```text
Extensions > Apps Script
```

Delete the starter code and paste the full contents of:

```text
google-apps-script.gs
```

At the top of the script, paste your Google Drive folder ID:

```javascript
const DRIVE_FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE';
```

If the script is bound to the Google Sheet, you may leave `SPREADSHEET_ID` blank:

```javascript
const SPREADSHEET_ID = '';
```

If you are using a standalone Apps Script project, paste your Google Sheet ID:

```javascript
const SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
```

### 4. Run setup once

In Apps Script, select this function:

```javascript
setupGocoTawiranSheet
```

Click **Run**. Google will ask for permission. Allow it.

This creates/updates the required tabs and headers.

### 5. Deploy Apps Script as Web App

In Apps Script:

```text
Deploy > New deployment > Select type: Web app
```

Use these settings:

```text
Execute as: Me
Who has access: Anyone / Anyone with the link
```

Click **Deploy**, then copy the Web App URL.

### 6. Paste the Web App URL into `config.js`

Open `config.js` and replace:

```javascript
APPS_SCRIPT_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with your deployed Apps Script Web App URL.

### 7. Upload the website files to GitHub

Create a GitHub repository. Upload all files in this folder:

```text
index.html
board.html
design-approval.html
area-notes.html
dashboard.html
records.html
style.css
app.js
config.js
manifest.json
service-worker.js
google-apps-script.gs
README.md
```

The `google-apps-script.gs` file is included for reference. It does not run on GitHub Pages; it runs inside Google Apps Script.

### 8. Enable GitHub Pages

In GitHub:

```text
Settings > Pages > Build and deployment
```

Set:

```text
Source: Deploy from a branch
Branch: main / root
```

Open the GitHub Pages link after it deploys.

### 9. Add to iPhone/iPad Home Screen

On iPhone/iPad:

1. Open the GitHub Pages site in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Open it like a normal app.

## How to use on site

1. Open the app on iPhone/iPad.
2. Tap **Add**.
3. Use the camera/photo field.
4. Select floor level, area, trade/scope, category, status, priority, severity, progress, drawing reference, and responsible person.
5. Type the site concern/note/action needed.
6. Tap **Save Site Record**.
7. Review outputs from:
   - Photo Issue Board
   - Design Approval Board
   - Area Notes Board
   - Dashboard
   - Photo Reference Log
8. For report output, open `Photo Issue Board`, `Design Approval Board`, or `Area Notes Board`, then tap **Print / Save PDF**. The boards now use a construction report-card layout with header, floor/area/trade/date, photo box, status strip, issue/photo ID, and concern/note section.

## Report card layout

The printable board pages use the same construction photo board style as the sample layout:

- dark title bar such as `DESIGN APPROVAL` or `PHOTO ISSUE BOARD`
- floor level, area, trade/scope, and date header
- large photo area
- progress/status/Issue ID/Photo ID strip
- concern, issue, note, remarks, target date, resolved date, and verified-by fields

The Excel/Google Sheet template also includes a `Report Card Template` sheet. Change cell `D2` to the source row number from `Issue Records` to pull the text fields into the printable card. Photos are best printed from the web app board pages because they automatically show the uploaded Google Drive image.

## Drawing references included

- `A-1 Site Development / Perspective / Location`
- `A-2 Ground Floor and Second Floor Plan`
- `A-3 Elevations`
- `A-4 Sections and Roof Plan`
- `A-5 Reflected Ceiling Plan`
- `Structural Drawing`
- `Electrical Drawing`
- `Plumbing / Sanitary Drawing`
- `Not Applicable`

## Notes and troubleshooting

### Photos save locally but not to Google Drive

Check these items:

- `APPS_SCRIPT_URL` in `config.js` is correct.
- Apps Script is deployed as Web App.
- Web App access is set to `Anyone / Anyone with the link`.
- `DRIVE_FOLDER_ID` is filled in `google-apps-script.gs`.
- You redeployed Apps Script after editing `DRIVE_FOLDER_ID`.

### Records do not appear on boards

- Refresh the board page.
- Confirm records exist in the `Issue Records` tab.
- Confirm the Web App URL is the latest deployment URL.
- Check if the record was saved only in local browser storage due to weak signal or missing setup.

### Export to Excel

The live database is Google Sheets. To export:

```text
Google Sheets > File > Download > Microsoft Excel (.xlsx)
```

The `records.html` page also has a CSV download button for quick reference.

## Recommended site workflow

Use the category based on the purpose of the record:

- **Issue / Concern** — defect, conflict, discrepancy, or item requiring action
- **Site Note** — observation or reminder per room/area
- **Design Approval** — owner/architect decision needed
- **Punch List** — turnover or rectification item
- **Progress Photo** — documentation only
- **Drawing Clarification** — unclear drawing/detail that needs confirmation
- **Owner Decision** — decision needed from owner/client

Use status consistently:

- **Open** — newly recorded
- **For Action** — assigned to contractor/foreman/supplier
- **In Progress** — work or rectification ongoing
- **For Approval** — needs architect/owner approval
- **For Verification** — inspector must check if resolved
- **Resolved** — work completed but not final closed
- **Closed** — verified and accepted
