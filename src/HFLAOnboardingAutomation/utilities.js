/**
 * Validates an email address.
 * @param {string} email - The email to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a GitHub handle.
 * @param {string} handle - The GitHub handle to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidGitHubHandle(handle) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(handle);
}

/**
 * Retrieves a sheet by ID from a spreadsheet.
 * @param {string} spreadsheetId - The spreadsheet ID.
 * @param {number} sheetId - The sheet GID.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} - The sheet object.
 * @throws {Error} - If the spreadsheet or sheet is not found.
 */
function getSheetById(spreadsheetId, sheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheets().find(s => s.getSheetId() === sheetId);
  if (!sheet) {
    throw new Error(`Sheet ID ${sheetId} not found in spreadsheet ${spreadsheetId}`);
  }
  return sheet;
}
/**
 * Constructs a GitHub API request for adding or removing a user from a team.
 * @param {Object} env - Environment variables.
 * @param {string} invitee - The GitHub handle.
 * @param {string} team - The team slug.
 * @param {string} [method='put'] - The HTTP method ('put' or 'delete').
 * @param {string} [role='member'] - The role for 'put' requests ('member' or 'maintainer').
 * @param {string} [url] - Optional URL; if not provided, defaults to team membership endpoint.
 * @returns {Object} - The request configuration.
 */
function getGithubRequest(env, invitee, team, method = 'put', role = 'member', url = '') {
  const requestUrl = url || `https://api.github.com/orgs/${env.GITHUB_ORG}/teams/${team}/memberships/${invitee}`;
  return {
    contentType: 'application/json',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    method,
    muteHttpExceptions: true,
    payload: method === 'put' ? JSON.stringify({ role }) : undefined,
    url: requestUrl
  };
}

/** 
 * Returns the log sheet (creates it the sheet + headers if it doesn't exist)
 * Uses its own dedicated spreadsheet ID – change this to your actual logs spreadsheet ID
 */
function getAutomationLogSheet() {
  // <<< PUT YOUR LOGS SPREADSHEET ID HERE >>>
  const LOG_SPREADSHEET_ID = '1sB-FSmO4fwuC7NvwKLqQh1STpG2e5F8twnvFM0lxClY'; // <-- CHANGE THIS

  const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
  const SHEET_NAME = "Project On/off board Automation_Logs";

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Action",            // onboarding or offboarding
      "Project Name",
      "GitHub Handle",
      "Role",              // blank for offboarding
      "Record ID",
      "Total Time (sec)",
      "Result Status",     // success / partial/error / no volunteer record
      "GitHub Comment URL",
      "Full Log JSON"
    ]);
    // Make header bold and freeze it
    const headerRange = sheet.getRange("A1:J1");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Appends the complete processLog to the log sheet
 */
function logAutomationProcess(processLog) {
  try {
    const sheet = getAutomationLogSheet();

    // Determine overall result status
    let resultStatus = "success";
    if (processLog.steps.some(s => s.status === "error" || (s.message && s.message.includes("error")))) {
      resultStatus = "partial/error";
    }
    if (processLog.steps.some(s => s.message && /No volunteer record found|not found in volunteer database/.test(s.message))) {
      resultStatus = "no volunteer record";
    }

    sheet.appendRow([
      processLog.timestamp || new Date().toISOString(),
      processLog.action || "",
      processLog.projectName || "",
      processLog.githubHandle || "",
      processLog.role || "",
      processLog.recordId || "",
      processLog.total_time_to_process ? (processLog.total_time_to_process / 1000).toFixed(3) : "",
      resultStatus,
      processLog.githubCommentUrl || "N/A",
      JSON.stringify(processLog, null, 2)  // full log for debugging
    ]);
  } catch (e) {
    // If logging itself fails, at least show it in the script log
    Logger.log("CRITICAL: Failed to write to automation log sheet: " + e);
  }
}