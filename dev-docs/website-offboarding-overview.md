## Website Offboarding Overview

## What is the website onboarding overview?
The document identifies all the current Google App Scripts, GitHub Actions and their order and purpose. It also identifies a future path for upgrades.

## Current
### GitHub Actions
GHA runs monthly that looks for inactive members.
- if inactive at 30 days, but less 60, then their GitHub handle is added to an issue that contains a warning that they will be removed if they don't become active and what they can do if the script accidentally caught them
- if inactive for 60 days or more, their GitHub handle is added to the same issue (at the bottom) and they are removed from the write team[^4]

### Google app scripts
Update roster and Drive
- daily a Google app script runs that checks to see who is on the GitHub website write team[^4], and marks everyone else on roster as inactive
   - what day? 
- weekly a google app script runs that removes inactive members from the google drive[^5], using the roster[^6] as its data source
   - what day?
- the app scripts are run from hackforla-bot@hackforla.org and there is additional documentation in its My Drive

we don't currently update the website team table[^2] to indicate they are no longer on the team.  So the table is a record of when people were added and what meetings they indicated they could go to, and their contact info.

## Upcoming improvements
next version of GHA that runs at 60 days inactivity will 
1. post a comment on the teams dev/pm agenda issue https://github.com/hackforla/website/issues/2607 that the person is inactive and the issue they are assigned to.
2. close a prework issue for an inactive member (needs to be double checked, might not close it if they have other issues assigned)
3. no one will get removed without being warned first

### Possible changes for future
(making this work across many teams)
- adding fields to the tables, website table[^2]
   - `Active=True`
   - ?? 
- move Google App script to run from tables to mark people as inactive
- move Google App script to remove from drive using inactive on same table
- produce the website roster automatically instead of having people fill out a spreadsheet

#### Blockers for future changes
- move GHA for removing inactive members to .github repo
- move GHA for 2 week inactive and to update! labels to .github repo
- make sure all repos have 2 week inactive and to update! and updated labels
- roll out the form for adding members to project to every team
- create script that finds all people who have had ever been assigned issues and add them to the read team (except exclusion list). See website read team example[^3]
   - exclusion list = people who have asked to be removed from the org (mailing list etc.)

[^1]: [Tables form for adding new members to the website team](https://tables.area120.google.com/u/0/form/80QWxNLn_ehajAGpCcx4Ej/t/9zbNZkfHUltaJ3isu4c4ywbrD_O8ucFn5cUruf1Mf_at8ZmOdy7ADrF1xnRNF6p4O0)
[^2]: [Link to the Tables tab "Website Team Onboarding"](https://tables.area120.google.com/u/0/workspace/bHKoRlcCZyubeRsnie2OgH/table/8UiKk90_KmN7QJAp8UX_1R)
[^3]: [GitHub Teams, Website](https://github.com/orgs/hackforla/teams/website)
[^4]: [GitHub Teams, Website-write](https://github.com/orgs/hackforla/teams/website-write)
[^5]: [Google Drive for the website team](https://drive.google.com/drive/folders/0AKWbU6_2dvZuUk9PVA)
[^6]: [Google roster for the website team](https://docs.google.com/spreadsheets/d/11u71eT-rZTKvVP8Yj_1rKxf2V45GCaFz4AXA7tS_asM/edit)
[^7]: [Google Tables help file: Tiers, Limits, and Pricing](https://support.google.com/area120-tables/answer/10011560?hl=en#:~:text=As%20of%20the%20announcement%20on,choose%20or%20are%20on%20today%20)
