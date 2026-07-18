# Changelog

This changelog tracks meaningful product and workflow checkpoints for SkillSpring Quantum.

It is intentionally lightweight.

- it focuses on user-visible or release-relevant changes
- it does not try to list every internal edit
- it is meant to complement the deeper roadmap and walkthrough notes under `docs/`

## 2026-07-18

### Added

- export-guide documentation under `docs/user/exports/` for ChatGPT, Claude, Gemini, Microsoft Copilot, and Grok, with verification-pending screenshot placeholders
- a first-run output-root confirmation flow so packaged installs now ask the user to choose a real local workspace before the main workflow begins
- writable packaged governance workspace seeding under user-owned app data for packaged builds
- natural-language drafting support for `redaction-rules.json`
- a Windows packaging icon asset wired into the current installer/app build

### Changed

- refactored the main conversation pipeline into focused helper modules for streaming ChatGPT imports, conversation segment processing, and pipeline input handling
- clarified archive-screen guidance in the Beta Guide and User Guide so topic groups, dates, and readable slices are explained as memory anchors before dataset review
- documented large-workspace screen-loading expectations so beta testers know `Find Imports` is the quickest immediate follow-up, `Readable Archive` can take a few minutes at very high slice counts, and `Datasets` currently follows archive readiness
- tightened Readable Archive overflow handling so long topic labels and markdown preview panes behave better in the desktop UI
- expanded the technical pipeline documentation and removed the completed temporary pipeline refactor implementation note
- README and beta-facing guidance now make it explicit that `Ask Quantum` is still experimental and not the primary or fully reliable evaluator path
- README, User Guide, Beta Guide, first-run guide, dashboard copy, and primary navigation now use the canonical beta workflow: `Imports -> Readable Archive -> Datasets -> Find Imports`
- beta version metadata now identifies the submission candidate as `0.1.0-beta.1`

### Fixed

- restored legacy ChatGPT import streaming on the modern intake path
- packaged diagnostics actions now respect the selected output root instead of hardcoding `organized_output`
- packaged governance and runtime rule loading now support live filesystem-backed rule files instead of relying only on static bundled JSON imports
- runtime redaction and private-review classification now respect `redaction-rules.json`, including custom hard-private phrases drafted through governance
- import reuse validation now invalidates preserved output when the import-affecting governance rule snapshot changes, so reruns no longer silently skip updated rule-driven output generation
- previously broken README, User Guide, and Beta Guide export-guide links now resolve

### Known follow-up

- packaged diagnostics artifacts can exist on disk before the current UI reliably opens or summarizes every advanced diagnostics output
- vendor screenshots still need to be captured from the current live interfaces before private-beta distribution
- the streaming-resume finalisation safety issue remains a focused release-blocking engineering task unless separately fixed and tested

### Validated

- the Windows NSIS installer was rebuilt successfully on Saturday, July 18, 2026
- live governance filesystem overrides were verified to affect runtime rule loading
- natural-language redaction drafting was verified to generate structured rule JSON for quoted sensitive phrases

## 2026-07-15

### Changed

- prepared and validated the Windows Electron packaging pipeline for SkillSpring Quantum
- packaged child-process execution now works cleanly from unpacked and installed builds instead of assuming a dev-only working directory
- the packaged app now preserves the same output-root continuity, reuse behavior, archive loading, dataset loading, and activity-history context as the dev build

### Fixed

- a packaged-only import failure where child processes tried to launch from an invalid packaged working directory

### Validated

- a full packaged-app walkthrough completed successfully against a fresh output root with a newly downloaded free-account ChatGPT export
- an installed-build rerun against the same output root correctly recognized an already valid workspace and reused prior outputs instead of reprocessing them

## 2026-07-12

### Added

- comprehensive README rewrite reflecting the actual July 2026 product shape and capabilities
- new `docs/NEXT_FIVE_SLICES_2026-07-12.md` with updated priority sequence after full-repo verification
- new `docs/MANUAL_WALKTHROUGH_2026-07-12.md` capturing the unchanged-rerun trust result on a real large ChatGPT export
- new `docs/MANUAL_TEST_SCRIPT_2026-07-12.md` for the full Slice 3 Electron retest across Imports, import history, archive, datasets, retrieval, and return-to-Imports continuity
- `manual_test_output_*/` pattern to `.gitignore` to cover dated manual test directories

### Changed

- README now accurately documents the settings output root persistence, archive filtering, attachment visibility, auto-select behaviors, and review queue empty states that were already implemented in the July 9 commit
- next-slice priority order updated to reflect that settings, filtering, attachment surfacing, auto-select, and review queue states are verified complete
- priority shifted forward from "repair the shell" to "prepare for outside beta" framing
- manual retest guidance now reflects that a full large ChatGPT import completed in roughly 90 minutes and an unchanged rerun completed in under 30 seconds through honest reuse
- Imports now makes output-root scope more explicit so already-imported reuse is easier to understand when users switch local workspaces
- active imports can now be force-stopped from the Imports screen instead of only waiting for completion or failure

## 2026-07-09

### Added

- focused manual-retest docs for the July 9 import-hardening pass
- a new manual walkthrough record for rerun and resume trust findings
- a repo-level changelog for checkpoint-oriented release notes

### Changed

- hardened import reuse validation so reruns no longer trust path, size, and timestamp alone
- expanded import progress wording to distinguish preparing, reuse, retry, resume, and output-writing states
- widened the default regression gate so `npm run test:ci` now covers the release-relevant import, smoke, retrieval, pipeline, assistant, and governance suites
- improved import segment labeling and archive-reader compatibility uncovered during the broader CI pass
- updated the Imports screen so an active rerun can displace stale finished-run framing with current in-progress context sooner

### Fixed

- the Windows npm launcher issue that blocked plain `npm run ...` usage
- topic-drift segmentation regressions uncovered by the broader pipeline pass
- markdown archive CLI behavior for requested-file loading and content return
- classifier summary labels that had drifted into awkward subject phrases instead of readable user-facing labels

## 2026-07-08

### Changed

- improved heavy ChatGPT reruns so already imported shard files can be reused quickly
- allowed recent import history to recover reusable-success state when a dedicated ledger is missing
- deepened interrupted streaming-shard resume checkpoints to the conversation level
- ordered failed-shard retries more deliberately so lighter retries can run before the heaviest retry candidate
- aligned supported-file progress counts more closely with the files that are actually import-ready

## 2026-07-05

### Changed

- landed the first deterministic-first `Ask Quantum` command bridge milestone
- added stronger retrieval evidence cues and clearer next-step labels
- continued reducing operator-heavy default UI density across the main workflow screens
