# CI/CD Workflow Overview

## What is the CI/CD Workflow?

The CI/CD workflow is a system built with GitHub Actions to automate the deployment and maintenance of Google Apps Script (GAS) projects for Hack for LA's onboarding automation. 

It integrates GitHub (code repository), Google Apps Script (deployment target), and Clasp (CLI tool for GAS management). The workflow automates pushing code changes to Google Apps Script deployments, handles token refreshes for authentication, and ensures only relevant projects are updated based on changed files.

The setup assumes multiple Google Apps Script projects organized in subdirectories under `src/`, each with its own `.clasp.json` configuration file. Changes are detected via Git diffs, and deployments are triggered on pushes to the `main` branch or manually.

There are two primary workflows:

- **Deploy Script**: Automates deployment on code pushes to `main` or manual triggers. See `deploy.yml` for details.
- **Weekly Clasp Token Update**: Manages token refreshes to prevent authentication failures. See `update_clasp_token.yml` for details.

### Key Components

- **Repository**: The [hackforla/tables](https://github.com/hackforla/tables) GitHub repository hosts the codebase, with `.github/workflows/` (workflow definitions) and `.github/scripts/` (supporting bash scripts).
- **Triggers**: 
  - GitHub events (e.g., push to `main`) trigger deployments
  - scheduled cron jobs handle token updates.
- **Automation Features**: 
  - Detects changed files via Git diffs
  - Pushes only affected projects
  - refreshes Clasp OAuth tokens, and updates GitHub secrets programmatically.

## Why Clasp with GitHub Actions?

The selection of Clasp with Git and GitHub Actions was based on research documented in [Issue #93](https://github.com/hackforla/tables/issues/93). Key findings and rationale are summarized below.

### Key Findings

- **Clasp Features**: [Clasp](https://github.com/google/clasp) is an open-source CLI tool for local Google Apps Script development, syncing code between a Git repository and Google Drive. Core commands include `clasp pull`, `clasp push`, `clasp deploy`, and `clasp run`. It supports structured folders, `.claspignore` for file exclusion, and CI/CD integration.
- **Version Control**: Pairing Clasp with Git enables change tracking, branching, and PR-based code reviews — none of which are available natively in the Apps Script editor.
- **Clasp Limitations**: `clasp push` performs a full project overwrite (non-atomic), risking data loss if a local copy is missing files. Mitigated by requiring PR review before merging to `main`.
- **Testing Limitations**: Google Apps Script has third-party testing libraries (e.g., GasT, QUnit), but tests are limited to unit and dependency testing. Integration or end-to-end testing requires manual effort or a custom test harness due to Apps Script's server-side nature. Running E2E tests directly in the Apps Script editor is a practical interim solution.
- **Security**: OAuth tokens in `.clasprc.json` must be kept private. In this public repo, credentials are stored as GitHub Secrets, masked in logs, and updated programmatically. [GitLeaks](https://github.com/gitleaks/gitleaks) helps catch accidentally committed secrets. See [GitHub's security hardening guidelines](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- **OAuth Token Handling**: Tokens from `clasp login` expire after inactivity. The workflow uses `clasp list` to force a refresh and persists updated tokens back to GitHub Secrets. A weekly scheduled run prevents expiration.

### Reasons for Choosing Clasp

1. **Standard approach**: Most widely used tool for local GAS management, with no comparable alternatives identified.
2. **Lightweight setup**: Minimal overhead (Node.js + `clasp login`), integrates seamlessly with GitHub.
3. **CI/CD enablement**: Pairs with GitHub Actions for automated deployments, token refreshes, and selective pushes.
4. **Manageable risks**: Security and race condition concerns are mitigated with GitHub Secrets, hardening guidelines, and PR-based workflows.
5. **Scalability path**: Allows future migration to Google Cloud Functions, Cloudflare Workers, or AWS Lambdas for concurrency-heavy tasks.

## Accessing the CI/CD Workflow

The codebase is stored in the [hackforla/tables](https://github.com/hackforla/tables) GitHub repository. Deployments use GitHub Actions and Clasp to push code to production GAS scripts hosted on Google Cloud Platform (GCP) under the Tables Automation Apps Script project.

**Workflows**:
- **Deploy Script** (`deploy.yml`): Main deployment workflow
- **Weekly Clasp Token Update** (`update_clasp_token.yml`): Token maintenance workflow

**Scripts**:
- **`clasp_push.sh`**: Selective deployment logic

**Related Resources**:
- [CONTRIBUTING.md](CONTRIBUTING.md): Contribution guidelines and setup instructions
- [app-scripts.md](app-scripts.md): App Scripts overview

Access workflows via the **Actions** tab in the GitHub repository or use `clasp` for local testing. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup guides.

## Prerequisites

Before setting up or running the workflow, ensure the following:

### 1. Google Apps Script Project Setup
- Each project should have a `.clasp.json` file in its directory (generated via `clasp create` or `clasp clone`).
- Projects are organized under `src/` (e.g., `src/HFLAOnboardingAutomation/`, `src/project1/`, `src/project2/`).

### 2. GitHub Repository Secrets
- The secrets are stored in tables > Settings > Secrets and variables > Actions.
- `CLASPRC_JSON`: The contents of your `~/.clasprc.json` file (Clasp credentials, including OAuth token). Generate this by running `clasp login` locally.
- `REPO_ACCESS_TOKEN`: A GitHub REPO_ACCESS_TOKEN (PAT) with `repo` scope to update secrets programmatically.

### 3. Repository Structure
- `.github/workflows/deploy.yml`: Main deployment workflow.
- `.github/workflows/update_clasp_token.yml`: Token update workflow.
- `.github/scripts/clasp_push.sh`: Script for selective pushing.
- `src/`: Directory containing Apps Script projects.

### 4. Permissions
- The Google account used for `clasp login` must have edit access to the target Apps Script projects (currently `tables@hackforla.org`).

## How It Works: Step-by-Step

### 1. Push to Main

```
Push to main (or manual dispatch)
    │
    ▼
deploy.yml
    │
    ├─► Checkout code (full git history for diff)
    ├─► Set up Node.js 20 + install clasp
    ├─► Restore OAuth credentials from CLASPRC_JSON secret
    ├─► Run `clasp list` (forces token refresh)
    ├─► Compare refreshed token to stored secret
    │       └─► Update CLASPRC_JSON secret if changed
    │
    ├─► clasp_push.sh
    │       │
    │       ├─► `git diff` to find changed files under src/
    │       ├─► Find all directories containing .clasp.json
    │       ├─► For each project with changes:
    │       │       └─► `clasp push -f` ──► Google Apps Script
    │       │               ├─► HFLAOnboardingAutomation
    │       │               └─► HFLAOnboardingTimeTrigger
    │       └─► Exit with status
    │
    └─► Cleanup (remove credentials file)
```

### 2. Weekly Token Refresh

```
Weekly (Monday 12:00 UTC) or manual dispatch
    │
    ▼
update_clasp_token.yml
    │
    ├─► Set up Node.js + install clasp
    ├─► Restore and validate OAuth credentials
    ├─► Run `clasp list` (forces token refresh)
    ├─► Update CLASPRC_JSON secret if token changed
    └─► Cleanup
```

### 3. Manual Triggers

Use the GitHub UI to dispatch either workflow for on-demand runs. Navigate to the **Actions** tab in the repository, select the desired workflow, and click **Run workflow**.

## Technical Summary

The system, built with GitHub Actions and bash scripting, uses a modular architecture:

- **Core Workflows**: `deploy.yml` handles deployments; `update_clasp_token.yml` manages token maintenance.
- **Triggers**: Event-based (push to `main`, manual dispatch) and scheduled (weekly cron).
- **Integrations**: GitHub API (for secret updates via `gh`), Clasp (for GAS pushes), Node.js (runtime for Clasp).
- **Configuration**: GitHub Secrets store credentials; environment variables enable dynamic token updates within workflows.

### Script Overview

| Workflow/Script | File | Purpose |
|---|---|---|
| Deploy Script | `.github/workflows/deploy.yml` | Deploys code on push or manual trigger; refreshes tokens and pushes selectively |
| Weekly Clasp Token Update | `.github/workflows/update_clasp_token.yml` | Scheduled weekly token refresh and GitHub secret update |
| Clasp Push Script | `.github/scripts/clasp_push.sh` | Detects changed files, finds projects via `.clasp.json`, and pushes only affected code |

## Workflows

### 1. Deploy Script (`deploy.yml`)

This workflow deploys code changes to Google Apps Script projects when code is pushed to `main` or manually triggered.

**Triggers**:
- `push` to `branches: main`.
- `workflow_dispatch` (manual trigger).

**Job: `clasp-push`** — Runs on `ubuntu-latest`:

| Step | Action | Details |
|------|--------|---------|
| 1 | Checkout code | Uses `actions/checkout@v4` with `fetch-depth: 0` for full Git history (required for `git diff` in `clasp_push.sh`) |
| 2 | Set up Node.js | Uses `actions/setup-node@v4` with Node v20 |
| 3 | Install clasp | Globally installs `@google/clasp` |
| 4 | Write credentials | Writes the `CLASPRC_JSON` secret to `~/.clasprc.json` |
| 5 | Refresh token | Runs `clasp list` to refresh the OAuth token if expired |
| 6 | Save credentials | Masks and saves the updated `.clasprc.json` to an environment variable |
| 7 | Update secret | If credentials changed, updates the `CLASPRC_JSON` GitHub secret using `gh secret set` |
| 8 | Set permissions | Makes `clasp_push.sh` executable |
| 9 | Deploy | Runs `clasp_push.sh` to push changes selectively |
| 10 | Cleanup | Removes `~/.clasprc.json` |

**Environment Variables/Secrets Used**:
- `CLASPRC_JSON`: Clasp credentials.
- `REPO_ACCESS_TOKEN`: For updating secrets via GitHub CLI.

### 2. Weekly Clasp Token Update (`update_clasp_token.yml`)

This workflow refreshes the Clasp authentication token weekly to prevent expiration. OAuth tokens can expire after extended inactivity, and this scheduled run ensures the token remains valid even when no code is being pushed.

**Triggers**:
- `schedule`: Every Monday at 12:00 UTC (`cron: '0 12 * * 1'`).
- `workflow_dispatch` (manual trigger).

**Job: `weekly-update`** — Runs on `ubuntu-latest`:

| Step | Action | Details |
|------|--------|---------|
| 1 | Checkout code | Uses `actions/checkout@v4` |
| 2 | Set up Node.js | Uses `actions/setup-node@v4` with Node v16 |
| 3 | Install clasp | Globally installs `@google/clasp` |
| 4 | Write credentials | Writes the `CLASPRC_JSON` secret to `~/.clasprc.json` and validates JSON with `jq` |
| 5 | Refresh token | Runs `clasp list` to refresh the token |
| 6 | Save credentials | Masks and saves updated credentials |
| 7 | Update secret | If credentials changed, updates the `CLASPRC_JSON` GitHub secret |
| 8 | Cleanup | Removes `~/.clasprc.json` |

**Environment Variables/Secrets Used**: Same as `deploy.yml`.

## Scripts

### `clasp_push.sh`

This bash script handles selective deployment by checking for changes in project directories and pushing only affected projects.

**Key Logic**:

- **Error Handling**: Exits on any error (`set -e`).
- **Change Detection**:
  - Determines changed files via `git diff` (compares to `HEAD~1` for pushes or `origin/main` otherwise).
  - Filters changes to those under `src/`.
  - If no changes are found, exits early.
- **Project Discovery**:
  - Finds all directories containing `.clasp.json` using `find`.
- **Selective Push**:
  - For each project directory, checks if any changed files are within it using the `contains_changes` function.
  - If changes are found, runs `clasp push -f` (force push, skips `.claspignore` checks).
- **Exit Code**: Sets non-zero if any push fails.

**Usage**: Executed within the GitHub Actions workflow; not intended for manual runs outside of CI.

### Security Considerations

- **Secrets Management**: `CLASPRC_JSON` and `REPO_ACCESS_TOKEN` are stored as GitHub Secrets. Tokens are masked in workflow logs (`::add-mask::`) and updated programmatically. **Recommendation**: Rotate the `REPO_ACCESS_TOKEN` PAT quarterly and use minimal scopes.
- **Access Control**: The repository is restricted to authorized contributors via GitHub permissions. Only merged code on `main` triggers deployment, preventing unauthorized pushes. **Recommendation**: Audit Actions permissions and secrets access regularly.
- **Credential Cleanup**: Workflow steps remove `~/.clasprc.json` after use to prevent credential persistence on runners.
- **Secret Scanning**: Use pre-commit tools like [GitLeaks](https://github.com/gitleaks/gitleaks) to prevent accidental credential commits. See [security.md](security.md) for the project's secrets detection practices.

### Versioning and CI/CD Pipeline

Script versions are tracked in the [hackforla/tables](https://github.com/hackforla/tables) GitHub repository. Updates are deployed via GitHub Actions, triggered on `main` branch pushes. Deployments include Node.js setup, Clasp installation, token validation, and selective pushes. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup guides.

## Troubleshooting

| Problem | Solution |
|---|---|
| Clasp authentication fails (`"Clasp can't use current credential"`) | Check `CLASPRC_JSON` secret for validity. Run `clasp login` locally and update the secret in Settings > Secrets and variables > Actions. |
| No changes detected | Ensure changes are in `src/` directory and Git history is fetched correctly (`fetch-depth: 0`). |
| Secret update fails | Verify `REPO_ACCESS_TOKEN` has `repo` scope and hasn't expired. |
| JSON validation errors | Ensure `CLASPRC_JSON` is properly formatted. Test locally with `jq . ~/.clasprc.json`. |
| `clasp push` fails for a project | Check that `.clasp.json` has the correct `scriptId`. Verify the authenticated account has edit access to the target Apps Script project. |
| Workflow permissions error | Ensure GitHub Actions are enabled in repository settings and the workflow has appropriate permissions. |
| Token expires frequently | If the weekly refresh is insufficient, increase the cron frequency or manually dispatch the token update workflow. |

## Best Practices

- **Security**: Mask secrets in logs and avoid committing credentials. Follow [GitHub's security hardening guidelines](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- **Testing**: Test workflows on a feature branch before merging to `main`.
- **Monitoring**: Set up GitHub notifications for workflow failures. Review the **Actions** tab regularly.
- **Scalability**: For additional projects, add a `.clasp.json` in the project directory under `src/`. The selective push logic will automatically detect and deploy it.

## Upcoming Improvements

Due to evolving requirements and rapid feature development, planned improvements include:

- **Pre-commit Hooks**: Add linting and GitLeaks scanning as pre-commit checks to catch issues before they reach CI.
- **Enhanced Testing**: Integrate a unit test framework (e.g., GasT, QUnit) into the GitHub Actions workflow. Run tests before deployment to catch regressions. See [Issue #93](https://github.com/hackforla/tables/issues/93) for the testing discussion.
- **Error Notifications**: Implement Slack or email alerts for failed workflow runs.
- **Merge Conflict Mitigation**: Develop scripts for diff-based conflict detection and automated reviewer assignment for overlapping PRs.
- **Staging Environment**: Create a mirrored GCP project with duplicate Apps Script instances for safe testing before production deployment.

## Resources for New Contributors

- [Clasp Setup Guide](https://github.com/google/clasp)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Security Hardening for Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [Issue #93: CI/CD and Version Control Options](https://github.com/hackforla/tables/issues/93)
