# Using Website Onboarding Form

## What is the website onboarding form?

The website onboarding form a google form used to add members to the Google Drive, GitHub Team, and send out the weekly team meetings.

It achieves the above by collecting user input and inserting the data into the 'Website Team Onboarding' Table

- The table has bots that run whenever a new row/user is added onto the table
- A row/user gets added upon form submission

There are currently 3 weekly team meeting invites sent out:

- Sunday: All Team Meeting
- Tuesday: Developer Meeting
- Thursday: Office Hours

## Where to find the website onboarding form?

- The form is located on the google table database.
- Select the 'Website Team Onboarding' table
- Select 'Forms' located to the top right of the table
- The form name is currently listed as 'Hack for L.A. Website Onboarding Form'

## What are the inputs to the form?

- First Name
- Last Name
- Email
  - Used to add users to google drive
- GitHub Handle
  - Used to add members to the GitHub Team
- Yes/No response to the Sunday meeting
- Yes/No response to the Tuesday meeting
- Yes/No response to the Thursday meeting

## How to use the website onboarding form?

- Make sure that the form is turned on
  - Check this by accessing the 'Website Team Onboarding' table and verify that it is toggled on
- Open the form and copy the URL to send out to users
- The administrators who are running the onboarding should be the one to send out this URL to the new members

## Technical details of the Gihtub script

Tables passes the script the invitee's username, their role, and the teams they are joining. This makes it easy to reuse for additional teams. Right now, the Github token and the organization name are stored as "environment variables" (which are simulated by properties). It is possible to pass the Github token in from Tables, but I don't believe it is a good idea to store secrets on Tables itself.

An interesting thing to note is that the form _can not_ add someone who is not in the organization to the team. However, since anyone who is signing up for the website team should already be in the org, this is a non-issue.

The token is a classic token. Classic tokens are considered legacy, but the new fine-tunes tokens have expiration dates. It would be a good idea to look into Github apps in the future in case Classic tokens get fully deprecated. They will probably not be removed anytime soon - they are used for too many things. However, it is possible that Github may follow in Slack's steps and prevent creation of new tokens in the future.

Github's error codes and token scopes don't have the best documentation, so here is the result of some experiments.

A classic token with read and write perms is not enough, despite the fact that the scope claims to be able to modify team membership.
![Write perms](https://github.com/hackforla/tables/assets/44281159/5a101a3a-e4b6-4f31-a727-38196e384e6f)
Github will return a 403 error if you try that.
![403 error](https://github.com/hackforla/tables/assets/44281159/88b02a33-837a-4c74-9a63-34dbc92d05b5)
The returned error message is incorrect however - if you use a token with only write:org and read:org permissions, you will always receive that error regardless if you are an owner, team maintainer, or just a random person.
Github's team documentation lists what error codes mean, but it is not an exhaustive list - it makes it seem like every code only has one purpose when this is not the case.
![Team specific error codes](https://github.com/hackforla/tables/assets/44281159/d8f52a1d-f713-4750-b0ac-3069272940c3)
If you search in the more general documentation, you will find this explanation which is much more helpful.
![General 403 error code](https://github.com/hackforla/tables/assets/44281159/1361a9ca-285b-46ac-ab3d-5f2a41930b46)
For whatever reason, Github requires that your token has the admin:org scope. Once this scope is added, the script can add members who were in the organization to the website and website-write team.

Interestingly, trying to add someone who is not in the organization to a team gives a bizarre error code - which it was expected to error, the propor error code would be a 403 error as before. Instead, it gives this:
![422 error](https://github.com/hackforla/tables/assets/44281159/cc302c66-218f-4077-8c04-7234ed36760b)
Why a 422 error? Absolutely no clue. No where in the documentation does it mention how insufficient permissions would result in a 422 error code. However, it does make it easy to tell apart the token not having the required scopes and the user not having the required permissions at least.

TL'DR of the Github specific stuff:
If you are trying to add a user to a team and are getting a 403 error code, your token needs the admin:org scope. If you are getting a 422 error code, you are trying to add someone from outside the organization and you are not an owner.
