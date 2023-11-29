/* exported getGithubOrgRequest, getGithubTeamsRequest, addToAllGithubTeams */
/* globals doAllRequests */
"use strict";

// This uses the Github HTTP api to add users to the github org and teams.

const getGithubOrgRequest = (
  githubOrg,
  githubInviteeUsername,
  githubRole,
  githubTeamIDs,
) => ({
  contentType: "application/json",
  headers: {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": `Bearer ${env.GITHUB_OWNER_TOKEN}`,
    /* Ideally the User-Agent should be set to the Github user's name that is
     * running the script, but Google Apps Script prevents changing the user agent.
     * See: https://issuetracker.google.com/issues/36758197.
     * If Google's policy changes, please uncomment the below line. */
    // "User-Agent": env.GITHUB_BOT_USERNAME, */
    "X-GitHub-Api-Version": "2022-11-28",
  },
  method: "post",
  muteHttpExceptions: true,
  payload: `{"invitee_id": "${githubInviteeUsername}, "role":"${githubRole}", "team_ids": "${githubTeamIDs}"}`,
  url: `https://api.github.com/orgs/${githubOrg}/invitations`,
});

const getGithubTeamsRequest = (githubOrg, invitee, role, team) => ({
  contentType: "application/json",
  headers: {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": `Bearer ${env.GITHUB_TEAM_TOKEN}`,
    /* Ideally the User-Agent should be set to the Github user's name that is
     * running the script, but Google Apps Script prevents changing the user agent.
     * See: https://issuetracker.google.com/issues/36758197.
     * If Google's policy changes, please uncomment the below line. */
    // "User-Agent": env.GITHUB_BOT_USERNAME, */
    "X-GitHub-Api-Version": "2022-11-28",
  },
  method: "put",
  muteHttpExceptions: true,
  payload: `{"role":"${role}"}`,
  url: `https://api.github.com/orgs/${githubOrg}/teams/${team}/memberships/${invitee}`,
});

// Needed to add people to teams based on project participation
const addToAllGithubTeams = (githubOrg, invitee, role, ...teams) => {
  const requests = [];
  for (const team of teams) {
    requests.push(getGithubTeamsRequest(githubOrg, invitee, role, team));
  }
  doAllRequests(requests);
};
