# Manual Test Script - 2026-07-09

This script is the focused walkthrough for the next Electron manual retest after the July 9 import-hardening and CI stabilization pass.

It stays inside the current MVP promise:

1. inspect a recognizable export
2. import it locally
3. review readable archive output
4. review privacy-aware dataset output
5. verify retrieval / Find Imports
6. only use diagnostics if trust breaks or something is unclear

## Today's Priority

The main question is no longer "can the downstream screens work at all?"

The main question today is:

- does the ordinary user flow still feel steady and trustworthy now that rerun reuse, retry, and resume states are more explicit?

Use the stable walkthrough path already reinforced in the UI:

- Imports
- Readable Archive
- Datasets
- Find Imports

Treat that as the reusable baseline for:

- internal manual validation
- outside beta onboarding
- future tutorial material

## Target Scenarios

If possible, cover these in order:

1. first import of a realistic export path
2. unchanged rerun of the same path
3. previously interrupted or failed heavy-shard retry path

If only one scenario is practical today, prioritize:

1. unchanged rerun
2. heavy retry/resume path
3. first import

## Recommended Test Input

Prefer a realistic export that can exercise rerun trust rather than only a tiny happy-path fixture.

If using a lightweight fixture-backed path for orientation, record that clearly and note that heavy retry/resume confidence remains partially unvalidated.

Suggested options:

- a known large ChatGPT export folder with multiple shards
- a previously used manual-test root where rerun reuse can be observed clearly
- a fixture-backed vendor folder only if the goal is limited to navigation and handoff validation

## What We Are Testing For

This pass is mainly checking:

- whether rerun reuse looks intentional and trustworthy
- whether retry versus resume wording is understandable at a glance
- whether the import screen feels active during heavy work
- whether archive and dataset handoff remains clear after rerun-aware import behavior
- whether Find Imports still feels connected to the import that just happened
- whether loaded states remain calm and user-facing rather than operator-heavy

This pass is not mainly about:

- adding new features
- exercising governance or review workflows
- broad parser edge-case hunting
- expanding the assistant surface

## Screen Script

### 1. Imports

Do:

1. launch Electron fresh
2. confirm the output root is the one we intend to test
3. choose the vendor through the normal vendor-first flow
4. select the file or folder
5. run Export Check
6. run Import
7. if the import completes, rerun the same unchanged source path once
8. if a heavy retry path is available, observe at least one retry or resume cycle

Look for:

- is the primary action obvious at each step?
- does Export Check feel decisive enough?
- does progress wording distinguish:
  - preparing files
  - reusing completed files
  - retrying failed files
  - resuming interrupted shards
  - writing outputs
- does rerun reuse feel like a successful optimization instead of a silent skip?
- does long-running heavy work still feel active even when no exact ETA is shown?

Record:

- exact path tested
- export shape detected
- result wording shown by Export Check
- import result summary
- rerun wording shown for unchanged files
- any retry/resume wording that felt strong or weak
- whether progress counted import-ready files honestly

### 2. Readable Archive

Do:

1. open Readable Archive from the normal next-step path if available
2. confirm it is using the expected output root
3. select a real archive slice
4. wait for the markdown body and related context to load
5. review any attachment or source-reference cues
6. use the archive-to-dataset handoff

Look for:

- does the screen load truthfully against the fresh run or rerun?
- does it still feel like a review workspace instead of a technical report?
- is the next action obvious from the selected file view?
- does anything about the archive view suggest stale outputs after rerun?

Record:

- counts shown for slices or topic groups
- whether selected markdown body lagged noticeably
- whether the right pane felt guided or dense
- whether archive state still felt trustworthy after rerun-aware import behavior

### 3. Datasets

Do:

1. land in Datasets from the archive handoff if possible
2. confirm the dataset view matches the archive context
3. inspect preview alignment messaging
4. inspect trust and redaction summary language
5. verify whether historical-versus-latest scope is understandable

Look for:

- is the archive-selected context still obvious?
- can we tell exactly what dataset context we are viewing?
- does the screen stay understandable without study?
- does rerun-aware workflow create any stale-feeling ambiguity here?

Record:

- whether archive-selected context carried through clearly
- whether preview alignment was immediately understandable
- any places where wording was too technical or too dense

### 4. Find Imports

Do:

1. open Find Imports / retrieval using the fresh run
2. search or filter against the new import
3. open the selected import context
4. confirm results load and feel connected to the run just performed

Look for:

- does it load promptly and truthfully?
- does it feel like guided investigation rather than an operator report?
- can we tell whether the selected result came from the expected rerun or current run?

Record:

- whether the fresh run appeared immediately
- whether the selected import area stayed understandable
- any loading ambiguity or orientation loss

### 5. Imports Return Check

Do:

1. navigate back to Imports after the full path above
2. inspect the top status area and import form
3. compare the visible top-of-screen state with the successful run context lower on the page

Look for:

- does Imports still feel anchored to the latest successful run?
- does the top status card preserve success context?
- does returning to Imports weaken trust after a rerun or retry path?

Record:

- whether the successful-run feeling remained strong or weakened
- whether this is still a trust issue or now mostly a polish issue

## Failure Triggers

Open Diagnostics only if one of these happens:

- import result is unclear or contradictory
- archive or dataset handoff breaks
- a screen shows stale or obviously wrong root/run context
- retry/resume behavior cannot be understood from the normal UI
- loading behavior undermines trust badly enough that we need evidence

If Diagnostics is opened, record why it became necessary.

## Fast Scoring

Give each area a quick score from `1` to `5`:

- Imports clarity
- rerun trust
- retry/resume trust
- Archive usability
- Dataset clarity
- Find Imports usability
- cross-screen continuity
- overall steadiness

Use:

- `5` = clear and confidence-building
- `3` = workable but noticeably awkward
- `1` = confusing or trust-reducing

## What Would Count As A Good Result Today

Today's pass is a success if:

- the ordinary path works without needing advanced tools
- rerun reuse is visible and feels intentional
- retry versus resume wording feels honest enough to trust
- Imports -> Archive -> Datasets -> Find Imports still feels connected
- remaining issues are mostly polish or copy issues rather than flow-break issues

## Output Note

After the walkthrough, write the next record in the same style as prior notes and separate findings into:

- what worked smoothly
- what still felt confusing
- copy issues
- layout and hierarchy issues
- trust or missing-state issues
- best next simplification slices
