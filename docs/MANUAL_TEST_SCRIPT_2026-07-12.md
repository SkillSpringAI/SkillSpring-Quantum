# Manual Test Script - 2026-07-12

This script is the focused Slice 3 retest plan for tonight.

It assumes the July 12 import-trust work is already in place:

- unchanged reruns can now complete quickly when prior output is safely reusable
- progress wording is stronger about verification, reuse, retry, resume, and output-finalization phases
- reuse invalidation is stricter and should refuse stale or legacy validation records more safely

## Tonight's Goal

Validate the ordinary Quantum workflow in the real Electron shell and document whether it now feels steady, honest, and reusable enough for a small outside beta path.

Primary flow:

1. Imports
2. Import history
3. Readable Archive
4. Datasets
5. Find Imports
6. Return to Imports

## What We Already Know

These points are no longer hypothetical:

- a real large ChatGPT export has completed fully in roughly 90 minutes
- an unchanged rerun of an already imported large export completed in under 30 seconds
- that quick rerun felt like honest reuse rather than suspicious duplicate parsing

That means tonight's main open question is no longer unchanged-rerun trust.

The main open question is whether the rest of the ordinary workflow still feels coherent and truthful around that improved import behavior.

## Priority Scenarios For Tonight

Cover these in order if possible:

1. unchanged rerun confirmation in Imports
2. ordinary downstream handoff:
   - Readable Archive
   - Datasets
   - Find Imports
3. Imports return check
4. heavy retry or interrupted resume path only if available

If time runs short, do not skip the downstream handoff path just because unchanged rerun trust already improved.

## Test Input

Prefer one of these:

- the already imported large ChatGPT export that proved the under-30-second rerun
- another realistic export path with trustworthy archive and dataset output already present

If a heavy retry or resume case is not available tonight, record that clearly instead of forcing an artificial failure.

## Screen Script

### 1. Imports

Do:

1. launch Electron fresh
2. confirm the output root is the intended one
3. restore or choose the known rerun path
4. run Export Check
5. run the unchanged import rerun again if practical
6. watch the status card, next-step card, and import history framing together

Look for:

- does the top status area feel anchored to the current run immediately?
- does the verification phase explain itself clearly enough before main work starts?
- when reuse is available, does the import feel like success rather than a hidden skip?
- does the screen still make preserved work obvious when exact ETA is unknown?

Record:

- exact path tested
- output root used
- whether changing output root changed the already-imported acknowledgement story
- Export Check wording
- import completion wording
- whether the under-30-second rerun result still holds
- whether any part of the screen still reads like stale finished-run framing
- whether a visible stop or escape hatch was needed during the import attempt

### 2. Import History

Do:

1. open the latest run details
2. inspect summary counts
3. inspect any reused-file wording
4. check whether the run reads like safe reuse instead of duplicate work

Look for:

- does import history explain reused output clearly enough?
- can you tell which files were imported, skipped through reuse, or handled as companions?
- does the latest run feel connected to the action just performed?

Record:

- summary counts shown
- whether reused-file records feel obvious
- whether any wording still sounds too operator-heavy

### 3. Readable Archive

Do:

1. open Readable Archive from the normal next-step path if available
2. confirm the output root shown there matches Imports
3. open a real archive file
4. review the selected-file pane
5. inspect any preserved attachment cues

Look for:

- does the archive feel like the natural next screen after the rerun?
- does anything here feel stale, mismatched, or detached from the import that just happened?
- are the next available actions obvious?

Record:

- whether the selected archive file loaded cleanly
- whether the current folder cue felt strong enough
- whether attachment or preservation cues felt useful or noisy

### 4. Datasets

Do:

1. move into Datasets from the archive handoff if possible
2. confirm the selected run matches expectations
3. inspect the archive-linked handoff summary
4. inspect preview scope and output file framing
5. switch preview lanes only if needed for clarity

Look for:

- does the archive-to-dataset handoff feel exact, approximate, or unclear?
- can you tell whether the preview is a matched historical run or a latest-bundle fallback?
- does the dataset view still feel understandable for an ordinary user?

Record:

- whether archive-linked matching felt trustworthy
- whether preview scope language was immediately understandable
- whether any part of the dataset view feels too dense for beta-facing use
- whether the density feels unnecessary or whether it becomes justified once the archive-linked handoff is visible

### 5. Find Imports

Do:

1. open Find Imports from the current folder context
2. verify the fresh run appears
3. search using a vendor, topic, or title clue from the current import
4. open one matching import result
5. inspect any linked segment view only if it clarifies the run

Look for:

- does Find Imports feel connected to tonight's actual run?
- does retrieval remain understandable after a rerun-aware import path?
- do selected results feel grounded in deterministic evidence rather than generic search noise?

Record:

- whether the fresh run appeared promptly
- whether the selected result felt trustworthy
- whether the next-step guidance from retrieval felt useful

### 6. Imports Return Check

Do:

1. return to Imports after the downstream screens
2. compare the top status card with the visible latest-run context
3. check whether the screen still feels anchored to the same story

Look for:

- does the product still feel like one connected workflow after the round-trip?
- does returning to Imports weaken confidence or preserve it?

Record:

- whether the successful-run feeling held up
- whether remaining issues are mostly copy, hierarchy, or trust-state issues

## Heavy Retry Or Resume Add-On

Only run this if a real heavy retry or interrupted shard path is available tonight.

Look for:

- whether `verifying previous output` appears soon enough
- whether retry versus resume is obvious without close reading
- whether preserved work is clearly acknowledged before the longest step
- whether long elapsed time still feels active rather than frozen

If this scenario is not available tonight, explicitly record:

- `heavy retry/resume not exercised in this pass`

## Fast Scoring

Score each area from `1` to `5`:

- Imports clarity
- unchanged rerun trust
- import history clarity
- Archive usability
- Dataset handoff clarity
- Find Imports usability
- return-to-Imports continuity
- heavy retry/resume trust if exercised
- overall steadiness

Use:

- `5` = clear and confidence-building
- `3` = workable but awkward
- `1` = confusing or trust-reducing

## Good Result For Tonight

Tonight's pass is a success if:

- the ordinary workflow stays coherent after the improved rerun behavior
- unchanged rerun trust remains strong
- archive, dataset, and retrieval handoffs still feel grounded
- returning to Imports preserves continuity
- remaining issues are mostly polish rather than hidden-state or stale-context failures

## Output Template

When the walkthrough ends, write the next record with:

- path tested
- output root used
- vendor/export shape
- scenario type
- what worked smoothly
- what still felt confusing
- copy issues
- hierarchy or layout issues
- trust or missing-state issues
- fast scores
- best next simplification slices
