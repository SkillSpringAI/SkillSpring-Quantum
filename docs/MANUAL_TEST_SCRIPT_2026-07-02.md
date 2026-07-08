# Manual Test Script - 2026-07-02

This script is the focused walkthrough for today's Electron manual test.

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

- does the ordinary user flow feel steady, trustworthy, and easy to follow after a successful import?

Use the same stable walkthrough path now reinforced in the UI:

- Imports
- Readable Archive
- Datasets
- Find Imports

Treat that as the reusable baseline for:

- internal manual validation
- outside beta onboarding
- a future short tutorial video

## Primary Path

Run this screen order:

1. Imports
2. Readable Archive
3. Datasets
4. Find Imports
5. Imports return check

If the first-run overlay or `Open Walkthrough` entry point is visible, follow that same path rather than inventing a new test order.

## Recommended Test Input

Prefer the same realistic fixture-backed path used in the last successful walkthrough unless there is a deliberate reason to change it:

- vendor/export shape: Claude fixture folder at `tests\fixtures\vendor-exports\claude`
- output root: either reuse a clearly named fresh manual-test root or create a new dated one for today's pass

If we change vendor or export shape, record that clearly in the walkthrough notes.

## What We Are Testing For

This pass is mainly checking:

- finished-state trust after import
- cross-screen handoff clarity
- stable orientation while moving through screens
- whether primary actions are obvious without too much reading
- whether loaded states feel truthful and calm
- whether copy still sounds too internal or operator-oriented
- whether scrolling and panel pacing make the app feel heavier than it should
- whether long-running retry states feel active enough to trust
- whether progress wording matches the actual import-ready file count

This pass is not mainly about:

- adding new feature ideas
- testing advanced governance flows
- proving every parser edge case
- exploring deferred future-scope inputs

## Screen Script

### 1. Imports

Do:

1. launch Electron fresh
2. confirm the output root is what we expect
3. choose the vendor through the normal vendor-first flow
4. select the file or folder
5. run Export Check
6. run Import

Look for:

- is the primary action obvious at each step?
- does vendor-first flow reduce file-mode confusion?
- is Export Check result visually decisive enough?
- are ready-now, mismatch, or recovery-path states easy to distinguish quickly?
- after import, does the screen clearly explain what happened and what to do next?
- do any labels still sound internal rather than user-facing?
- are there too many competing buttons before real data exists?

Record:

- exact path tested
- export shape detected
- result wording shown by Export Check
- import result summary
- any confusing labels or layout friction
- whether progress counted import-ready files honestly
- whether rerun reuse of already imported files was immediate enough to feel right

### 2. Readable Archive

Do:

1. open Readable Archive from the normal next-step path if available
2. confirm it is using the expected output root
3. select a real archive slice
4. wait for the markdown body and related context to load
5. review any attachment or source-reference cues
6. use the archive-to-dataset handoff

Look for:

- does the screen load truthfully against the fresh run?
- does it feel like a review workspace instead of a technical report?
- does selected-file content load fast enough to feel trustworthy?
- are attachment or source-trace cues helpful and easy to interpret?
- is the next meaningful action obvious from the selected file view?

Record:

- counts shown for conversations, slices, or topic groups
- whether selected markdown body lagged noticeably
- whether the right pane felt guided or dense
- whether handoff to Datasets felt natural

### 3. Datasets

Do:

1. land in Datasets from the archive handoff if possible
2. confirm the dataset view matches the archive context
3. inspect preview alignment messaging
4. inspect trust and redaction summary language
5. verify whether the screen makes historical-run versus latest-bundle scope understandable

Look for:

- is "Opened From Archive" or equivalent context strong enough to build trust?
- can we tell exactly what dataset context we are viewing?
- is the screen understandable without studying it?
- is the density acceptable once real data loads?
- are secondary explanations staying out of the way enough?

Record:

- whether archive-selected context carried through clearly
- whether preview alignment was immediately understandable
- any places where wording was too technical or too dense

### 4. Find Imports

Do:

1. open Find Imports / retrieval using the fresh run
2. search or filter against the new import
3. open the selected import context
4. confirm results load and feel connected to the run we just performed

Look for:

- does it load promptly and truthfully?
- does it feel like guided investigation or an operator report?
- are filters and selected import details easy to read?
- does the screen become too scroll-heavy once data is loaded?

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
- does the form look like it drifted back to a generic default?
- does returning to Imports make the product feel like it forgot what happened?

Record:

- whether the successful-run feeling remained strong or weakened
- whether this is still the top trust issue from the June 30, 2026 walkthrough

## Failure Triggers

Open Diagnostics only if one of these happens:

- import result is unclear or contradictory
- archive or dataset handoff breaks
- a screen shows stale or obviously wrong root/run context
- fallback or partial-package handling cannot be understood from normal UI
- loading behavior undermines trust badly enough that we need evidence

If Diagnostics is opened, record why it became necessary. That is part of the UX signal.

## Additional heavy-shard check

If the tested export contains large ChatGPT shards:

1. note which shard is the first heavy retry candidate
2. record whether the status text makes it obvious that Quantum is retrying prior failed work rather than redoing the whole folder
3. record whether the user would need an estimated-time hint or elapsed-time hint to stay confident
4. if the app is closed mid-shard and reopened later, check whether the retry feels like it resumes meaningfully deeper into that shard

## Fast Scoring

Give each area a quick score from `1` to `5`:

- Imports clarity
- post-import trust
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
- Imports -> Archive -> Datasets -> Find Imports feels connected
- the fresh run remains visible and believable across screens
- any remaining problems are mostly UX polish issues, not flow-break issues

## Likely Findings To Watch Closely

Based on the June 30, 2026 walkthrough, pay special attention to:

- Imports losing its finished-state feeling after navigation
- the top status area regressing to a generic state
- long-page scrolling weakening orientation
- archive selected-body loading feeling half-ready
- internal wording such as operator-style labels surviving in loaded states

## Output Note

After the walkthrough, write the next record in the same style as the prior notes and separate findings into:

- what worked smoothly
- what still felt confusing
- copy issues
- layout and hierarchy issues
- trust or missing-state issues
- best next simplification slices
