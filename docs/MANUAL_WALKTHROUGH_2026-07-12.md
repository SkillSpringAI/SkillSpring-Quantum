# Manual Walkthrough - 2026-07-12

This record captures the next focused Electron retest after the July 12 progress-trust follow-through.

## Path Tested

- screen flow reached: Imports -> unchanged rerun observation
- vendor/export shape: large ChatGPT folder export
- scenario type: unchanged rerun of a source path that had already been fully imported and sorted
- observed behavior: import completed in under 30 seconds because Quantum recognized the existing imported state and did not perform duplicate parsing work
- additional walkthrough branch: March 13 ChatGPT html-heavy dump was tried again first and still failed through the heavyweight `chat.html` path
- output-root note: switching to a different output root removed the earlier already-imported acknowledgement until the output root was changed back to the original processed location

## What Worked Smoothly

- the rerun completed quickly because the export had already been imported and organized successfully
- the quick completion felt like a legitimate reuse success rather than an unexplained skip
- the result increased confidence that Quantum is not silently creating duplicate parses on unchanged reruns
- this directly improves one of the core trust questions from the earlier hardening pass: whether rerun reuse is real, safe, and visible enough to believe
- the archive handoff still looked grounded after the rerun and the selected-file path remained easy to follow
- the dataset screen initially felt heavy, but the visible run scope, archive-linked handoff, review-state framing, and privacy cues turned out to be necessary context rather than accidental clutter

## What Improved Since The Earlier Rerun Pass

- the older trust concern was that it was difficult to tell whether reruns were doing smart reuse or quietly duplicating work
- this pass provided a much clearer product signal: unchanged reruns can now finish fast when the output already exists
- the user-facing outcome felt honest enough to distinguish "already preserved and reused" from "processing everything all over again"

## What Still Needs Follow-Through

- this confirms the unchanged-rerun case much more strongly than before, but it does not replace the heavy retry or interrupted-shard trust check
- the remaining important trust question is still whether long-running heavy retries feel equally honest when the import cannot finish in seconds
- the product should continue toward clearer guidance for very large imports if they remain closer to the roughly 90-minute baseline observed in the full-import run
- a second March 13 ChatGPT export retest exposed a different package shape: a huge top-level `chat.html` bundle with attachment files and UUID folders instead of the newer shard-first `export_manifest.json` layout
- that older package still looks like a valid ChatGPT export, but it likely exercises the heavyweight HTML import path rather than the lighter shard-first path
- this means the manual trust story should track at least two ChatGPT package variants separately: legacy html-heavy bundles and newer sharded bundles
- the Imports screen needs an explicit force-stop control so a user can stop a path that is clearly heading into the wrong heavy import lane instead of waiting for failure
- the product should explain more plainly that import history and already-imported reuse are scoped to the currently selected output root, not globally across every local Quantum folder

## Trust Or Missing-State Notes

- the key trust gain here is not raw speed by itself
- the key gain is clarity that Quantum is not duplicating parse work on an unchanged rerun
- that matters because a sub-30-second rerun is believable only if the user can also trust that the existing archive and dataset outputs were reused safely rather than recreated ambiguously
- this also strengthens the case for versioned vendor fixtures, because one generic "ChatGPT export" sample is no longer enough to represent both the March html-heavy package and the newer sharded package reliably
- the output-root switch created a believable but important moment of confusion: Quantum looked like it had forgotten prior work, when the real issue was that the user had moved into a different local workspace with no matching import history yet
- that means output-root scope is not only technical behavior. It is a trust behavior and needs visible explanation on the Imports screen
- the dataset screen did not ultimately feel overbuilt in this pass. It felt dense at first glance, but most of the density was doing real explanatory work once the archive-to-dataset handoff was followed normally

## Fast Scoring

- Imports clarity: 4/5
- unchanged rerun trust: 5/5
- duplicate-work confidence: 5/5
- output-root reuse clarity: 3/5
- archive handoff clarity: 4/5
- dataset usefulness versus density: 4/5
- heavy retry/resume trust: not retested in this short pass
- overall steadiness for unchanged reruns: 5/5

## Bottom Line

This was a meaningful trust win.

An unchanged rerun of the already imported large ChatGPT export completed in under 30 seconds, and the outcome felt honest rather than suspicious. The most important part is not only that it was fast. It is that the rerun now appears to behave like safe reuse instead of ambiguous duplicate parsing.

That gives Quantum a much stronger story for unchanged reruns:

- big first import can be long
- unchanged rerun can be very fast
- the system is behaving more like a trustworthy organizer than a black box repeating hidden work
