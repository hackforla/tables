# Project Onboarding and Offboarding Automation

## Overview
Project onboarding and offboarding automation manages the addition and removal of Hack for LA volunteers to/from project-specific resources, such as Google Drive folders and GitHub teams, based on roles (e.g., Project Manager, Contributor). Integrated with the Volunteer Resource Management System (VRMS), it enables project managers to automate access control while ensuring read access retention during offboarding. The system is triggered by form submissions, streamlining project team management.

## Accessing Project Onboarding/Offboarding
- **Forms**:
  - [**Project Onboarding Form**](https://docs.google.com/forms/d/1BIbCc-KiWNBTpR8NGchaGD5k81z0tPqUtNxK4_lL_90/edit): Adds volunteers to project resources.
  - [**Project Offboarding Form**](https://docs.google.com/forms/d/1y5ikJ_HceunH7VtQa66WvRgFNAQUugXC5WXJohrGmQo/edit): Removes volunteers from project resources.
  - Access via Shared Drives > Tables > projects onboarding
- **Spreadsheet**: 
  - [**HFLA Volunteers**](https://docs.google.com/spreadsheets/d/15ByO77F032kr5xBiX_xJw3BXz8Yd1A-gDUASyI9mAiw/edit?)
    - "Projects" tab (GID: `564488836`): Stores project metadata (e.g., Drive IDs, GitHub team IDs).
    - "Project On/Off-boarding log" tab (GID: `1891272984`): Logs form submissions.
    - "Volunteers" tab (GID: `992054610`): Updates member’s `project_name` column.
  - [**Onboarding permissions survey**](https://docs.google.com/spreadsheets/d/1DCWo6ZLBGqIBK07k-uckVH-STcBAChzFGaBdVp8c-Kw/edit?gid=0#gid=0) : Defines role permissions for project resources.
- **Scripts**: 
  - [**HFLAOnboardingAutomation**](https://script.google.com/home/projects/1S33shpkpzSm3HVs-9HjF57XtA_82VtCmF7pyvSiF_03bp6h6bJo2z3hx/edit):`Input_process.gs` (form routing), `project_onboarding.gs` (onboarding), `project_offboarding.gs` (offboarding).
- **Repository**: `hackforla/tables` on GitHub
- **Logs**: Results posted to GitHub issue [#391](https://github.com/hackforla/product-management/issues/391); errors emailed to `tables@hackforla.org`.

## Inputs
- **Project Onboarding Form**: Action ("onboard"), project name, GitHub handle, role (e.g., PM, Developer).
- **Project Offboarding Form**: Action ("offboard"), project name, GitHub handle.
- **Spreadsheet Log**: Populated by form submissions in "Project On/Off-boarding log".
- **Roles Sheet**: Defines permissions in ["Roles" sheet](https://docs.google.com/spreadsheets/d/1DCWo6ZLBGqIBK07k-uckVH-STcBAChzFGaBdVp8c-Kw/edit?gid=0#gid=0) (ID: `1DCWo6ZLBGqIBK07k-uckVH-STcBAChzFGaBdVp8c-Kw`, GID: `0`).
- **Volunteers Sheet**: Provides emails (`preferred_email`, `Gmail`) and project lists (`project_name`).

## Usage Instructions
1. **Onboarding**:
   - Share the Project Onboarding Form URL with project managers.
   - Submission adds a row to "Project On/Off-boarding log", processed by `Input_process.gs` to trigger `projectOnboardingAutomation` in `project_onboarding.gs`.

2. **Offboarding**:
   - Share the Project Offboarding Form URL with project managers.
   - Submission adds a row to "Project On/Off-boarding log", processed by `Input_process.gs` to trigger `projectOffboardingAutomation` in `project_offboarding.gs`.

3. **Monitoring**:
   - Check Apps Script "Executions" logs or GitHub issue [#391](https://github.com/hackforla/product-management/issues/391) for results.
   - Errors emailed to `tables@hackforla.org`.

## Current Features
The project onboarding and offboarding automation provides a role-based system for managing volunteer access to project-specific resources, integrated with the VRMS system for seamless project team management. Below are the detailed features and their underlying mechanisms:

1. **Role-Based Access Control**:
   - **Mechanism**: The `getRolePermission` function retrieves permissions from the "Roles" sheet (ID: `1DCWo6ZLBGqIBK07k-uckVH-STcBAChzFGaBdVp8c-Kw`, GID: `0`) based on the input role (e.g., PM, Developer). It supports:
     - **GitHub Permissions**: `github_read`, `github_write`, `github_admin`, and maintainer variants (`github_read_maintainer`, `github_write_maintainer`, `github_admin_maintainer`), mapping to team roles (member or maintainer).
     - **Google Drive Permissions**: `gd_project_manager` (organizer), `gd_project_contributor` (writer), `gd_project_pii_manager` (organizer for PII Drive).
     - **Planned Permissions**: 1Password (`onepassword_pm`, `onepassword_dev`, etc.), Figma (`figma`), and Slack (`slack`), currently unimplemented but supported in the schema for future expansion.
   - **Process**: `projectOnboardingAutomation` and `projectOffboardingAutomation` use `getRolePermission` to determine applicable Drive and GitHub teams, ensuring precise access control. For example, a PM role grants `organizer` access to the main Drive and `admin` to GitHub teams. The function validates the role exists, logging errors to `processLog.steps` if not found.

2. **Google Drive Access Management**:
   - **Onboarding**:
     - **Mechanism**: The `addUserToProjectDrive` function fetches project Drive IDs (`main_drive_id`, `pii_drive_id`) from the "Projects" sheet (GID: `564488836`) via `getProjectInfo`. It retrieves emails (`preferred_email`, `Gmail`) from the "Volunteers" sheet (GID: `992054610`) using `getEmails`. It prioritizes `preferred_email` for Drive access, falling back to `Gmail` if the first fails, using `Drive.Permissions.insert` with `supportsAllDrives: true`.
     - **Process**: Based on role permissions, adds the user to the main Drive (if `gd_project_manager` or `gd_project_contributor`) as `organizer` or `writer`, or to the PII Drive (if `gd_project_pii_manager`) as `organizer`. Logs attempts and fallbacks to `processLog.tasks`. For example, a contributor is added as `writer` to `main_drive_id`, with fallback to `Gmail` if `preferred_email` fails.
   - **Offboarding**:
     - **Mechanism**: The `removeUserFromProjectDrive` function checks both `preferred_email` and `Gmail` for existing permissions in the main and PII Drives using `Drive.Permissions.list`. Removes permissions via `Drive.Permissions.remove` if found.
     - **Process**: Ensures complete removal by checking both emails, logging failures to `processLog.tasks` if no permissions exist.

3. **GitHub Team Management**:
   - **Onboarding**:
     - **Mechanism**: The `addToProjectGithubTeams` function uses `getProjectInfo` to fetch team IDs (`github_read_team`, `github_write_team`, `github_admin_team`) and `getRolePermission` to determine applicable teams. It calls `addToGithubTeams`, which uses `getGithubRequest` (from `utilities.gs`) to send batch API requests to GitHub (`admin:org` scope).
     - **Process**: Assigns the user to teams based on role permissions (e.g., `github_write` adds to `github_write_team` as member or maintainer). Validates the GitHub handle with `/^(\w|-)+$/` to prevent errors, logging results to `processLog.tasks`.
   - **Offboarding**:
     - **Mechanism**: The `removeFromProjectGithubTeams` function removes the user from write/admin teams (`github_write_team`, `github_merge_team`, `github_admin_team`) using `getremovalGithubRequest` with a `DELETE` method. It adds the user to the `github_read_team` (if specified) to retain read access, using batch API calls for efficiency.
     - **Process**: Ensures read access retention by adding to `github_read_team` after removals, logging to `processLog.tasks`. For example, an offboarded developer is removed from `github_write_team` and added to `github_read_team`.

4. **Database Updates**:
   - **Mechanism**: The `addProjectToHFLADB` (onboarding) and `removeProjectFromHFLADB` (offboarding) functions update the `project_name` column in the "Volunteers" sheet (GID: `992054610`) as a comma-separated list. They fetch the member’s row via `getEmails`, checking `github_handle`.
   - **Process**: For onboarding, `addProjectToHFLADB` appends the project name, avoiding duplicates. For offboarding, `removeProjectFromHFLADB` filters out the project name. Updates are made via `sheet.getRange().setValue`, with results logged to `processLog.tasks`. Errors (e.g., missing member) are logged to `processLog.steps`.


5. **Error Handling and Logging**:
   - **Mechanism**: Both `projectOnboardingAutomation` and `projectOffboardingAutomation` use try-catch blocks to handle errors, validating inputs:
     - **GitHub Handle**: Ensures valid format (`/^(\w|-)+$/`) in `addToGithubTeams` and `removeFromGithubTeams`.
     - **Project**: Verifies existence via `getProjectInfo` against "Projects" sheet.
     - **Role**: Confirms role exists in "Roles" sheet via `getRolePermission`.
     - **Emails**: Checks `preferred_email` or `Gmail` via `getEmails`.
     - The `constructOnboardingComment` and `constructOffboardingComment` functions create formatted comments detailing task outcomes (Drive, GitHub, database) and processing time (in seconds or minutes). `onboardingGHlog` posts comments to GitHub issue #391 using the GitHub API (`admin:org` scope).
   - **Process**: Errors are logged to `processLog.steps` and `processLog.tasks`, with notifications sent to `tables@hackforla.org` via `errorMessage` (from `utilities.gs`). API calls use `Utilities.withRetry` for reliability. For onboarding, logs tasks like Drive/GitHub additions; for offboarding, flags partial failures (e.g., "Attention! partially offboarded") if any task fails, including timestamps and execution time.

## Technical Details
- **Scripts**:
  - `HFLAOnboardingAutomation`:
    - `Input_process.gs`: Routes form submissions to onboarding/offboarding functions.
    - `project_onboarding.gs`: Executes `projectOnboardingAutomation`, fetching project info (`getProjectInfo`), emails (`getEmails`), role permissions (`getRolePermission`), and updating Drive, GitHub, and database.
    - `project_offboarding.gs`: Executes `projectOffboardingAutomation`, removing Drive/GitHub access and updating database, with read access retention.
- **Dependencies**:`config.gs` (stores IDs and setting), `utilities.gs`.
- **Error Handling**: Try-catch blocks, detailed logging to `processLog.steps` and `processLog.tasks`, email notifications, github issue logging [#391](https://github.com/hackforla/product-management/issues/391).
- **Limitations**: Relies on spreadsheet schema; 1Password, Figma, and Slack tasks are unimplemented; no async/await support in GAS.

## Security Considerations
- **Secrets Management**: `GITHUB_TOKEN` stored in `PropertiesService`. **Recommendation**: Rotate tokens quarterly or on team member offboarding.
- **Access Control**: Spreadsheet and scripts restricted via Google Drive permissions. **Recommendation**: Audit access monthly.
- **Input Validation**: Validates GitHub handle (`/^(\w|-)+$/`), project, and role to prevent errors.
