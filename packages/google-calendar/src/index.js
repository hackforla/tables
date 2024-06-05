import GoogleJWTAuth from '@hackforla-tables/google-common';

/**
 * @typedef {import("gaxios").GaxiosResponse<T>} GaxiosResponse
 * @template T
 */
/**
 * @typedef {import("@googleapis/calendar").calendar_v3.Calendar} Calendar
 * @typedef {import("@googleapis/calendar").calendar_v3.Schema$Event} Event
 * @typedef {import("@googleapis/calendar").calendar_v3.Schema$EventAttendee} EventAttendee
 */

/**
 * @typedef {{calendarID: string, eventID: string}} CalendarEventID
 * @typedef {{calendarEventID: CalendarEventID, eventDetails: Event}} CalendarEventDetails
 */

/**
 * @param {CalendarEventID[]} calendarEvents - Object of calender IDs and Events to invite user to
 * @returns {Promise<CalendarEventDetails>[]} Promise of all Calendar Requests to add invittee
 */
const getEventsDetails = (calendarEvents) => {
  const calendarEventsDetailsProms = [];
  for (const calendarEvent of calendarEvents) {
    calendarEventsDetailsProms.push(
      getCalendarEvent(calendarEvent)
    );
  }
  return calendarEventsDetailsProms;
};

/**
 * @param {CalendarEventID} calendarEvent
 * @param calendarClient
 * @returns {Promise<CalendarEventDetails>}
 */
const getCalendarEvent = async(calendarEvent, calendarClient) => {
  const calendarResponse = await calendarClient.events.get({
    calendarId: calendarEvent.calendarID,
    eventId: calendarEvent.eventID,
  });
  verifyGoogleResponse(
    calendarResponse,
    calendarEvent
  );
  return {
    calendarEventID: calendarEvent,
    eventDetails: calendarResponse.data,
  };
};

/**
 * @param {Promise<CalendarEventDetails> | CalendarEventDetails} calendarEventDetailsProm
 * @param {string} calendarInviteeEmail
 * @param calendarClient
 * @returns {Promise<GaxiosResponse<Event>>}
 */
const doCalendarInvite = async(calendarEventDetailsProm, calendarInviteeEmail, calendarClient) => {
  const calendarEventDetails = await calendarEventDetailsProm;
  const calendarEventID = calendarEventDetails.calendarEventID;
  const eventDetails = calendarEventDetails.eventDetails;
  eventDetails.attendees ??= [];
  eventDetails.attendees.push({
    email: calendarInviteeEmail,
    responseStatus: 'needsAction',
  });
  const calendarResponse = await calendarClient.events.update({
    calendarId: calendarEventID.calendarID,
    eventId: calendarEventID.eventID,
    requestBody: eventDetails,
  });
  verifyGoogleResponse(
    calendarResponse,
    calendarEventID
  );
  return calendarResponse;
};

/**
 * @param {GaxiosResponse<unknown>} response
 * @param {CalendarEventID} eventDetails
 */
const verifyGoogleResponse = (response, eventDetails) => {
  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `ERROR ${response.status} (${response.statusText}) {CalID: ${eventDetails.calendarID}, EventID: ${eventDetails.eventID}}: ${response.data}`
    );
  }
};

export default {
  async queue(batch, environment) {
    const googleAuthClient = new GoogleJWTAuth(
      environment.GOOGLE_JWT,
      environment.GOOGLE_SCOPES
    );
    const calendarClient = googleAuthClient.getGCalClient();
    for (const message of batch.messages) {
      const calendarEventDetailsProms = getEventsDetails(message.calendarEvents, calendarClient);
      const invites = [];
      for (const calendarEventDetailsProm of calendarEventDetailsProms) {
        invites.push(doCalendarInvite(calendarEventDetailsProm, message.calendarInviteeEmail, calendarClient));
      }
      /* eslint-disable-next-line no-await-in-loop --
       * Concurrent opperations are not supported by Google */
      const results = await Promise.allSettled(invites);
      let success = true;
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error(result.reason);
          success = false;
        }
      }
      if (success) {
        message.ack();
      } else {
        message.retry();
      }
    }
  },
};
