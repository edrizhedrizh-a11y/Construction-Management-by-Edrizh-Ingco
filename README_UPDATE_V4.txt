GOCO TAWIRAN - Team + Drive Folder Update v4

WHAT THIS UPDATE ADDS
1. New site record fields:
   - Project Architect
   - Project In-Charge / Site Inspector
   - Site / Zone

2. Report cards now show:
   - Site / Zone
   - Project Architect
   - Project In-Charge
   - Photo Folder Path

3. Google Drive photo storage now creates folders automatically:
   Root Drive Folder
   └── GOCO TAWIRAN
       └── YYYY-MM-DD
           └── Site / Zone
               └── Floor Level
                   └── Area
                       └── Trade / Scope

FILES TO UPLOAD TO GITHUB
- index.html
- app.js
- style.css
- service-worker.js

DO NOT OVERWRITE config.js.
Your config.js already has the working Apps Script URL.

GOOGLE APPS SCRIPT UPDATE
1. Open your Google Sheet.
2. Extensions > Apps Script.
3. Replace the existing script with google-apps-script.gs from this update.
4. IMPORTANT: paste your current SPREADSHEET_ID and DRIVE_FOLDER_ID again at the top.
5. Run setupGocoTawiranSheet once.
6. Deploy > Manage deployments > Edit/pencil > Version: New version > Deploy.

AFTER UPLOADING
Open the app with a cache-buster:
https://edrizhedrizh-a1ly.github.io/Construction-Management-by-Edrizh-Ingco/?v=40

