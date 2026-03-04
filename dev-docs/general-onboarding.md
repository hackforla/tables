# General Onboarding Automation

## Overview
General onboarding automates the process of adding new Hack for LA volunteers to shared resources, such as Community of Practice (CoP) Google Drive folders, GitHub teams, and Zoom meetings. It processes form submissions and spreadsheet edits, validates attendance, and ensures compliance with conduct and passphrase requirements.

## Accessing General Onboarding
- **Form**: [**Hack for LA Onboarding Form**](https://docs.google.com/forms/d/1vZZQC9PX-F4wmORhM4X7ZtfFhj7v1qDRRUZPwKIrMLk/edit): General onboarding
  - Access via "HFLA Volunteers" spreadsheet > "Forms" > "Hack for LA Onboarding Form".Contact the Tables team via #tables Slack channel for access permissions.
- **Spreadsheet**: [**HFLA Volunteers**](https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?gid=992054610#gid=992054610) - Volunteers tab.
  - Access via Shared Drives > Tables > Tables Database > HFLA Volunteers. Contact the Tables team via #tables Slack channel for access permissions.
- **Scripts**: 
   - [**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit):`Input_process.gs`, `general_onboarding.gs`, `bots.gs`.
   - [**HFLAOnboardingTimeTrigger**](https://script.google.com/home/projects/1uNXw1yX6g1O5wH7xFOqpA89yrD6EGx1c8tgRTRnQZvVeoP1NIbz9v_yr/edit):`main.gs`, `GoogleFormOnOff.gs`, `ZoomAttendeeReport.gs`.
- **Repository**: [`hackforla/tables`](https://github.com/hackforla/tables) on GitHub.
- **Logs**: Check logs in the Apps Script editor under "Executions". Errors are emailed to `tables@hackforla.org`.

## Inputs
- **Form Inputs**: First/last name, preferred email, Gmail, phone, texting OK, Slack name/ID, GitHub handle, LinkedIn, time zone, conduct acceptance, passphrase, referred by, Zoom email.
- **Spreadsheet Columns**: 
   Monitored in "Volunteers" for manual onboarding or updates:
      - `attn-verified`: Checkbox for manual attendance override.
      - `Enter Passphrase`: Validates passphrase (`strawberry`).
      - `name_first`, `name_last`: Volunteer identity.
      - `preferred_email`, `Gmail`, `zoom_email`: Email for Drive/Zoom access.
      - `github_handle`: GitHub team membership.
      - `cop_name`, `conduct`, `linkedin`: CoP and compliance data.
   Monitored in "Onboarding - Schedule Sheet" for onboarding event schedule updates:
      - `date`: Meeting date.
      - `on`: Event start time.
      - `off`: Event end time.
- **Zoom Data**: Attendee reports (email, join/leave time, duration) for validation.

## Usage Instructions
1. **Form Submission**:
   - Share the form URL with volunteers.
   - Submissions add rows to "Volunteers", processed by `Input_process.gs` to trigger `onboard` in `general_onboarding.gs`.

2. **Spreadsheet Edits**:
   - Edit monitored columns in "Volunteers" to trigger `bots.gs`, which calls `onboard` for updates (e.g., after manual verification).

3. **Attendance Validation**:
   - Automatically cross-validates Zoom attendance with form data.
   - Manual override via "attn-verified" checkbox in "Volunteers".

4. **Monitoring**:
   - Check Apps Script logs under "Executions" in the Apps Script editor (access via the HFLAOnboardingAutomation project’s script editor).
   - Errors are emailed to `tables@hackforla.org`. Configure alerts in Google Cloud Monitoring by creating a notification channel in the GCP project’s Monitoring dashboard for critical failures (e.g., API rate limits). See [Google Cloud Monitoring Docs](https://cloud.google.com/monitoring/docs) for setup.

## Current Features
1. **Onboarding Event Attendance Cross-Validation**:
   - Matches Zoom attendee emails with form data (`preferred_email`, `Gmail`, `zoom_email`) using `ZoomAttendeeReport.gs`.
   - Verifies attendance duration against an 83% threshold (based on the longest duration of `zoom4@civictechstructure.org`, e.g., 50 minutes for a 1-hour meeting). For attendees with multiple logins, the maximum duration is used.
   - Updates "attn-verified" (checkbox) and "attn-duration" (duration and percentage) in the "Volunteers" tab of the HFLA Volunteers spreadsheet. If no matching email is found, "attn-duration" is set to "Did not attend."
   - Updates "attn-verified" in the "Part1_onboarding_zoom_attendee_report" spreadsheet (ID: `1zYfTMyr0Yospj5hLjz0ZdX93llJ8Zy-JF_9k-cPUuW0`) to confirm matching emails.
   - Pulls Zoom attendee reports 65 minutes after the event starts (e.g., 7:05 PM for a 6:00 PM event) via the Zoom API. If the meeting runs overtime, the script retries every minute for 5 minutes, then every 5 minutes until 7:30 PM.
   - Supports manual override by checking the "attn-verified" checkbox in "Volunteers" for participants who don’t meet the cutoff.

2. **Schedule Pull and Time Triggers**:
   - Pulls the next three meetings from the "Onboarding - Schedule" tab (`date`, `on`, `off`) in the HFLA Volunteers spreadsheet.
   - Sets time-based triggers via `main.gs` to toggle form availability (`GoogleFormOnOff.gs`) and generate Zoom reports (`ZoomAttendeeReport.gs`). Only the three closest future events are scheduled to comply with Google’s 20-trigger limit per script.
   - A weekly trigger runs every Sunday at 23:30 to update schedules for upcoming meetings.
   - Edits to "Onboarding - Schedule" trigger `bots.gs` to call `setTrigger`, rescheduling form open/close and Zoom report generation as needed.

3. **Tasks Performed**:
   - **Form Processing**: `Input_process.gs` appends form data to "Volunteers" and triggers `onboard`.
   - **Resource Addition**: `general_onboarding.gs` adds volunteers to CoP Drive (shared Community of Practice folder), knowledge Drive (shared documentation folder), GitHub teams, and Zoom meetings.
   - **Validation**: Verifies conduct acceptance and passphrase; cross-validates attendance.
   - **Metadata Updates**: Sets `last_modified_by` (user email) and `last_modified` (timestamp) in "Volunteers".
   - **Logging**:  Check logs in the Apps Script editor under "Executions" .

## Technical Details
- **Scripts**:
   - `HFLAOnboardingAutomation`:
      - `Input_process.gs`: Routes form submissions to appropriate onboarding functions.
      - `general_onboarding.gs`: Manages resource addition and attendance validation.
      - `bots.gs`: Handles spreadsheet edit triggers.
   - `HFLAOnboardingTimeTrigger`:
      - `main.gs`: Schedules time-based triggers for the next three meetings.
      - `GoogleFormOnOff.gs`: Toggles form availability.
      - `ZoomAttendeeReport.gs`: Fetches Zoom attendee data with pagination and retry logic.
- **Dependencies**: `config.gs` (stores IDs and setting), `utilities.gs`.
- **CI/CD**: Deployments are automated via GitHub Actions, triggering `clasp push` on `main` branch updates, with validation for script syntax and secret availability.
- **OAuth Scopes**: `spreadsheets`, `drive`, `mail`, `script.external_request`.
- **Error Handling**: Try-catch, email notifications.
- **Limitations**: No async/await support in GAS; Apps Script’s 20-trigger limit is managed by scheduling only three meetings.

