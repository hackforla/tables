# Onboarding Automation Overview

## What is the Onboarding Automation?
The onboarding automation is a system built with Google Apps Script (GAS) to streamline volunteer onboarding and offboarding for Hack for LA. It integrates Google Sheets (central database), Google Forms (data collection), Google Drive (shared access), GitHub (team membership), and Zoom (attendance verification and reports). The system handles general onboarding (e.g., adding to Community of Practice resources), project-specific onboarding/offboarding (e.g., role-based access), and event-driven updates via spreadsheet triggers.

There are two primary tasks:
1. **General Onboarding**: Automates onboarding for new volunteers attending onboarding events. See [general-onboarding.md](general-onboarding.md) for details.
2. **Project On/Off-boarding**: Manages onboarding and offboarding for specific projects, designed for internal use by project managers and integrated with the VRMS system. See [project-onboarding-offboarding.md](project-onboarding-offboarding.md) for details.

### Key Components
- [**Database**](https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=992054610#gid=992054610): The "HFLA Volunteers" spreadsheet is the core database, with sheets like "Volunteers" (member data), "Projects" (project metadata), "Onboarding - Schedule" (event times), and "CoP" (Community of Practice details).
- **Triggers**: Spreadsheet edits trigger manual onboarding (e.g., updating `attn-verified`); scheduled triggers manage form open/close and Zoom reports.
- **Automation Features**: Validates attendance, adds/removes access, updates databases, and logs to GitHub issues.

### Related Projects
- [**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit): Core scripts for onboarding/offboarding logic.
- [**HFLAOnboardingTimeTrigger**](https://script.google.com/home/projects/1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr/edit): Time-based triggers for forms and Zoom reports.

## Accessing the Onboarding Automation
The codebase is stored in the shared Tables Google Drive and hosted on Google Cloud Platform (GCP) under the *Tables Automation Apps Script* project. A version control and CI/CD pipeline, using GitHub Actions and `clasp`, deploys the codebase from the Hack for LA GitHub repository (`hackforla/tables`) to production GAS scripts.

- **scripts** : 
  - [**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit)
  - [**HFLAOnboardingTimeTrigger**](https://script.google.com/home/projects/1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr/edit)
- **Main Spreadsheet**: - [**HFLA Volunteers**](https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=992054610#gid=992054610) : Centralized database for HFLA
- **Forms**:
  - [**HFLA Onboarding form**](https://docs.google.com/forms/d/1vZZQC9PX-F4wmORhM4X7ZtfFhj7v1qDRRUZPwKIrMLk/edit) : General onboarding 
  - [**HFLA Website Team Onboarding form**](https://docs.google.com/forms/d/1nFiL45x2AG3mxebCAvoVeW_MdkSKrHja4Q_fOKRhgZk/edit) : Website team onboarding
  - [**Project Onboarding Form**](https://docs.google.com/forms/d/1BIbCc-KiWNBTpR8NGchaGD5k81z0tPqUtNxK4_lL_90/edit) : Role-based project onboarding
  - [**Project Offboarding Form**](https://docs.google.com/forms/d/1y5ikJ_HceunH7VtQa66WvRgFNAQUugXC5WXJohrGmQo/edit) : Project offboarding
- **Zoom Reports**:  - [**Part1_onboarding_zoom_attendee_report**](https://docs.google.com/spreadsheets/d/1zYfTMyr0Yospj5hLjz0ZdX93llJ8Zy-JF_9k-cPUuW0/edit?gid=1375213426) : Attendee report for part 1 onboarding event

Access scripts via the Google Apps Script editor or use `clasp` for local development. See [CONTRIBUTING.md](dev-docs/CONTRIBUTING.md) for setup guides.

## Inputs
The system processes data from:
- **Hack for LA Onboarding Form**: First/last name, preferred email, Gmail, phone, texting OK, Slack name/ID, GitHub handle, LinkedIn, time zone, conduct acceptance, passphrase (`strawberry`), referred by, Zoom email.
- **Project Onboarding Form**: Action ("onboard"), project name, GitHub handle, role.
- **Project Offboarding Form**: Action ("offboard"), project name, GitHub handle.
- **Zoom API**: Webinar IDs, attendee data (email, join/leave time, duration).
- **Spreadsheet Edits**: 
   - **Volunteers Sheet**: Triggers on monitored columns for manual onboarding or updates:
      - `attn-verified`: Checkbox for manual attendance override.
      - `Enter Passphrase`: Validates passphrase (`strawberry`).
      - `name_first`, `name_last`: Volunteer identity.
      - `preferred_email`, `Gmail`, `zoom_email`: Email for Drive/Zoom access.
      - `github_handle`: GitHub team membership.
      - `cop_name`, `conduct`, `linkedin`: CoP and compliance data.
  - **Onboarding - Schedule Sheet**: Triggers on schedule changes:
      - `date`: Meeting date.
      - `on`: Event start time.
      - `off`: Event end time.

## Usage Instructions
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
- **Core Scripts**: `Input_process.gs` routes form submissions; `general_onboarding.gs`, `project_onboarding.gs`, `project_offboarding.gs`, and `website_onboarding.gs` manage workflows.
- **Triggers**: `bot.gs` processes spreadsheet edits with `switch`-based `onChange` handling; `main.gs` and `GoogleFormOnOff.gs` manage scheduled tasks.
- **Integrations**: Zoom API (with retry for errors like code 3001), GitHub API (`admin:org` scope), Google Drive, and Google Forms.
- **Configuration**: `config.gs` stores IDs/settings; `utilities.gs` provides shared functions (e.g., `getGithubRequest`, `isValidEmail`...).

For details, see [general-onboarding.md](general-onboarding.md) and [project-onboarding-offboarding.md](project-onboarding-offboarding.md).

### Script Overview
| Script Project               | Script File             | Purpose                              |
|------------------------------|-------------------------|--------------------------------------|
| HFLAOnboardingAutomation     | `Input_process.gs`      | Processes form submissions           |
| HFLAOnboardingAutomation     | `general_onboarding.gs`  | Handles general onboarding tasks     |
| HFLAOnboardingAutomation     | `project_onboarding.gs`  | Manages project-specific onboarding   |
| HFLAOnboardingAutomation     | `project_offboarding.gs` | Manages project-specific offboarding  |
| HFLAOnboardingAutomation     | `website_onboarding.gs`  | Manages website team onboarding       |
| HFLAOnboardingAutomation     | `bots.gs`               | Triggers automation on spreadsheet changes |
| HFLAOnboardingAutomation     | `utilities.gs`           | Provides shared utilities            |
| HFLAOnboardingAutomation     | `config.gs`             | Centralizes configuration            |
| HFLAOnboardingTimeTrigger    | `main.gs`               | Schedules triggers (HFLAOnboardingTimeTrigger) |
| HFLAOnboardingTimeTrigger    | `GoogleFormOnOff.gs`    | Toggles Google Forms                 |
| HFLAOnboardingTimeTrigger    | `ZoomAttendeeReport.gs` | Generates Zoom attendee reports      |


### Security Considerations
- **Secrets Management**: API tokens (e.g., `GITHUB_TOKEN`, `ZOOM_CLIENT_ID`) are stored in `PropertiesService` via `getScriptSecret`. **Recommendation**: Rotate tokens quarterly or upon team member offboarding.
- **Access Control**: The "HFLA Volunteers" spreadsheet and Apps Script project are restricted to authorized team members via Google Drive permissions. **Recommendation**: Audit access frequently via the Google Drive admin panel.

### Versioning and CI/CD pipeline
Script versions are tracked in the `hackforla/tables` GitHub repository using semantic versioning. Updates are deployed via `clasp` and GitHub Actions, triggered on `main` branch pushes. Deployments are validated with syntax checks and secret availability. See [CONTRIBUTING.md](https://github.com/hackforla/tables/blob/main/CONTRIBUTING.md) for setup guides.


## Upcoming Improvements
Due to rapid feature development and migration deadlines, the project has accumulated technical debt. Planned improvements include:
- **Staging Environment**: Create a mirrored GCP project with a duplicate Google Sheet and Apps Script instance for testing. This isolates production data, enables safe feature testing, and reduces deployment risks.
- **Unit Testing**: Implement QUnit tests for critical functions (e.g., `onboard`, `setTrigger`, `verifyZoomAttendance`, `addToProjectGithubTeams`). Aim for 80% coverage to ensure reliability and catch regressions.

## Resources for New Contributors
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Clasp Setup Guide](https://github.com/google/clasp)