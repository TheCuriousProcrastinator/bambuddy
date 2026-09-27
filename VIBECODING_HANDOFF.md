# VIBECODING_HANDOFF.md

## Project

**Name:** Bambuddy custom fork

**Purpose:** Alex's custom Bambuddy fork for managing and controlling Bambu Lab printers from a self-hosted web UI.

The fork adds custom behavior on top of upstream Bambuddy, including:

- internal inventory F-code stock IDs
- merge-safe persistent inventory undo/redo
- F-code reconnect persistence
- custom printer/AMS behavior fixes
- custom CI/deployment work
- an incremental redesign of the Printers page M/L cards

The current development phase is the **M/L printer-card redesign**.

### Interim checkpoint - September 27, 2026

The safe pre-Step-6 checkpoint was committed as `57978c590d9b4f0e0c9e9953f187f150258c7b88`.

That documentation-only checkpoint was fully green:

- Alex Custom PR CI: success
- Security Audit: success
- PR #2 remained open, draft, and mergeable
- Ninja source checkout had been synced through functional HEAD `f811b071`
- current Docker/runtime UI had not been rebuilt or visually validated from this redesign branch

This redesign must remain visual and incremental. Preserve printer controls, AMS interactions, inventory integration, permissions, MQTT-derived state, and existing workflows.

## Repository and branch model

- GitHub: `TheCuriousProcrastinator/bambuddy`
- Visibility: public fork of `maziggy/bambuddy`
- Default branch: `main`
- Custom stable branch: `alex-custom`
- Active development branch: `feature/printer-card-redesign-v2`
- Active draft PR: **#2 - Redesign M/L printer cards incrementally**
- PR base: `alex-custom`
- PR head: `feature/printer-card-redesign-v2`

Verified immediately before the Step 8 implementation commit:

- `main`: `9e9c08ba2cc08bf1e746ed98bef2b46b7bedea02`
- `alex-custom`: `4008f20c99ed26b8893c1f3bed9ca88b481d75f2`
- feature HEAD: `47a9ca2baad9e2272f6cee55e9b0a0d64e8fdfa9`
- feature branch: 19 commits ahead and 0 behind `alex-custom`
- PR #2: open, draft, mergeable
- Alex Custom PR CI for `47a9ca2`: success
- Security Audit for `47a9ca2`: success

The Step 8 commit advances the feature branch by one additional commit. Always verify the actual current HEAD before changing anything.

### Important branch rule

Do **not** use `main` as the custom development baseline.

The custom fork work lives on `alex-custom`.

At handoff creation, `alex-custom` and `main` were significantly diverged. Treat `alex-custom` as the custom stable base and the active feature branch as the current work branch.

Do not casually merge/rebase `main` into `alex-custom` during printer-card work.

## Current application version and release state

Verified from current source:

- `backend/app/core/config.py`
- `APP_VERSION = "1.2.5.6"`

Verified release/tag state:

- tag `v1.2.5.6`
- tag commit: `e548ba65e18743ac2fd27f98a53c1d16efbf75fa`
- GitHub Releases collection: empty
- this fork currently uses tags rather than GitHub Release objects

`alex-custom` contains unreleased custom commits after the `v1.2.5.6` tag.

No new application version has been assigned for the printer-card redesign.

Do not bump the version or create a release until the redesign has passed automated and manual validation.

## Runtime and deployment

Historical verified local deployment:

- host: Ninja
- source checkout:
  `/Users/ninja/docker/bambuddy/.bambuddy-custom-v1.2.5.5`
- parent Compose directory:
  `/Users/ninja/docker/bambuddy`
- Docker service/container:
  `bambuddy`
- local UI/API:
  `http://127.0.0.1:8001/`

The checkout directory name is stale. Source version is 1.2.5.6.

The Ninja source checkout was explicitly synced by the user through functional HEAD `f811b071`.

No Docker rebuild/restart or visual runtime validation of the current printer-card redesign branch has been verified yet.

Treat the live Bambuddy runtime as **not yet validated against the redesign branch**, even though the source checkout is current through `f811b071`.

### Compose rule

The parent Compose setup is customized.

**Do not replace it with the stock repository `docker-compose.yml`.**

If visual/runtime behavior differs from source, verify the actual container image/source before editing code. Stale Docker images have caused source/UI mismatches before.

## Architecture

### Backend

- FastAPI
- async SQLAlchemy
- SQLite in the local deployment
- MQTT integration for printer state/control
- WebSockets for live UI updates

Important custom backend files:

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/api/routes/inventory.py`
- `backend/app/models/spool.py`
- `backend/app/models/spool_assignment.py`
- `backend/app/models/spool_usage_history.py`
- `backend/app/models/spool_k_profile.py`
- `backend/app/models/spool_filament_preset.py`
- `backend/app/models/undo_operation.py`

### Frontend

- React
- TypeScript
- Vite
- TanStack Query
- existing Bambuddy theme variables/components

Critical files for the active redesign:

- `frontend/src/pages/PrintersPage.tsx`
- `frontend/src/__tests__/pages/PrintersPage.test.tsx`
- `frontend/src/__tests__/pages/PrintersPageCardScale.test.tsx`
- `frontend/src/__tests__/pages/PrintersPageCompactMetrics.test.tsx`
- `docs/printer-card-redesign.md`
- `.github/workflows/alex-custom-pr-ci.yml`

`PrintersPage.tsx` is a very large monolithic file, roughly 10,000 lines / 500+ KB.

It mixes presentation and substantial printer behavior.

Make surgical changes only.

Do not refactor the entire page while the visual design is still being stabilized.

## Existing custom behavior that must remain intact

### F-code inventory IDs

Internal inventory supports short stock IDs such as:

`F0001`

The field is hidden when Spoolman owns inventory.

The printer-page F-code picker can point a live slot at the desired F-code before merging a duplicate inventory row.

### F-code merge endpoint

`POST /api/v1/inventory/spools/{source_spool_id}/merge`

Important invariants:

- source and target must differ
- canonical code format is `F0000`
- target must still own the F-code
- target cannot be archived
- material must match
- subtype/brand/color must match when both records provide values
- source cannot still be assigned to a printer slot
- target stock totals remain authoritative
- source stock totals are not summed into target
- usage history is moved
- non-conflicting K profiles and filament presets are moved
- newer `last_used` wins
- metadata collisions favor target
- source row is deleted after dependents move

### Persistent global undo/redo

Current reversible coverage is **inventory merge only**, not universal undo.

Shortcuts:

- macOS: Cmd+Z undo, Cmd+Shift+Z redo
- Windows/Linux: Ctrl+Z undo, Ctrl+Shift+Z or Ctrl+Y redo

Shortcut handler ignores:

- form/input controls
- contentEditable areas
- repeated keydown events

Backend routes:

- `POST /api/v1/inventory/undo`
- `POST /api/v1/inventory/redo`

Do not use `/undo` as a health probe. It can mutate real history.

Printer slot reassignment is intentionally separate from merge undo.

Undo restores the inventory source row but does not automatically reassign an AMS slot.

This is a print-safety decision.

### F-code reconnect persistence

Relevant code:

`backend/app/main.py:on_ams_change()`

When a slot is assigned to an F-code, a new Bambu RFID UUID should not destroy the assignment if the live spool still matches the F-code bucket by:

**material + color**

A genuine material/color change should still unlink/reconcile.

Do not replace this with a permanently sticky F-code assignment rule.

### Historical baseline tests

Previously verified custom-behavior tests include:

- F-code reconnect regression: 2 passed, 40 deselected
- merge undo/redo integration tests: 5 passed
- global shortcut tests: 3 passed

Preserve these behaviors during unrelated UI work.

## Printer-card redesign contract

Authoritative design document:

`docs/printer-card-redesign.md`

### Core rule

**M and L use exactly the same composition.**

L is only a proportional scale-up of M.

Elements do not move between M and L.

L does not reveal extra information.

S and XL remain unchanged during this redesign phase.

### Approved information order

1. Printer header
2. AMS
3. Current job
4. Telemetry
5. Actions

### Visual principles

- AMS sits directly below printer identity.
- AMS humidity must be explicitly labeled.
- Healthy status noise should not dominate.
- Current job, progress, ETA, and actionable problems get strongest hierarchy.
- Telemetry should be calmer and grouped.
- Rare controls should use progressive disclosure.
- Prefer proximity/whitespace before borders/dividers.
- Preserve the existing theme engine.
- Green should primarily communicate active/good state.
- Preserve existing printer behavior and interaction semantics.

## M/L redesign scale tokens

Current source contains:

`PRINTER_CARD_REDESIGN_SCALE`

M / card size 2:

- scale: 1.0
- target width: 45 rem
- outer padding: 16 px
- major gap: 16 px
- minor gap: 8 px
- control height: 36 px

L / card size 3:

- scale: 1.2
- target width: 56 rem
- outer padding: 20 px
- major gap: 20 px
- minor gap: 10 px
- control height: 43 px

Current source also contains:

`isPrinterCardRedesignSize(cardSize)`

which identifies only sizes 2 and 3.

`isRedesignedCard` is gated by:

- expanded view
- M/L size

The older `CARD_BODY_SCALE` remains for legacy body/icon scaling.

## Current redesign implementation

Functional HEAD before this handoff commit:

`6c4a97e6388daffcd6b578523fa7dea44743c92f`

The redesign is intentionally incomplete.

### Completed: design contract

Commit:

`a394d913 Add incremental printer card redesign plan`

Established the incremental design plan.

### Completed: shared M/L gate and scale tokens

Commits:

- `7aa4f441 Prepare shared M/L printer card redesign tokens`
- `7f427e60 Fix redesign prep lint`

Established the shared M/L scale source of truth without changing S/XL.

### Completed: M/L header cleanup

Commit:

`47ae5b67 Clean up M/L printer card header`

For redesigned M/L cards:

- connection state becomes a quiet dot + Connected/Offline summary
- normal Wi-Fi dBm / wired-network pills are hidden
- healthy HMS OK is hidden
- real HMS issues still surface
- healthy maintenance OK is hidden
- due/warning maintenance still surfaces
- closed enclosure door is hidden
- open door can surface
- maintenance-mode state remains visible

Regression test:

`uses a quiet connection summary and hides healthy diagnostic noise at M`

Important limitation:

The header is not the final redesign.

Some legacy badges/secondary information still render under their existing conditions.

Do not claim the badge wall is fully solved yet.

### Completed: explicit AMS humidity label

Commits:

- `d3388780 Label AMS humidity on redesigned M/L cards`
- `8d8a9054 Wait for AMS humidity label in test`

`HumidityIndicator` now accepts an optional `label`.

For redesigned M/L AMS headers, current code passes the localized `Humidity` label.

S/XL retain legacy rendering.

Regression test:

`labels AMS humidity explicitly on the redesigned M card`

### Completed: AMS section extraction only

Latest functional commit:

`6c4a97e6 Extract AMS section for safe card reordering`

The large AMS JSX is now extracted into:

`const amsSection = ...`

inside `PrinterCard`.

Purpose:

Allow the AMS surface to move without copying or rewriting behavior.

### Completed: Step 4 M/L AMS reorder

The already-extracted `amsSection` now renders above the current-job/status surface for redesigned M/L cards only.

Legacy S/XL cards keep the previous bottom AMS placement.

The move does not duplicate or rewrite AMS internals and preserves:

- slot rendering
- assignment logic
- hover cards
- RFID actions
- drying
- Spoolman integration
- internal inventory integration
- F-code picker behavior
- runout guidance
- backup state
- external spool behavior
- permissions
- callbacks/mutations

Focused regression coverage now verifies M document order:

`printer header -> AMS -> current job`

The test waits for async AMS/status content before checking document order.

### Completed: Step 5 M/L divider cleanup

Redesigned M/L cards no longer render the legacy `FILAMENTS` or `STATUS` section labels and horizontal rule dividers.

The change is presentation-only:

- AMS backup state remains rendered
- the external-spool toggle remains rendered
- AMS internals and callbacks are unchanged
- current-job content is unchanged
- S/XL behavior remains unchanged; XL keeps the legacy divider presentation and S keeps its compact layout

Focused regression coverage verifies:

- M and L omit the legacy `FILAMENTS` and `STATUS` divider labels
- XL still renders both legacy divider labels

### Completed: Step 6 M/L current-job surface

Redesigned M/L cards now give the current job stronger visual priority without changing job data or controls.

M/L-only presentation changes:

- current-job surface uses a calmer `rounded-xl` bordered `bg-black/10` treatment with `p-3`
- job title uses `text-base font-semibold`
- M thumbnail/content height grows from 24 to 28 Tailwind units
- L thumbnail/content height grows proportionally to 32 Tailwind units
- responsive fallbacks remain in place for narrower viewports

Preserved unchanged:

- job state text
- progress values and progress-bar behavior
- skip-object control and permissions
- retained-print handling
- ETA, layer, and user metadata
- queue widget
- S compact path
- XL legacy expanded current-job styling

Focused regression coverage verifies the redesigned M/L treatment and the unchanged XL legacy treatment.

### Completed: Step 7 M/L telemetry grouping

Redesigned M/L cards now present temperatures and fans as one calmer telemetry surface.

M/L-only presentation changes:

- temperature row uses a shared `rounded-t-xl` bordered `bg-black/10` group
- fan row attaches directly below with a matching `rounded-b-xl` group
- shared telemetry gaps collapse from `gap-1.5` to `gap-0`
- common temperature/control cells drop their individual dark rounded-card background and use slightly roomier `px-3 py-2`
- common telemetry hover feedback becomes a subtle `hover:bg-white/5`

Preserved unchanged:

- all telemetry values
- heater/fan state calculations
- heater history controls
- temperature mutations and popovers
- fan mutations and popovers
- active-nozzle behavior
- permissions
- S and XL legacy styling

Focused regression coverage verifies M/L grouped telemetry styling and unchanged XL legacy grouping.

### Completed: Step 8 M/L action/footer hierarchy

Redesigned M/L cards now keep primary print actions visible while placing secondary printer controls behind one deliberate Controls entry point.

M/L-only hierarchy changes:

- the legacy CONTROLS label/divider is replaced by a quieter top border before the action row
- pause/resume and stop remain visible as primary print actions
- chamber light, movement, plate detection, speed, airduct, and other existing secondary controls remain unchanged but live inside a Controls popover
- the existing More printer-actions menu moves beside the M/L header connection summary
- the footer retains camera/files/upload actions but no longer duplicates the More menu

Preserved unchanged:

- every existing control and mutation
- all permissions and disabled states
- confirmation dialogs and popovers
- S and XL legacy control/footer hierarchy
- Step 7 telemetry grouping

Focused regression coverage verifies the M/L progressive action hierarchy, popover toggle, header More-menu placement, and unchanged XL legacy hierarchy.

## GitHub CI

Active PR workflow:

`.github/workflows/alex-custom-pr-ci.yml`

Focused frontend validation currently runs:

```bash
npm ci
npm run lint
npx tsc --noEmit
npx vitest run   src/__tests__/pages/PrintersPage.test.tsx   src/__tests__/pages/PrintersPageCardScale.test.tsx   src/__tests__/pages/PrintersPageCompactMetrics.test.tsx
npm run check:i18n
npm run build
```

### Latest validated HEAD before Step 8

For `47a9ca2baad9e2272f6cee55e9b0a0d64e8fdfa9`:

- Alex Custom PR CI: success
- Frontend validation: success
- lint: success
- type check: success
- focused printer-card regression tests: success
- production frontend build: success

Security Audit: success, including:

- Frontend Security Audit
- Backend Security Audit
- Bandit / Python security analysis
- Trivy / container security scan

Earlier on the branch, the full frontend suite reported:

- 258 test files passed
- 3,520 tests passed

before a later commit cancelled the run during the subsequent build step.

The fast PR gate intentionally uses the focused printer-card regression suite.

A full frontend suite is still required at final redesign validation.

## Development workflow

### Small chunks only

For this project phase:

- one small change per commit
- validate it
- let CI finish
- then continue
- avoid big-bang redesigns
- avoid long tool streams
- do not dump investigation details unless blocked or asked

The previous large redesign branch:

`feature/printer-card-redesign`

was abandoned because it changed too much at once.

Do not resume it or copy it wholesale.

Active clean restart:

`feature/printer-card-redesign-v2`

### GitHub CI is the normal code validation gate

Do not ask the user to rerun the same lint/typecheck/focused tests on Ninja when GitHub CI already ran them.

Use Ninja only when a real local Docker build, deployment, runtime inspection, or visual/functional printer test is needed.

### Terminal style

When user commands are needed:

- one short robust block
- clearly say if it runs on Ninja
- use `GIT_PAGER=cat` or `git --no-pager`
- avoid giant pasted scripts
- avoid fragile escaping

## Pending GitHub-first Docker deployment direction

Concept agreed, not implemented:

1. code changes land in the GitHub fork
2. GitHub Actions tests
3. GitHub Actions builds amd64 + arm64 image
4. publish to user's GHCR
5. publish moving `alex-custom` image tag plus immutable version tags
6. Ninja pulls the image and restarts the customized Compose service

Possible registry direction:

`ghcr.io/thecuriousprocrastinator/bambuddy`

Constraints:

- preserve the customized parent Compose file
- only change the Bambuddy image reference when migration is ready
- do not replace Compose with the stock repository file
- this is pending architecture, not current deployment behavior

Keep this decision in future handoffs until implemented or abandoned.

## Failed / misleading approaches to avoid

### Big redesign branch

Do not resume:

`feature/printer-card-redesign`

The redesign is now incremental.

### Broad PrintersPage refactor

Do not refactor the entire giant page before the visual design is stable.

UI and printer mutations are deeply mixed.

### Full frontend suite after every tiny visual commit

Too slow for every step.

Use focused PR CI for each small slice.

Run the full suite at meaningful milestones and before merge/release.

### Duplicate local CI

Do not ask the user to repeat GitHub CI locally without a distinct reason.

### Giant pasted scripts

Avoid large Python/base64/install blocks in the user's shell.

### Permanent F-code stickiness

Do not replace material+color reconnect continuity with unconditional stickiness.

### Numeric SQLite ID assumptions

SQLite can reuse deleted IDs.

Tests should validate semantic assignment state, not numeric ID disappearance.

### Slot reassignment during inventory undo

Intentionally excluded for print safety.

Do not add casually.

### Inventory undo as a health check

Unsafe because it mutates state.

### Casual `npm audit fix`

Existing dependency vulnerabilities are separate dependency work.

Do not mix dependency upgrades into the printer-card redesign.

## Important debugging findings

- `PrintersPage.tsx` is large enough that Babel may report deoptimized code generation during lint.
- lint can take noticeable time even for tiny changes
- prep initially failed lint because `isRedesignedCard` was introduced before use
- focused CI uses explicit Vitest file paths for predictable selection
- humidity regression test must wait for async status rendering and use an all-elements query because the fixture contains multiple AMS humidity labels
- S uses the compact legacy card path and does not render the FILAMENTS/STATUS divider rows; XL is the correct legacy expanded regression target
- `CoverImage` applies sizing classes to its wrapper div; the inner img is always `w-full h-full`, so current-job size regressions must assert the wrapper
- AMS JSX was extracted specifically to make the next move a tiny diff
- source/UI mismatch may be a stale Docker image rather than source code
- verify live container/source before editing to fix a visual mismatch

## Open / deferred custom-fork validation

Not active redesign work, but useful context:

- full browser undo/redo round trip for inventory merge remains useful
- real backend/container restart confirming F-code reconnect persistence remains useful
- exhaustive K-profile/preset collision restoration is not complete
- auth-specific undo-stack coverage could improve
- duplicate merge error-toast UX is not fully polished

Do not mix these into the printer-card redesign unless a real regression appears.

## Remaining printer-card redesign backlog

Follow the design contract in order.

Next remaining steps:

9. Bound M/L widths in the page grid so a lone card does not stretch across an ultrawide display.
10. Run full regression validation and manual P1S + AMS testing.

Do not jump ahead.

S and XL remain unchanged during this phase.

## Exact next development task

**Step 9 only: bound redesigned M/L card widths in the page grid.**

Before editing, inspect the current printers grid/card-width logic and `docs/printer-card-redesign.md`.

Implementation constraints:

- M/L only
- S and XL remain unchanged
- preserve the approved M/L composition and Steps 5-8 styling
- prevent a lone M/L card from stretching across an ultrawide display
- do not change card information or controls
- do not change printer mutations, telemetry behavior, permissions, Spoolman, or F-code behavior
- keep the change layout-only and small

Add or adjust focused regression coverage for the redesigned M/L width bound.

Make this one small code change.

Update this handoff in the same meaningful commit.

Then let GitHub PR CI finish.

Do not continue to Step 10 until CI is green.

Ninja visual testing may be useful after this layout step, but do not guess deployment commands; verify the customized Compose/runtime state first.

## Local Ninja command when visual testing is actually needed

Run on Ninja only when a real local deployment/runtime test is needed:

```bash
cd "/Users/ninja/docker/bambuddy/.bambuddy-custom-v1.2.5.5" || exit 1
set -e
export GIT_PAGER=cat

git fetch origin
git switch feature/printer-card-redesign-v2
git pull --ff-only origin feature/printer-card-redesign-v2
```

Do not automatically follow this with redundant lint/tests if GitHub CI already passed them.

Build/deploy commands must be based on the then-current verified customized Compose/runtime state, not guessed from historical commands.

## Handoff maintenance rule

Every meaningful future development commit on the custom fork must update this file with enough current context for a new ChatGPT session to continue without prior conversation history.

Update this handoff when a commit changes:

- printer-card implementation
- custom backend behavior
- F-code behavior
- undo/redo behavior
- architecture
- branch/PR state
- version/release state
- CI strategy
- deployment strategy
- debugging findings
- validation status
- known issues
- exact next task

Keep the handoff current-state focused.

Do not turn it into a chronological transcript.

## Prompt for the next ChatGPT session

Read the full handoff first.

Treat it as historical context, but verify the current GitHub repository, `alex-custom`, `feature/printer-card-redesign-v2`, PR #2, HEAD commit, CI status, version, and relevant source before changing anything.

Never guess about implementation details that can be inspected.

Preserve all existing custom inventory, undo/redo, F-code reconnect, printer, AMS, permissions, and MQTT-derived behavior.

Continue from the exact active task only: Step 9, bound redesigned M/L card widths in the page grid while keeping S/XL unchanged, preserve the approved composition and Steps 5-8 styling, add focused coverage, update this handoff in the same commit, and stop after that small commit plus CI result.
