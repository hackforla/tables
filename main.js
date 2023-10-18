/* exported inviteUserToServices */
/* globals checkCoCPassphrase, getGithubOrgRequest, getAllZoomMeetingsRequest, addToAllDrives, doAllRequests */
"use strict";

const inviteUserToServices = (
	passphrase,
	gmail,
	preferred_email,
	githubInviteeUsername,
	githubRole,
	githubTeams,
	driveRole,
	driveIDs,
	firstName,
	lastName,
	meetingIDs /* , calendarID, calendarEventIDs */,
) => {
	const inviteeEmail = gmail ?? preferred_email;
	if (checkCoCPassphrase(passphrase, inviteeEmail)) {
		const githubOrg = env.GITHUB_ORG;
		const requests = [];
		githubTeams = githubTeams ? githubTeams.split(", ") : [];
		driveIDs = driveIDs ? driveIDs.split(", ") : [];
		meetingIDs = meetingIDs ? meetingIDs.split(", ") : [];
		if (githubOrg) {
			requests.push(
				getGithubOrgRequest(
					githubOrg,
					githubInviteeUsername,
					githubRole,
					githubTeams,
				),
			);
		}
		if (meetingIDs) {
			requests.push(
				getAllZoomMeetingsRequest(
					inviteeEmail,
					firstName,
					lastName,
					meetingIDs,
				),
			);
		}
		if (driveIDs) {
			addToAllDrives(inviteeEmail, driveRole, ...driveIDs);
		}
		// Due to timeout restrictions, adding to calendar has a seperate "thread" (apps script invocation).
		// calendarEventIDs = calendarEventIDs ? calendarEventIDs.split(", ") : [];
		// doCalendarRequests(inviteeEmail, calendarID, ...calendarEventIDs);
		doAllRequests(requests);
	}
};
