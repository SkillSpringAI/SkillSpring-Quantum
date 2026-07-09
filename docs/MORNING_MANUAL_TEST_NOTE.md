# Morning Manual Test Note

This is the next recommended follow-up task after the July 9, 2026 import-hardening checkpoint.

## Goal

Run a focused Electron desktop retest of the ordinary Quantum workflow and document whether the new rerun, reuse, retry, and resume behavior now feels honest in the real app.

This should be treated as both:

- a manual product validation pass
- a trust-and-UX documentation pass for the current MVP surface

Start from the same ordinary walkthrough path reinforced in the UI:

1. Imports
2. Readable Archive
3. Datasets
4. Find Imports

That same route should continue to act as:

- the first-use in-app walkthrough
- the manual validation spine
- the baseline for future outside beta sessions

## What changed before this retest

The previous implementation slices already landed:

- cache/reuse invalidation is now stronger and tied to richer validation metadata
- progress wording now distinguishes reuse, retry, resume, and output-writing states more clearly
- the default regression gate now runs the release-relevant suites through `npm run test:ci`

That changes the testing question.

The next manual pass is no longer mainly asking whether the screens can load at all.

It is asking whether the hardened import behavior is visible, believable, and easy to follow in the real desktop workflow.

## Run through these screens

1. Imports
2. import history
3. Readable Archive
4. Datasets
5. Find Imports / retrieval
6. diagnostics only when relevant
7. any advanced screen only if ordinary flow breaks trust

## What to test

Use a real or realistic export path and walk the flow as an ordinary user would:

1. pick a vendor
2. choose a file or folder
3. run the export check
4. import
5. review the archive
6. open matching dataset context
7. inspect dataset preview alignment
8. try retrieval / Find Imports from a real run
9. rerun the same unchanged source path
10. if possible, exercise an interrupted or previously failed heavy shard path
11. open diagnostics only if something seems unclear, missing, stale, or fallback-driven

## What to document

Capture notes screen by screen:

- what the user is trying to do
- what the primary action appears to be
- what is immediately clear
- what still feels dense, internal, or overly technical
- where there are too many competing buttons
- where wording still sounds like it is for operators rather than general users
- where alignment, spacing, or hierarchy makes the next action less obvious
- where cross-screen handoff is strong
- where cross-screen handoff is still confusing
- whether the product would benefit more from a first-use walkthrough video, a guided checklist, or simple in-place UI cues

Also capture import-hardening specifics:

- whether rerun reuse is acknowledged quickly enough to feel like a success rather than a mysterious skip
- whether retry versus resume wording is obvious without reading carefully
- whether long-running heavy work feels active enough when exact ETA is unknown
- whether archive and dataset handoff still feel grounded after a rerun path rather than only after a clean first import

## Deliverable

Write a short walkthrough record afterward that includes:

- the path tested
- the vendor/export shape tested
- whether the run was first import, unchanged rerun, interrupted retry, or mixed
- what worked smoothly
- what felt confusing
- what should be simplified next
- which issues are copy issues versus layout/hierarchy issues versus trust or missing-state issues

## Reminder

The point of this pass is not only to prove that the app works.

The point is to document whether Quantum now communicates the hardened import loop honestly:

Inspect -> Import -> Readable Archive -> Datasets -> Find Imports

The next UX round should be based on observed friction in that real loop, not on assumptions.

## Additional import-hardening checks

During the next manual pass, explicitly note:

- whether supported-file progress counts match the user-facing import-ready count
- whether already imported files are acknowledged quickly on rerun
- whether a heavy failed shard shows clear enough retry state to feel trustworthy
- whether interrupted heavy-shard retries resume materially deeper into the shard on the next attempt
- whether elapsed-time wording is enough, or whether an evidence-backed duration range is now the next missing trust cue
