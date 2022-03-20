# How to use Google Tables

In order to access Google Tables, you will need to be logged into tables@hackforla.org. In order to login to tables@hackforla.org you will need access to the tables 1Password vault. If you do not have access to the tables 1Password vault, reach out in the [#tables](https://app.slack.com/client/T04502KQX/C02LPQXUWJ0) Slack channel.

To access the Google Tables project, go to: https://tables.area120.google.com/about. And click the “Try Tables Now” button. This will take you to a page where you will see a list of workspaces. There should only be one workspace called, "HfLA Volunteers". Click on that workspace and it will open up the Google Table workspace for the project.

## The different tables

There are currently three tables within the project workspace (Volunteers, CoPs, and Projects). Below is a breakdown of the various tables and their functions.

### Volunteers Table

The Volunteers Table is the main table for the project. It holds a list of all Hack for LA’s volunteers and new onboarded volunteers will be added to this table. Each row in the table represents a different volunteer. Each column in the table represents various data associated with a specific volunteer, and some of these columns are fields in the onboarding form volunteers fill out during onboarding. There are two fields, cop_name and project_name, that have a relationship to two other tables (CoP and Projects). This allows these columns to have a specific selection of the rows from these other two tables.

### CoP Table

The CoP table represents data for the various Communities of Practice within Hack for LA. Each row specifies one Community of Practice. The columns of this table represent the various data specific to each Community of Practice. Currently, the most important fields for use with the Onboarding Script are cop_name, google_drive_id, repo_team, calendar_id, and calendar_invite.

### Projects Table

The projects table represents data for the various projects within Hack for LA. Each row specifies one project. The columns of this table represent the various data specific to each project. Currently, there are no automations being done with projects so a majority of the columns for each project are blank.

## Bots

Bots are the way in which Google Tables can add automations for a particular table. Currently, there is only one bot called Onboarding Automation that is associated with the Volunteers table. It is triggered when a new row is added. It has an action that calls on a Google App Script called, “Tables Scripts” and calls that script’s onboardingAutomation function. As arguments, it passes the data (columns) for the newly added row (volunteer) into the onboardingAutomation function. You can see this bot and the bots associated with a particular table by going to the table in question and looking at the top right where it says “Bots”. Clicking on that will show the details for the Bot and its trigger and actions.

## Forms

Forms are the way in which Google Tables adds new rows to a particular table on the Frontend.
(Note: You can still add a new row into a table without the use of a form by going to the bottom of the table and clicking “Add row”). A link to these forms is given to new volunteers when attending onboarding to fill out. Currently, there are two forms, both of which are identical in the contents asked on the form. The main difference between the two is that the first form requires that the user be logged in to a Gmail account and allows the user to update their form which updates their row. The second form does not force users to be logged into a Gmail account and after submission of the form, they cannot re-edit but can re-submit. Due to some international uses of Google products, the second form is needed for volunteers outside of the United States.

The forms can be found on the top right of a table. Currently, there are only forms associated with the Volunteers table.

When working on the forms, you may see that they are deselected. The reason is because we do not want people filling out these forms outside of the onboarding meeting. If you need to test the functionality of the forms, you can turn them on, just make sure to turn them off after you are finished with work for the day.
