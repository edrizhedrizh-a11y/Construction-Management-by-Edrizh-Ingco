# GOCO TAWIRAN Site Inspection App v5

Mobile-first construction site inspection and project documentation app for **GOCO TAWIRAN**, a two-storey residential/commercial building in Brgy. Tawiran, Calapan City.

## v5 New Features

- User login from Google Sheet `Users` tab
- Master Admin / Site Inspector / Project In-Charge roles
- Created By, Created By Email, User ID, and User Role tracking on every record
- Master Admin page with records by user, in-charge, status, and area
- A4 JPG report generator with 1, 2, 4, or 6 cards per page
- Download JPG report pages for Messenger
- Upload generated JPG reports to Google Drive
- Report Exports log in Google Sheet
- Google Drive folders for photos and reports
- Photo image proxy so Drive images can be included in exported JPGs

## Files

- `index.html` - Add Site Record form
- `board.html` - Photo Issue Board
- `report.html` - A4 JPG Report Export
- `design-approval.html` - Design Approval Board
- `area-notes.html` - Area Notes Board
- `dashboard.html` - Dashboard
- `records.html` - Photo Reference Log
- `admin.html` - Master Admin page
- `login.html` - User login page
- `style.css` - App styling
- `app.js` - Frontend logic
- `config.js` - App configuration
- `google-apps-script.gs` - Google Apps Script backend
- `manifest.json` and `service-worker.js` - PWA install support
- `GOCO_TAWIRAN_Google_Sheet_Template_v5.xlsx` - Optional fresh Google Sheet template

## Important Update Note

If your current `config.js` already has a working Apps Script Web App URL, **do not overwrite it** unless you will paste the URL again.

For v5, your `config.js` can include this:

```js
REQUIRE_LOGIN: true,
```

If it is missing, the app still treats login as required by default. Set `REQUIRE_LOGIN: false` only for personal testing.

## Google Sheet Tabs

Required tabs are created/updated by `setupGocoTawiranSheet()`:

1. Issue Records
2. Photo Records
3. Design Approvals
4. Area Notes
5. Users
6. User Sessions
7. Report Exports
8. Lookups
9. Dashboard Export

## Default Login

After running setup, a default admin is created if the Users tab has no active users:

- Email: `admin@goco.local`
- PIN: `1234`
- Role: `Master Admin`

Change this immediately in the `Users` tab.

## Users Tab Columns

| Column | Purpose |
|---|---|
| User ID | Example: U-001 |
| Full Name | User display name |
| Email | Login email / username |
| PIN / Access Code | Simple PIN |
| Role | Master Admin, Project Architect, Site Inspector, In-Charge |
| Assigned Site / Zone | Use All or specific site |
| Assigned Area | Use All or specific area |
| Status | Active / Inactive |
| Can View All | Yes / No |
| Can Export Reports | Yes / No |
| Created At | Date created |
| Remarks | Notes |

## Recommended Users

| User ID | Full Name | Email | PIN | Role | View All | Export |
|---|---|---|---|---|---|---|
| U-001 | Edrizh Ingco | your@email.com | 1234 | Master Admin | Yes | Yes |
| U-002 | Site Inspector 1 | inspector1@goco.local | 1111 | Site Inspector | No | Yes |
| U-003 | Foreman 1 | foreman1@goco.local | 2222 | In-Charge | No | No |

## Google Drive Folder Structure

Photos:

```text
Main Drive Folder
└── GOCO TAWIRAN
    └── 01_SITE PHOTOS
        └── YYYY-MM-DD
            └── Site / Zone
                └── Floor Level
                    └── Area
                        └── Trade / Scope
                            └── Photo files
```

Report JPG exports:

```text
Main Drive Folder
└── GOCO TAWIRAN PROJECT DOCUMENTATION
    └── 02_PHOTO ISSUE BOARDS
        └── YYYY-MM-DD
            └── JPG
                └── A4 report JPG files
```

## Update Existing Website to v5

1. Download/extract the v5 ZIP.
2. In GitHub, upload/overwrite these files:
   - `index.html`
   - `board.html`
   - `report.html`
   - `design-approval.html`
   - `area-notes.html`
   - `dashboard.html`
   - `records.html`
   - `admin.html`
   - `login.html`
   - `style.css`
   - `app.js`
   - `service-worker.js`
   - `manifest.json`
3. Do **not** overwrite `config.js` unless you will paste your Web App URL again.
4. In Google Apps Script, replace the script with `google-apps-script.gs`.
5. Paste back your:
   - `SPREADSHEET_ID`
   - `DRIVE_FOLDER_ID`
6. Run `setupGocoTawiranSheet()` once.
7. Deploy:
   - Deploy > Manage deployments
   - Edit pencil
   - Version: New version
   - Deploy
8. Open the app using cache-bust URL:

```text
https://YOUR-GITHUB-PAGES-URL/?v=50
```

## Export A4 JPG Report

1. Login.
2. Go to `Report` page.
3. Choose:
   - Photo Issue Board / Design Approval / Area Notes
   - 4 cards per A4 or 6 cards per A4
4. Use filters if needed.
5. Tap **Generate A4 JPG**.
6. Tap **Download JPG** to send via Messenger.
7. Tap **Upload JPG to Google Drive** to save report in Drive.

## Security Note

This is a lightweight Google Apps Script login suitable for project documentation workflow. It is not a banking-grade authentication system. Keep your Apps Script Web App URL private, manage users in the Sheet, and change the default admin PIN.
