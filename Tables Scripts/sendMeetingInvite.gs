function testSunday() {
  let first_name = 'first'
  let last_name = 'last'
  let email = 'tablesuser01@gmail.com'
  let github_handle = 'tablesuser01'; 
  sendSunMeeting(first_name, last_name, email, github_handle)
}

function sendSunMeeting(first_name, last_name, email, github_handle) {
  let meeting_name = 'website-all-team';
  sendMeetingInvite(first_name, last_name, email, github_handle, meeting_name)
}

function sendTuesMeeting(first_name, last_name, email, github_handle) {
  let meeting_name = 'website-dev';
  sendMeetingInvite(first_name, last_name, email, github_handle, meeting_name)
}

function sendThursMeeting(first_name, last_name, email, github_handle) {
  let meeting_name = 'website-dev-office-hours';
  sendMeetingInvite(first_name, last_name, email, github_handle, meeting_name)
}

function sendMeetingInvite(first_name, last_name, email, github_handle, meeting_name) {
  let start = Date.now();
  console.log(`start time for adding ${email} to ${meeting_name}: ${start}`)

  let invitee = {
    first_name,
    last_name,
    email,
    github_handle
  }

  const meeting_table = getMeetingInfo(meeting_name, invitee);
  
  if (!meeting_table) return;

  const meeting_id = meeting_table.rows[0].values['calendar_id']
  const meeting_hash = meeting_table.rows[0].values['calendar_invite'];

  // In case the meeting hash has been removed
  // Previous case where a CoP had their weekly meetings removed from the table by removing this hash
  // Although, it would be better to turn off the bot on google tables
  if (!meeting_hash || meeting_hash.length === 0) return;

  let id;

  console.log(`meeting_id: ${meeting_id}`)
  console.log(`meeting_hash: ${meeting_hash}`)

  try {
    id = Utilities.newBlob(Utilities.base64Decode(meeting_hash)).getDataAsString().split(" ")[0];
    let event = CalendarApp.getCalendarById(meeting_id).getEventSeriesById(id);

    console.log(`Decoded id and retrieved event - Duration - ${(Date.now() - start)/1000}`)
    console.log('Starting to add guest')

    let ce = event.addGuest(email);
    console.log(`ce returned: ${ce}`)
    console.log(`Added Guest`)
    
  } catch (err) {
    notifyInviteFailed(meeting_hash, invitee, 'Failed in main.');
    return;
  }

  console.log(`Completed invite. Duration: ${(Date.now() - start)/1000}s`)
  console.log('Exiting function')
  // let subject = `Success - Invite sent for ${meeting_name}`
  // let message = `Took ${(Date.now() - start)/1000}s to complete!`
  // MailApp.sendEmail('tables@hackforla.org', subject, message)

  return;
}

/* -- HELPER FUNCTIONS FOR sendMeetingInvite -- */
function getMeetingInfo(meeting_name, invitee) {
  const MEETING_TABLE_ID = '8lS3wt0ttgX4WDb-KSCOlz';
  const MEETING_TABLE_NAME = 'tables/' + MEETING_TABLE_ID;
  
  let meeting_table;

  try {
    meeting_table = Area120Tables.Tables.Rows.list(MEETING_TABLE_NAME, {filter: `values.\"meeting_name\"=\"${meeting_name}\"`});
  } catch (err) {
    let additional_info = `Unable to retrieve info for ${meeting_name}`;
    additional_info = additional_info + '\n' + 'Failed in helper.'

    notifyInviteFailed(meeting_name, invitee, additional_info)

    return null
  }

  return meeting_table;
}

// Function sends an error email message to tables@hackforla.org if an error occurs in the onboarding process
function notifyInviteFailed(meeting_name, invitee, additional_info) {
  let subject = `Calendar Invite Failed - ${meeting_name}`

  let name_message = `Invitee: ${invitee.first_name} ${invitee.last_name}\n`;
  let email_message = `Email: ${invitee.email}\n`;
  let github_message = `GitHub: ${invitee.github_handle}`;

  let message = name_message + email_message + github_message;

  if (typeof additional_info === 'string') {
    message = message + '\n' + additional_info
  }

  MailApp.sendEmail('tables@hackforla.org', subject, message)
}

