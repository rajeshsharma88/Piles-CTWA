/**
 * Single Google Apps Script webhook for ALL leads from the 3A PILES KIT
 * landing page. Both forms post here and land in the SAME sheet:
 *
 *   1. Popup modal  -> Name, Mobile, Age, Address
 *   2. Inline form  -> Name, Mobile, City
 *
 * Missing fields are simply left blank, and the "Form" column records
 * which form the lead came from.
 *
 * ------------------------------------------------------------------
 * SETUP (5 minutes, one time)
 * ------------------------------------------------------------------
 * 1. Create/open the Google Sheet that should store the leads.
 * 2. Extensions -> Apps Script. Delete the boilerplate, paste this file in,
 *    and Save (name it e.g. "Piles Lead Capture").
 * 3. Run the `setupHeaders` function once (pick it in the function dropdown,
 *    click Run) and authorize when prompted. This creates the header row.
 * 4. Deploy -> New deployment -> type "Web app":
 *      - Description : Lead capture
 *      - Execute as  : Me
 *      - Who has access: Anyone          <-- MUST be "Anyone", not
 *                                            "Anyone with Google account"
 *    Deploy, then copy the /exec URL.
 * 5. Paste that URL into LEAD_WEBHOOK_URL at the top of lead-api.js.
 *
 * After ANY change to this file: Deploy -> Manage deployments -> pencil
 * (edit) -> Version: "New version" -> Deploy. The URL stays the same.
 *
 * NOTE ON BROWSER REQUESTS: Apps Script rejects CORS preflights, so the
 * page must post with Content-Type "text/plain;charset=utf-8" (lead-api.js
 * already does). This script parses both a JSON body and normal
 * form-encoded parameters, so either style works.
 */

// ---------- CONFIG ----------
// Which spreadsheet to write into. Leave '' to use the sheet this script is
// attached to. To send leads to a DIFFERENT sheet, paste its ID here — the
// long string in its URL between /d/ and /edit:
//   docs.google.com/spreadsheets/d/<THIS PART>/edit
// The Google account that owns this script must have edit access to it.
// After changing this: Deploy -> Manage deployments -> pencil -> New version.
// The /exec URL stays the same, so lead-api.js needs no change.
const SPREADSHEET_ID = '';

// Tab name to write to. It is created automatically if missing.
// Leave as '' to always use the first/active sheet instead.
const SHEET_NAME = 'Leads';

// Optional shared secret. If you set a value here, also set the same value
// as LEAD_WEBHOOK_SECRET in lead-api.js. Leave '' to disable the check.
const SHARED_SECRET = '';

// Column order. Add or reorder freely — rows are written by header NAME,
// so an extra column never shifts the data into the wrong place.
const HEADERS = [
  'Timestamp',
  'Name',
  'Mobile',
  'Age',
  'City',
  'Address',
  'Form',
  'Source',
  'Page',
];

// ---------- SHEET HELPERS ----------

function getSheet() {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!SHEET_NAME) return ss.getActiveSheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

/**
 * Makes sure every header in HEADERS exists in row 1, appending any that
 * are missing. Returns the full header row as written in the sheet.
 */
function ensureHeaders(sheet) {
  const lastCol = sheet.getLastColumn();

  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    return HEADERS.slice();
  }

  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const missing = HEADERS.filter(h => existing.indexOf(h) === -1);
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length)
      .setValues([missing])
      .setFontWeight('bold');
    return existing.concat(missing);
  }
  return existing;
}

/** Run this once from the editor to create the header row. */
function setupHeaders() {
  const sheet = getSheet();
  const headers = ensureHeaders(sheet);
  Logger.log('Sheet "%s" ready. Headers: %s', sheet.getName(), headers.join(' | '));
}

// ---------- VALIDATION / NORMALISATION ----------

/** Keeps digits only and drops a 91 / 0 prefix, then expects 10 digits. */
function normaliseMobile(raw) {
  let digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (digits.length > 10) digits = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function clean(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

function jsonOutput(obj) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

/** Reads the payload whether it arrived as JSON or as form parameters. */
function readPayload(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      const parsed = JSON.parse(e.postData.contents);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (err) {
      // Not JSON — fall through to e.parameter below.
    }
  }
  return (e && e.parameter) ? e.parameter : {};
}

// ---------- MAIN ENTRY POINT ----------

function doPost(e) {
  const data = readPayload(e);

  if (SHARED_SECRET && clean(data.secret, 100) !== SHARED_SECRET) {
    return jsonOutput({ ok: false, error: 'Unauthorized' });
  }

  // Honeypot: bots fill hidden fields, humans never see them.
  if (clean(data.company, 100) || clean(data.hp_no_fill_x92, 100)) {
    // Pretend everything is fine so the bot does not retry.
    return jsonOutput({ ok: true });
  }

  const name = clean(data.name, 200);
  const mobile = normaliseMobile(data.mobile);

  if (name.length < 2) {
    return jsonOutput({ ok: false, error: 'कृपया अपना पूरा नाम दर्ज करें' });
  }
  if (!mobile) {
    return jsonOutput({ ok: false, error: 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें' });
  }

  // Which form sent this? Trust an explicit value, else guess from fields.
  const form = clean(data.form, 50) || (clean(data.city, 100) ? 'inline-form' : 'popup-modal');

  const row = {
    'Timestamp': new Date(),
    'Name': name,
    'Mobile': "'" + mobile,          // leading quote keeps the leading digit
    'Age': clean(data.age, 10),
    'City': clean(data.city, 100),
    'Address': clean(data.address, 500),
    'Form': form,
    'Source': clean(data.source, 100) || '3a-piles-kit',
    'Page': clean(data.page, 300),
  };

  // Serialise concurrent submits so two leads never fight over the same row.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Server busy, please try again' });
  }

  try {
    const sheet = getSheet();
    const headers = ensureHeaders(sheet);
    // Build the row in the sheet's own column order.
    const values = headers.map(h => (h in row ? row[h] : ''));
    sheet.appendRow(values);
    return jsonOutput({ ok: true, form: form });
  } catch (err) {
    Logger.log('Lead write failed: ' + err.message);
    return jsonOutput({ ok: false, error: 'कुछ समस्या हुई, कृपया दोबारा प्रयास करें' });
  } finally {
    lock.releaseLock();
  }
}

/** Health check — open the /exec URL in a browser to confirm deployment. */
function doGet() {
  let sheetName = '(none)';
  let fileName = '(none)';
  try {
    const sheet = getSheet();
    sheetName = sheet.getName();
    fileName = sheet.getParent().getName();
  } catch (err) {
    sheetName = 'error: ' + err.message;
  }
  // Open the /exec URL in a browser to confirm WHICH sheet leads land in.
  return jsonOutput({
    ok: true,
    status: 'Lead webhook live',
    spreadsheet: fileName,
    sheet: sheetName,
  });
}
