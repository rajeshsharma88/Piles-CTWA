/**
 * Google Sheet webhook for verified leads from the order modal.
 *
 * Setup:
 * 1. Create/open a Google Sheet for storing leads.
 * 2. Make sure row 1 has these headers (case-sensitive):
 *      Timestamp | Name | Mobile | Age | Address | Verified At | Source
 *    The script auto-creates them if the sheet is empty.
 * 3. Extensions -> Apps Script, delete the boilerplate, paste this in.
 *    Save the project (e.g. "Piles CTWA Lead Capture").
 * 4. Deploy -> New deployment -> type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Copy the deployment URL.
 * 5. Paste the URL into GOOGLE_SHEET_WEBHOOK_URL in api/lib/config.php
 *    on the server.
 * 6. After ANY code change, Deploy -> Manage deployments -> edit ->
 *    "New version" -> Deploy, and re-paste the URL (it stays the same
 *    if "Execute as: Me" is kept).
 */

const HEADERS = [
  'Timestamp',
  'Name',
  'Mobile',
  'Age',
  'Address',
  'Verified At',
  'Source',
];

// Best-effort header setup. If the script lacks permission to modify the
// sheet (e.g. container-bound to a different sheet, or scopes stripped),
// this throws — we catch it in doPost and skip silently rather than
// blocking the lead write. Headers can be added by hand once.
function ensureHeaders(sheet) {
  if (!sheet) {
    Logger.log('ensureHeaders: no sheet provided, skipping');
    return;
  }
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setFrozen(true);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const missing = HEADERS.filter(h => existing.indexOf(h) === -1);
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length)
      .setValues([missing])
      .setFontWeight('bold');
  }
}

// Manual one-time setup. Open the script, select "setupHeaders" from the
// function dropdown, click Run. Authorize if prompted.
function setupHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeaders(sheet);
  Logger.log('Headers OK. Columns: ' + sheet.getLastColumn());
}

function isValidMobile(m) {
  return typeof m === 'string' && /^[6-9]\d{9}$/.test(m);
}

function jsonOutput(obj, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonOutput({ ok: false, error: 'No payload received' });
  }

  let data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Invalid JSON' });
  }

  if (!isValidMobile(data.mobile)) {
    return jsonOutput({ ok: false, error: 'Invalid mobile' });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (!sheet) {
    return jsonOutput({ ok: false, error: 'No active sheet' });
  }
  try {
    ensureHeaders(sheet);
  } catch (err) {
    // Header write failed (e.g. read-only scope, detached sheet). Don't
    // block the lead write — the appendRow below can still succeed, and
    // headers can be added by hand or via setupHeaders().
    Logger.log('ensureHeaders skipped: ' + err.message);
  }

  sheet.appendRow([
    new Date(),
    String(data.name || '').slice(0, 200),
    String(data.mobile),
    Number(data.age) || '',
    String(data.address || '').slice(0, 500),
    data.verifiedAt || '',
    String(data.source || '3a-piles-kit').slice(0, 100),
  ]);

  return jsonOutput({ ok: true });
}

// Optional: handle accidental GETs with a clear error instead of 404.
function doGet() {
  return jsonOutput({ ok: false, error: 'POST only' });
}