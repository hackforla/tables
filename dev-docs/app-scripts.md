# Using the App Script

## What is Google App Scripts?

Google Apps Script is a free cloud-based JavaScript platform that lets you integrate with and automate tasks across Google Products.

## Why Google App Scripts?

Google Apps Scripts is free and makes it easy to interface with Google Tables, Google Drive, and Google Calendar. This makes it easier to automate the onboarding process as those services are being used.

## Where to find the scripts file?

To find the main scripts file, login to tables@hackforla.org Google account and go to the account's Google Drive.
The file in question is in the "Scripts" folder and open a file called "Tables Scripts".

## What are the automations? How does it work?

- The scripts and its functions are triggered by bots.
- The bots are found on Google Tables. Each table has its own bot(s).
  - Arguments are passed in from the table to the function.
- The onboarding automation bot runs when a new row is added to the Volunteers table.
  - A row is added to the Volunteers table when a user fills out and submits the volunteer onboarding form.
  - The main functions, onboardingAutomation and addUsersToPlatform, are called which in turn call helper functions.
    - Exception of addUserToCopCalendar which has a different workflow
  - Another bot runs which adds the user to specific CoP tables based on their selected CoP
    - The [CoP name] table's current purpose is solely for sending out calendar invites
  - Note that the bots can be be triggered based on different actions.
    - Column value change.
    - Time based.
    - Row added.
    - Row removed.
    - Comment added.

### Automations

- addUserToGitHub - Adds the user's GitHub to the organization and the CoP team.
- addUserToDrive - Adds user to the CoP google drive as a contributor.
- addUserToCopCalendar - Sends a google calendar invite for the CoP's meetings.
- AuditGoogleDrivesPermission - Audit All the HFLA projects' google drive Users' permission
- GoogleformTimeTrigger - Turn "Accepting responses" on/off for onboarding google form according to onboarding meeting schedule
- GoogleformTimeTrigger_Copy-for_2_form - Turn "Accepting responses" on/off for onboarding google form according to onboarding meeting schedule

### addUserToGitHub

- Help function within addUsersToPlatforms
- Adds the user to HackForLa organizaiton on GitHub
- Adds the user to the CoP that they selected on the volunteer onboarding form

### addUserToDrive

- Helper function called within addUsersToPlatforms
- Adds user to their selected CoP's drive as a contributor
- The contributor settings are

```
let properties = {
    role: 'writer',
    value: gmail,
    type: 'user'
  };
```

- https://developers.google.com/drive/api/guides/ref-roles

### addUserToCopCalendar

- Standalone function called in the CoP table's bot
- When a user is added to the Volunteer table, the user is then added to the [CoP Name] table by a bot in the Volunteer table titled Add [CoP Name] Volunteer
- The [CoP Name] table has its own bot which triggers addUserToCopCalendar
- addUserToCopCalendar sends out a google calendar invite to the user
- addUserToCopCalendar executes for each CoP that the user signed up for
  - A user selects x number of CoPs then addUserToCoP executes x times for that user
- addUserToCopCalendar could take up 30+ seconds causing the script to prematurely end due to a runtime limit of 30 seconds
  - Current runtime limitations: 30 sec / execution
  - https://developers.google.com/apps-script/guides/services/quotas
- The function will send the calendar invite regardless of the timeout, but it will not run any subsequent actions if any (which is why this function was separated from the others and has its own execution for each CoP)
- By separating this automation from the others, it will allow the addUserToDrive and addUserToGithub to run in one call

### AuditGoogleDrivesPermission

- To Run on Appscript execute the funtion "Run"
- The script runs though all the drives listed and generates a CSV (created date + 'google_drive_permissions_audit.csv') with each users' permission details 
- To Audit more/less drives, update driveIDs list in the Run function
- tables@hackforla.org would need permission for auditting the drive
- If tables@hackforla.org does not have permission to access the drive, the drive ID will appear in the execution log with the text "list permission to Drive with driveID: "+driveID+ " fails " (where +driveID+ is replaced with the drive ID
- The script is located in tables@hackforla.org google drive > Scripts > Google Drive Permissions > AuditGoogleDrivesPermissionAuditGoogleDrivesPermission

### GoogleformTimeTrigger

- Generate time trigger according to onboarding meeting schdule from HFLA Volunteers-[Onboarding - Schedule] table
- The time trigger turns google form AcceptingResponses feature on/off according to on and off time from the table
- The script weeds out past events and only creates triggers for the 3 closest future events.  Google limits to no more than 20 triggers per script
- There are 3 bots that will call the script in the [Onboarding - Schedule] table
  - New edit trigger: calls the script every time the event time is editted
  - weekly update trigger: calls the script every week (Monday at 1AM) to update the trigger
  - weekly clear trigger: clears all triggers before weekly update, in order to prevent exceeding the 20 trigger limit
- To Deploy: 
  - Change formID in function openForm() & closeForm() to target google form ID on line 80 & 87
- The script is located in tables@hackforla.org google drive > Scripts > GoogleformTimeTrigger

### GoogleformTimeTrigger_Copy-for_2_form

- same functions as GoogleformTimeTrigger and also allows for a second form AcceptingResponses feature on/off
- To Deploy: 
  - Change formID in function openForm() & closeForm() to target google form ID on line 80 81 & 90 91
  - change the 3 bots mentioned above in GoogleformTimeTrigger to trigger GoogleformTimeTrigger_Copy-for_2_form instead
- The script is located in tables@hackforla.org google drive > Scripts > GoogleformTimeTrigger_Copy-for_2_form





![onboardingAutomation workflow - Flowchart](https://github.com/hackforla/tables/assets/60123981/cb64f66d-b09a-472d-b228-1210900635b3)

