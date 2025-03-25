## Zoom API for Tables

### Intro

To use the Zoom API, we need access to Zoom App Marketplace accounts. During setup, these accounts are granted permission to make certain API calls and take certain actions on behalf of a user.

### Hack for LA's Zoom Marketplace Apps to Use on This Project

Use the Zoom App Marketplace account called "Hack for LA Zoom API" to make API calls. The credentials for that account are detailed below.
We do have other Zoom App Marketplace accounts which also allow users to make calls into the Zoom API and can be used if necessary. However, the "Hack for LA Zoom API" account is strongly recommended because it has the most permissions, including for retrieving information about Zoom meetings, participants, and registrants.

### Typical API Calls We May Want to make

Here is a list of potential calls that we would want to make. The endpoints to use, scopes needed per Zoom marketplace App, and a brief description.

- List all meetings
  - Endpoint: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/users/{userId}/meetings`
  - Scopes: `meeting:read,meeting:read:admin`
  - Granular scopes: `meeting:read:list_meetings,meeting:read:list_meetings:admin`
  - Description: Retrieve a list of all meetings
- Who attended an onboarding
  - Endpoint: `GET /past_meetings/{meetingId}/participants`
  - Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/past_meetings/{meetingId}/participants`
  - Description: Gives a list of participants of a past meeting.
  - Caveat: Does not return information if there was only one participant
  - Scopes: `meeting:read:admin,meeting:read`
  - Grandular Scopes: `meeting:read:list_past_participants,meeting:read:list_past_participants:admin`
- Who registered for an onboarding
  - Endpoint: `GET /meetings/{meetingId}/registrants`
  - Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/meetings/{meetingId}/registrants`
  - Description: List users that have registered for a meeting.
  - Scopes: `meeting:read:admin,meeting:read`
  - Granular Scopes: `meeting:read:list_registrants,meeting:read:list_registrants:admin`

#### Notes for API Calls

You need a list of meetings and their ids to make certain API calls, such as the API call above for getting a list of participants for a past meeting. One way to get that information is to first get a list of meetings for a single user. The user in this case will really be a Zoom Marketplace App account that we have created for our own use.
Scopes listed are essentially permissions granted to an App account. `Scopes` are broad scopes granted during Zoom App creation. While still supported, `Scopes` are an older style of permission management within Zoom and are on their way to deprecation. `Granular Scopes` are a more finely-grained version of scopes that are used for new Zoom Apps.

### Usage

To make a call to Zoom's API, you need an OAuth token. These tokens must be generated and are typically valid for 1 hour. The account id that we need to make the API all below is listed in the Tables 1Password entry under "Hack for LA Zoom API". Other necessary fields for the instructions below can also be found under the same 1Password entry.

#### Generating an Authorization Token to Make API Calls

The relevant fields for use in generating an authorization token are:

- Account id: which we set to the field with the same name as a form parameter.
- Authorization token: this needs to be created using base64 encoded string that is initially formatted like so before encoding: "client_id:secret_token". There are a couple of way to do such an encoding.
  - You can use the command line in OS X: `echo -n "[client_secret]:[secret_token]" | openssl base64`
  - Or you can provide a string in the above format to a service online that will do the encoding for you.

```
curl -X POST https://zoom.us/oauth/token -d 'grant_type=account_credentials' \
  -d 'account_id=[account_id]' -H 'Host: zoom.us' -H \
  'Authorization: Basic [base64 encoded combination of client secret and secret token]'
```

Once you have a generated authorization token from the API call above, store it somewhere temporarily and include it as your Bearer token in an API call that you wish to make. Here is an example API call that you could make with cURL.

```
curl --request GET \
  --url https://api.zoom.us/v2/users/tables@hackforla.org/meetings \
  --header 'Authorization: Bearer [BEARER_TOKEN]' \
  --header 'Content-Type: application/x-www-form-urlencoded'
```

### Resources

#### How to access the Zoom admin account

- Log in as an admin. The only account with true admin privileges is `zoom@civictechstructure.org`. The login information for this account should be on Tables 1Password vault.
- `https://zoom.us/myhome` — home page once logged in as admin. You need admin access to create new Zoom Apps for API use. Keep in mind that we already have a working Zoom App account.

#### How to add a new Zoom marketplace app

- `https://marketplace.zoom.us/` — Once logged in as an admin, this is where you can create new Zoom Apps if need be. The only reason I can think of to do this though is if existing Zoom Apps don't have the required permissions to make necessary API calls. It seems that once created, you cannot alter the permissions/scopes on a Zoom Marketplace App Account.
  - Login, and then from there you can go to the Zoom marketplace, hover over "Develop", and then click "Build App". An App's credentials will be needed to make API calls. Just keep in mind, that you may need additional permissions to log into that admin zoom account, and we would ideally want to just use the existing App Account anyways for API calls.
  - From there you will find step-by-step guidance that should provide the necessary information on how to finish creating an app account and what credentials/permissions to add to that account.
  - Make sure to store the account id, client id, and secret token in the Tables 1Password vault for later use.
- `https://marketplace.zoom.us/user/build` — Space where you can see existing Zoom Marketplace Apps and manage them.
