//App script has limit of 20 trigger which means can only schedule 6 meetings once(open trigger, close trigger, Zoom attendee report trigger and weekly update)
//The script will set a weekly trigger to run itself every Sunday 11:30pm  and set trigger for closest 3 meeting
//The meeting in HFLA table's Onboarding - Schedule have to be in chronical order
//The table bot will trigger the script one every edit on HFLA form

function setTrigger() {
  deleteAllTriggers(); // Clear old triggers
  Utilities.sleep(5*1000); //pause for 5 sec to ensure cleanup is complete,, try using async/await later =>
                           // https://justin.poehnelt.com/posts/apps-script-async-await/
                           //Google Apps Script doesn't support Promise or async/await natively because it runs in a synchronous execution model.
  
  var onboardingData = getOnboardingSchedule();//get closest next 3 meeting 
  if (!onboardingData) return;//insert error throwing later

  weeklyUpdateTrigger(); // Set weekly trigger every Sunday
  scheduledTrigger(onboardingData); // Schedule triggers for next 3 meetings
}

function weeklyUpdateTrigger() {
  // Trigger every Sunday at 23:30.
  ScriptApp.newTrigger('setTrigger')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(23)
    .nearMinute(30)
    .inTimezone('America/Los_Angeles')
    .create();
}

function scheduledTrigger(onboardingData) {     
  onboardingData.forEach(({ date, on, off }) => {
    var openTime = parseDateTime(date, on);
    var closeTime = parseDateTime(date, off);
    
    ScriptApp.newTrigger('openForm') // Open Google Form
      .timeBased()
      .at(openTime)
      .create();

    ScriptApp.newTrigger('closeForm') // Close Google Form
      .timeBased()
      .at(closeTime)
      .create();

    ScriptApp.newTrigger('createAttendeeReport') // Fetch Zoom Attendees
      .timeBased()
      .at(subtract15Minutes(openTime))
      .create();
  });
}

function getOnboardingSchedule() {
  var tablesID = '9o1gvt9pjWdcV-rCZ4c46G';  //google table beta -> HFLA-Onboarding - Schedule table id
  var tableName = "tables/" + tablesID;

  var today = new Date(); //get today's date
  today.setHours(0, 0, 0, 0);

   var response = Area120Tables.Tables.Rows.list(tableName); //read from HFLA table's Onboarding - Schedule

  if (!response) return null; //insert error throwing later

  var meetings = [];
  for (var row of response.rows) {
    if (!row.values) continue;
    
    var { day, year, month } = row.values["date"];
    var date = new Date(year, month - 1, day);
    
    if (date >= today) {
      meetings.push({
        date: row.values["date"],
        on: row.values["on"],
        off: row.values["off"]
      });

      if (meetings.length === 3) break; // Only get next 3 meetings
    }
  }
  Logger.log( "Next 3 onboarding meetings:");
  Logger.log( meetings);

  return meetings.length ? meetings : null; //return null if meeting length = 0
}

//Parsing onboardingdata into date object
function parseDateTime(dateObj, timeStr) {
  var [hour, minute] = timeStr.split(":").map(Number); //seperate timeStr into hour and minute 
  return new Date(dateObj.year, dateObj.month - 1, dateObj.day, hour, minute, 0); // create new date object in appscript,  month - 1 because months are 0-indexed in google appscript
}

//subtract 15 to date object
function subtract15Minutes(date) {
  var newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() - 15);
  return newDate;
}

function deleteAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log("Deleted all previous triggers");
}