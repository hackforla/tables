//App script has limit of 20 trigger which means can only schedule 6 meetings once(open trigger, close trigger, Zoom attendee report trigger and weekly update)
//The script will set a weekly trigger to run itself every Sunday 11:30pm  and set trigger for closest 3 meeting
//The meeting in HFLA table's Onboarding - Schedule have to be in chronical order
//The table bot will trigger the script one every edit on HFLA form
/**
 * Sets up triggers for onboarding meetings, including a weekly update and the next three meetings.
 */
function setTrigger() {
  try {
    deleteAllTriggers();// Clear old triggers
    Utilities.sleep(5000); // 5-second pause for cleanup,try using async/await later =>
                           // https://justin.poehnelt.com/posts/apps-script-async-await/
                           //Google Apps Script doesn't support Promise or async/await natively because it runs in a synchronous execution model.

    const onboardingData = getOnboardingSchedule();//get closest next 3 meeting 
    if (!onboardingData) {
      throw new Error('No valid onboarding meetings found');
    }

    weeklyUpdateTrigger();// Set weekly trigger every Sunday
    scheduledTrigger(onboardingData);// Schedule triggers for next 3 meetings
    Logger.log('Triggers set successfully');
  } catch (error) {
    Logger.log(`Error in setTrigger: ${error.message}`);
    errorMessage(`Error in setTrigger: ${error.message}`, 'HFLAOnboardingTimeTrigger');
  }
}

/**
 * Sets a weekly trigger to run setTrigger every Sunday at 23:30.
 */
function weeklyUpdateTrigger() {
  // Trigger every Sunday at 23:30.
  ScriptApp.newTrigger('setTrigger')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(23)
    .nearMinute(30)
    .inTimezone('America/Los_Angeles')
    .create();
  Logger.log('Weekly trigger set for Sunday 23:30');
}

/**
 * Schedules triggers for the next three onboarding meetings.
 * @param {Object[]} onboardingData - Array of meeting objects with date, on, and off properties.
 */
function scheduledTrigger(onboardingData) {     
  onboardingData.forEach(({ date, on, off }) => {
    var startTime = parseDateTime(date, on);
    var closeTime = parseDateTime(date, off);

    // Open Google Form at 6:45pm(if on time is 6:00)
    ScriptApp.newTrigger('openForm') 
      .timeBased()
      .at(add45Minutes(startTime))
      .create();
    Logger.log(`Open form trigger set for ${startTime}`);
    // Close Google Form at off time
    ScriptApp.newTrigger('closeForm') 
      .timeBased()
      .at(closeTime)
      .create();
    Logger.log(`Close form trigger set for ${closeTime}`);
    // Fetch Zoom PAttendee at 7:05pm(if on time is 6:00)
    ScriptApp.newTrigger('createAttendeeReport')
      .timeBased()
      .at(add65Minutes(startTime))
      .create();
    Logger.log(`Close form trigger set for ${closeTime}`);
  });
}

/**
 * Retrieves the next three onboarding meetings from the Onboarding - Schedule sheet.
 * @returns {Object[]|null} - Array of meeting objects or null if none found.
 */
function getOnboardingSchedule() {
  const SPREADSHEET_HFLA_Volunteers_ID = "15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw"; //HFLA Volunteers spreadsheet ID
  const SHEET_Onboarding_Schedule_ID = 1700787930; //Volunteers grid id
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_HFLA_Volunteers_ID);
  var spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_HFLA_Volunteers_ID);
  } catch (e) {
    Logger.log("Error accessing spreadsheet with ID " + SPREADSHEET_HFLA_Volunteers_ID + ": " + e.message);
    return;
  }
  var sheets = spreadsheet.getSheets();
  var sheet = sheets.find(sheet => sheet.getSheetId() === SHEET_Onboarding_Schedule_ID);

  if (!sheet) {
    Logger.log("Sheet Onboarding_Schedule not found in spreadsheet " + SPREADSHEET_SCHEDULE_ID);
    return null;
  }

  const today = new Date();
  const timeZone = "America/Los_Angeles";
  const timeStr = Utilities.formatDate(today, timeZone, "HH:mm:ss");
  const [h, m, s] = timeStr.split(':').map(Number);
  const todayPST = new Date(today.getTime() - (h * 3600000 + m * 60000 + s * 1000))
  
  // Read all data (starting from row 2 to skip headers)
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  var meetings = [];

  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateStr = row[0]; // date (e.g., "2025-01-06") (Date object)
    var onTime = row[2]; // on (e.g., "19:00") (Date object)
    var offTime = row[3]; // off (e.g., "21:30") (Date object)

    // Skip rows with missing date, on, or off
    if (!dateStr || !onTime || !offTime) continue;

    // Format to strings
    var dateStr = Utilities.formatDate(dateStr, timeZone, "yyyy-MM-dd");
    var onTime = Utilities.formatDate(onTime, timeZone, "HH:mm");
    var offTime = Utilities.formatDate(offTime, timeZone, "HH:mm");

    Logger.log("dateStr: " + dateStr);
    Logger.log("onTime: " + onTime);
    Logger.log("offTime: " + offTime);

    // Parse date string (YYYY-MM-DD)
    var dateParts = dateStr.toString().split("-");
    if (dateParts.length !== 3) continue; // Invalid date format
    var year = parseInt(dateParts[0]);
    var month = parseInt(dateParts[1]) - 1; // 0-based month 
    var day = parseInt(dateParts[2]);
    
    var [onHour, onMinute] = onTime.split(":").map(Number);
    var date = new Date(year, month, day, onHour, onMinute);

    // Only include future meetings
    if (date >= todayPST) {
      meetings.push({
        date: { year: year, month: month, day: day },
        on: onTime,
        off: offTime
      });

      if (meetings.length === 3) break; // Limit to next 3 meetings
    }
  }
  Logger.log( "Next 3 onboarding meetings:");
  Logger.log( meetings);

  return meetings.length ? meetings : null; //return null if meeting length = 0
}

/**
 * Parses a date object and time string into a Date object.
 * @param {Object} dateObj - Date object with year, month, day.
 * @param {string} timeStr - Time string (HH:mm).
 * @returns {Date} - Parsed Date object.
 */
function parseDateTime(dateObj, timeStr) {
  var [hour, minute] = timeStr.split(":").map(Number); //seperate timeStr into hour and minute 
  return new Date(dateObj.year, dateObj.month, dateObj.day, hour, minute, 0); // month is already 0-based
}

/**
 * Adds 30 minutes to a Date object.
 * @param {Date} date - Input date.
 * @returns {Date} - New Date with 45 minutes added.
 */
function add30Minutes(date) {
  var newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + 30);
  return newDate;
}
/**
 * Adds 45 minutes to a Date object.
 * @param {Date} date - Input date.
 * @returns {Date} - New Date with 45 minutes added.
 */
function add45Minutes(date) {
  var newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + 45);
  return newDate;
}
/**
 * Adds 65 minutes to a Date object.
 * @param {Date} date - Input date.
 * @returns {Date} - New Date with 65 minutes added.
 */
function add65Minutes(date) {
  var newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + 65);
  return newDate;
}
/**
 * Deletes all project triggers.
 */
function deleteAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log("Deleted all previous triggers");
}