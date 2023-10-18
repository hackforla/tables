/* exported addToCalendar */
/* globals checkCoCPassphrase */
"use strict";

// Due to timeout restrictions, currently only 1 request can be processed at a time
const addToCalendar = (
	passphrase,
	gmail,
	preferred_email,
	/* calendarInviteeEmail,*/ calendarID,
	calendarEventID,
) => {
	// Needed since this is called standalone
	if (checkCoCPassphrase(passphrase)) {
		CalendarApp.getCalendarById(calendarID)
			.getEventSeriesById(calendarEventID)
			.addGuest(gmail ?? preferred_email);
	}
};

/*
const addToAllCalendar = (calendarInviteeEmail, calendarID, ...calendarEventIDs) => {
  for (const calendarEventID of calendarEventIDs) {
    addToCalendar(calendarInviteeEmail, calendarID, calendarEventID);
  }
}
*/
