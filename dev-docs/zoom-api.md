## Zoom API for Tables

### Intro

To use the Zoom API, we need access to Zoom App Marketplace accounts. During setup, these accounts are granted permission to make certain API calls and take certain actions on behalf of a user.

### Hack for LA's Zoom Marketplace Apps to Use on This Project

Use the Zoom App Marketplace account called "Hack for LA Zoom API" to make API calls. The credentials for that account are detailed below.
We do have other Zoom App Marketplace accounts which also allow users to make calls into the Zoom API and can be used if necessary. However, the "Hack for LA Zoom API" account is strongly recommended because it has the most permissions, including for retrieving information about Zoom meetings, participants, and registrants.

### Usage

To make a call to Zoom's API, you need an OAuth token. These tokens must be generated and are typically valid for 1 hour. The account ID that we need to make the API call below for an authorizationtoken is listed in the Tables 1Password entry under "Hack for LA Zoom API". Other necessary fields for the instructions below can also be found under the same 1Password entry.

#### Generating an Authorization Token to Make API Calls

The relevant fields for use in generating an authorization token are:

- Account ID: set to the field with the same name as a form parameter.
- Authorization token: this needs to be created using base64 encoded string formatted as follows: "client_id:secret_token". This can then be encoded by:
  - Using the command line in OS X: `echo -n "[client_secret]:[secret_token]" | openssl base64`
  - Or by pasting the string into an online service that will do the encoding for you.

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

### Typical API Calls We May Want to make

Here is a list of potential calls to make, together with their endpoints, scopes (per Zoom App Marketplace), and a brief description.

- List all meetings
  - Endpoint: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/users/{userId}/meetings`
  - Scopes: `meeting:read,meeting:read:admin`
  - Granular scopes: `meeting:read:list_meetings,meeting:read:list_meetings:admin`
  - Description: Retrieves a list of all meetings
- Who attended an onboarding
  - Endpoint: `GET /past_meetings/{meetingId}/participants`
  - Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/past_meetings/{meetingId}/participants`
  - Description: Retrieves a list of participants in a past meeting
  - Caveat: Does not return information if there was only one participant
  - Scopes: `meeting:read:admin,meeting:read`
  - Granular Scopes: `meeting:read:list_past_participants,meeting:read:list_past_participants:admin`
- Who registered for an onboarding
  - Endpoint: `GET /meetings/{meetingId}/registrants`
  - Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/meetings/{meetingId}/registrants`
  - Description: Retrieves a list of users who have registered for a meeting
  - Scopes: `meeting:read:admin,meeting:read`
  - Granular Scopes: `meeting:read:list_registrants,meeting:read:list_registrants:admin`

#### Notes for API Calls

- In order to make certain API calls (such as the API call above for retrieving a list of participants in a past meeting), you first need a list of meetings and their ids. One way to get that information is to get a list of meetings for a single 'user' which is actually a Zoom App Marketplace account we have created for our own use — such as "Hack for LA Zoom API" account mentioned earlier.
- `Scopes` are essentially permissions granted to a Zoom App Marketplace account during its creation. There are currently 2 types:
  - `Scopes` - an older style of permission management within Zoom which are still supported but on their way to deprecation.
  - `Granular Scopes` - a more finely-grained version used for new Zoom Apps.

### Resources

#### How to Access the Zoom Admin Account

- Log in as an admin. The only account with true admin privileges is `zoom@civictechstructure.org`. The login information for this account should be on Tables 1Password vault.
- `https://zoom.us/myhome` — home page once logged in as admin. You need admin access to create new Zoom Apps for API use. Keep in mind that we already have a working Zoom App account.

#### How to Add a New Zoom Marketplace App

- `https://marketplace.zoom.us/` — Once logged in as an admin, this is where you can create new Zoom Apps if need be. The only reason I can think of to do this though is if existing Zoom App account — "Hack for LA Zoom API" — doesn't have the required permissions to make necessary API calls. Once created, you cannot alter the permissions/scopes on a Zoom App Marketplace account.
  - Login as an admin (you may require additional credentials via the 1Password vault, see above)
  - Go to the Zoom App Marketplace, hover over "Develop" at the top, and click "Build App"
  - There, you'll find step-by-step guidance on how to finish creating an Zoom Marketplace App account and the credentials/permissions that can be added to it
  - Remember that you'll need the new account's credentials to make API calls, so remember to store the following in the Tables 1Password vault for later use:
    - Account ID
    - Client ID
    - Secret token
- `https://marketplace.zoom.us/user/build`: Where you can see existing Zoom Marketplace Apps and manage them.
