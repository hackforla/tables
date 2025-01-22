## Zoom API for Tables

### Creating an App Account to call the API
We already have an API App Account titled "Zoom Meeting and Past Participant API".
Please use that to make API calls. The credentials associated with that account are
detailed below.

If for whatever reason you don't have access to that App account, then
we can create a new one to make calls to Zoom's API. You will first need
access to the admin account that we use for Zoom. Login, and then from there you can
go to the Zoom marketplace, hover over "Develop", and then click "Build App". An App's credentials will be needed to make API calls. Just keep in mind, that you may need additional permissions to log into that admin zoom account, and we would ideally want to just use the existing App Account anyways for API calls.
Please try and use that account first if you can.

### Typical API Calls We May Want to make

Here is a list of potential calls that we would want to make. The endpoints
to use, scopes needed per Zoom marketplace App, and a brief description.

* List all meetings
  * Endpoint: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/users/{userId}/meetings`
  * Scopes: `meeting:read,meeting:read:admin`
  * Granular scopes: `meeting:read:list_meetings,meeting:read:list_meetings:admin`
  * Description: Retrieve a list of all meetings
* Who attended an onboarding
  * Endpoint: `GET /past_meetings/{meetingId}/participants`
  * Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/past_meetings/{meetingId}/participants`
  * Description: Gives a list of participants of a past meeting.
  * Caveat: Does not return information if there was only one participant
  * Scopes: `meeting:read:admin,meeting:read`
  * Grandular Scopes: `meeting:read:list_past_participants,meeting:read:list_past_participants:admin`
* Who registered for an onboarding
  * Endpoint: `GET /meetings/{meetingId}/registrants`
  * Documentation URL: `https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/meetings/{meetingId}/registrants`
  * Description: List users that have registered for a meeting.
  * Scopes: `meeting:read:admin,meeting:read`
  * Granular Scopes: `meeting:read:list_registrants,meeting:read:list_registrants:admin`

Just to give some additional details here. You need a list of meetings and their ids
to make the second and third API calls above. One way to get that information is to
first get a list of meetings for a single user. The user in this case
will really be a Zoom marketplace API App user that we have created for our
own use. 

Note, that the scopes listed are essentially permissions granted to an App
account. `Scopes` are broad scopes grante to an App during Zoom App creation.
While still supported, Scopes are an older style of permission management within Zoom and are on their way to deprecation.
Granular Scopes are a more finely-grained version of scopes that are used
for new Zoom Apps.

### Usage
To make a call to Zoom's API, you meed an OAuth token. These tokens must
be generated and are typically valid for 1 hour.
The account id that we need to make the API all below is listed in the Tables 
1Pass entry under "Zoom Meeting and Past Participant API". The relevant
fields for use in generating an authorization token are the account id and
the client secret within the entry. 

```
curl -X POST https://zoom.us/oauth/token -d 'grant_type=client_credentials' \
  -d 'account_id=[account_id]' -H 'Host: zoom.us' -H \
  'Authorization: Basic [SECRET KEY]'
```

Once you have a generated authorization token, store it somewhere temporarily and include
it as your Bearer token in an API call that you wish to make. Here is an example API call
that you could make with cURL.

```
curl --request GET \
  --url https://api.zoom.us/v2/users/tables@hackforla.org/meetings \
  --header 'Authorization: Bearer [BEARER_TOKEN]' \
  --header 'Content-Type: application/x-www-form-urlencoded'
```
