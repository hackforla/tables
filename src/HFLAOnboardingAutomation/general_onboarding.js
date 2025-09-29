/**
 * Automates the general onboarding process for a volunteer.
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} preferredEmail - Volunteer's preferred email.
 * @param {string} gmail - Volunteer's Gmail address.
 * @param {string} githubHandle - Volunteer's GitHub handle.
 * @param {string} copName - Community of Practice name(s), comma-separated.
 * @param {boolean} conduct - Whether the Code of Conduct was accepted.
 * @param {string} passphrase - The entered passphrase.
 * @param {string} linkedin - Volunteer's LinkedIn profile.
 * @param {string} zoomEmail - Volunteer's Zoom email.
 * @param {boolean} attnVerified - Whether attendance is verified.
 * @param {number} recordId - The record ID (row number).
 * @returns {Object} - { status: 'success'|'error', message: string }
 */
function onboardingAutomation(nameFirst, nameLast, preferredEmail, gmail, githubHandle, copName, conduct, passphrase, linkedin, zoomEmail, attnVerified, recordId) {
  try {
    let isVerified = attnVerified;

    // If not verified yet, check Zoom Attendance report
    if (!isVerified) {
        isVerified = verifyZoomAttendance(preferredEmail, gmail, zoomEmail, recordId);
      }
      
    // Proceed only if Zoom report verification succeeded or attn_verified is true(manual override)
    if (isVerified) {
      Logger.log(`Proceeding with onboarding for ${nameFirst} ${nameLast}`);
      addUsersToPlatforms(nameFirst, nameLast, preferredEmail, gmail, githubHandle, copName, conduct, passphrase);
      return { status: 'success', message: `Onboarded ${nameFirst} ${nameLast} successfully` };
    } else {
      Logger.log(`User ${nameFirst} ${nameLast} not verified for attendance`);
      errorMessage(nameFirst, nameLast, 'User is not onboarded');
      return { status: 'error', message: 'User not verified for attendance' };
    }
  } catch (error) {
    Logger.log(`Error onboarding ${nameFirst} ${nameLast}: ${error.message}`);
    errorMessage(nameFirst, nameLast, `Onboarding failed: ${error.message}`, preferredEmail || gmail);
    return { status: 'error', message: error.message };
  }
}
/**
 * Verifies Part1_onboarding Zoom attendance and updates the Volunteers sheet.
 * @param {string} preferredEmail - Volunteer's preferred email.
 * @param {string} gmail - Volunteer's Gmail address.
 * @param {string} zoomEmail - Volunteer's Zoom email.
 * @param {number} rowId - The row ID in the Volunteers sheet.
 * @returns {boolean} - True if attendance is verified, false otherwise.
 */
function verifyZoomAttendance(preferredEmail, gmail, zoomEmail, rowId) {

  try {

    // Try opening Zoom report spreadsheet by ID
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_IDS.ZOOM_REPORT);
    } catch (e) {
      const files = DriveApp.getRootFolder().getFilesByName(CONFIG.ZOOM_REPORT_NAME);
      if (!files.hasNext()) {
        throw new Error(`Zoom attendee spreadsheet "${CONFIG.ZOOM_REPORT_NAME}" not found`);
      }
      spreadsheet = SpreadsheetApp.openById(files.next().getId());
    }
    //load all the tabs in zoom attendee report's sheet
    const sheets = spreadsheet.getSheets();
    // Get today's date in "YYYY-MM-DD" format as tab's name in the report
    const todayFormatted = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
    //const todayFormatted = "2025-05-13"//for testing purpose

    // Find sheet's tab with today’s date as name
    const latestSheet = sheets.find(sheet => sheet.getName() === todayFormatted);
    if (!latestSheet) {
      throw new Error(`No sheet found for ${todayFormatted} in ${CONFIG.ZOOM_REPORT_NAME}`);
    }

    //get attendee's report data
    const data = latestSheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf('user_email');
    const verifiedIndex = headers.indexOf('attended');
    if (emailIndex === -1 || verifiedIndex === -1) {
      throw new Error(`Missing required columns in Zoom report: user_email=${emailIndex}, attended=${verifiedIndex}`);
    }

    let userEmail = null;//attendee's email on attendee report
    //match preferredEmail, gmail, zoomEmail, record_id with the email in attendee report
    for (let i = 0; i < data.length; i++) {
      const zoomEmailLower = data[i][emailIndex].toString().toLowerCase();
      if (zoomEmailLower === ((preferredEmail || '').toLowerCase()) ||
          zoomEmailLower === ((gmail || '').toLowerCase()) ||
          zoomEmailLower === ((zoomEmail || '').toLowerCase())) {
        userEmail = data[i][emailIndex];
        latestSheet.getRange(i + 2, verifiedIndex + 1).setValue(true);// check the attn_verified box for Part1_onboarding_zoom_attendee_report on google sheet
        Logger.log(`Marked attended for ${userEmail} in Part1_onboarding_zoom_attendee_report at row ${i + 2}`);
        break;
      }
    }

    //check attendance duration cutoff
    let durationString = 'did not attend';
    let isVerified = false;
    if (userEmail) {
      const startTime = getOnboardingStartTime();//get onboarding event start time
      if (!startTime) {
        throw new Error('No onboarding start time found for today');
      }
      const fullDuration = getMaxDuration(CONFIG.ZOOM_ATTENDANCE_REF_ACCOUNT, data, startTime);
      const userDuration = getMaxDuration(userEmail, data, startTime);//user may hop on and hop off multiple time, take the longest duration
      if (userDuration / fullDuration > CONFIG.ZOOM_ATTENDANCE_THRESHOLD) {
        isVerified = true;
      }
      durationString = `${Math.floor(userDuration / 60)} mins, ${Math.floor((userDuration / fullDuration) * 100)}%`;
    }

    // Update Volunteers sheet

    // Get all data from the sheet
    const volunteerSheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.VOLUNTEERS);
    // Find the column index for 'preferred_email' and 'attn-verified'
    const headersVolunteer = volunteerSheet.getRange(1, 1, 1, volunteerSheet.getLastColumn()).getValues()[0];
    const attnVerifiedCol = headersVolunteer.indexOf('attn-verified');
    const durationCol = headersVolunteer.indexOf('attn-duration');
    if (attnVerifiedCol === -1 || durationCol === -1) {
      throw new Error(`Missing columns in Volunteers sheet: attn-verified=${attnVerifiedCol}, attn-duration=${durationCol}`);
    }
    //update  attnVerified and duration for the user
    volunteerSheet.getRange(rowId, attnVerifiedCol + 1).setValue(isVerified);
    volunteerSheet.getRange(rowId, durationCol + 1).setValue(durationString);

    return isVerified;
  } catch (error) {
    Logger.log(`Error in verifyZoomAttendance: ${error.message}`);
    errorMessage('AttendanceVerification', 'N/A', `Zoom attendance verification failed: ${error.message}`);
    return false;
  }
}
/**
 * Helper function to calculates the maximum attendance duration for a user.
 * if attendee join before start time deduct it from duration
 * @param {string} email - The email to check.
 * @param {Array} data - The Zoom report data.
 * @param {Date} startTime - The onboarding event start time.
 * @returns {number} - The maximum duration in seconds.
 */
function getMaxDuration(email, data, startTime){
  
  const headers = data[0];
  const emailIndex = headers.indexOf("user_email");
  const durationIndex = headers.indexOf("duration");
  const joinTimeIndex = headers.indexOf("join_time");
  if (emailIndex === -1 || durationIndex === -1 || joinTimeIndex === -1) {
    throw new Error('Missing required columns in Zoom report data');
  }
  let maxDuration = 0;

  for(let i = 1; i < data.length; i++){
    if(data[i][emailIndex] == email){
      let duration = data[i][durationIndex];
      // Adjust duration if attendee joined before startTime
      if (data[i][joinTimeIndex] < startTime){
        const timeDiffSec = (startTime - data[i][joinTimeIndex]) / 1000;
        duration = duration - timeDiffSec //deduct the time attendee join early
      }
      // Update max_duration if current duration is larger
      maxDuration = Math.max(maxDuration, duration);
    }
  }
  return maxDuration
}
/**
 * Helper function to retrieves the onboarding event start time for today from HFLA volunteers - onboarding schedule.
 * @returns {Date|null} - The start time or null if not found.
 */
function getOnboardingStartTime(){
  try {
    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.ONBOARDING_SCHEDULE);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error('No data rows in Onboarding_Schedule sheet');
    }

    const today = new Date();
    const todayPST = new Date(today.getTime());
    //const todayPST = new Date(2025, 4, 13); // May 13, 2025 (month is 0-based)for testing purpose
    todayPST.setHours(0, 0, 0, 0);// Normalize to midnight for comparison

    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Columns A (date), B (day of week), C (on)
    for (const [rowDate, , startTime] of data) {
      if (!rowDate || !startTime) continue;// Skip rows with empty date or start time
      rowDate.setHours(0, 0, 0, 0);// Normalize to midnight for comparison
      rowDate.getTime(todayPST.getTime())
      if (rowDate.getTime() === todayPST.getTime()) {
        const timeString = Utilities.formatDate(startTime, CONFIG.TIME_ZONE, 'HH:mm'); //parse start_time to string
        const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);// Validate and parse hh:mm format
        if (!timeMatch) {
          throw new Error(`Invalid time format: ${timeString}`);
        }
        const [hours, minutes] = timeMatch.slice(1).map(Number);
        // Create Date object with today's date and the parsed time
        const startTimeDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate(), hours, minutes);
        // Validate the resulting Date object
        if (isNaN(startTimeDate)) {
          throw new Error(`Error: Invalid Date created from start_time in row ${i + 2}: ${start_time}`);
        }
        Logger.log(`Found matching onboarding start time: ${startTimeDate}`);
        return startTimeDate;
      }
    }
    Logger.log('No onboarding event found for today');
    return null;
  } catch (error) {
    Logger.log(`Error in getOnboardingStartTime: ${error.message}`);
    return null;
  }
}

/**
 * Helper function to retrieves the onboarding event start time for today from HFLA volunteers - onboarding schedule.
 * @returns {Date|null} - The start time or null if not found.
 */
function getOnboardingStartTime(){
  try {
    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.ONBOARDING_SCHEDULE);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error('No data rows in Onboarding_Schedule sheet');
    }

    const today = new Date();
    const todayPST = new Date(today.getTime());
    //const todayPST = new Date(2025, 4, 13); // May 13, 2025 (month is 0-based)for testing purpose
    todayPST.setHours(0, 0, 0, 0);// Normalize to midnight for comparison

    const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Columns A (date), B (day of week), C (on)
    for (const [rowDate, , startTime] of data) {
      if (!rowDate || !startTime) continue;// Skip rows with empty date or start time
      rowDate.setHours(0, 0, 0, 0);// Normalize to midnight for comparison
      rowDate.getTime(todayPST.getTime())
      if (rowDate.getTime() === todayPST.getTime()) {
        const timeString = Utilities.formatDate(startTime, CONFIG.TIME_ZONE, 'HH:mm'); //parse start_time to string
        const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);// Validate and parse hh:mm format
        if (!timeMatch) {
          throw new Error(`Invalid time format: ${timeString}`);
        }
        const [hours, minutes] = timeMatch.slice(1).map(Number);
        // Create Date object with today's date and the parsed time
        const startTimeDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate(), hours, minutes);
        // Validate the resulting Date object
        if (isNaN(startTimeDate)) {
          throw new Error(`Error: Invalid Date created from start_time in row ${i + 2}: ${start_time}`);
        }
        Logger.log(`Found matching onboarding start time: ${startTimeDate}`);
        return startTimeDate;
      }
    }
    Logger.log('No onboarding event found for today');
    return null;
  } catch (error) {
    Logger.log(`Error in getOnboardingStartTime: ${error.message}`);
    return null;
  }
}

/**
 * Adds a volunteer to platforms (Google Drive, GitHub, Zoom).
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} preferredEmail - Volunteer's preferred email.
 * @param {string} email - Volunteer's Gmail address.
 * @param {string} githubHandle - Volunteer's GitHub handle.
 * @param {string} cop - Community of Practice name(s), comma-separated.
 * @param {boolean} conduct - Whether the Code of Conduct was accepted.
 * @param {string} passphrase - The entered passphrase.
 */
function addUsersToPlatforms(nameFirst, nameLast, preferredEmail, email, githubHandle, cop, conduct, passphrase) {
  try {
    if (!conduct) {
      throw new Error('Code of Conduct not accepted');
    }
    if (passphrase.toLowerCase() !== CONFIG.PASSHRASE) {
      errorMessage(nameFirst, nameLast, 'Incorrect passphrase', preferredEmail);
      sendPassphraseEmailToUser(preferredEmail);
      throw new Error('Incorrect passphrase');
    }
    if (!cop) {
      throw new Error('Community of Practice (CoP) is empty');
    }
    const copList = cop.split(',').map(c => c.trim()).filter(c => c);
    if (copList.length === 0) {
      throw new Error('No valid CoP names provided');
    }
    const copSheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.COP);
    const data = copSheet.getRange(2, 1, copSheet.getLastRow() - 1, copSheet.getLastColumn()).getValues();
    const headers = copSheet.getRange(1, 1, 1, copSheet.getLastColumn()).getValues()[0];
    const copNameCol = headers.indexOf('cop_name');
    const driveCol = headers.indexOf('google_drive_id');
    const repoCol = headers.indexOf('repo_team');
    const zoomIdCol = headers.indexOf('zoom_meeting_id');
    if (copNameCol === -1 || driveCol === -1 || repoCol === -1 || zoomIdCol === -1) {
      throw new Error('Missing required CoP sheet columns');
    }

    // Loop through all COP(s) associated with the volunteer
    for (const copName of copList) {
      const foundRow = data.find(row => row[copNameCol] === copName);
      if (!foundRow) {
        throw new Error(`Invalid CoP: ${copName}`);
      }

      const copDriveId = foundRow[driveCol];
      const copGhTeam = foundRow[repoCol];
      const copZoomId = foundRow[zoomIdCol]?.toString();

      //onboarding user
      addUserToDrive(nameFirst, nameLast, email || preferredEmail, copDriveId);
      addUserToGitHub(nameFirst, nameLast, githubHandle, copGhTeam);
      //guard clause for empty zoomID, No current meeting invite for Product Management, Dev Ops, Marketing, Data Science, Revenue
      if (copZoomId) {
        addUserToMeeting(nameFirst, nameLast, preferredEmail, copZoomId);
      }
    }
    Logger.log(`Finished onboarding ${nameFirst} ${nameLast} to ${copList.join(', ')}`);
  } catch (error) {
    errorMessage(nameFirst, nameLast, `Add to Platform failed: ${error.message}`, email || preferredEmail);
    throw error;
  }
}

/**
 * Adds a volunteer to a Google Shared Drive.
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} email - The email to add.
 * @param {string} driveId - The Google Drive ID.
 * @returns {number} - Execution time in seconds.
 */
function addUserToDrive(nameFirst, nameLast, email, driveId) {
  Logger.log(`Adding ${nameFirst} ${nameLast} to Drive ${driveId}`);
  const start = new Date();
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email: ${email}`);
  }
  if (!driveId) {
    throw new Error('Drive ID is required');
  }

  const properties = {
    role: 'writer',
    value: email,
    type: 'user'
  };

  try {
    Drive.Permissions.insert(properties, driveId, { sendNotificationEmails: true, supportsAllDrives: true });
    Drive.Permissions.insert(properties, CONFIG.KNOWLEDGE_DRIVE_ID, { sendNotificationEmails: true, supportsAllDrives: true });
    return (new Date() - start) / 1000;
  } catch (error) {
    throw new Error(`Failed to add ${email} to Drive ${driveId}: ${error.message}`);
  }
}
/**
 * Adds a volunteer to a GitHub team.
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} githubHandle - Volunteer's GitHub handle.
 * @param {string} githubTeam - The GitHub team slug.
 * @returns {number} - Execution time in seconds.
 */
function addUserToGitHub(nameFirst, nameLast, githubHandle, githubTeam) {
  Logger.log(`Adding ${githubHandle} to GitHub team ${githubTeam}`);
  const start = new Date();
  if (!isValidGitHubHandle(githubHandle)) {
    throw new Error(`Invalid GitHub handle: ${githubHandle}`);
  }
  if (!githubTeam) {
    throw new Error('GitHub team is required');
  }

  const options = {
    method: 'PUT',
    headers: { Authorization: `token ${getScriptSecret('GITHUB_TOKEN')}` },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(`https://api.github.com/orgs/hackforla/teams/${githubTeam}/memberships/${githubHandle}`, options);
    const res = JSON.parse(response.getContentText());
    if (!res.state) {
      throw new Error(`GitHub API response missing state for ${githubHandle}`);
    }
    return (new Date() - start) / 1000;
  } catch (error) {
    throw new Error(`Failed to add ${githubHandle} to team ${githubTeam}: ${error.message}`);
  }
}

/**
 * Adds a volunteer to a Zoom meeting.
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} email - Volunteer's email.
 * @param {string} zoomId - The Zoom meeting ID.
 */
function addUserToMeeting(nameFirst, nameLast, email, zoomId) {
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email: ${email}`);
  }
  if (!zoomId) {
    throw new Error('Zoom meeting ID is required');
  }

  Logger.log(`Adding ${nameFirst} ${nameLast} to Zoom meeting ${zoomId}`);
  const url = `https://api.zoom.us/v2/meetings/${zoomId}/registrants`;
  const payload = JSON.stringify({
    first_name: nameFirst,
    last_name: nameLast,
    email: email
  });

  try {
    const response = accessProtectedResource(url, 'post', { 'Content-Type': 'application/json; charset=utf-8' }, payload);
    JSON.parse(response); // Validate response
  } catch (error) {
    throw new Error(`Failed to add ${email} to Zoom meeting ${zoomId}: ${error.message}`);
  }
}

/**
 * Makes an OAuth-protected API request to Zoom.
 * @param {string} url - The API endpoint.
 * @param {string} method - The HTTP method (default: 'get').
 * @param {Object} headers - Additional headers.
 * @param {string} payload - The request payload.
 * @returns {string} - The response content.
 * @throws {Error} - If the request fails.
 */
function accessProtectedResource(url, method = 'get', headers = {}, payload) {
  const token = getClientCredentialsToken();
  headers['Authorization'] = `Bearer ${token}`;
  headers['Content-Type'] = headers['Content-Type'] || 'application/json; charset=utf-8';

  const options = {
    headers,
    method,
    muteHttpExceptions: true,
    contentType: 'application/json'
  };
  if (payload) {
    options.payload = payload;
  }

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return response.getContentText('utf-8');
  }

  const errorText = response.getContentText('utf-8');
  let errorMessage = errorText;
  if (errorText.includes('<error>')) {
    const codeMatch = errorText.match(/<code>(\d+)<\/code>/);
    const messageMatch = errorText.match(/<message>([^<]+)<\/message>/);
    errorMessage = `Zoom API Error: Code ${codeMatch ? codeMatch[1] : 'Unknown'}, Message: ${messageMatch ? messageMatch[1] : 'Unknown'}`;
  }
  throw new Error(`Zoom API request failed (${code}): ${errorMessage}`);
}
/**
 * Retrieves a Zoom OAuth token.
 * @returns {string} - The access token.
 * @throws {Error} - If token retrieval fails.
 */
function getClientCredentialsToken() {
  const url = 'https://zoom.us/oauth/token';
  const payload = {
    grant_type: 'account_credentials',
    account_id: getScriptSecret('ZOOM_ACCOUNT_ID')
  };
  const options = {
    method: 'post',
    payload,
    headers: {
      Authorization: `Basic ${Utilities.base64Encode(`${getScriptSecret('ZOOM_CLIENT_ID')}:${getScriptSecret('ZOOM_CLIENT_SECRET')}`)}`
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return result.access_token;
  } catch (error) {
    throw new Error(`Failed to retrieve Zoom token: ${error.message}`);
  }
}
/**
 * Retrieves a secret from Script Properties.
 * @param {string} key - The secret key.
 * @returns {string} - The secret value.
 * @throws {Error} - If the secret is not found.
 */
function getScriptSecret(key) {
  const secret = PropertiesService.getScriptProperties().getProperty(key);
  if (!secret) {
    throw new Error(`Secret ${key} not found in Script Properties`);
  }
  return secret;
}
/**
 * Sends an error email to the configured address.
 * @param {string} nameFirst - Volunteer's first name.
 * @param {string} nameLast - Volunteer's last name.
 * @param {string} error - The error message.
 * @param {string} [email] - Optional email to include in the message.
 */
function errorMessage(nameFirst, nameLast, error, email) {
  const subject = `${nameFirst} ${nameLast} Onboarding Error`;
  const message = email ? `${email}\n${error}` : error;
  Logger.log(`${subject}: ${error}`);
  MailApp.sendEmail(CONFIG.ERROR_EMAIL, subject, message);
}

/**
 * Sends a passphrase error email to the volunteer.
 * @param {string} email - The volunteer's email.
 */
function sendPassphraseEmailToUser(email) {
  if (!isValidEmail(email)) {
    Logger.log(`Invalid email for passphrase notification: ${email}`);
    return;
  }
  MailApp.sendEmail(email, 'Hack For LA Onboarding: Incorrect Passphrase',
    'You did not provide the correct passphrase from the Code of Conduct. Please go to the tech support room to provide the proper passphrase.');
}
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

