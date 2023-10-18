/* exported getAllZoomMeetingsRequest */
"use strict";

const getOauthToken = () => {
	const cache = CacheService.getUserCache();
	let oauthToken = cache.get("oauthToken");
	if (!oauthToken) {
		const start = Date.now();
		const response = UrlFetchApp.fetch("https://zoom.us/oauth/token", {
			contentType: "application/x-www-form-urlencoded",
			headers: {
				Accept: "application/json",
				Authorization: `Basic ${Utilities.base64Encode(
					`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`,
				)}`,
			},
			method: "post",
			muteHttpExceptions: true,
			payload: `grant_type=account_credentials&account_id=${encodeURIComponent(
				env.ZOOM_ACCOUNT_ID,
			)}`,
		});
		const responseCode = response.getResponseCode();
		if (responseCode !== 200) {
			console.error(`ERROR ${responseCode}: ${response.getContentText()}`);
		} else {
			const responseJSON = JSON.parse(response.getContentText());
			if (responseJSON) {
				oauthToken = responseJSON["access_token"];
				const expirationTime = responseJSON["expires_in"];
				if (oauthToken && expirationTime) {
					/*
					 * fetch times out before 10 minutes (highest recorded time is 6 minutes according to https://issuetracker.google.com/issues/36761852).
					 * The below calculation ensures that the key in cache will always be valid and not out of date.
					 */
					cache.put(
						"oauthToken",
						oauthToken,
						expirationTime +
							Math.floor(start / 100) -
							600 -
							Math.ceil(Date.now() / 100),
					);
				}
			}
		}
	}
	return oauthToken;
};

const getZoomMeetingRequest = (email, firstName, lastName, meetingID) =>
	`addMeetingRegistrant(input: {\
 autoApprove: \\"true\\",\
 email: \\"${email}\\",\
 firstName: \\"${firstName}\\",\
 lastName: \\"${lastName}\\" \
},\
 meetingId: ${meetingID}\
){id}`;

const getAllZoomMeetingsRequest = (
	email,
	firstName,
	lastName,
	...meetingIDs
) => {
	const oauthToken = getOauthToken();
	if (!oauthToken) {
		console.error("ERROR: Missing OAuth Token");
	} else {
		const mutations = [];
		for (const meetingID of meetingIDs) {
			mutations.push(
				getZoomMeetingRequest(email, firstName, lastName, meetingID),
			);
		}
		return {
			contentType: "application/json",
			headers: {
				Accept:
					"application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
				Authorization: `Bearer ${oauthToken}`,
			},
			method: "post",
			muteHttpExceptions: true,
			payload: `{"query": "mutation addRegistrantToAllMeetings {${mutations.join(
				" ",
			)}}"}`,
			url: "https://api.zoom.us/v3/graphql",
		};
	}
};
