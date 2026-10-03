# Bambuddy - Development Handoff

**Updated:** 2026-10-02

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
