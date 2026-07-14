# Manual Test Script - 2026-07-14

This script is the next recommended Slice 4 walkthrough plan.

It is designed around one specific rule:

- do **not** delete the existing manual-test output folders first

Instead, use a fresh output root that is not tied to the repository workspace so Quantum experiences the run the way an ordinary user would.

## Goal

Run a full fresh Electron walkthrough using:

1. a real export path
2. a brand-new output root
3. an output folder outside the Quantum repository

The purpose is to test whether Quantum behaves clearly when:

- the export may already be familiar to the maintainer
- but the chosen output root has no prior Quantum history
- and the workflow therefore looks like a first-time user workspace rather than a maintainer rerun lane

## Why this is the right next test

This is better than deleting old manual-test folders because:

- old output folders remain useful comparison evidence
- output-root-scoped reuse is already part of the product contract
- a fresh output root should naturally look unprocessed without destructive cleanup
- an ordinary user is more likely to choose a normal destination folder than a repository-coupled workspace

This test therefore checks the product more honestly.

## Setup rule

Keep all existing local Quantum output folders intact.

For the walkthrough, choose:

- one export folder you trust enough to use as a realistic input
- one brand-new output root outside the repo

Examples of the output-root shape to prefer:

- a normal Desktop folder
- a Documents folder
- a user-created review folder

Avoid:

- the repo root
- existing Quantum-maintained output roots
- any folder whose history would confuse the “fresh workspace” question

## Main question

When Quantum sees a familiar export source but a brand-new output root, does it behave like:

- “fresh local workspace, no prior history here yet”

instead of:

- “mysterious missing memory”

That is the trust question this pass should answer.

## Required path

1. Imports
2. Export Check
3. Import
4. Import History
5. Readable Archive
6. Datasets
7. Find Imports
8. Return to Imports

If relevant:

9. safe stop control

## Scenario to run

### Fresh workspace run

Use:

- a known export folder
- a new output root outside the repo

Verify:

- Imports explains that the workspace is fresh rather than implying lost history
- the Export Check remains understandable in the new workspace
- the import behaves like new work instead of accidental reuse
- Import History starts empty, then fills in normally after the run
- downstream archive and dataset handoff still feel grounded

### Optional comparison after the fresh run

Only if useful after the first pass:

- switch back to the older output root
- confirm that Quantum restores the older workspace history and latest-run framing clearly

This comparison is useful only to verify workspace-scoped continuity, not as the primary test.

## What to document

Capture these items exactly:

1. export path tested
2. fresh output root chosen
3. whether the output root was outside the repo
4. whether Imports correctly read as a fresh workspace before import
5. whether any copy still sounded like Quantum had “forgotten” prior work
6. whether the first successful run populated Import History in a believable way
7. whether Archive, Datasets, and Find Imports still felt connected to the same run
8. whether returning to Imports preserved the same story

## Specific trust checks

### Before import

Look for:

- whether the Current Workspace card explains the fresh output root clearly
- whether the empty-history state feels expected instead of alarming
- whether the latest-run surfaces stay quiet or contextual instead of pretending old history still applies

### During import

Look for:

- whether the running state feels like true new processing rather than reuse
- whether long-running work still feels active and bounded

### After import

Look for:

- whether Import History now feels naturally “born” in the new workspace
- whether the archive and dataset outputs feel tied to the new output root
- whether Find Imports sees the run as part of this workspace without confusion

## Legacy ChatGPT add-on

If the chosen export is an older `chat.html`-heavy ChatGPT package, explicitly note:

- whether Quantum warns clearly that this is the heavier legacy lane
- whether the stop/switch-path guidance appears early enough to be useful
- whether you would have known to back out if it was the wrong export path

## Fast scoring

Score each item from `1` to `5`:

- fresh-workspace clarity
- output-root trust
- Export Check clarity
- import-state honesty
- Import History continuity
- Archive handoff
- Dataset handoff
- Find Imports continuity
- return-to-Imports continuity

## Success condition

This walkthrough succeeds if:

- Quantum reads like a fresh workspace in the new output root
- that fresh-workspace state does not feel like missing memory
- the first import populates history and downstream screens coherently
- the ordinary user path remains understandable without maintainer context

## Deliverable

Write the next walkthrough record afterward with:

- export path tested
- output root used
- whether it was a fresh non-repo workspace
- what felt clear
- what still felt risky or ambiguous
- whether any remaining issue belongs to:
  - blocker
  - readiness issue
  - observe in beta
  - cosmetic
