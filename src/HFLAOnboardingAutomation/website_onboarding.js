/**
 * Automates onboarding for the Hack for LA website team.
 * @param {string} firstName - Volunteer's first name.
 * @param {string} lastName - Volunteer's last name.
 * @param {string} gmail - Volunteer's Gmail address.
 * @param {string} githubHandle - Volunteer's GitHub handle.
 * @param {number} recordId - The record ID (row number).
 * @returns {Object} - { status: 'success'|'error', message: string }
 */
function website_onboardingAutomation(firstName, lastName, gmail, githubHandle, recordId) {
  try {
    if (!isValidEmail(gmail)) {
      throw new Error(`Invalid Gmail: ${gmail}`);
    }
    if (!isValidGitHubHandle(githubHandle)) {
      throw new Error(`Invalid GitHub handle: ${githubHandle}`);
    }
    if (!recordId || isNaN(recordId)) {
      throw new Error(`Invalid record ID: ${recordId}`);
    }

    Logger.log(`Starting website onboarding for ${firstName} ${lastName} (record ${recordId})`);
    const driveId = getProjectDriveId(CONFIG.WEBSITE.PROJECT_NAME);
    if (!driveId) {
      throw new Error(`Drive ID not found for project ${CONFIG.WEBSITE.PROJECT_NAME}`);
    }

    const driveResult = addUserToWebsiteDrive(firstName, lastName, gmail, driveId);//add to website team drive
    const githubResult = addToWebsiteGithubTeams(githubHandle, CONFIG.WEBSITE.GITHUB_ROLE, CONFIG.WEBSITE.GITHUB_TEAMS);//add to website read team & write team

    Logger.log(`Website onboarding completed for ${firstName} ${lastName}: ,GDrive: ${driveResult.status}, GitHub:${githubResult.status}`);
    return { status: 'success', message: `Onboarded ${firstName} ${lastName} to website team` };
  } catch (error) {
    Logger.log(`Website onboarding error for ${firstName} ${lastName}: ${error.message}`);
    errorMessage(firstName, lastName, `Website Onboarding failed: ${error.message}`, gmail);
    return { status: 'error', message: error.message };
  }
}
/**
 * Retrieves the Google Drive ID for a project.
 * @param {string} projectName - The project name.
 * @returns {string|null} - The Drive ID or null if not found.
 */
function getProjectDriveId(projectName) {
  try {
    if (!projectName) {
      throw new Error('Project name is required');
    }

    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.PROJECTS);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error('No data rows in Projects sheet');
    }

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const projectCol = headers.indexOf('project_name');
    const gdriveCol = headers.indexOf('google_drive_main_id');
    if (projectCol === -1 || gdriveCol === -1) {
      throw new Error(`Missing columns: project_name=${projectCol}, google_drive_main_id=${gdriveCol}`);
    }

    const projectRow = data.find(row => row[projectCol] === projectName);
    if (!projectRow) {
      throw new Error(`Project ${projectName} not found`);
    }

    const driveId = projectRow[gdriveCol];
    Logger.log(`Drive ID for ${projectName}: ${driveId}`);
    return driveId;
  } catch (error) {
    Logger.log(`Error in getProjectDriveId: ${error.message}`);
    return null;
  }
}

/**
 * Adds a user to specified GitHub teams.
 * @param {string} invitee - The GitHub handle.
 * @param {string} role - The role ('member' or 'maintainer').
 * @param {string[]} teams - The team slugs.
 * @returns {Object} - { status: 'success'|'error', message: string }
 */
function addToWebsiteGithubTeams(invitee, role, teams) {
  try {
    if (!isValidGitHubHandle(invitee)) {
      throw new Error(`Invalid GitHub handle: ${invitee}`);
    }
    if (!role || !['member', 'maintainer'].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      throw new Error('At least one team is required');
    }

    const env = getEnv();
    const requests = teams
      .filter(team => team)
      .map(team => getGithubRequest(env, invitee, team, 'put', role));

    if (requests.length === 0) {
      throw new Error(`No valid teams to add ${invitee} to`);
    }

    const responses = UrlFetchApp.fetchAll(requests);
    let success = false;
    const messages = [];
    responses.forEach((response, index) => {
      const responseCode = response.getResponseCode();
      if (responseCode === 200) {
        success = true;
        messages.push(`Added ${invitee} to team ${teams[index]} as ${role}`);
      } else {
        messages.push(`Failed to add ${invitee} to team ${teams[index]}: ${response.getContentText()}`);
      }
    });

    Logger.log(`GitHub team results: ${messages.join('; ')}`);
    return {
      status: success ? 'success' : 'error',
      message: success ? `Added ${invitee} to GitHub teams` : `Failed to add ${invitee} to some or all teams: ${messages.join('; ')}`
    };
  } catch (error) {
    Logger.log(`Error in addToWebsiteGithubTeams: ${error.message}`);
    return { status: 'error', message: error.message };
  }
}

/**
 * Adds a user to the website team Google Drive.
 * @param {string} firstName - Volunteer's first name.
 * @param {string} lastName - Volunteer's last name.
 * @param {string} gmail - Volunteer's Gmail address.
 * @param {string} driveId - The Google Drive ID.
 * @returns {number} - Execution time in seconds.
 */
function addUserToWebsiteDrive(firstName, lastName, gmail, driveId) {
  Logger.log(`Adding ${firstName} ${lastName} to Drive ${driveId}`);

  if (!isValidEmail(gmail)) {
    throw new Error(`Invalid Gmail: ${gmail}`);
  }
  if (!driveId) {
    throw new Error('Drive ID is required');
  }

  const properties = {
    role: 'writer',
    value: gmail,
    type: 'user'
  };

  try {
    Drive.Permissions.insert(properties, driveId, {
      sendNotificationEmails: true,
      supportsAllDrives: true
    });
    return {
      status: 'success',
      message: `Added ${firstName} ${lastName} to Drive ${driveId}`
    };
  } catch (error) {
    throw new Error(`Failed to add ${gmail} to Drive ${driveId}: ${error.message}`);
  }
}

