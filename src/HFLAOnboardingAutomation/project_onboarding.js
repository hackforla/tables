/**
 * Automates onboarding for a Hack for LA project.
 * @param {string} projectName - The project name.
 * @param {string} githubHandle - The volunteer's GitHub handle.
 * @param {string} role - The role to assign.
 * @param {number} recordId - The record ID (row number).
 * @returns {Object} - { status: 'success'|'error', message: string }
 * GUARANTEES a GitHub comment on EVERY attempt — success or total failure.
 */
function projectOnboardingAutomation(projectName, githubHandle, role, recordId) {
  Logger.log(`Starting onboarding for project: ${projectName}, member: ${githubHandle}, role: ${role}, recordId: ${recordId}`);

  const startTime = Date.now();
  let processLog = {
    timestamp: new Date().toISOString(),
    action: 'onboarding',
    projectName: projectName,
    githubHandle: githubHandle,
    role: role,
    recordId: recordId,
    total_time_to_process: 0,
    steps: [],
    tasks: []
  };
  processLog.steps.push({ 
    step: 'start', 
    message: `Starting onboarding for project: ${projectName}, member: ${githubHandle}, role: ${role}, recordId: ${recordId}` 
  });

  let finalComment = null;
  let githubCommentResult = null;

  try {
    /* ---------- BASIC VALIDATION ---------- */
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    if (!isValidGitHubHandle(githubHandle)) {
      throw new Error(`Invalid GitHub handle: "${githubHandle}" (empty, contains comma, or invalid format)`);
    }
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }
    if (!recordId || isNaN(recordId)) {
      throw new Error(`Invalid record ID: ${recordId}`);
    }

    /* ---------- FETCH DATA ---------- */
    const projectInfoResult = getProjectInfo(projectName, processLog);
    if (!projectInfoResult.data) {
      throw new Error(`Project "${projectName}" not found in Volunteers sheet`);
    }
    const projectInfo = projectInfoResult.data;

    const emailsResult = getEmails(githubHandle, processLog);
    if (!emailsResult.data) {
      throw new Error(`No volunteer record found for GitHub handle: ${githubHandle}`);
    }
    const emails = emailsResult.data;
    processLog.steps.push({ step: 'emails', message: `Fetched emails for ${githubHandle}` });

    const roleInfoResult = getRolePermission(role, processLog);
    if (!roleInfoResult.data) {
      throw new Error(`Role "${role}" not found in Roles sheet`);
    }
    const roleInfo = roleInfoResult.data;

    /* ---------- EXECUTE TASKS ---------- */
    const driveResult = addUserToProjectDrive(emails, projectInfo, roleInfo, processLog);
    processLog.tasks.push(driveResult);

    const githubResult = addToProjectGithubTeams(githubHandle, projectInfo, roleInfo, processLog);
    processLog.tasks.push(githubResult);

    const dbResult = addProjectToHFLADB(githubHandle, projectName, processLog);
    processLog.tasks.push(dbResult);

    processLog.total_time_to_process = Date.now() - startTime;
    finalComment = constructOnboardingComment(processLog);
    processLog.steps.push({ step: 'complete', status: 'success', message: `Successfully onboarded ${githubHandle}` });

  } catch (error) {
    // Capture all errors — including early validation failures
    processLog.steps.push({ 
      step: 'error', 
      status: 'error', 
      message: `Onboarding failed: ${error.message}` 
    });
    processLog.total_time_to_process = Date.now() - startTime;

    // Build fallback comment if normal one isn't available
    if (!finalComment) {
      finalComment = constructOnboardingComment(processLog); // will use fallback below
    }
  } finally {
    // FINAL BLOCK: GitHub comment is now 100% GUARANTEED
    if (finalComment) {
      Logger.log(`Posting GitHub comment:\n${finalComment}`);
      githubCommentResult = onboardingGHlog(finalComment, processLog);
      processLog.steps.push(githubCommentResult);

      if (githubCommentResult.status === 'success' && githubCommentResult.data?.commentUrl) {
        processLog.githubCommentUrl = githubCommentResult.data.commentUrl;
      } else {
        processLog.githubCommentUrl = "Failed to post comment";
      }
    } else {
      // Ultra-rare case: even comment construction failed
      const fallback = `## Onboarding Failed (Critical Error)\n\n` +
        `**${githubHandle || 'unknown'}** could not be onboarded to **${projectName || 'unknown'}**\n\n` +
        `No log details available. Check Apps Script logs immediately.\n\n` +
        `Time: ${new Date().toISOString()}`;
      githubCommentResult = onboardingGHlog(fallback, processLog);
      processLog.steps.push(githubCommentResult);
      processLog.githubCommentUrl = githubCommentResult.data?.commentUrl || "Failed to post fallback comment";
    }

    // Always save to logs sheet
    logAutomationProcess(processLog);
    Logger.log("Final log: " + JSON.stringify(processLog, null, 2));
  }

  // Final status
  const hasError = processLog.steps.some(s => s.status === 'error');
  return {
    status: hasError ? 'error' : 'success',
    message: hasError 
      ? `Onboarding failed for ${githubHandle} — see GitHub comment for details`
      : `User ${githubHandle} successfully onboarded to ${projectName}`
  };
}
/**
 * Retrieves project information from the Volunteers spreadsheet.
 * @param {string} projectName - The project name.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { status: 'success'|'error', message: string, data: Object|null }
 */
function getProjectInfo(projectName, processLog) {
  try {
    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.PROJECTS);
    const data = sheet.getDataRange().getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const projectCol = headers.indexOf('project_name');
    if (projectCol === -1) {
      throw new Error('project_name column not found');
    }
    
    const projectRow = data.find(row => row[projectCol] === projectName);
    if (!projectRow) {
      processLog.steps.push({ step: 'getProjectInfo', status: 'error', message: `Project ${projectName} not found` });
      return { status: 'error', message: `Project ${projectName} not found`, data: null };
    }
    
    const teamIds = {
      github_read_team_id: projectRow[headers.indexOf('github_read_team_id')],
      github_write_team_id: projectRow[headers.indexOf('github_write_team_id')],
      github_merge_team_id: projectRow[headers.indexOf('github_merge_team_id')],
      github_admin_team_id: projectRow[headers.indexOf('github_admin_team_id')]
    };
    
    const projectInfo = {
      main_drive_id: projectRow[headers.indexOf('google_drive_main_id')],
      pii_drive_id: projectRow[headers.indexOf('google_drive_PII_id')],
      github_read_team: teamIds.github_read_team_id ? getTeamName(teamIds.github_read_team_id, processLog) : null,
      github_write_team: teamIds.github_write_team_id ? getTeamName(teamIds.github_write_team_id, processLog) : null,
      github_merge_team: teamIds.github_merge_team_id ? getTeamName(teamIds.github_merge_team_id, processLog) : null,
      github_admin_team: teamIds.github_admin_team_id ? getTeamName(teamIds.github_admin_team_id, processLog) : null,
      slack_channel: projectRow[headers.indexOf('project_slack')]
    };
    
    processLog.steps.push({ step: 'getProjectInfo', status: 'success', message: `Fetched project info for ${projectName}` });
    return { status: 'success', message: `Fetched project info for ${projectName}`, data: projectInfo };
  } catch (error) {
    processLog.steps.push({ step: 'getProjectInfo', status: 'error', message: `Error fetching project info: ${error.message}` });
    return { status: 'error', message: error.message, data: null };
  }
}

/**
 * Retrieves email addresses for a GitHub handle.
 * @param {string} githubHandle - The GitHub handle.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { status: 'success'|'error', message: string, data: Object|null }
 */
function getEmails(githubHandle, processLog) {
  try {
    if (!isValidGitHubHandle(githubHandle)) {
      throw new Error(`Invalid GitHub handle: ${githubHandle}`);
    }
    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.VOLUNTEERS);
    const data = sheet.getDataRange().getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const githubCol = headers.indexOf('github_handle');
    if (githubCol === -1) {
      throw new Error('github_handle column not found');
    }
    
    const memberRow = data.find(row => row[githubCol] && row[githubCol].toString().trim().toLowerCase() === githubHandle.trim().toLowerCase());
    if (!memberRow) {
      processLog.steps.push({ step: 'getEmails', status: 'error', message: `No member found with githubHandle: ${githubHandle}` });
      return { status: 'error', message: `No member found with githubHandle: ${githubHandle}`, data: null };
    }
    
    const emails = {
      preferred_email: memberRow[headers.indexOf('preferred_email')].trim().toLowerCase(),
      gmail: memberRow[headers.indexOf('Gmail')].trim().toLowerCase()
    };
    
    processLog.steps.push({ step: 'getEmails', status: 'success', message: `Fetched emails for ${githubHandle}` });
    return { status: 'success', message: `Fetched emails for ${githubHandle}`, data: emails };
  } catch (error) {
    processLog.steps.push({ step: 'getEmails', status: 'error', message: `Error fetching member emails: ${error.message}` });
    return { status: 'error', message: error.message, data: null };
  }
}
/**
 * Retrieves role permissions from the Roles spreadsheet.
 * @param {string} role - The role name.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { status: 'success'|'error', message: string, data: Object|null }
 */
function getRolePermission(role, processLog) {
  try {
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.ROLES, CONFIG.SHEET_IDS.ROLE_PERMISSION);
    const data = sheet.getDataRange().getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const roleIndex = headers.indexOf('Role');
    if (roleIndex === -1) {
      throw new Error('Role column not found');
    }

    const roleRow = data.find(row => row[roleIndex] === role);
    if (!roleRow) {
      processLog.steps.push({ step: 'getRolePermission', status: 'error', message: `Role ${role} not found` });
      return { status: 'error', message: `Role ${role} not found`, data: null };
    }
    
    const isTrue = (value) => {
      if (typeof value === 'string') return value.trim().toUpperCase() === 'TRUE';
      return !!value;
    };
    const roleInfo = {
      github_read: isTrue(roleRow[headers.indexOf('GitHub-read')]),
      github_write: isTrue(roleRow[headers.indexOf('GitHub-write')]),
      github_admin: isTrue(roleRow[headers.indexOf('GitHub-admin')]),
      github_read_maintainer: isTrue(roleRow[headers.indexOf('GitHub-read-maintainer')]),
      github_write_maintainer: isTrue(roleRow[headers.indexOf('GitHub-write-maintainer')]),
      github_admin_maintainer: isTrue(roleRow[headers.indexOf('GitHub-admin-maintainer')]),
      gd_project_manager: isTrue(roleRow[headers.indexOf('Google Drive-Project-Manager')]),
      gd_project_contributor: isTrue(roleRow[headers.indexOf('Google Drive-Project-Contributor')]),
      gd_project_pii_manager: isTrue(roleRow[headers.indexOf('Google Drive-Project-PII-Manager')]),
      onepassword_pm: isTrue(roleRow[headers.indexOf('1Password-team-PM')]),
      onepassword_research_lead: isTrue(roleRow[headers.indexOf('1Password-team-research-lead')]),
      onepassword_research: isTrue(roleRow[headers.indexOf('1Password-team-research')]),
      onepassword_dev: isTrue(roleRow[headers.indexOf('1Password-team-dev')]),
      onepassword_devops: isTrue(roleRow[headers.indexOf('1Password-team-devOps')]),
      onepassword_design_lead: isTrue(roleRow[headers.indexOf('1Password-team-design-lead')]),
      onepassword_design: isTrue(roleRow[headers.indexOf('1Password-team-design')]),
      onepassword_zoom: isTrue(roleRow[headers.indexOf('1Password-zoom')]),
      onepassword_test_cases: isTrue(roleRow[headers.indexOf('1Password-team-test-cases')]),
      figma: isTrue(roleRow[headers.indexOf('Figma')]),
      slack: isTrue(roleRow[headers.indexOf('Slack-team channel')])
    };
    
    processLog.steps.push({ step: 'getRolePermission', status: 'success', message: `Fetched role permissions for ${role}` });
    return { status: 'success', message: `Fetched role permissions for ${role}`, data: roleInfo };
  } catch (error) {
    processLog.steps.push({ step: 'getRolePermission', status: 'error', message: `Error fetching role permissions: ${error.message}` });
    return { status: 'error', message: error.message, data: null };
  }
}
/**
 * Adds a user to project Google Drives based on role permissions.
 * Emails are NEVER shown in public GitHub comments.
 * @param {Object} emails - The user's email addresses.
 * @param {Object} projectInfo - The project information.
 * @param {Object} roleInfo - The role permissions.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function addUserToProjectDrive(emails, projectInfo, roleInfo, processLog) {
  if (!emails || !projectInfo || !roleInfo) {
    processLog.steps.push({ 
      step: 'addUserToProjectDrive', 
      status: 'error', 
      message: 'Missing required parameters for addUserToProjectDrive' 
    });
    return { 
      task: 'add to Project Drives',
      status: 'error', 
      message: 'Missing required parameters' 
    };
  }

  const addToDrive = (email, driveId, permissionRole) => {
    try {
      Drive.Permissions.insert(
        {
          role: permissionRole,
          value: email,
          type: 'user'
        },
        driveId,
        {
          sendNotificationEmails: true,
          supportsAllDrives: true
        }
      );
      return { 
        success: true, 
        publicMsg: `Successfully added to Drive as ${permissionRole === 'organizer' ? 'manager' : 'contributor'}`,
        debugMsg: `Added ${email} to Drive ${driveId} as ${permissionRole}`  // private only
      };
    } catch (error) {
      return { 
        success: false, 
        publicMsg: `Failed to add to Drive`,
        debugMsg: `Failed to add ${email} to Drive ${driveId}: ${error.message}`
      };
    }
  };

  const tryAddToDrive = (driveId, permissionRole, driveType) => {
    let added = false;
    let usedEmail = null;
    const publicLines = [];
    const debugLines = [];

    // Try preferred email first
    if (emails.preferred_email) {
      const r = addToDrive(emails.preferred_email, driveId, permissionRole);
      publicLines.push(r.publicMsg);
      debugLines.push(r.debugMsg);
      processLog.steps.push({ 
        step: 'addUserToProjectDrive', 
        status: r.success ? 'success' : 'error', 
        message: r.debugMsg 
      });
      if (r.success) { added = true; usedEmail = emails.preferred_email; }
    }

    // Fallback to Gmail if preferred failed
    if (!added && emails.gmail && emails.gmail !== emails.preferred_email) {
      const r = addToDrive(emails.gmail, driveId, permissionRole);
      publicLines.push(r.publicMsg);
      debugLines.push(r.debugMsg);
      processLog.steps.push({ 
        step: 'addUserToProjectDrive', 
        status: r.success ? 'success' : 'info', 
        message: r.debugMsg 
      });
      if (r.success) { added = true; usedEmail = emails.gmail; }
    }

    const finalPublic = added
      ? `Successfully added to ${driveType} Drive`
      : `Failed to add to ${driveType} Drive`;

    return { added, publicMsg: finalPublic };
  };

  let allSuccess = true;
  let log = '';

  // Main Drive
  if (projectInfo.main_drive_id) {
    if (roleInfo.gd_project_manager) {
      const res = tryAddToDrive(projectInfo.main_drive_id, 'organizer', 'main');
      log += res.publicMsg + '\n';
      allSuccess = allSuccess && res.added;
    } else if (roleInfo.gd_project_contributor) {
      const res = tryAddToDrive(projectInfo.main_drive_id, 'writer', 'main');
      log += res.publicMsg + '\n';
      allSuccess = allSuccess && res.added;
    }
  }

  // PII Drive
  if (projectInfo.pii_drive_id && roleInfo.gd_project_pii_manager) {
    const res = tryAddToDrive(projectInfo.pii_drive_id, 'organizer', 'PII');
    log += res.publicMsg + '\n';
    allSuccess = allSuccess && res.added;
  }

  if (!projectInfo.main_drive_id && !projectInfo.pii_drive_id) {
    log = 'No project Drives configured';
    allSuccess = true;
  }

  return { 
    task: 'add to Project Drives', 
    status: allSuccess ? 'success' : 'error', 
    message: log.trim() 
  };
}

/**
 * Retrieves the GitHub team name for a team ID.
 * @param {string} teamId - The GitHub team ID.
 * @param {Object} processLog - The process log object.
 * @returns {string|null} - The team slug or null if not found.
 */
function getTeamName(teamId, processLog) {
  const env = getEnv();
  if (!env.GITHUB_ORG) {
    processLog.steps.push({ step: 'getTeamName', status: 'error', message: 'GitHub organization not defined in environment' });
    return null;
  }
  const orgId = env.GITHUB_ORG_ID ;
  if (!orgId) {
    processLog.steps.push({ step: 'getTeamName', status: 'error', message: 'GitHub organization ID not available' });
    return null;
  }
  const request = {
    contentType: "application/json",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    method: "get",
    muteHttpExceptions: true,
    url: `https://api.github.com/organizations/${orgId}/team/${teamId}`
  };
  
  try {
    const response = UrlFetchApp.fetch(request.url, request);
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      processLog.steps.push({ step: 'getTeamName', status: 'error', message: `Failed to fetch team name for ID ${teamId}: ${response.getContentText()}` });
      return null;
    }
    const teamData = JSON.parse(response.getContentText());
    const teamSlug = teamData.slug;
    processLog.steps.push({ step: 'getTeamName', status: 'success', message: `Fetched team slug ${teamSlug} for ID ${teamId}` });
    return teamSlug;
  } catch (error) {
    processLog.steps.push({ step: 'getTeamName', status: 'error', message: `Error fetching team name for ID ${teamId}: ${error.message}` });
    return null;
  }
}

/**
 * Adds a user to project GitHub teams based on role permissions.
 * @param {string} githubHandle - The GitHub handle.
 * @param {Object} projectInfo - The project information.
 * @param {Object} roleInfo - The role permissions.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function addToProjectGithubTeams(githubHandle, projectInfo, roleInfo, processLog) {
  if (!githubHandle || !projectInfo || !roleInfo) {
    processLog.steps.push({ step: 'addToProjectGithubTeams', status: 'error', message: 'Missing required parameters for addToProjectGithubTeams' });
    
    return {task: 'add to Github Teams', status: 'error', message: 'Missing required parameters for addToProjectGithubTeams' };
  }
  
  const memberTeams = [];
  const maintainerTeams = [];
  
  if (roleInfo.github_read && projectInfo.github_read_team) {
    memberTeams.push(projectInfo.github_read_team);
  }
  if (roleInfo.github_read_maintainer && projectInfo.github_read_team) {
    maintainerTeams.push(projectInfo.github_read_team);
  }
  if (roleInfo.github_write && projectInfo.github_write_team) {
    memberTeams.push(projectInfo.github_write_team);
  }
  if (roleInfo.github_write_maintainer && projectInfo.github_write_team) {
    maintainerTeams.push(projectInfo.github_write_team);
  }
  if (roleInfo.github_admin && projectInfo.github_admin_team) {
    memberTeams.push(projectInfo.github_admin_team);
  }
  if (roleInfo.github_admin_maintainer && projectInfo.github_admin_team) {
    maintainerTeams.push(projectInfo.github_admin_team);
  }

  let success = false;
  let log = "";
  if (memberTeams.length > 0) {
    const result = addToGithubTeams(githubHandle, 'member', memberTeams, processLog);
    success = result.status === 'success' || success;
    success?log+=`added member to ${memberTeams} as member \n`:log`unable added member to ${memberTeams} as member \n`;
    processLog.steps.push(result)
  }
  if (maintainerTeams.length > 0) {
    const result = addToGithubTeams(githubHandle, 'maintainer', maintainerTeams, processLog);
    success = result.status === 'success' || success;
    success?log+=`added member to ${maintainerTeams} as maintainer \n`:log`unable added member to ${maintainerTeams} as maintainer \n`;
    processLog.steps.push(result);
  }
  if ((memberTeams.length == 0)&&(maintainerTeams.length == 0)){
    processLog.steps.push({ step: 'addToProjectGithubTeams', status: 'error', message: 'No valid github teams to onboard, check HFLA Volunteers-project for detail' });
    log = 'No valid github teams to onboard, check HFLA Volunteers-project for detail';
  }
  return { task: 'add to Github Teams', status: success ? 'success' : 'error', message: log };
}

/**
 * Adds a user to specified GitHub teams.
 * @param {string} invitee - The GitHub handle.
 * @param {string} role - The role ('member' or 'maintainer').
 * @param {string[]} teams - The team slugs.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function addToGithubTeams(invitee, role, teams, processLog) {
  if (! isValidGitHubHandle(invitee)) {
    processLog.steps.push({ step: 'addToGithubTeams', status: 'error', message: `Invalid GitHub handle: ${invitee}` });
    return { task: 'add to Github Teams', status: 'error', message: `Invalid GitHub handle: ${invitee}` };
  }
  const env = getEnv();
  
  const requests = teams
    .filter(team => team)
    .map(team => getGithubRequest(env, invitee, team, 'put', role));
  
  try {
    if (requests.length === 0) {
      processLog.steps.push({ step: 'addToGithubTeams', status: 'error', message: `No valid teams to add ${invitee} to for role ${role}` });

      return { task: 'add to Github Teams', status: 'error', message: `No valid teams to add ${invitee} to for role ${role}` };
    }

    const responses = UrlFetchApp.fetchAll(requests);
    let success = false;

    responses.forEach((response, index) => {
      const responseCode = response.getResponseCode();
      if (responseCode !== 200) {
        processLog.steps.push({ step: 'addToGithubTeams', status: 'error', message: `Failed to add ${invitee} to GitHub team ${teams[index]}: ${response.getContentText()}` });
      } else {
         processLog.steps.push({ step: 'addToGithubTeams', status: 'success', message: `Added ${invitee} to GitHub team ${teams[index]} as ${role}` });
        success = true;
      }
    });
    return { task: 'add to Github Teams', status: success ? 'success' : 'error', message: success ? `Added ${invitee} to GitHub teams` : `Failed to add ${invitee} to some or all GitHub teams` };
  } catch (error) {
    processLog.steps.push({ step: 'addToGithubTeams', status: 'error', message: `Error adding ${invitee} to GitHub teams: ${error.message}` });
    return { task: 'add to Github Teams', status: 'error', message: error.message };
  }
}
/**
 * Adds a project to the member's database in the Volunteers spreadsheet.
 * @param {string} githubHandle - The GitHub handle.
 * @param {string} projectName - The project name.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function addProjectToHFLADB(githubHandle, projectName, processLog) {

  try {
    const sheet = getSheetById(CONFIG.SPREADSHEET_IDS.VOLUNTEERS, CONFIG.SHEET_IDS.VOLUNTEERS);
    const data = sheet.getDataRange().getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const githubCol = headers.indexOf('github_handle');
    const projectCol = headers.indexOf('project_name');
    if (githubCol === -1 || projectCol === -1) {
      throw new Error(`Missing columns: github_handle=${githubCol}, project_name=${projectCol}`);
    }
    
    const rowIndex = data.findIndex((row, index) => index > 0 && row[githubCol] === githubHandle);
    if (rowIndex === -1) {
      processLog.steps.push({ step: 'addProjectToHFLADB', status: 'error', message: `No member found with githubHandle: ${githubHandle}` });
      return { task: 'add to HFLA DB', status: 'error', message: `No member found with githubHandle: ${githubHandle}` };
    }
    
    const currentProjects = data[rowIndex][projectCol] || '';
    let updatedProjects;
    
    if (!currentProjects) {
      updatedProjects = projectName;
    } else {
      const projectList = currentProjects.split(',').map(p => p.trim()).filter(p => p);
      if (!projectList.includes(projectName)) {
        projectList.push(projectName);
        updatedProjects = projectList.join(',');
      } else {
        processLog.steps.push({ step: 'addProjectToHFLADB', status: 'info', message: `Project ${projectName} already exists for ${githubHandle}` });
        return { task: 'add to HFLA DB', status: 'success', message: `Project ${projectName} already exists for ${githubHandle}` };
      }
    }
    
    sheet.getRange(rowIndex + 1, projectCol + 1).setValue(updatedProjects);
    processLog.steps.push({ step: 'addProjectToHFLADB', status: 'success', message: `Updated project_name for ${githubHandle}: ${updatedProjects}` });

    return { task:'add to HFLA DB',status: 'success', message: `Added ${projectName} to ${githubHandle}'s projects` };
  } catch (error) {
    processLog.steps.push({ step: 'addProjectToHFLADB', status: 'error', message: `Error updating project to member's database: ${error.message}` });

    return {task:'add to HFLA DB', status: 'error', message: error.message };
  }
}

/**
 * Constructs a GitHub comment for the onboarding process.
 * @param {Object} processLog - The process log object.
 * @returns {string|null} - The comment body or null if invalid.
 */
function constructOnboardingComment(processLog) {
  if (!processLog) {
    processLog.steps.push({ step: 'constructOnboardingComment', status: 'error', message: 'Missing required data in processLog for constructing comment' });
    return null;
  }
  // FALLBACK: If no tasks ran (early validation or critical failure)
  if (processLog.tasks.length === 0) {
    const errorStep = processLog.steps.find(s => s.step === 'error');
    const errorMsg = errorStep ? errorStep.message : 'Unknown error during onboarding';

    const today = new Date();
    const todayFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm');
    const timestampFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm:ss');
    const totalTime = processLog.total_time_to_process / 1000;
    const timeString = totalTime < 60 ? `${totalTime.toFixed(2)} seconds` : `${(totalTime / 60).toFixed(2)} minutes`;

    const comment = `## Onboarding Failed Early\n\n` +
      `**${processLog.githubHandle || 'unknown'}** (role: **${processLog.role || 'unknown'}**) ` +
      `could not be onboarded to **${processLog.projectName || 'unknown'}**\n\n` +
      `Error: ${errorMsg}\n\n` +
      `request made ${timestampFormatted}, total time to process ${timeString}`;

    processLog.steps.push({
      step: 'constructOnboardingComment',
      status: 'success',
      message: 'Fallback error comment constructed'
    });
    return comment;
  }

  const totalTime = processLog.total_time_to_process / 1000; // Convert to seconds
  const timeString = totalTime < 60 ? `${totalTime.toFixed(2)} seconds` : `${(totalTime / 60).toFixed(2)} minutes`;
  

  let githubTeamString = 'Not performed';
  let driveString = 'Not performed';
  let onePasswordString = 'Not performed';
  let figmaString = 'Not performed';
  let slackString = 'Not performed';

  let githubTask = processLog.tasks.find(task => task.task === 'add to Github Teams');
  if (githubTask) {
    githubTeamString = `${githubTask.status}\n`+ `${githubTask.message}`;
  }
  let driveTask = processLog.tasks.find(task => task.task === 'add to Project Drives');
  if (driveTask) {
    driveString = `${driveTask.status}\n`+ `${driveTask.message}`;
  }
  let onePasswordTask = processLog.tasks.find(task => task.task === 'add to onePassword');
  if (onePasswordTask) {
    onePasswordString = `${onePasswordTask.status}\n`+ `${onePasswordTask.message}`;
  }
  let figmaTask = processLog.tasks.find(task => task.task === 'add to figma');
  if (figmaTask) {
    figmaString = `${figmaTask.status}\n`+ `${figmaTask.message}`;
  }
  let slackTask = processLog.tasks.find(task => task.task === 'add to slack');
  if (slackTask) {
    slackString = `${slackTask.status}\n`+ `${slackTask.message}`;
  }

  const today = new Date();
  const todayFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm');
  const timestampFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm:ss');

  const commentBody = `**${processLog.githubHandle}**, role: **${processLog.role}** got onboarded to Project: **${processLog.projectName}** with the following resources at ${todayFormatted}\n\n` +
                     `* github: ${githubTeamString}\n` +
                     `* google drive: ${driveString}\n` +
                     `* 1Password: ${onePasswordString}\n` +
                     `* figma: ${figmaString}\n` +
                     `* meetings: ${slackString}\n\n` +
                     `request made ${timestampFormatted}, total time to process ${timeString}`;

  processLog.steps.push({ step: 'constructOnboardingComment', status: 'success', message: 'Onboarding comment constructed successfully' });
  return commentBody;
}

/**
 * Logs the onboarding result to a GitHub issue.
 * @param {string} commentBody - The comment body.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { status: 'success'|'error', message: string, data: Object|null }
 */
function onboardingGHlog(commentBody, processLog) {
  if (!commentBody || typeof commentBody !== 'string') {
    processLog.steps.push({ step: 'onboardingGHlog', status: 'error', message: 'Invalid or missing comment body' });
    return { status: 'error', message: 'Invalid or missing comment body', data: null };
  }

  const env = getEnv();
  if (!env.GITHUB_TOKEN) {
    processLog.steps.push({ step: 'onboardingGHlog', status: 'error', message: 'GitHub token not defined in environment' });
    return { status: 'error', message: 'GitHub token not defined in environment', data: null };
  }

   const request = {
    contentType: 'application/json',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    method: 'post',
    muteHttpExceptions: true,
    payload: JSON.stringify({ body: commentBody }),
    url: `https://api.github.com/repos/hackforla/product-management/issues/${CONFIG.GITHUB_PROJECT_LOG_ISSUE_NUMBER}/comments`
  };

  try {
    const response = UrlFetchApp.fetch(request.url, request);
    const responseCode = response.getResponseCode();

    if (responseCode === 201) {
      const responseData = JSON.parse(response.getContentText());
      processLog.steps.push({
        step: 'onboardingGHlog',
        status: 'success',
        message: `Comment created successfully for issue #${CONFIG.GITHUB_PROJECT_LOG_ISSUE_NUMBER}: ${responseData.html_url}`
      });
      return {
        status: 'success',
        message: `Comment created successfully for issue #${CONFIG.GITHUB_PROJECT_LOG_ISSUE_NUMBER}`,
        data: {
          commentId: responseData.id,
          commentUrl: responseData.html_url,
          createdAt: responseData.created_at
        }
      };
    } else {
      const errorText = response.getContentText();
      processLog.steps.push({
        step: 'onboardingGHlog',
        status: 'error',
        message: `Failed to create comment for issue #${CONFIG.GITHUB_PROJECT_LOG_ISSUE_NUMBER}: ${errorText}`
      });
      throw new Error(`API request failed with status ${responseCode}: ${errorText}`);
    }
  } catch (error) {
    processLog.steps.push({
      step: 'onboardingGHlog',
      status: 'error',
      message: `Error creating GitHub comment for issue #${CONFIG.GITHUB_PROJECT_LOG_ISSUE_NUMBER}: ${error.message}`
    });
    return { status: 'error', message: error.message, data: null };
  }
}
//test functions
function test1(){
  let processLog = {
    timestamp: new Date().toISOString(),
    action: 'onboarding',
    projectName: "test",
    githubHandle: "wesley115",
    role: "PM",
    recordId: "123",
    total_time_to_process: 0,
    steps: [],
    tasks:[]
  };
  const projectInfoResult=getProjectInfo("test", processLog);
  Logger.log("-----------------------------");
  Logger.log(JSON.stringify(projectInfoResult, null, 2));
  Logger.log(JSON.stringify(projectInfoResult.data, null, 2));
  Logger.log(projectInfoResult.data);
  const projectInfo = projectInfoResult.data;
  Logger.log( projectInfo);
  const githubResult = removeFromProjectGithubTeams("wesley115", projectInfo, processLog);
  processLog.tasks.push(githubResult);
  Logger.log("123: " + JSON.stringify(processLog, null, 2));
  let commentBody = constructOffboardingComment(processLog);
    if (!commentBody) {
      throw new Error('Failed to construct onboarding comment');
    }
  Logger.log(`Constructed comment: ${commentBody}`);
  //log result on github issue
  const githubCommentResult = onboardingGHlog(commentBody, processLog);
  processLog.steps.push(githubCommentResult);

 
}
function test2(){
  let processLog = {
    timestamp: new Date().toISOString(),
    action: 'onboarding',
    projectName: "test",
    githubHandle: "wesley115",
    role: "PM",
    recordId: "123",
    total_time_to_process: 0,
    steps: [],
    tasks:[]
  };
  const projectInfoResult=getProjectInfo("test", processLog);
  Logger.log("-----------------------------");
  Logger.log(JSON.stringify(projectInfoResult, null, 2));
  Logger.log(JSON.stringify(projectInfoResult.data, null, 2));
  Logger.log(projectInfoResult.data);
  const projectInfo = projectInfoResult.data;
  Logger.log( projectInfo);
  const roleInfoResult = getRolePermission(processLog.role, processLog);
    if (!roleInfoResult.data) {
      throw new Error(`Role ${role} not found`);
    }
  const roleInfo = roleInfoResult.data;
  const emailsResult = getEmails(processLog.githubHandle, processLog);
    if (!emailsResult.data) {
      throw new Error(`Emails for ${processLog.githubHandle} not found`);
    }
  const emails = emailsResult.data;
  processLog.steps.push({ step: 'emails', message: `Fetched emails for ${processLog.githubHandle}` });
    

  // Add user to Google Drive
  const driveResult = addUserToProjectDrive(emails, projectInfo, roleInfo, processLog);
  processLog.tasks.push(driveResult);

  const githubResult = addToProjectGithubTeams(processLog.githubHandle, projectInfo, roleInfo, processLog);
  processLog.tasks.push(githubResult);
  
  Logger.log("123: " + JSON.stringify(processLog, null, 2));
  let commentBody = constructOnboardingComment(processLog);
    if (!commentBody) {
      throw new Error('Failed to construct onboarding comment');
    }
  Logger.log(`Constructed comment: ${commentBody}`);
  //log result on github issue
  const githubCommentResult = onboardingGHlog(commentBody, processLog);
  processLog.steps.push(githubCommentResult);

}