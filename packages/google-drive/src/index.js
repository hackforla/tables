import GoogleJWTAuth from '@hackforla-tables/google-common';

/**
 * @param {string} driveInviteeEmail
 * @param {string} driveRole
 * @param {string} driveID
 * @param {GoogleJWTAuth} driveClient
 * @returns {Promise<GaxiosResponse<Permission>>} Promise of Drive request to add invittee
 */
const doGDriveInvite = async(driveInviteeEmail, driveRole, driveID, driveClient) => {
  const driveResponse = await driveClient.permissions.create({
    sendNotificationEmail: true,
    supportsAllDrives: true,
    fileId: driveID,
    requestBody: {
      emailAddress: driveInviteeEmail,
      role: driveRole,
      type: 'user',
    },
  });
  verifyDriveResponse(driveResponse, driveID);
  return driveResponse;
};

/**
 * @param {GaxiosResponse<unknown>} response
 * @param {string} driveID
 */
const verifyDriveResponse = (response, driveID) => {
  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `ERROR ${response.status} (${response.statusText}) {DriveID: ${driveID}}: ${response.data}`
    );
  }
};

export default {
  async queue(batch, environment) {
    const googleAuthClient = new GoogleJWTAuth(
      environment.GOOGLE_JWT,
      environment.GOOGLE_SCOPES
    );
    const driveClient = googleAuthClient.getGDriveClient();
    for (const message of batch.messages) {
      const invites = [];
      for (const driveID of message.driveIDs) {
        invites.push(doGDriveInvite(message.email, message.driveRole, driveID, driveClient));
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
