/*The script is bounded to Migration HFLA Onboarding form (Responses)
https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=2141712738#gid=2141712738
*/
/**
 * Handles form submissions for onboarding and offboarding processes.
 * Bound to the HFLA Volunteers spreadsheet (ID: 15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw).
 * @param {Object} s - The form submission event object.
 * @returns {Object} - { status: 'success'|'error', message: string }
 */
function submit(s) {
    try {
      if (!s || !s.range) {
        throw new Error('Invalid form submission event');
      }

      //check which form submit the response
      const onboardType = identifyOnboardType();
      //arrange entry for new row according to onbardtype
      const newRowValues = processInput(s,onboardType);
      if (!newRowValues) {
        throw new Error(`Failed to process input for onboardType: ${onboardType}`);
      }
      //append new row to designated according to onbardtype
      const rowId = makeRow(newRowValues, onboardType);
      if (!rowId) {
        throw new Error(`Failed to append row for onboardType: ${onboardType}`);
      }
      //perform onboarding automation according to onbardtype
      onboard(rowId, onboardType);
      return { status: 'success', message: `Processed submission for row ${rowId}, type: ${onboardType}` };
    } catch (error) {
      Logger.log(`Error in submit: ${error.message}`);
      return { status: 'error', message: error.message };
  }
}
    
/**
 * Identifies the type of onboarding based on the active sheet name.
 * @returns {string} - The onboarding type ('general', 'website', 'project_on', 'project_off').
 */
function identifyOnboardType() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // Returns the currently active spreadsheet, or null if there is none.
  if (!ss) {
    throw new Error('No active spreadsheet found');
  }

  // Gets the active sheet in a spreadsheet.
  const sheet = ss.getActiveSheet(); 
  const sheetName = sheet.getName();
  Logger.log(`Submission from sheet: ${sheetName}`);

  const ONBOARD_TYPES = {
    'General Onboarding Form Responses': 'general',
    'Website Onboarding Form Responses': 'website',
    'Project Onboarding Form Response': 'project_on',
    'Project Offboarding Form Response': 'project_off'
  };

  const onboardType = ONBOARD_TYPES[sheetName];
  if (!onboardType) {
    throw new Error(`Unknown sheet name: ${sheetName}`);
  }
  return onboardType;
  
}
/**
 * Processes form input and constructs row values based on onboarding type.
 * @param {Object} s - The form submission event object.
 * @param {string} sheetName - The onboarding type ('general', 'website', 'project_on', 'project_off').
 * @returns {Array} - The row values to append.
 */
function processInput(s, sheetName){
  const CONFIG = {
    TIME_ZONE: 'America/Los_Angeles',
    EXPECTED_COLUMNS: 22
  };

  var sheet = SpreadsheetApp.getActiveSheet();
  var theRow = s.range.getRow();
  const range = sheet.getRange(theRow, 1, 1, CONFIG.EXPECTED_COLUMNS);
  const rangeArray = range.getValues()[0];

  if (!rangeArray[0]) {
    throw new Error(`No timestamp found in row ${theRow}`);
  }

  const currentTime = Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'MMMM d, yyyy, h:mm:ss a z');

  let newRowValues;
  switch (sheetName) {
    case 'general':
      newRowValues = [
        rangeArray[11], // cop_name
        '', // project_name
        rangeArray[1], // name_first
        rangeArray[2], // name_last
        'Active', // user_status
        rangeArray[12], // job_title_current
        rangeArray[13], // job_title_target
        rangeArray[4], // preferred_email
        rangeArray[5].toString(), // phone
        rangeArray[6] === 'Yes', // texting_ok
        rangeArray[7], // slack_name
        rangeArray[8], // slack_id
        rangeArray[9], // github_handle
        rangeArray[10], // linkedin
        '', // Following HfLA
        '', // Found on LinkedIn
        '', // Connected B LinkedIn
        '', // Do Not
        '', // sent
        rangeArray[14], // time_zone
        rangeArray[15] === 'Yes', // conduct
        rangeArray[3], // last_modified_by
        '', // is_hfla_github_member
        '', // github_2fa
        '', // github_membership_public
        '', // job_title_target2
        rangeArray[17], // referred_by
        rangeArray[3], // Gmail
        rangeArray[18], // zoom_email
        rangeArray[3], // created_by
        currentTime, // first_attended
        currentTime, // last_modified
        rangeArray[16], // Enter Passphrase
        '', // attn-verified
        '', // attn-duration
        '' // _Comments
      ];
      break;
    case 'website':
      newRowValues = [
        rangeArray[1], // first_name
        rangeArray[2], // last_name
        rangeArray[3], // email
        rangeArray[4], // github_handle
        currentTime, // first_attended
        currentTime, // last_modified
        rangeArray[3], // last_modified_by
        '', // website_all_team_meeting
        '', // website_dev_meeting
        '', // website_dev_office_hrs
        '' // _Comments
      ];
      break;
    case 'project_on':
      newRowValues = [
        'onboard', // action
        rangeArray[2], // project_name
        rangeArray[3], // github_handle
        rangeArray[1], // role
        currentTime // execute_time
      ];
      break;
    case 'project_off':
      newRowValues = [
        'offboard', // action
        rangeArray[2], // project_name
        rangeArray[1], // github_handle
        '', // role
        currentTime // execute_time
      ];
      break;
    default:
      throw new Error(`Invalid onboardType: ${sheetName}`);
  }
    return newRowValues;
}
/**
 * Appends a new row to the appropriate sheet and applies data validation.
 * @param {Array} rowValues - The values to append.
 * @param {string} sheetName - The onboarding type.
 * @returns {number} - The new row ID.
 */
function makeRow(rowValues, sheetName) {
  const CONFIG = {
    SPREADSHEET_ID: '15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw',
    SHEET_IDS: {
      general: 992054610, // Volunteers
      website: 306592775, // Website_Team_Onboarding
      project_on: 1891272984, // Project On/Off-boarding log
      project_off: 1891272984 // Project On/Off-boarding log
    }
  };

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheets().find(s => s.getSheetId() === CONFIG.SHEET_IDS[sheetName]);
  if (!sheet) {
    throw new Error(`Sheet not found for ${sheetName}, ID: ${CONFIG.SHEET_IDS[sheetName]}`);
  }

  sheet.appendRow(rowValues);
  const newRowId = sheet.getLastRow();
  Logger.log(`New row appended to ${sheet.getName()}: ${rowValues}`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Add checkbox datatype to column
  const checkboxColumns = sheetName === 'general' ? [
    'texting_ok', 'Following HfLA', 'Connected B LinkedIn', 'Do Not', 'Sent',
    'conduct', 'is_hfla_github_member', 'github_2fa', 'github_membership_public', 'attn-verified'
  ] : sheetName === 'website' ? [
    'website_all_team_meeting', 'website_dev_meeting', 'website_dev_office_hrs'
  ] : [];
  // Apply checkbox data validation to the specific cells in the new row
  if (checkboxColumns.length > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
    checkboxColumns.forEach(column => {
      const colIndex = headers.indexOf(column) + 1;
      if (colIndex > 0) {
        sheet.getRange(newRowId, colIndex).setDataValidation(rule);
      }
    });
  }

  return newRowId
}
/**
 * Triggers the appropriate onboarding/offboarding automation.
 * @param {number} rowId - The row ID to process.
 * @param {string} sheetName - The onboarding type.
 */
function onboard(rowId, sheetName){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
   const sheet = spreadsheet.getSheetByName({
    general: 'Volunteers',
    website: 'Website Team Onboarding',
    project_on: 'Project On/Off-boarding log',
    project_off: 'Project On/Off-boarding log'
  }[sheetName]);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Extract the column data from the new row
  const rowData = sheet.getRange(rowId, 1, 1, sheet.getLastColumn()).getValues()[0];

  try {
    switch (sheetName) {
      case 'general':
        const generalData = {
          name_first: rowData[headers.indexOf('name_first')],
          name_last: rowData[headers.indexOf('name_last')],
          preferred_email: rowData[headers.indexOf('preferred_email')],
          gmail: rowData[headers.indexOf('Gmail')],
          github_handle: rowData[headers.indexOf('github_handle')],
          cop_name: rowData[headers.indexOf('cop_name')],
          conduct: rowData[headers.indexOf('conduct')],
          passphrase: rowData[headers.indexOf('Enter Passphrase')],
          linkedin: rowData[headers.indexOf('linkedin')],
          zoom_email: rowData[headers.indexOf('zoom_email')],
          attn_verified: rowData[headers.indexOf('attn-verified')],
          record_id: rowId
        };
        Logger.log(`General onboarding data: ${JSON.stringify(generalData)}`);
        onboardingAutomation(generalData.name_first, generalData.name_last, generalData.preferred_email,
          generalData.gmail, generalData.github_handle, generalData.cop_name, generalData.conduct,
          generalData.passphrase, generalData.linkedin, generalData.zoom_email, generalData.attn_verified,
          generalData.record_id);
        break;
      case 'website':
        const websiteData = {
          first_name: rowData[headers.indexOf('first_name')],
          last_name: rowData[headers.indexOf('last_name')],
          gmail: rowData[headers.indexOf('email')],
          github_handle: rowData[headers.indexOf('github_handle')],
          record_id: rowId
        };
        Logger.log(`Website onboarding data: ${JSON.stringify(websiteData)}`);
        website_onboardingAutomation(websiteData.first_name, websiteData.last_name, websiteData.gmail,
          websiteData.github_handle, websiteData.record_id);
        break;
      case 'project_on':
        const projectOnData = {
          project_name: rowData[headers.indexOf('project_name')],
          github_handle: rowData[headers.indexOf('github_handle')],
          role: rowData[headers.indexOf('role')],
          record_id: rowId
        };
        Logger.log(`Project onboarding data: ${JSON.stringify(projectOnData)}`);
        projectOnboardingAutomation(projectOnData.project_name, projectOnData.github_handle,
          projectOnData.role, projectOnData.record_id);
        break;
      case 'project_off':
        const projectOffData = {
          project_name: rowData[headers.indexOf('project_name')],
          github_handle: rowData[headers.indexOf('github_handle')],
          record_id: rowId
        };
        Logger.log(`Project offboarding data: ${JSON.stringify(projectOffData)}`);
        projectOffboardingAutomation(projectOffData.project_name, projectOffData.github_handle,
          projectOffData.record_id);
        break;
      default:
        throw new Error(`Invalid onboardType: ${sheetName}`);
    }
    Logger.log(`${sheetName} onboarding/offboarding finished for row ${rowId}`);
  } catch (error) {
    Logger.log(`Error in onboard for row ${rowId}: ${error.message}`);
    throw error;
  }
}