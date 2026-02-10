# Website Offboarding Overview
This documentation describes the Continuous Integration/Continuous Deployment (CI/CD) workflow for deploying Google Apps Script projects using GitHub Actions and the `@google/clasp` tool. The workflow automates pushing code changes to Google Apps Script deployments, handles token refreshes for authentication, and ensures only relevant projects are updated based on changed files.
The setup assumes multiple Google Apps Script projects organized in subdirectories under `src/`, each with its own `.clasp.json` configuration file. Changes are detected via Git diffs, and deployments are triggered on pushes to the `main` branch or manually.
## Overview?
- Purpose: Automate the deployment of Google Apps Script code from GitHub to Google Workspace. It selectively pushes changes to projects that have been modified, reducing unnecessary deployments.
- Tools Used:
 - GitHub Actions: For workflow orchestration.
 - `@google/clasp`: CLI tool for managing Google Apps Script projects.
 - Bash scripting: For custom logic in change detection and selective pushing.
- Key Features:
 - Selective deployment: Only pushes to projects with changed files.
 - Token management: Automatically refreshes and updates Clasp authentication tokens.
 - Scheduled maintenance: Weekly token refresh to prevent expiration.
- Triggers:
 - Push to `main` branch.
 - Manual workflow dispatch.
 - Scheduled weekly run for token updates.

## Prerequisites
Before setting up or running the workflow, ensure the following:
### 1.Google Apps Script Project Setup:
- Each project should have a `.clasp.json` file in its directory (generated via `clasp create` or `clasp clone`).
- Projects are organized under `src/` (e.g., `src/project1/`, `src/project2/`).

### 2.GitHub Repository Secrets:
- `CLASPRC_JSON`: The contents of your `~/.clasprc.json` file (Clasp credentials, including OAuth token). Generate this by running `clasp login` locally.
- `REPO_ACCESS_TOKEN`: A GitHub Personal Access Token (PAT) with `repo` scope to update secrets programmatically.

### 3.Clasp Installation and Authentication:
- Install Clasp locally for initial setup: `npm install -g @google/clasp`.
- Authenticate with `clasp login` to generate credentials.
### 4.Repository Structure:
- `.github/workflows/deploy.yml`: Main deployment workflow.
- `.github/workflows/update_clasp_token.yml`: Token update workflow.
- `.github/scripts/clasp_push.sh`: Script for selective pushing.
- `src/`: Directory containing Apps Script projects.
### 5.Permissions:
- Ensure the GitHub Actions runner has access to Node.js and bash.
- Google account must have permissions for Apps Script deployments.

# Workflows
## 1.Deploy Script (deploy.yml):
This workflow deploys code changes to Google Apps Script projects when code is pushed to `main` or manually triggered.
### Triggers:
- `push` to `branches: main`.
- `workflow_dispatch` (manual trigger).
### Jobs:
-clasp-push:
 - Runs on `ubuntu-latest`.
 - Steps:
 1.Checkout code: Uses `actions/checkout@v4` to fetch the repository, including full Git history for diffing.
 2.Set up Node.js: Uses `actions/setup-node@v4` with Node v20.
 3.Install clasp: Globally installs `@google/clasp`.
 4.Write CLASP_CREDENTIALS: Writes the `CLASPRC_JSON` secret to `~/.clasprc.json`.
 5.Update clasp credential: Runs `clasp list` to refresh the token if expired.
 6.Save current .clasprc.json: Masks and saves the updated credentials to an environment variable.
 7.Update CLASPRC_JSON secret: If credentials changed, updates the GitHub secret using `gh secret set`.
 8.Make clasp_push.sh executable: Sets execute permissions on the script.
 9.Run clasp_push.sh: Executes the script to push changes selectively.
 10.Cleans up by removing `~/.clasprc.json`.
### Environment Variables/Secrets Used:
- `CLASPRC_JSON`: Clasp credentials.
- `REPO_ACCESS_TOKEN`: For updating secrets via GitHub CLI.

## 2.DWeekly Clasp Token Update(`update_clasp_token.yml`):
This workflow refreshes the Clasp authentication token weekly to prevent expiration (OAuth tokens expire after ~1 week of inactivity).
### Triggers:
- `schedule`: Every Monday at 12:00 UTC (`cron: '0 12 * * 1'`).
- `workflow_dispatch` (manual trigger).
### Jobs:
- weekly-update:
 - Runs on `ubuntu-latest`.
 - Steps:
 1.Checkout code: Uses `actions/checkout@v4`.
 2.Set up Node.js: Uses `actions/setup-node@v4` with Node v16.
 3.Install clasp: Globally installs `@google/clasp`.
 4.Write CLASP_CREDENTIALS: Writes the `CLASPRC_JSON` secret to `~/.clasprc.json` and validates JSON.
 5.Update clasp credential: Runs `clasp list` to refresh the token.
 6.Save current .clasprc.json: Masks and saves updated credentials.
 7.Update CLASPRC_JSON secret: If changed, updates the GitHub secret.
 8.Cleans up by removing `~/.clasprc.json`.
### Environment Variables/Secrets Used:
- Same as `deploy.yml`.
# Scripts
## clasp_push.sh:
This bash script handles selective deployment by checking for changes in project directories and pushing only affected projects.
### Key Logic:
- Error Handling: Exits on any error (`set -e`).
- Change Detection:
  - Determines changed files via `git diff` (compares to `HEAD~1` for pushes or `origin/main` otherwise).
  - Filters changes to those under `src/`.
  - If no changes, exits early.

- Project Discovery:
  - Finds all directories with `.clasp.json` using `find`.

- Selective Push:
  - For each project directory:
   - Checks if any changed files are within it using `contains_changes` function.
   - If yes, runs `clasp push -f` (force push).


- Exit Code: Sets non-zero if any push fails.
### Usage:
- Executed within the workflow; not intended for manual runs outside GitHub Actions.

# How It Works: Step-by-Step:
- 1.Push to Main:
 - Workflow triggers `deploy.yml`.
  - Code is checked out.
  - Clasp is set up and authenticated.
  - Token is refreshed if needed and secrets updated.
  - `clasp_push.sh` identifies changes and pushes to relevant projects.

- 2.Weekly Token Refresh:
  - `update_clasp_token.yml` runs automatically.
  - Refreshes token via `clasp list`.
  - Updates GitHub secret if token changed.

- 3.Manual Triggers:
 - Use GitHub UI to dispatch either workflow for on-demand runs.
# Troubleshooting:
- Clasp Authentication Fails: Check `CLASPRC_JSON` secret for validity. Run `clasp login` locally and update the secret.
- No Changes Detected: Ensure changes are in `src/` and Git history is fetched correctly.
- Secret Update Fails: Verify `REPO_ACCESS_TOKEN` has `repo` scope.
- JSON Validation Errors: Ensure `CLASPRC_JSON` is properly formatted (use `jq` locally to test).
- Workflow Permissions: Ensure Actions are enabled in repo settings.
- Logs: Review GitHub Actions logs for errors like "Clasp can't use current credential".
- Token Expiration: If tokens expire frequently, increase the
# Best Practices:
- Security: Mask secrets in logs and avoid committing credentials.
- Testing: Test workflows on a branch before merging to `main`.
- Monitoring: Set up GitHub notifications for workflow failures.
- Scalability: For many projects, ensure directory structure is flat to avoid performance issues in `find`.

# Upcoming Improvements
Due to evolving requirements, planned improvements include:

- Enhanced Testing: Add integration tests for workflows using GitHub Actions self-hosted runners.
- Error Handling: Implement notifications (e.g., Slack alerts) for failed runs.
- Merge Conflict Mitigation: Develop scripts for diff-based conflict detection and automated reviewer assignment for overlapping PRs.


# Resources for New Contributors
GitHub Actions Documentation
Clasp Setup Guide
Google Apps Script Documentation