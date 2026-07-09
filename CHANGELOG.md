# Changelog

This changelog tracks meaningful product and workflow checkpoints for SkillSpring Quantum.

It is intentionally lightweight.

- it focuses on user-visible or release-relevant changes
- it does not try to list every internal edit
- it is meant to complement the deeper roadmap and walkthrough notes under `docs/`

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
