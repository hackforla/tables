# 1Password Beakdown

This document includes a breakdown of the various accounts, passwords, and keys/tokens needed to run the Tables project. Below you will find a description for each item in the 1Password vault. If you do not have access to the 1Password vault, you will need to reach out to the team in the [#tables](https://app.slack.com/client/T04502KQX/C02LPQXUWJ0) slack channel.

## tables@hackforla.org gmail account

This account is the main account that holds the Goolge Tables project as well as the Google App Script used for this project. This account has access the to all of the Community of Practice’s Shared Google Drives as well as access to the Community of Practice’s Google Calendars. In the Google Drive of this account, you can find the App Script as well as other documents needed for the project.

## hackforla-onboarding GitHub account

You will find the login information for the GitHub account used for onboarding automations for GitHub. This account has ownership of Hack for LA’s GitHub organization so all actions needed for the org can be done with this account.

## hackforla-onboarding GitHub token for app scripts

This token gives API access to use the hackforla-onboarding GitHub account to do automations during onboarding. The token is used within the App Script (see app-scripts.md for implementation details). This token has specific permissions related to GitHub org member actions. If you need to do other actions for the GitHub organization, you may need to create another token.

## tables2@hackforla.org github account

Currently, there is no need for this account.

## tables2@hackforla.org gmail account

Currently, there is no need for this account.

## tablesuser01 GitHub account

This account was used as a test volunteer when testing the onboarding process automations. Feel free to use this account as well to test onboarding automations.

## tablesuser01@gmail.com account

This account was used as a test volunteer when testing the onboarding process automations. Feel free to use this account as well to test onboarding automations.

## zoom@civictechstructure.org Zoom account

This is the Zoom master account for HFLA and serves as the admin account for managing Zoom-related operations, including sub-accounts and API integrations.

## zoom@civictechstructure.org gmail account

This Gmail account is required as 2FA (two-factor authentication) to log in to the zoom@civictechstructure.org Zoom account.

## Hack for LA Zoom API

This token provides API access for the Hack for LA Zoom integration. It should be used in conjunction with the [Zoom API reference](https://github.com/hackforla/tables/blob/main/dev-docs/zoom-api.md) for making API calls, such as retrieving meeting details, participants, and registrants.

## Zoom4@civictechstructure.org Zoom account

This is a sub-account under the main Zoom master account that currently holds and manages onboarding events for HFLA.

## Zoom4@civictechstructure.org gmail account

This Gmail account is required as 2FA (two-factor authentication) to log in to the Zoom4@civictechstructure.org Zoom account.



