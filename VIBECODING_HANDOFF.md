<!-- VIBE-CURRENT-STATE:START -->
## Current repository facts (generated, authoritative only for the facts listed)

- Repository: `TheCuriousProcrastinator/bambuddy`; local working branch: `main`.
- Version data below is read from the **Git index** (the files staged for commit).
- Source `pyproject.toml`: version `0.1.5`.
- Source `frontend/package.json`: version `0.0.0`.
- GitHub publication: No published GitHub release returned by the API. Other distribution channels are **unverified**.
- This section does **not** establish local build success, manual QA, App Store/Chrome Web Store approval, notarization, live website deployment, or release-asset integrity.
- The narrative below maintains architecture, decisions, issues and test evidence. Its older status and version claims are **historical** unless explicitly reconciled with this section.
- Before executable changes, inspect the actual checkout and validate the **exact files** on the real Mac. No automatic GitHub Actions.

<!-- VIBE-CURRENT-STATE:END -->

# Bambuddy - Development Handoff

## Publish/release command - standing authorization (2026-10-13)

- When the user says "publish", "release", "make update", or equivalent, treat that statement as standing authorization to complete the full validated local release and publication workflow. Do not ask for additional publication consent or confirmation.
- Never create Terminal scripts that ask the user to type "PASS", "YES", or another validation or confirmation keyword before publishing. Never introduce case-sensitive validation gates. A user statement such as "pass", "passed", "works", or equivalent is an explicit confirmation of the corresponding manual tests, regardless of capitalization.
- If the exact source change has already passed required local build/tests and the user confirmed required manual verification, proceed immediately with committing the exact tested source, handoff update, release build/signing/packaging, GitHub releases, Sparkle appcast publication, and live verification. Do not ask the user to repeat validation.
- Keep the non-negotiable local validation gate: do not publish unvalidated executable/build-affecting changes. If required validation genuinely has not happened, stop and explain that blocker, with the minimum required local test instructions; do not pretend validation passed.
- Stop only for real blockers such as missing local validation, failed build/test, unsafe working tree, missing signing credentials, or a failed release step. Do not create arbitrary pauses, keyword prompts, or extra approvals. Do not run GitHub Actions automatically.
- If local Mac access is unavailable, supply one copy-pasteable, **noninteractive** Terminal block to carry out already-authorized release actions in the exact validated Mac checkout. Use existing credentials/keychain without inventing confirmation prompts. If genuine credentials or macOS prompts are unavoidable, report them as blockers, not additional publication-approval requests.
- This rule takes precedence over older handoff wording that might suggest an additional user confirmation after validation. It does not override mandatory validation or source-of-truth checks.


**Updated:** 2026-10-02

## Shared Vibe Coding workflow rules (2026-10-08)

### Documentation-only handoff exception
- When the user explicitly requests a documentation-only update, ChatGPT may edit the existing root `VIBECODING_HANDOFF.md` directly through GitHub without requiring a Mac build or a local checkout step.
- First inspect the actual repository, target branch, and existing handoff. Change only the handoff, preserve historical project context, and verify the resulting GitHub file and commit. Do not use this exception for application code, tests, scripts, configuration, workflows, version/build changes, release assets, or other build-affecting files.
- Before the next local development change, fetch the remote branch and reconcile the updated handoff with the local checkout. Never overwrite or silently reset unrelated local changes.
- The normal rule remains: validate the exact executable/build-affecting changes in the real Mac checkout before committing or pushing those changes. Include a current handoff with every meaningful validated development commit.

### Temporary worktrees, releases, and logs
- Create temporary Git worktrees under `/Users/alex/Desktop/tmp/<project>-...` using a project-specific name.
- Put release working folders, temporary release artifacts, staging directories, and build/release logs under `/Users/alex/Desktop/tmp/<project>-release-...`.
- Do not create disposable worktrees inside `/Users/alex/Documents/Vibe Coding`.
- Do not place release artifacts or logs directly on the Desktop root.
- After a successful verified release, remove temporary worktrees and temporary release artifacts when safe. Do not remove active worktrees, uncommitted work, published assets, or permanent project files.
- Retain failure logs only when useful for debugging; remove unnecessary temporary logs.
- These instructions govern future operations and take precedence over historical temporary-path examples elsewhere in this handoff.

### Low-overhead development defaults
- Use ChatGPT plus GitHub inspection and Mac-local Terminal scripts by default; do not use Codex, ChatGPT Work, separately billed API agents, or GitHub Actions runners unless explicitly requested.
- Prefer existing project scripts. Give one local command block to apply, build, test, and launch an executable change, then a separate commit/push block only after required validation is confirmed.
- Documentation-only updates under the exception above do not require a rebuild.

## Project

Bambuddy is a self-hosted management system for Bambu Lab printers.

This repository contains application code, web/frontend components, printer-management features, container tooling, integrations, installer tooling, and GitHub maintenance workflows.

## Repository

- GitHub: `TheCuriousProcrastinator/bambuddy`
- Default branch: `main`
- Source baseline before this policy migration: `9e9c08ba2cc08bf1e746ed98bef2b46b7bedea02`

Always verify the current repository, branch, HEAD, and working tree before development.

## GitHub Actions policy

Local validation is authoritative for Vibe Coding development and releases.

All existing GitHub Actions workflows are retained but use only `workflow_dispatch`.

GitHub Actions must not run automatically for pushes, pull requests, tags, schedules, issue events, or other repository events.

Actions may be run only when the user explicitly requests optional clean-environment verification.

Development and releases do not depend on GitHub Actions.

## Manual-only workflows

- `.github/workflows/auto-label-area.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/cleanup-ghcr.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/issue-closed.yml`
- `.github/workflows/repo-stats.yml`
- `.github/workflows/security.yml`
- `.github/workflows/stale.yml`
- `.github/workflows/windows-installer.yml`

Existing `workflow_dispatch` inputs are preserved.

Some workflows were originally designed for issue events, schedules, pushes, pull requests, or release tags. Their bodies are intentionally unchanged. Under manual dispatch, event-specific jobs may skip or require future adaptation if the user explicitly wants to use them manually.

Do not restore automatic triggers without explicit user approval.

## Development workflow

Before modifying source:

1. `git fetch origin`
2. verify repository, branch, and expected HEAD
3. inspect `git status --short`
4. stop rather than overwrite, reset, stash, or merge unrelated work
5. make the smallest reliable change
6. validate locally
7. manually verify behavior when required
8. commit and push only the exact locally validated files
9. update this handoff with every meaningful development commit

GitHub remains read-only until required local validation succeeds.

## Release policy

Normal builds, tests, packaging, signing, and release validation must be performed locally when applicable.

GitHub remains the host for committed source/history, branches, tags, releases, downloadable assets, and optional manually requested clean-environment verification.

Automatic tag-triggered release publication must not be reintroduced.

The Windows installer workflow remains available as a manually invoked workflow. Its implementation and signing logic were not rewritten by this migration.

## Backup boundary

GitHub does not back up local secrets, credentials, signing material, environment configuration, ignored files, or uncommitted work.

## Policy migration scope

This migration changes only:

- trigger blocks in the 9 existing GitHub Actions workflows
- `VIBECODING_HANDOFF.md`

No Bambuddy application source, tests, dependencies, containers, installer implementation, or runtime behavior is changed.

## Next development task

Verify this handoff against the current repository before beginning any product change.
