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