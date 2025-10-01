# Onboarding Automation Overview

## What is the Onboarding Automation?

The onboarding automation is a system built with Google Apps Script (GAS) to streamline volunteer onboarding and offboarding for Hack for LA. It integrates Google Sheets (central database), Google Forms (data collection), Google Drive (shared access), GitHub (team membership), and Zoom (attendance verification and reports). The system handles general onboarding (e.g., adding to Community of Practice resources), project-specific onboarding/offboarding (e.g., role-based access), and event-driven updates via spreadsheet triggers.

There are two primary tasks in the onboarding automation:
1. **General Onboarding**: Automates onboarding for new volunteers attending onboarding events. See [general-onboarding.md](general-onboarding.md) for details.
2. **Project On/Off-boarding**: Manages onboarding and offboarding for specific projects, designed for internal use by project managers and integrated with the VRMS system. See [project-on-off-boarding.md](project-on-off-boarding.md) for details.

### Key Components
- [**Database**](https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=992054610#gid=992054610): The "HFLA Volunteers" spreadsheet is the core database, with sheets like "Volunteers", "Projects", "Onboarding - Schedule", and "Cop".
- **Triggers**: Spreadsheet edits trigger onboarding (manual onboarding); scheduled triggers manage forms and reports.
- **Automation Features**: Validates attendance, adds/removes access, updates databases, and logs to GitHub issues.

### Related Projects
- [**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit): Core scripts for onboarding/offboarding logic.
- [**HFLAOnboardingTimeTrigger**](https://script.google.com/home/projects/1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr/edit): Time-based triggers for forms and Zoom reports.

## Where to Find the Onboarding Automation?

The codebase is stored in the shared Tables Google Drive and hosted on Google Cloud Platform (GCP) under the *Tables Automation Apps Script* project. A version control and CI/CD pipeline, using GitHub Actions and `clasp`, deploys the codebase from the Hack for LA GitHub repository (`hackforla/tables`) to production GAS scripts.

- **scripts** : 
  -[**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit)
  -[**HFLAOnboardingTimeTrigger**](https://script.google.com/home/projects/1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr/edit)
- **Main Spreadsheet**: "HFLA Volunteers" Google Sheet (ID: `15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw`).
- **Forms**:
  - General Onboarding Form (ID: `1vZZQC9PX-F4wmORhM4X7ZtfFhj7v1qDRRUZPwKIrMLk`).
  - Website Onboarding Form (ID: `1nFiL45x2AG3mxebCAvoVeW_MdkSKrHja4Q_fOKRhgZk`).
  - Project Onboarding Form (ID: Contact the Tables team for details).
  - Project Offboarding Form (ID: Contact the Tables team for details).
- **Zoom Reports**: Generated in "Part1_onboarding_zoom_attendee_report" (ID: `1zYfTMyr0Yospj5hLjz0ZdX93llJ8Zy-JF_9k-cPUuW0`).

Access scripts via the Google Apps Script editor or use `clasp` for local development. See [Resources for New Contributors](dev-docs/CONTRIBUTING.md) for setup guides.

## What are the Inputs to the Automation?

The system processes data from:
- **HFLA Onboarding Form**: Collects fields such as first/last name, preferred email, Gmail, GitHub handle, CoP name, conduct acceptance, passphrase, LinkedIn, Zoom email.
- **Project Onboarding Form**: Action ("onboard"), project name, GitHub handle, role.
- **Project Offboarding Form**: Action ("offboard"), project name, GitHub handle.
- **Spreadsheet Edits**: Triggers on monitored columns in "Volunteers" (e.g., name, email, GitHub) and "Onboarding - Schedule" (e.g., date, on, off).
- **Zoom API**: Provides webinar IDs, attendee data (email, join/leave time, duration).

## How to Use the Onboarding Automation?


1. **General Onboarding**:
   - Submit the General Onboarding Form to add a row to "Volunteers".
   - Edit monitored columns in "Volunteers" to trigger `onboard` (adds to Drive, GitHub, Zoom).
   - Attendance is validated via Zoom reports.
2. **Project Onboarding/Offboarding**:
   - Submit Project Onboarding Form to add to project resources (Drive, GitHub teams).
   - Submit Project Offboarding Form to remove access (retaining read access).
   - Results are logged to GitHub issue [Project Onboarding log #391](https://github.com/hackforla/product-management/issues/391).
3. **Schedule Updates**:
   - Edit "Onboarding - Schedule" to trigger `setTrigger` for form open/close and Zoom reports.
   - Weekly trigger runs Sundays at 23:30 for the next three meetings.
4. **Monitoring**:
   - Check logs in the Apps Script editor under "Executions" or GitHub issue [Project Onboarding log #391](https://github.com/hackforla/product-management/issues/391) for automation results.
   - Errors are emailed to `tables@hackforla.org`. Configure email alerts in Google Cloud Monitoring for critical failures (e.g., API rate limits).

## Technical Summary
The system, built in GAS, uses a modular architecture:
- **Core Scripts**: `Input_process.gs` handles form submissions; `general_onboarding.gs`, `project_onboarding.gs`, `project_offboarding.gs`, and `website_onboarding.gs` manage specific workflows.
- **Triggers**: `bots.gs` processes spreadsheet edits; `main.gs` and `GoogleFormOnOff.gs` handle scheduled tasks.
- **Integrations**: Zoom API (with retry logic for errors like code 3001) and GitHub API manage attendance and team membership.
- **Configuration**: `config.gs` stores IDs and settings; `utilities.gs` provides shared functions.
For detailed implementation, see [general-onboarding.md](general-onboarding.md) and [project-on-off-boarding.md](project-on-off-boarding.md).

### Script Overview
| Script File             | Purpose                              |
|-------------------------|--------------------------------------|
| `Input_process.gs`      | Processes form submissions           |
| `general_onboarding.gs`  | Handles general onboarding tasks     |
| `project_onboarding.gs`  | Manages project-specific onboarding   |
| `project_offboarding.gs` | Manages project-specific offboarding  |
| `website_onboarding.gs`  | Manages website team onboarding       |
| `bots.gs`               | Triggers automation on spreadsheet changes |
| `utilities.gs`           | Provides shared utilities            |
| `config.gs`             | Centralizes configuration            |
| `main.gs`               | Schedules triggers (HFLAOnboardingTimeTrigger) |
| `GoogleFormOnOff.gs`    | Toggles Google Forms                 |
| `ZoomAttendeeReport.gs` | Generates Zoom attendee reports      |


### Security Considerations
- **Secrets Management**: API tokens (e.g., `GITHUB_TOKEN`, `ZOOM_CLIENT_ID`) are stored in `PropertiesService` via `getScriptSecret`. # Suggestion: Rotate tokens quarterly or upon team member offboarding.
- **Access Control**: The "HFLA Volunteers" spreadsheet and Apps Script project are restricted to authorized team members via Google Drive permissions. # Suggestion: Audit access frequently via the Google Drive admin panel.

### Versioning and CI/CD pipleline
Script versions are tracked in the `hackforla/tables` GitHub repository using semantic versioning. Major updates are deployed via `clasp` and logged in GitHub releases.

The CI/CD pipeline uses GitHub Actions to automate `clasp push` deployments, triggered on `main` branch updates. Deployments are validated via automated checks for script syntax and secret availability, with releases tagged using semantic versioning. See [Resources for New Contributors](dev-docs/CONTRIBUTING.md) for setup guides.


## Upcoming Improvements
Due to rapid feature development and migration deadlines, the project has accumulated technical debt. Planned improvements include:
- **Staging Environment**: Create a mirrored GCP project with a separate Google Sheet and Apps Script instance for testing. This will isolate production data, enable safe testing, and reduce deployment errors. 
- **Unit Testing**: Implement QUnit to test critical functions (e.g., `onboardingAutomation`, `verifyZoomAttendance`, `addToProjectGithubTeams`). Focus on high-risk areas like API integrations to improve reliability and maintainability. 

## Resources for New Contributors
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Clasp Setup Guide](https://github.com/google/clasp)