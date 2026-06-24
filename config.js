/*
  GOCO TAWIRAN Site Inspection App Configuration
  1. Deploy google-apps-script.gs as a Google Apps Script Web App.
  2. Paste the Web App URL below.
*/
window.GOCO_CONFIG = {
  PROJECT_NAME: "GOCO TAWIRAN",
  PROJECT_LOCATION: "Brgy. Tawiran, Calapan City",
  PROJECT_DESCRIPTION: "Two-Storey Residential / Commercial Building",

  // Paste your Google Apps Script Web App URL here.
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwrDHopyNfO3HWqLHnl3v8Nz_0qAB7_qvwMjgBfhbcAla81QPV3PePHk_qd3pSbb7fg/exec",

  // Keeps a device backup in browser storage. Helpful when signal is weak on site.
  ENABLE_LOCAL_BACKUP: true,

  // v5: require Google Sheet user login. Set false only for personal/offline testing.
  REQUIRE_LOGIN: true,

  // Maximum uploaded photo width/height before sending to Apps Script.
  PHOTO_MAX_SIZE: 1600,
  PHOTO_JPEG_QUALITY: 0.78
};
