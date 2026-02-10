/**
 * Automates offboarding for a Hack for LA project.
 * @param {string} projectName - The project name.
 * @param {string} githubHandle - The volunteer's GitHub handle.
 * @param {number} recordId - The record ID (row number).
 * @returns {Object} - { status: 'success'|'error', message: string }
 * GUARANTEES a GitHub comment on EVERY attempt — success, partial, or total failure.
 */
function projectOffboardingAutomation(projectName, githubHandle, recordId) {
  Logger.log(`Starting offboarding for project: ${projectName}, member: ${githubHandle}, recordId: ${recordId}`);

  const startTime = Date.now();
  let processLog = {
    timestamp: new Date().toISOString(),
    action: 'offboarding',
    projectName: projectName,
    githubHandle: githubHandle,
    recordId: recordId,
    total_time_to_process: 0,
    steps: [],
    tasks: []
  };
  processLog.steps.push({ 
    step: 'start', 
    message: `Starting offboarding for project: ${projectName}, member: ${githubHandle}, recordId: ${recordId}` 
  });

  let finalComment = null;
  let githubCommentResult = null;

  try {
    /* ---------- BASIC VALIDATION ---------- */
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    if (!isValidGitHubHandle(githubHandle)) {
      throw new Error(`Invalid GitHub handle: "${githubHandle}" (may contain comma, space, or be empty)`);
    }
    if (!recordId || isNaN(recordId)) {
      throw new Error(`Invalid record ID: ${recordId}`);
    }

    /* ---------- PROJECT INFO ---------- */
    const projectInfoResult = getProjectInfo(projectName, processLog);
    if (!projectInfoResult.data) {
      throw new Error(`Project "${projectName}" not found in Volunteers sheet`);
    }
    const projectInfo = projectInfoResult.data;

    /* ---------- EMAIL LOOKUP ---------- */
    const emailsResult = getEmails(githubHandle, processLog);
    if (!emailsResult.data) {
      processLog.total_time_to_process = Date.now() - startTime;
      finalComment = constructOffboardingComment(processLog, true); // noMatch = true
      githubCommentResult = onboardingGHlog(finalComment, processLog);
      processLog.steps.push(githubCommentResult);
      throw new Error(`GitHub handle "${githubHandle}" not found in volunteer database`);
    }
    const emails = emailsResult.data;
    processLog.steps.push({ step: 'emails', message: `Fetched emails for ${githubHandle}` });

    /* ---------- NORMAL PIPELINE ---------- */
    const driveResult = removeUserFromProjectDrive(emails, projectInfo, processLog);
    processLog.tasks.push(driveResult);

    const githubResult = removeFromProjectGithubTeams(githubHandle, projectInfo, processLog);
    processLog.tasks.push(githubResult);

    const dbResult = removeProjectFromHFLADB(githubHandle, projectName, processLog);
    processLog.tasks.push(dbResult);

    processLog.total_time_to_process = Date.now() - startTime;
    finalComment = constructOffboardingComment(processLog);
    processLog.steps.push({ step: 'complete', status: 'success', message: `Successfully offboarded ${githubHandle}` });

  } catch (error) {
    // This catch now runs for ALL errors — including validation
    processLog.steps.push({ 
      step: 'error', 
      status: 'error', 
      message: `Offboarding failed: ${error.message}` 
    });
    processLog.total_time_to_process = Date.now() - startTime;

    // Always try to build a comment — even on total failure
    if (!finalComment) {
      finalComment = constructOffboardingComment(processLog); // fallback: will show error in steps
    }
  } finally {
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
      processLog.githubCommentUrl = "No comment generated";
      processLog.steps.push({ step: 'onboardingGHlog', status: 'error', message: 'Failed to construct comment body' });
    }

    // Always log to sheet
    logAutomationProcess(processLog);
    Logger.log("Final log: " + JSON.stringify(processLog, null, 2));
  }

  // Return based on outcome
  const hasError = processLog.steps.some(s => s.status === 'error');
  return {
    status: hasError ? 'error' : 'success',
    message: hasError 
      ? `Offboarding failed for ${githubHandle}: check GitHub comment`
      : `User ${githubHandle} offboarded successfully`
  };
}

/**
 * Removes a user from project Google Drives.
 * @param {Object} emails - The user's email addresses.
 * @param {Object} projectInfo - The project information.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function removeUserFromProjectDrive(emails, projectInfo, processLog) {
  if (!emails || !projectInfo) {
    processLog.steps.push({ 
      step: 'removeUserFromProjectDrive', 
      status: 'error', 
      message: 'Missing required parameters for removeUserFromProjectDrive' 
    });
    return { 
      task: 'remove from Project Drives',
      status: 'error', 
      message: 'Missing required parameters for removeUserFromProjectDrive' 
    };
  }

  const removeFromDrive = (email, driveId, driveType) => {
    try {
      const permissions = Drive.Permissions.list(driveId, { supportsAllDrives: true }).items;
      const permission = permissions.find(p =>
        p.emailAddress && p.emailAddress.toLowerCase() === email.toLowerCase()
      );
      if (permission) {
        Drive.Permissions.remove(driveId, permission.id, { supportsAllDrives: true });
        return { 
          success: true, 
          reason: `Successfully removed user from Drive ${driveId}`,
          debugReason: `Successfully removed ${email} from Drive ${driveId}`  // only for internal log
        };
      } else {
        return { 
          success: false, 
          reason: `No access found in Drive ${driveId}`,
          debugReason: `No permission found for ${email} in Drive ${driveId}`  // internal only
        };
      }
    } catch (error) {
      return { 
        success: false, 
        reason: `Failed to check/remove access from Drive ${driveId}`,
        debugReason: `Failed to remove ${email} from Drive ${driveId}: ${error.message}`
      };
    }
  };

  const tryRemoveFromDrive = (driveId, driveType) => {
    const reasons = [];
    const debugReasons = [];  // will be used only in processLog.steps (private)
    let removed = false;
    let usedEmail = null;

    if (emails.preferred_email) {
      const r = removeFromDrive(emails.preferred_email, driveId);
      reasons.push(r.reason);
      debugReasons.push(r.debugReason);
      processLog.steps.push({ 
        step: 'removeUserFromProjectDrive', 
        status: r.success ? 'success' : 'info', 
        message: r.debugReason 
      });
      if (r.success) { removed = true; usedEmail = emails.preferred_email; }
    }

    if (!removed && emails.gmail && emails.gmail.toLowerCase() !== (emails.preferred_email||'').toLowerCase()) {
      const r = removeFromDrive(emails.gmail, driveId);
      reasons.push(r.reason);
      debugReasons.push(r.debugReason);
      processLog.steps.push({ 
        step: 'removeUserFromProjectDrive', 
        status: r.success ? 'success' : 'info', 
        message: r.debugReason 
      });
      if (r.success) { removed = true; usedEmail = emails.gmail; }
    }

    const publicMsg = removed
      ? `Successfully removed user from ${driveType} Drive`
      : `No access found (with user's emails from database) or failed to remove from ${driveType} Drive`;

    return { removed, msg: publicMsg };
  };

  let allSuccess = true;
  let log = '';
  let hasDrives = false;

  if (projectInfo.main_drive_id) {
    hasDrives = true;
    const { removed, msg } = tryRemoveFromDrive(projectInfo.main_drive_id, 'main');
    log += msg + '\n';
    allSuccess = allSuccess && removed;
  }

  if (projectInfo.pii_drive_id) {
    hasDrives = true;
    const { removed, msg } = tryRemoveFromDrive(projectInfo.pii_drive_id, 'PII');
    log += msg + '\n';
    allSuccess = allSuccess && removed;
  }

  if (!hasDrives) {
    log = 'No project Drives configured to remove from';
    allSuccess = true;
  }

  return { 
    task: 'remove from Project Drives', 
    status: allSuccess ? 'success' : 'error', 
    message: log.trim() 
  };
}



/**
 * Removes a user from project GitHub teams, retaining read access.
 * @param {string} githubHandle - The GitHub handle.
 * @param {Object} projectInfo - The project information.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function removeFromProjectGithubTeams(githubHandle, projectInfo, processLog) {
  if (!githubHandle || !projectInfo) {
    processLog.steps.push({ step: 'removeFromProjectGithubTeams', status: 'error', message: 'Missing required parameters for removeFromProjectGithubTeams' });

    return {task: 'remove from Github Teams', status: 'error', message: 'Missing required parameters for removeFromProjectGithubTeams' };
  }
  //Logger.log(`Removing ${githubHandle} from GitHub teams for project, keeping read access: ${JSON.stringify(projectInfo, null, 2)}`);
  const teamsToRemove = [];
  const teamsToAdd = [];

  if (projectInfo.github_write_team) {
    teamsToRemove.push(projectInfo.github_write_team);
  }
  if (projectInfo.github_merge_team) {
    teamsToRemove.push(projectInfo.github_merge_team);
  }
  if (projectInfo.github_admin_team) {
    teamsToRemove.push(projectInfo.github_admin_team);
  }
  if (projectInfo.github_read_team) {
    teamsToAdd.push(projectInfo.github_read_team);
  }
  //Logger.log(`projectInfo.data.github_read_team: ${projectInfo.github_read_team}`);

  let success = false;
  let log = "";
  if (teamsToRemove.length > 0) {
    const result = removeFromGithubTeams(githubHandle, teamsToRemove, processLog);
    success = result.status === 'success' || success;
    success?log+=`remove member from ${teamsToRemove} \n`:log+=`unable remove member from ${teamsToRemove} \n`;
    processLog.steps.push(result)
  }
  if (teamsToAdd.length > 0) {
    const result = addToGithubTeams(githubHandle, 'member', teamsToAdd, processLog);
    success = result.status === 'success' || success;
    success?log+=`added member to ${teamsToAdd} as member \n`:log+=`unable added member to ${teamsToAdd} as member \n`;
    processLog.steps.push(result);
  }
  return { task: 'remove from Github Teams', status: success ? 'success' : 'error', message: log };
}

/**
 * Removes a user from specified GitHub teams.
 * @param {string} invitee - The GitHub handle.
 * @param {string[]} teams - The team slugs.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function removeFromGithubTeams(invitee, teams, processLog) {
  if (!isValidGitHubHandle(invitee)) {
    processLog.steps.push({ step: 'removeFromGithubTeams', status: 'error', message: `Invalid GitHub handle: ${invitee}` });
    return { task: 'remove from Github Teams', status: 'error', message: `Invalid GitHub handle: ${invitee}` };
  }
  const env = getEnv();
  const requests = teams
    .filter(team => team)
    .map(team => getGithubRequest(env, invitee, team, 'delete'));

  try {
    if (requests.length === 0) {
      processLog.steps.push({ step: 'removeFromGithubTeams', status: 'error', message: `No valid teams to remove ${invitee} from` });
      return { task: 'remove from Github Teams', status: 'error', message: `No valid teams to remove ${invitee} from` };
    }
    const responses = UrlFetchApp.fetchAll(requests);
    responses.forEach((response, index) => {
      const responseCode = response.getResponseCode();
      if (responseCode !== 204) {
       processLog.steps.push({ step: 'removeFromGithubTeams', status: 'error', message: `Failed to remove ${invitee} from GitHub team ${teams[index]}: ${response.getContentText()}` });
      } else {
        processLog.steps.push({ step: 'removeFromGithubTeams', status: 'success', message: `Removed ${invitee} from GitHub team ${teams[index]}` });
        success = true;
      }
    });
    return { task: 'remove from Github Teams', status: success ? 'success' : 'error', message: success ? `Removed ${invitee} from GitHub teams` : `Failed to remove ${invitee} from some or all GitHub teams` };
  } catch (error) {
    processLog.steps.push({ step: 'removeFromGithubTeams', status: 'error', message: `Error removing ${invitee} from GitHub teams: ${error.message}` });
    return { task: 'remove from Github Teams', status: 'error', message: error.message };
  }
}

/**
 * Removes a project from the member's database in the Volunteers spreadsheet.
 * @param {string} githubHandle - The GitHub handle.
 * @param {string} projectName - The project name.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { task: string, status: 'success'|'error', message: string }
 */
function removeProjectFromHFLADB(githubHandle, projectName, processLog) {
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
      processLog.steps.push({ step: 'removeProjectFromHFLADB', status: 'error', message: `No member found with githubHandle: ${githubHandle}` });
      return { status: 'error', message: `No member found with githubHandle: ${githubHandle}` };
    }
    
    const currentProjects = data[rowIndex][projectCol] || '';
    if (!currentProjects) {
      processLog.steps.push({ step: 'removeProjectFromHFLADB', status: 'error', message: `No projects found for ${githubHandle}, nothing to remove` });
      return {task:'remove from HFLA DB', status: 'error', message: `No projects found for ${githubHandle}, nothing to remove` };
    }
    
    const projectList = currentProjects.split(',').map(p => p.trim()).filter(p => p);
    const updatedProjectList = projectList.filter(p => p !== projectName);
    
    if (projectList.length === updatedProjectList.length) {
      processLog.steps.push({ step: 'removeProjectFromHFLADB', status: 'error', message: `Project ${projectName} not found in ${githubHandle}'s project list` });
      return {task:'remove from HFLA DB', status: 'error', message: `Project ${projectName} not found in ${githubHandle}'s project list` };
    }
    
    const updatedProjects = updatedProjectList.join(',');
    sheet.getRange(rowIndex + 1, projectCol + 1).setValue(updatedProjects);
    processLog.steps.push({ step: 'removeProjectFromHFLADB', status: 'success', message: `Remove project_name for ${githubHandle}: ${updatedProjects}` });
    
    return { task:'add to HFLA DB',status: 'success', message: `Removed ${projectName} from ${githubHandle}'s projects` };
    
  } catch (error) {
    processLog.steps.push({ step: 'removeProjectFromHFLADB', status: 'error', message: `Error removing project from member's Database: ${error.message}` });
    return {task:'remove from HFLA DB', status: 'error', message: error.message };
  }
}
/**
 * Builds the GitHub issue comment.
 * @param {Object} processLog
 * @param {boolean} [noMatch=false]  – true when the handle was not found in the DB
 * @returns {string|null}
 */
function constructOffboardingComment(processLog, noMatch = false) {
  if (!processLog) {
    processLog.steps.push({
      step: 'constructOffboardingComment',
      status: 'error',
      message: 'Missing required data in processLog for constructing comment'
    });
    return null;
  }

  const totalTime = processLog.total_time_to_process / 1000; // seconds
  const timeString =
    totalTime < 60
      ? `${totalTime.toFixed(2)} seconds`
      : `${(totalTime / 60).toFixed(2)} minutes`;

  const today = new Date();
  const todayFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm');
  const timestampFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm:ss');

  /* --------------------------------------------------------------
     NO-MATCH BRANCH – GitHub handle not in the volunteer sheet
     -------------------------------------------------------------- */
  if (noMatch) {
    const comment = `## Attention! No volunteer record found with the github handle\n\n` +
      `**${processLog.githubHandle}** was requested for offboarding from **${processLog.projectName}** ` +
      `at ${todayFormatted}, but **no row** with that GitHub handle exists in the Volunteers database.\n\n` +
      `* No actions were performed.\n\n` +
      `request made ${timestampFormatted}, total time to process ${timeString}`;

    processLog.steps.push({
      step: 'constructOffboardingComment',
      status: 'success',
      message: 'No-match offboarding comment constructed'
    });
    return comment;
  }
  /* --------------------------------------------------------------
     FALLBACK: If no tasks ran (e.g. early validation failure)
     -------------------------------------------------------------- */
  if (processLog.tasks.length === 0 && !noMatch) {
    const errorStep = processLog.steps.find(s => s.step === 'error');
    const errorMsg = errorStep ? errorStep.message : 'Unknown error during offboarding';
    const comment = `## Offboarding Failed Early\n\n` +
      `**${processLog.githubHandle}** could not be offboarded from **${processLog.projectName}**\n\n` +
      `Error: ${errorMsg}\n\n` +
      `request made ${timestampFormatted}, total time to process ${timeString}`;
    processLog.steps.push({
      step: 'constructOffboardingComment',
      status: 'success',
      message: 'Fallback error comment constructed'
    });
    return comment;
  }
  /* --------------------------------------------------------------
     NORMAL BRANCH – build the regular success / partial-failure comment
     -------------------------------------------------------------- */
  const githubTask = processLog.tasks.find(t => t.task === 'remove from Github Teams') || { status: 'Not performed', message: '' };
  const driveTask  = processLog.tasks.find(t => t.task === 'remove from Project Drives') || { status: 'Not performed', message: '' };
  const onePwTask  = processLog.tasks.find(t => t.task === 'remove from onePassword') || { status: 'Not performed', message: '' };
  const figmaTask  = processLog.tasks.find(t => t.task === 'remove from figma') || { status: 'Not performed', message: '' };
  const slackTask  = processLog.tasks.find(t => t.task === 'remove from slack') || { status: 'Not performed', message: '' };

  const githubStr = `${githubTask.status}\n${githubTask.message}`.trim();
  const driveStr  = `${driveTask.status}\n${driveTask.message}`.trim();
  const onePwStr  = `${onePwTask.status}\n${onePwTask.message}`.trim();
  const figmaStr  = `${figmaTask.status}\n${figmaTask.message}`.trim();
  const slackStr  = `${slackTask.status}\n${slackTask.message}`.trim();

  const anyError = [githubTask, driveTask, onePwTask, figmaTask, slackTask]
    .some(t => t.status === 'error');

  const header = anyError
    ? `## Attention! \n\n**${processLog.githubHandle}**, only got partially offboarded from Project: **${processLog.projectName}** at ${todayFormatted}\n\n`
    : `**${processLog.githubHandle}**, got fully offboarded from Project: **${processLog.projectName}** at ${todayFormatted}\n\n`;

  const body = `* github: ${githubStr}\n` +
               `* google drive: ${driveStr}\n` +
               `* 1Password: ${onePwStr}\n` +
               `* figma: ${figmaStr}\n` +
               `* meetings: ${slackStr}\n\n` +
               `request made ${timestampFormatted}, total time to process ${timeString}`;

  processLog.steps.push({
    step: 'constructOffboardingComment',
    status: 'success',
    message: 'Offboarding comment constructed successfully'
  });
  return header + body;
}