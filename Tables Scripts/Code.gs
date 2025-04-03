/* -- Function called by Tables Bot -- */
function onboardingAutomation(name_first, name_last, preferred_email, gmail, github_handle, cop_name, conduct, passphrase, linkedin, zoom_email, reg_verified, record_id) {
  
  let isVerified = stringToBoolean(reg_verified); // convert reg_verified to boolean
  
  // If reg_verified is false, check Zoom report
  if (!isVerified) {
    isVerified = verifyZoomRegistration(preferred_email, gmail, zoom_email, record_id);
  }
  // Proceed only if Zoom report verification succeeded or reg_verified is true(manual override) 
  if (isVerified) {
    const data = validate(github_handle, linkedin);
    addUsersToPlatforms(name_first, name_last, preferred_email, gmail, data.github_handle, cop_name, conduct, passphrase);
  } else {
    Logger.log("User not verified, sending error");
    errorMessage(name_first, name_last, "User is not onboarded");
  }
}

//helper function to convert string to boolean
function stringToBoolean(str) {
  return str === "true";
}

/* -- ZoomRegistration cross validation and Google Table & Zoom report Update Function -- */
function verifyZoomRegistration(preferred_email, gmail, zoom_email, record_id) {

  const ZOOM_SPREADSHEET_NAME = "Onboarding_Zoom_Registrants_Report";
  const folder = DriveApp.getRootFolder();
  const files = folder.getFilesByName(ZOOM_SPREADSHEET_NAME);
  let isVerified = false;

  if (!files.hasNext()) {
    Logger.log("Zoom registrant spreadsheet not found");
    errorMessage("ZoomVerification", "N/A", "Zoom registrant spreadsheet not found");
    return isVerified; // Exit early
  }

  const file = files.next();
  const ss = SpreadsheetApp.openById(file.getId());
  const sheets = ss.getSheets();

  // Get today's date in "YYYY-MM-DD" format as tab's name in the report
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0]; 

  // Find sheet's tab with today’s date as name
  const latestSheet = sheets.find(sheet => sheet.getName() === todayFormatted);
  
  if (!latestSheet) {
    const errorMsg = `No sheet found with today's date (${todayFormatted}) in ${ZOOM_SPREADSHEET_NAME}`;
    Logger.log(errorMsg);
    errorMessage("ZoomVerification", "N/A", errorMsg);
    return isVerified; // Exit early
  }

  const data = latestSheet.getDataRange().getValues();
  const headers = data[0];
  const emailIndex = headers.indexOf("email");
  const verifiedIndex = headers.indexOf("reg-verified");

  //match preferred_email, gmail, zoom_email, record_id with email in attendee report
  if (emailIndex === -1) {
    Logger.log("Email column not found in Zoom report");
  } else if (verifiedIndex === -1) {
    Logger.log("reg-verified column not found in Zoom report");
  } else {
    for (let i = 1; i < data.length; i++) {
      const zoomEmail = data[i][emailIndex].toLowerCase();
      const emailsMatch = zoomEmail === (preferred_email || "").toLowerCase() || 
                          zoomEmail === (gmail || "").toLowerCase() || 
                          zoomEmail === (zoom_email || "").toLowerCase();
      if (emailsMatch) {
        isVerified = true;
        latestSheet.getRange(i + 1, verifiedIndex + 1).setValue(true); // check the reg_verified box for Zoom report on google sheet
        Logger.log(`Set reg-verified to true for ${zoomEmail} in Zoom report at row ${i + 1}`);
        break;
      }
    }
  }
  
  //update reg-verified for the user
  const tableId = "a8Fi8xyvbbq0gWnJv5p_tB";
  const tableName = `tables/${tableId}`;
  const rowName = `${tableName}/rows/${record_id}`;
  const newValues = {
            "reg-verified": isVerified
          };
  Area120Tables.Tables.Rows.patch({ values: newValues }, rowName);
  
  return isVerified;
}


function validate(github_handle, linkedin) {
  if (github_handle.toLowerCase().includes('github') && !linkedin.toLowerCase().includes("linkedin.com/in/")) {
    const tableId = "a8Fi8xyvbbq0gWnJv5p_tB";
    const tableName = `tables/${tableId}`;
    let nextPageToken = null;

    do {
      const response = Area120Tables.Tables.Rows.list(tableName, {
        pageToken: nextPageToken,
        pageSize: 100,
      });
      if (response.rows) {
        for (let i = 0; i < response.rows.length; i++) {
          let row = response.rows[i];
          const githubValue = row.values["github_handle"];
          const expectedGithubValue = githubValue ? githubValue.replace(/.*github\.com\//, '') : '';
          const correctedGithubHandle = github_handle.replace(/.*github\.com\//, '');
          const linkedinValue = row.values["linkedin"];
          const correctedLinkedin = !linkedin.toLowerCase().includes("linkedin.com/in/")
            ? `https://www.linkedin.com/in/${linkedin}/` : linkedin;
          if (expectedGithubValue === correctedGithubHandle) {
            const rowId = row.name.split("/").pop();
            const rowName = `${tableName}/rows/${rowId}`;
            const newValues = {
              "github_handle": correctedGithubHandle,
              "linkedin": correctedLinkedin
            };
            Area120Tables.Tables.Rows.patch({ values: newValues }, rowName);
            return newValues;
          }
        }
      }

      nextPageToken = response.nextPageToken;
    } while (nextPageToken);
  }
  return { github_handle, linkedin };
}


/* -- Function to add new members to hack for la's various platforms -- */
function addUsersToPlatforms(name_first, name_last, preferred_email, email, githubHandle, cop, conduct, passphrase) {
  // Checks to see if the volunteer has 1, more than 1, or no communities of practice associated with them and sets the value to a variable
  cop = (cop ? cop.split(', ') : null);
  // project = (project ? project.split(', ') : null);      // Commented out because projects are not yet implemented into automations

  // setting table name and initalizing array for Communities of Practice
  let copTableID = "bXIzeO-0GAl7Vb8sbu8__z"; // Google tables id for the CoP Table
  let copTableName = "tables/" + copTableID; // Needed for the API call to filter the CoP table for the volunteer's associated COP(s)
  let filterTableCop;  // Variable will contain a list of the COP(s) associated with the volunteer

  let copDriveID;  // Variable will contain a list of the Google Drive ID(s) for the filtered COP(s)
  let copGHTeam;   // Variable will contain a list of Hack for LA GitHub teams the volunteer needs to be added to
  let copCalendarID;  // Variable will contain a list of Google Calendar ID(s) for the filtered COP(s)
  let copCalendarInvite;  // Variable will contain a list of Google Calendar Invite hashes for the filtered COP(s)

  // (not implmemented yet, DO NOT DELETE) Setting table name and initializing array for Projects 
  // let projectTableID = "aUgD85hZoYo2epgVPd4O1c"; //google tables id (after the /) //NEEDS TO BE CHANGED
  // let projectTableName = "tables/" + projectTableID;

  // The GitHub token for the hackforla-onboarding GitHub account.
  // Token is used for GitHub User automations
  const TOKEN = "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";

  // Additional options needed for GitHub autiomations API call
  let options = {
    "method": "PUT",
    "headers": { "Authorization": "token " + TOKEN },
    "muteHttpExceptions": true
  };

  // Moved guard clause outside to remove multiple iteration
  if (conduct !== "true" || passphrase.toLowerCase() !== 'strawberry') {
    errorMessage(name_first, name_last, "User didn't accept code of conduct");
    return
  }

  // Created this guard clause
  if (!cop) {
    errorMessage(name_first, name_last, "COP was empty")
    return
  }

  // For COPs
  // Check needed to make sure cop is not empty. If it is, there is an error
  if (cop) {
    // Loop through all COP(s) associated with the volunteer
    for (let i = 0; i < cop.length; i++) {
      // Gets row from Google Tables that corresponds with the correct COP(s)
      try {
        filterTableCop = Area120Tables.Tables.Rows.list(copTableName, { filter: `values.\"cop_name\"=\"${cop[i]}\"` });
      } catch (err) {
        errorMessage(name_first, name_last, err);
        break;
      }

      // After a COP is filtered, check to see if it is empty. If it is, there is an error, else, set variables to use for helper functions
      if (!filterTableCop || Object.keys(filterTableCop).length === 0) {
        errorMessage(name_first, name_last, "An incorrect community of practice was entered");
        break;
      } else {
        // Set variables for use with helper functions
        copDriveID = filterTableCop.rows[0].values["google_drive_id"];
        copGHTeam = filterTableCop.rows[0].values["repo_team"];
        copCalendarID = filterTableCop.rows[0].values["calendar_id"];
        copCalendarInvite = filterTableCop.rows[0].values["calendar_invite"];

        // No current calendar invites for marketing and revenue
      }

      // Calling helper functions if code of conduct was correct
      // Adds user to Google Drive, GitHub Repo Team, and Google Calendar
      if (conduct === "true" && passphrase.toLowerCase() === "strawberry") {
        addUserToDrive(name_first, name_last, email, preferred_email, copDriveID);
        addUserToGitHub(name_first, name_last, githubHandle, copGHTeam, options);

        // addUserToCalendar taken out of this workflow due to it causing timeout
        // addUserToCalendar(name_first, name_last, email, preferred_email, copCalendarID, copCalendarInvite);
        MailApp.sendEmail("tables@hackforla.org", "Table Scripts test", "it works")//for testing purpose

      } else {
        errorMessage(name_first, name_last, "User didn't accept code of conduct");
      }
    }
  } else {
    errorMessage(name_first, name_last, "COP was empty");
  }

  // (not implmemented yet, DO NOT DELETE) // For PROJECTS
  // if (project) {
  //   for (let i = 0; i < project.length; i++){
  //     let filterTableProject = Area120Tables.Tables.Rows.list(projectTableName, {filter: `values.\"CoP Name\"=\"${project[i]}\"`});
  //     let projectDriveID = filterTableProject.rows[0].values["Google Drive ID"];
  //     let projectResponse = DriveApp.getFolderById(projectDriveID).addEditor(email);
  //     MailApp.sendEmail("tables@hackforla.org", "From Tables Google Drive Function", projectResponse);
  //   }
  // }
}

/* -- Helper functions for addUsersToPlatforms -- */

// Function to add volunteer to the Google Shared Drive for the associated COP(s)
function addUserToDrive(name_first, name_last, email, preferred_email, driveID) {
  // For debugging/timing function
  let start = new Date()

  let gmail;
  if (email) {
    gmail = email;
  } else {
    gmail = preferred_email;
  }
  let properties = {
    role: 'writer',
    value: gmail,
    type: 'user'
  };

  // DEBUGGING
  // copsById = {
  //   '0ABybAQUv53kiUk9PVA': 'Data Science',
  //   '0AAX-8be-yD5JUk9PVA': 'Dev Ops',
  //   '0ALZlGXAx55mQUk9PVA': 'Engineering',
  //   '0AGAUfr5IS2YZUk9PVA': 'Marketing',
  //   '0AISloPaWXy2RUk9PVA': 'Product Management',
  //   '0AMHGjmh4EJW2Uk9PVA': 'Revenue',
  //   '0ACjCHzHKLLQxUk9PVA': 'UI/UX',
  //   '0AH1QP7hEsfMZUk9PVA' : 'Knowledge-based Content'
  // }

  // let copName = copsById[driveID] ? copsById[driveID] : driveID

  try {
    const knowledgeDriveID = '0ANa2FF5vnf3xUk9PVA';
    Drive.Permissions.insert(properties, driveID, {
      'supportsAllDrives': true,
    });
    Drive.Permissions.insert(properties, knowledgeDriveID, {
      'supportsAllDrives': true,
    });

    // Debugging purpose
    // let subject = `Adding ${email} to ${copName}`
    // let message = `Now attempting`

    // For debugging
    // if (gmail === 'tablesuser01@gmail.com') {
    //   subject = `TESTING - ${subject}`
    // }
    // MailApp.sendEmail("tables@hackforla.org", subject, message);

  } catch (err) {
    errorMessage(name_first, name_last, "Add to Drive Failed", gmail);

    // For Debugging
    // let subject = `TESTING - Adding ${email} to ${copName} failed`
    // let errMsg = JSON.parse(err).message
    // MailApp.sendEmail("tables@hackforla.org", subject, errMsg);
  }

  return (new Date() - start) / 1000
}

// Function to add volunteer to Hack for LA's GitHub organization and the GitHub team associated with COP(s)
function addUserToGitHub(name_first, name_last, ghHandle, ghTeam, options) {
  let start = new Date();
  if (/^(\w|-)+$/.test(ghHandle)) {
    try {
      let response = UrlFetchApp.fetch("https://api.github.com/orgs/hackforla/teams/" + ghTeam + "/memberships/" + ghHandle, options);
      let res = JSON.parse(response);
      if (!res.state) {
        errorMessage(name_first, name_last, "Add to GitHub Failed");
      }
    } catch (err) {
      // Add to GitHub Failed
      errorMessage(name_first, name_last, "Add to GitHub Failed");
    }
  }
  return (new Date() - start) / 1000;
}

// Tailored version of addUserToCalendar
// Rewrote function to run off the individual [CoP Name] tables
function addUserToCopCalendar(name_first, name_last, email, preferred_email, cop_name, conduct, passphrase) {
  // email input should be a gmail

  // For timing and debugging
  // let start = Date.now();

  if (conduct !== "true" || passphrase.toLowerCase() !== 'strawberry') {
    return
  }

  if (!cop_name) {
    let message = 'No CoP specified. Unable to add.'
    errorMessage(name_first, name_last, message);
  }

  let copTableID = "bXIzeO-0GAl7Vb8sbu8__z"; // Google tables id for the CoP Table
  let copTableName = "tables/" + copTableID; // Needed for the API call to filter the CoP table for the volunteer's associated COP(s)

  let copTable;

  // Get rows from Google Tables for specified CoP
  try {
    copTable = Area120Tables.Tables.Rows.list(copTableName, { filter: `values.\"cop_name\"=\"${cop_name}\"` });

  } catch (err) {
    let message = `Unable to retrieve cop info for ${cop_name}`
    errorMessage(name_first, name_last, message, preferred_email)
    return
  }

  if (!copTable) {
    let message = `Unable to retrieve cop info for ${cop_name}`
    errorMessage(name_first, name_last, message, preferred_email)
    return
  }

  let copCalendarID = copTable.rows[0].values["calendar_id"];
  let calendarInviteHash = copTable.rows[0].values["calendar_invite"];

  // Added this guard clause
  // Revenue and Marketing has no calendar invites/weekly meetings
  // As of 2023.05.19
  if (!calendarInviteHash || calendarInviteHash.length === 0) {
    return
  }

  // For debugging
  // if (!copCalendarID || !calendarInviteHash || calendarInviteHash.length === 0) {
  //   let hashLength = 'zero'
  //   if (calendarInviteHash) hashLength = calendarInviteHash.length
  //   let message = `cop_name: ${cop_name}\n` + `copCalendarID: ${copCalendarID}\n` + `calendarInviteHash: ${calendarInviteHash}\n` + `hashLength ${hashLength}\n` + `Duration: ${(Date.now()-start)/1000}`
  //   // MailApp.sendEmail("tables@hackforla.org", `TESTING - FAILED to send ${cop_name} calendar invite`, message);
  //   return
  // }

  // email input should be a gmail
  let gmail = email ? email : preferred_email
  let id;

  try {

    // MailApp.sendEmail("tables@hackforla.org", `TESTING - Attempting to send ${cop_name} calendar invite`, `TESTING - Attempting to send ${cop_name} calendar invite at ${new Date().toString()}`);
    id = Utilities.newBlob(Utilities.base64Decode(calendarInviteHash)).getDataAsString().split(" ")[0];
    let event = CalendarApp.getCalendarById(copCalendarID).getEventSeriesById(id);
    event.addGuest(gmail);
  } catch (err) {
    let message = `Add Guest to ${cop_name} Calendar Failed\n`
    message = message + `copCalendarID: ${copCalendarID}\n` + `id: ${id}`

    errorMessage(name_first, name_last, message);
  }

  // MailApp.sendEmail("tables@hackforla.org", `TESTING - SENT ${cop_name} calendar invite`, `SUCCESS - SENT ${cop_name} calendar invite at ${new Date().toString()} and it took ${(Date.now() - start)/1000}`);

}

// Function below not in use
// Use function above, addUserToCopCalendar
// Function to add volunteer to Google Calendar invite associated with COP(s)
function addUserToCalendar(name_first, name_last, email, preferred_email, calendarID, inviteHash) {
  // For debugging purposes... For timing functions
  // let start = new Date();
  // let blobStart;
  // let blobEnd;
  // let calendarAppStart;
  // let calendarAppEnd;
  // let addGuestStart;
  // let addGuestEnd;

  let gmail;
  if (email) {
    gmail = email;
  } else {
    gmail = preferred_email;
  }
  try {
    // blobStart = new Date()
    let id = Utilities.newBlob(Utilities.base64Decode(inviteHash)).getDataAsString().split(" ")[0];
    // blobEnd = (new Date - blobStart)/1000

    // calendarAppStart = new Date()
    let event = CalendarApp.getCalendarById(calendarID).getEventSeriesById(id);
    // calendarAppEnd = (new Date() - calendarAppStart)/1000

    // addGuestStart = new Date()
    event.addGuest(gmail);
    // addGuestEnd = (new Date() - addGuestStart)/1000

  } catch (err) {
    // Add to Calendar Failed
    errorMessage(name_first, name_last, "Add to Calendar Failed");
  }

  // return [{'blob': blobEnd}, {'calendar': calendarAppEnd}, {'guest': addGuestEnd}, {'total': (new Date() - start)/1000}]
}

// Function sends an error email message to tables@hackforla.org if an error occurs in the onboarding process
function errorMessage(name_first, name_last, error, email) {
  let subject = `${name_first} ${name_last} had an error`;

  let message = error;

  // Added email as optional input
  if (email) {
    message = `${email}\n` + message
  }

  MailApp.sendEmail("tables@hackforla.org", subject, message);
}

// NOT CURRENTLY USED
// Function to send an email to the volunteer if an error occurs 
function sendEmailToUser(email) {
  MailApp.sendEmail(email, "You entered the wrong passphrase", "You did not provide the correct passphrase from the Code of Conduct. Please go to the tech support room to provide the proper passphrase.");
}


/* -- Test Functions --*/


