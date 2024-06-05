import { Octokit } from 'octokit';
/**
 * @typedef {import("@octokit/types").OctokitResponse<T>} OctokitResponse
 * @template T
 */
/**
 * @typedef {import("@octokit/openapi-types").components["schemas"]["organization-invitation"]} orgInvitationSchema
 */

/**
 * @param {string} githubOrg
 * @param {string} githubInviteeUsername
 * @param {"admin" | "direct_member" | "billing_manager" | "reinstate" | undefined} githubRole
 * @param {number[]} githubTeamIDs
 * @returns {Promise<OctokitResponse<orgInvitationSchema>>}
 */
const doGithubOrgInvite = async (
  githubOrg,
  githubInviteeUsername,
  githubRole,
  githubTeamIDs,
  octokit
) => {
  return octokit.rest.orgs.createInvitation({
    org: githubOrg,
    invitee_id: await getGithubUserID(githubInviteeUsername),
    role: githubRole,
    team_ids: githubTeamIDs,
  });
}

/**
 * @param {string} githubInviteeUsername
 * @returns {Promise<number>}
 */
const getGithubUserID = async (githubInviteeUsername, octokit) => {
  const response = await octokit.rest.users.getByUsername({
    username: githubInviteeUsername,
  })
  return response.data.id;
}


