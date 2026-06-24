# TAWIRAN GOCO — Site Progress & Inspection Dashboard

This is a static starter web app for site inspection and physical progress tracking.

## What it does

- Input site inspection data per area, trade/category, and scope item
- Attach photo proof using phone/tablet camera upload
- Track progress percentage per scope
- Calculate category progress and overall project progress using cost weights
- Prevent accidental 100% marking unless turnover-ready checklist is complete
- Auto-identify open punchlist items
- Generate a printable Bossing Report
- Export JSON backup and CSV records

## How to use

1. Open `index.html` in a browser.
2. Go to **Settings** and edit project name, prepared by, area list, budgets, and scope items if needed.
3. Go to **New Inspection** during site visit.
4. Input area, category, scope, status, progress, remarks, and photos.
5. Check **Dashboard** for project progress.
6. Print **Bossing Report** after site visit.

## Important rule

100% means turnover-ready:

- Quantity complete
- Correct as per plan/specs
- Workmanship acceptable
- Required test passed or not applicable
- Punchlist closed
- Photo proof attached
- Accepted for billing/reporting

If any item is missing, the app caps the progress below 100%.

## Data storage

This version uses browser LocalStorage. Data stays in the device/browser where it was entered. Always use **Export JSON** after site visit as backup.

## Future upgrade

This can later be connected to:

- Google Sheets as database
- Google Drive for photo storage
- Google Apps Script backend
- GitHub Pages hosting
