/**
 * Automates offboarding for a Hack for LA project.
 * @param {string} projectName - The project name.
 * @param {string} githubHandle - The volunteer's GitHub handle.
 * @param {number} recordId - The record ID (row number).
 * @returns {Object} - { status: 'success'|'error', message: string }
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
    tasks:[]
  };

  processLog.steps.push({ step: 'start', message: `Starting offboarding for project: ${projectName}, member: ${githubHandle}, recordId: ${recordId}` });

  try {
    if (!projectName || typeof projectName !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    if (!isValidGitHubHandle(githubHandle)) {
      throw new Error(`Invalid GitHub handle: ${githubHandle}`);
    }
    if (!recordId || isNaN(recordId)) {
      throw new Error(`Invalid record ID: ${recordId}`);
    }

    const projectInfoResult = getProjectInfo(projectName, processLog);
    if (!projectInfoResult.data) {
      throw new Error(`Project ${projectName} not found`);
    }
    const projectInfo = projectInfoResult.data;
    
    const emailsResult = getEmails(githubHandle, processLog);
    if (!emailsResult.data) {
      throw new Error(`Emails for ${githubHandle} not found`);
    }
    const emails = emailsResult.data;
    processLog.steps.push({ step: 'emails', message: `Fetched emails for ${githubHandle}` });

    // Remove user from Google Drive
    const driveResult = removeUserFromProjectDrive(emails, projectInfo, processLog);
    processLog.tasks.push(driveResult);

    // Remove user from GitHub teams, keeping read access
    const githubResult = removeFromProjectGithubTeams(githubHandle, projectInfo, processLog);
    processLog.tasks.push(githubResult);
    
    // Remove project from member's database 
    const dbResult = removeProjectFromHFLADB(githubHandle, projectName, processLog);
    processLog.tasks.push(dbResult);
    
    processLog.total_time_to_process = Date.now() - startTime;

    // Construct and post the GitHub comment
    const commentBody = constructOffboardingComment(processLog);
    if (!commentBody) {
      throw new Error('Failed to construct offboarding comment');
    }
    Logger.log(`Constructed comment: ${commentBody}`);
    
    //log result on github issue
    const githubCommentResult = onboardingGHlog(commentBody, processLog);
    processLog.steps.push(githubCommentResult);

    processLog.steps.push({ step: 'complete', status: 'success', message: `Successfully offboarded ${githubHandle} from ${projectName}` });
    Logger.log("log: " + JSON.stringify(processLog, null, 2));//show log
    return { status: 'success', message: `User ${githubHandle} offboarded successfully` };
    
  } catch (error) {
    processLog.steps.push({ step: 'error', status: 'error', message: `Offboarding error for ${githubHandle}: ${error.message}` });
    Logger.log("log: " + JSON.stringify(processLog, null, 2));//show log
    return { status: 'error', message: error.message };
  }
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
    processLog.steps.push({ step: 'removeUserFromProjectDrive', status: 'error', message: 'Missing required parameters for removeUserFromProjectDrive' });
    return{ task: 'remove from Project Drives',status: 'error', message: 'Missing required parameters for removeUserFromProjectDrive' };
  }
  //Logger.log(`Attempting to remove user from Drive with emails: ${JSON.stringify(emails, null, 2)}, projectInfo: ${JSON.stringify(projectInfo, null, 2)}`);
  
  const removeFromDrive = (email, driveId) => {
    try {
      const permissions = Drive.Permissions.list(driveId, { supportsAllDrives: true }).items;
      const permission = permissions.find(p => p.emailAddress && p.emailAddress.toLowerCase() === email.toLowerCase());
      if (permission) {
        Drive.Permissions.remove(driveId, permission.id, { supportsAllDrives: true });
        processLog.steps.push({ step: 'removeUserFromProjectDrive', status: 'success', message: `Removed ${email} from Drive ${driveId}` });
        return true;
      } else {
        processLog.steps.push({ step: 'removeUserFromProjectDrive', status: 'error', message: `No permission found for ${email} in Drive ${driveId}`});
        return false;
      }
    } catch (error) {
      processLog.steps.push({ step: 'removeUserFromProjectDrive', status: 'error', message: `Failed to remove ${email} from Drive ${driveId}: ${error.message}`});
      return false;
    }
  };

  const tryRemoveFromDrive = (driveId) => {
    let removed = false;
    if (emails.preferred_email) {
      removed = removeFromDrive(emails.preferred_email, driveId);
    }
    if (!removed && emails.gmail && emails.gmail !== emails.preferred_email) {
      removed = removeFromDrive(emails.gmail, driveId);
    }
    if (!removed) {
      processLog.steps.push({ step: 'removeUserFromProjectDrive', status: 'error', message: `No valid email found to remove from Drive ${driveId}`});
    }
    return removed;
  };

  let success = false;
  let log = "";
  if (projectInfo.main_drive_id) {
    success = tryRemoveFromDrive(projectInfo.main_drive_id)|| success;
    success?log+=`removed member from main google drive \n`:log+=`unable to remove member from main google drive \n`;
  }
  
  if (projectInfo.pii_drive_id) {
    success = tryRemoveFromDrive(projectInfo.pii_drive_id)|| success;
    success?log+=`removed member from PII google drive \n`:log+=`unable to remove member from PII google drive \n`;
  }
  return { task: 'remove from Project Drives',status: success ? 'success' : 'error', message: log };
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
 * Logs the offboarding result to a GitHub issue.
 * @param {string} commentBody - The comment body.
 * @param {Object} processLog - The process log object.
 * @returns {Object} - { status: 'success'|'error', message: string, data: Object|null }
 */
function constructOffboardingComment(processLog) {
  if (!processLog) {
    processLog.steps.push({ step: 'constructOffnboardingComment', status: 'error', message: 'Missing required data in processLog for constructing comment' });
    return null;
  }

  const totalTime = processLog.total_time_to_process / 1000; // Convert to seconds
  const timeString = totalTime < 60 ? `${totalTime.toFixed(2)} seconds` : `${(totalTime / 60).toFixed(2)} minutes`;
  
  
  let githubTeamString = 'Not performed';
  let driveString = 'Not performed';
  let onePasswordString = 'Not performed';
  let figmaString = 'Not performed';
  let slackString = 'Not performed';

  let githubTask = processLog.tasks.find(task => task.task === 'remove from Github Teams');
  if (githubTask) {
    githubTeamString = `${githubTask.status}\n`+ `${githubTask.message}`;
  }
  let driveTask = processLog.tasks.find(task => task.task === 'remove from Project Drives');
  if (driveTask) {
    driveString = `${driveTask.status}\n`+ `${driveTask.message}`;
  }
  let onePasswordTask = processLog.tasks.find(task => task.task === 'remove from onePassword');
  if (onePasswordTask) {
    onePasswordString = `${onePasswordTask.status}\n`+ `${onePasswordTask.message}`;
  }
  let figmaTask = processLog.tasks.find(task => task.task === 'remove from figma');
  if (figmaTask) {
    figmaString = `${figmaTask.status}\n`+ `${figmaTask.message}`;
  }
  let slackTask = processLog.tasks.find(task => task.task === 'remove from slack');
  if (slackTask) {
    slackString = `${slackTask.status}\n`+ `${slackTask.message}`;
  }
  let fail = false;
  if ((githubTask && githubTask.status=="error")||
      (driveTask && driveTask.status=="error")||
      (onePasswordTask && onePasswordTask.status=="error")||
      (figmaTask && figmaTask.status=="error")||
      (slackTask && slackTask.status=="error")){
        fail = true;}

  const today = new Date();
  const todayFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm');
  const timestampFormatted = Utilities.formatDate(today, CONFIG.TIME_ZONE, 'yyyy-MM-dd hh:mm:ss');

  let commentBody = "";
  if(fail){
    commentBody = `##Attention! \n\n##`+
    `**${processLog.githubHandle}**, only got partially offboarded from Project: **${processLog.projectName}** at ${todayFormatted}\n\n` +
                        `* github: ${githubTeamString}\n` +
                        `* google drive: ${driveString}\n` +
                        `* 1Password: ${onePasswordString}\n` +
                        `* figma: ${figmaString}\n` +
                        `* meetings: ${slackString}\n\n` +
                        `request made ${timestampFormatted}, total time to process ${timeString}`;
  }else{
    commentBody = `**${processLog.githubHandle}**, got fully offboarded from Project: **${processLog.projectName}** \n\n` +
                        `request made ${timestampFormatted}, total time to process ${timeString}`;
  }

  processLog.steps.push({ step: 'constructOffboardingComment', status: 'success', message: 'Offboarding comment constructed successfully' });
  return commentBody;
}