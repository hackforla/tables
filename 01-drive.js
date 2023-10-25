/*exported addToAllDrives */
"use strict";

const addToDrive = (driveInviteeEmail, driveRole, driveID) => {
  Drive.Permissions.insert(
    {
      role: driveRole,
      value: driveInviteeEmail,
      type: "user",
    },
    driveID,
    { supportsAllDrives: true },
  );
};

const addToAllDrives = (driveInviteeEmail, driveRole, ...driveIDs) => {
  for (const driveID of driveIDs) {
    addToDrive(driveInviteeEmail, driveRole, driveID);
  }
};
