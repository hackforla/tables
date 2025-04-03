

//***Since getWebinarNow() get the Webinar that's happenning now, Uncomment getMostRecentWebinar() and comment out getWebinarNow() to test the script.***

function createAttendeeReport() {

  var webinars = [];
  var webinarId;
  var attendees = [];

  webinars = listAllWebinars();//call zoom API to list all webinars
  //Logger.log("-----------output1------------All Webinars ")
  //Logger.log(webinars); // Log the meetings or process them accordingly

  //webinar=getMostRecentWebinar(webinars);// DEBUGGING PURPOSE,used for testing when the onboarding event is in the past
  webinar=getWebinarNow(webinars);// get the webinar that's happening now,uncomment when in production

  //Logger.log("-----------output2------------Target Webinar")
  //Logger.log(webinar); // Log the meetings or process them accordingly

  if (!webinar) {
    Logger.log("No webinar selected; aborting report creation.");
    errorMessage("HFLAOnboardingTimeTrigger", "No webinar selected, Unable to generate report"); //Send error message to tables@hfla.org
    return; // Exit 
  }

  webinarId = webinar.id; //Use web id since it's a bug from ZOOM API itself for using uid
  //Logger.log("-----------output3------------Target Webinars's ID")
  //Logger.log(webinarId)

  //Logger.log("-----------output4------------Target Webinars's start_time")
  //Logger.log(webinar.start_time)

  attendees = getWebinarRegistrants(webinarId);//call zoom API to list all registrant
  

  var filename = "Onboarding_Zoom_Registrants_Report"
  var folder = DriveApp.getRootFolder();
  var files = folder.getFilesByName(filename);
  var file;
  
  if (files.hasNext()) {//"Onboarding_Zoom_Registrants_Report" already exist
    file = files.next();
  } else {//"Onboarding_Zoom_Registrants_Report" does not exist; create "Onboarding_Zoom_Registrants_Report" in root drive
    file = SpreadsheetApp.create(filename);
    file = DriveApp.getFileById(file.getId());
    file.moveTo(folder);
  }
  
  var ss = SpreadsheetApp.openById(file.getId());
  var pstDate = new Date(webinar.start_time);
  pstDate.setHours(pstDate.getHours() - 8); //Convert GMT to PST, Since zoom use GMT timestamp
  var sheetName = pstDate.toISOString().split('T')[0];
  
  // Remove existing tab with the same name to avoid duplicates
  var existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }

  // Insert new tab as the first tab (index 0)
  var sheet = ss.insertSheet(sheetName, 0);
  
  //Add "reg-verified" as the first column of the header
  var headers = ["reg-verified"].concat(Object.keys(attendees[0]));
  sheet.appendRow(headers);

  //Initialize data with "reg-verified" as FALSE for each row of attendees
  var data = attendees.map(att => {
    var row = [false]; // Default reg-verified to FALSE
    headers.slice(1).forEach(header => row.push(att[header] || ""));
    return row;
  });

  //write data to ta
  writeMultipleRows(data, ss.getId(), sheetName);

  //Format "reg-verified" column as checkboxes
  sheet.getRange(2, 1, data.length, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build());

  Logger.log("Spreadsheet updated: " + ss.getUrl());//log report's URL
}

//helper function write multiple rows
function writeMultipleRows(data, sheetId, sheetName) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  
  sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
}

//Get webinar happening now
function getWebinarNow(webinars) {
  var now = new Date(); // Current time as Date object (GMT internally)

  var ongoingWebinars = webinars.filter(function(webinar) {
    var startTime = new Date(webinar.start_time);
    var endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + webinar.duration); // Assuming webinar.duration is in minutes

    return startTime <= now && now <= endTime;
  });

  if (ongoingWebinars.length === 0) {
    Logger.log("No ongoing webinars found at " + now.toISOString());
    return null;
  }

  var currentWebinar = ongoingWebinars[0]; // Assuming only one webinar at a time
  Logger.log("Ongoing Webinar:");
  Logger.log(currentWebinar);

  return currentWebinar;
}

//function used for testing
function getMostRecentWebinar(webinars) {
  var now = new Date().toISOString(); // Current time in GMT
  
  var pastwebinars = webinars.filter(function(webinar) {
    return webinar.start_time < now;
  });
  
  if (pastwebinars.length === 0) {
    Logger.log("No past meetings found.");
    return null;
  }
  
  pastwebinars.sort(function(a, b) {
    return new Date(b.start_time) - new Date(a.start_time);
  });
  
  var mostRecentwebinars = pastwebinars[0];
  Logger.log("Most Recent Past webinars:");
  Logger.log(mostRecentwebinars);
  
  return mostRecentwebinars;
}

function listAllWebinars() {
  var webinars = [];
  var pageToken = "";
  var pageSize = 30; // Adjust if needed

  do {
    var url = `https://api.zoom.us/v2/users/${ZOOM_USER_ID}/webinars?page_size=${pageSize}&next_page_token=${pageToken}`;
    var response = accessProtectedResource(url, 'get');
    var res = JSON.parse(response);
    
    if (res.webinars && res.webinars.length > 0) {
      webinars = webinars.concat(res.webinars);
    }
    pageToken = res.next_page_token;
  } while (pageToken);
  
  return webinars;
}

// Function to get registrants of a webinar
function getWebinarRegistrants(webinarId) {
  var registrants = [];
  var pageToken = "";
  var pageSize = 100; // Max allowed
  
  do {
    var url = `https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=${pageSize}&next_page_token=${pageToken}`;

    var response = accessProtectedResource(url, 'get');
    var res = JSON.parse(response);

    if (res.registrants && res.registrants.length > 0) {
      registrants = registrants.concat(res.registrants);
    }
    pageToken = res.next_page_token;
  } while (pageToken);
  
  Logger.log("All Registrants:");
  Logger.log(registrants);
  
  return registrants;
}


//zoom Oauth call
function accessProtectedResource(url, method_opt, headers_opt) {
  var token = getClientCredentialsToken();  // Get the token
  var method = method_opt || 'get';
  var headers = headers_opt || {};
  headers['Authorization'] = 'Bearer ' + token;

  var resp = UrlFetchApp.fetch(url, {
    'headers': headers,
    'method': method,
    'muteHttpExceptions': true,
  });

  var code = resp.getResponseCode();
  if (code >= 200 && code < 300) {
    return resp.getContentText("utf-8"); // Success
  } else if (code == 401 || code == 403) {
    // Not authorized or token expired
    Logger.log("Authorization failed");
  } else {
    console.error("Error (%s): %s", code.toString(), resp.getContentText("utf-8"));
    throw ("Backend server error: " + code);
  }
}

function getClientCredentialsToken() {
  var url = 'https://zoom.us/oauth/token';
  var payload = {
    'grant_type': 'account_credentials',
    'account_id': ZOOM_ACCOUNT_ID
  };

  var options = {
    'method': 'post',
    'payload': payload,
    'headers': {
      'Authorization': 'Basic ' + Utilities.base64Encode(ZOOM_CLIENT_ID + ':' + ZOOM_CLIENT_SECRET)
    }
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());
  //Logger.log(result.access_token);
  return result.access_token;
}

// Function sends an error email message to tables@hackforla.org if an error occurs in the onboarding process
function errorMessage(subject, error) {
  let message = error;
  MailApp.sendEmail("tables@hackforla.org", subject, message);
}