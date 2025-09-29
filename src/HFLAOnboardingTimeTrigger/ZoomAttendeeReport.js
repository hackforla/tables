const ZOOM_ACCOUNT_ID = getScriptSecret("ZOOM_ACCOUNT_ID");
const ZOOM_CLIENT_ID = getScriptSecret("ZOOM_CLIENT_ID");
const ZOOM_CLIENT_SECRET = getScriptSecret("ZOOM_CLIENT_SECRET");   
const ZOOM_USER_ID = getScriptSecret("ZOOM_USER_ID");

/**
 * Creates a Zoom attendee report in the specified spreadsheet.
 */
function createAttendeeReport() {

  var webinars = [];
  var webinarId;
  var attendees = [];

  webinars = listAllWebinars();//call zoom API to list all webinars
  //Logger.log("-----------output1------------All Webinars ")
  //Logger.log(webinars); // Log the meetings or process them accordingly

  webinar=getMostRecentWebinar(webinars);//get the most recent webinar

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

  attendees =getWebinarsAttendees(webinarId);//call zoom API to list all participant
  //attendees = getWebinarRegistrants(webinarId);//call zoom API to list all registrant
  
var ss;
  try {
    ss = SpreadsheetApp.openById('1zYfTMyr0Yospj5hLjz0ZdX93llJ8Zy-JF_9k-cPUuW0'); //"Part1_onboarding_zoom_attendee_report" in Drive Tables > Tables > Database
  } catch (e) {
    var filename = "Part1_onboarding_zoom_attendee_report"
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
    
    ss = SpreadsheetApp.openById(file.getId());
  }

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

  // Define headers, inserting 'min' after 'duration'
  var baseHeaders = Object.keys(attendees[0]);
  var durationIndex = baseHeaders.indexOf('duration');
  baseHeaders.splice(durationIndex + 1, 0, 'min');
  //Add "reg-verified" as the first column of the header
  var headers = ["attended"].concat(baseHeaders);
  sheet.appendRow(headers);
  

  //Process data: 
  //initialize data with "reg-verified" as FALSE for each row of attendees
  //convert join_time and leave_time to LA time, add min column
  var data = attendees.map(att => {
    var row = [false]; // Default reg-verified to FALSE

    // Convert times to LA time (PDT or PST)
    var joinTime = new Date(att.join_time);
    var leaveTime = new Date(att.leave_time)
    var offset = isPST(joinTime) ? -7 : -8; // PDT: UTC-7, PST: UTC-8
    joinTime.setTime(joinTime.getTime() + (offset * 60 * 60 * 1000));
    leaveTime.setTime(leaveTime.getTime() + (offset * 60 * 60 * 1000));
    

    // Format times to M/d/yyyy H:mm
    att.join_time = formatDateToMDYYYYHMM(joinTime);
    att.leave_time = formatDateToMDYYYYHMM(leaveTime);
    
    // Convert duration to minutes
    var minutes = att.duration ? Math.round(att.duration / 60) : 0;

    // Build row data in header order
    headers.slice(1).forEach(header => {
      if (header === 'min') {
        row.push(minutes);
      } else {
        row.push(att[header] || "");
      }
    });
    return row;
  });

  //write data to report
  writeMultipleRows(data, ss.getId(), sheetName);

  //Format "reg-verified" column as checkboxes
  sheet.getRange(2, 1, data.length, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build());

  Logger.log("Spreadsheet updated: " + ss.getUrl());//log report's URL
}

/**
 * Helper function to determineDetermines if a date is in DST for Los Angeles.
 * @param {Date} date - Input date.
 * @returns {boolean} - True if in DST.
 */
function isPST(date) {
  var year = date.getFullYear();
  // DST starts second Sunday in March (month index 2)
  var dstStart = new Date(year, 2, 8); // 8th is first possible Sunday
  dstStart.setDate(8 + (7 - dstStart.getDay()) % 7); // Adjust to second Sunday
  // DST ends first Sunday in November (month index 10)
  var dstEnd = new Date(year, 10, 1); // 1st is first possible Sunday
  dstEnd.setDate(1 + (7 - dstEnd.getDay()) % 7); // Adjust to first Sunday
  return date >= dstStart && date < dstEnd;
}

/**
 * Helper function to formats a date to M/d/yyyy H:mm.
 * @param {Date} date - Input date.
 * @returns {string} - Formatted date string.
 */
function formatDateToMDYYYYHMM(date) {
  // Create a new Date object with the adjusted time
  var month = date.getUTCMonth() + 1; // Months are 0-based
  var day = date.getUTCDate();
  var year = date.getUTCFullYear();
  var hours = date.getUTCHours();
  var minutes = date.getUTCMinutes();
  // Pad single-digit minutes with leading zero
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}


//helper function write multiple rows
function writeMultipleRows(data, sheetId, sheetName) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  
  sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
}

/**
 * Retrieves attendees for a Zoom webinar.
 * @param {string} meetingId - Webinar ID.
 * @returns {Object[]} - Array of attendee objects.
 */
function getWebinarsAttendees(meetingId) {
  var attendees = [];
  var pageToken = "";
  var pageSize = 100; // Max allowed
  var retryDelay_1min = 60 * 1000; // 60 seconds in milliseconds, ie:it will call the api every minute
  var retryDelay_5min = 5 * 60 * 1000; //5 * 60 seconds in milliseconds, ie:it will call the api every 5 minute
  var maxTime_5min = 5 * 60 * 1000; // 5 minutes in milliseconds
  var maxTime_20min = 20 * 60 * 1000; // 20 minutes in milliseconds
  do {
    var url = "https://api.zoom.us/v2/past_webinars/" + meetingId + "/participants?page_size=" + pageSize;
    
    if (pageToken) {
      url += "&next_page_token=" + pageToken;
    }

    var startTime = Date.now();
    var attempt = 0;
    var success = false;
    var response;

    // Retry loop for API call until success or 5 minutes elapse
    while(!success && (Date.now() - startTime) < (maxTime_5min + maxTime_20min)){

      try{
        response = accessProtectedResource(url, 'get');
        var res = JSON.parse(response);
        
        // Check for Zoom API error code 3001
        if (res.code === 3001) {
          throw new Error("Zoom API Error 3001: Webinar not found or not ended");
        }

        // If no error, process the response
        if (res.participants && res.participants.length > 0) {
          attendees = attendees.concat(res.participants);
        }
        pageToken = res.next_page_token;
        success = true; // Mark as successful to exit retry loop

      }catch (e){
        // Convert error to string for robust checking
        var errorMessage = e.message || String(e);
        // Check if error is due to 404 with code 3001
        if (errorMessage.includes("3001") || errorMessage.includes("404")) {
          attempt++;
          if ((Date.now() - startTime) <= maxTime_5min) {// ecall Attendee Report API every 60 sec
            Logger.log(`Attempt ${attempt} failed with error: ${e.message}. Retrying in 60 seconds...`);
            Utilities.sleep(retryDelay_1min); // Wait 1 mins before retrying
          }else if( ((Date.now() - startTime) > maxTime_5min ) && ((Date.now() - startTime) < maxTime_20min)){//recall Attendee Report API every 5 mins, after try calling every min for 5 mins
            Logger.log(`Attempt ${attempt} failed with error: ${e.message}. Retrying in 5 mins...`);
            Utilities.sleep(retryDelay_5min); // Wait 5 mins before retrying
          }else {
            Logger.log(`Max time (25 minutes) reached. Failed to fetch attendees report for webinar ${meetingId}. Error: ${e.message}`);
            errorMessage("HFLAOnboardingTimeTrigger", `Failed to fetch attendees report for webinar ${meetingId} after 25 minutes: ${e.message}`);
            return attendees; // Return whatever attendees were collected, or empty array
          }
        }else{
          // Handle other errors immediately without retrying
          Logger.log(`Unexpected error fetching attendees for webinar ${meetingId}: ${e.message}`);
          errorMessage("HFLAOnboardingTimeTrigger", `Unexpected error fetching attendees for webinar ${meetingId}: ${e.message}`);
          return attendees
        }
      }
    }
  } while (pageToken);
  
  Logger.log("All Attendees:");
  Logger.log(attendees);
  
  return attendees;
}
/**
 * Retrieves the most recent past webinar.
 * @param {Object[]} webinars - Array of webinar objects.
 * @returns {Object|null} - Most recent webinar or null.
 */
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
/**
 * Lists all webinars for the Zoom user.
 * @returns {Object[]} - Array of webinar objects.
 */
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

/**
 * Accesses a protected Zoom resource with OAuth.
 * @param {string} url - API endpoint.
 * @param {string} [method='get'] - HTTP method.
 * @param {Object} [headers={}] - Additional headers.
 * @returns {string} - Response content.
 */
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

/**
 * Retrieves a Zoom OAuth token using client credentials.
 * @returns {string} - Access token.
 */
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

function getScriptSecret(key) {

  let secret = PropertiesService.getScriptProperties().getProperty(key)

  if (!secret) throw Error(`Secret ${key} is empty`)

  return secret

}

// Function sends an error email message to tables@hackforla.org if an error occurs in the onboarding process
function errorMessage(subject, error) {
  let message = error;
  MailApp.sendEmail("tables@hackforla.org", subject, message);
}