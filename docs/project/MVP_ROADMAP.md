# MVP Roadmap

## Audience

This document is for contributors, maintainers, and beta planning.

## Private beta target

**Target:** begin a small private beta by **August 15, 2026**.

## Product promise being tested

> Import major AI conversation exports, turn them into readable local archives and privacy-aware datasets, and make the results understandable and searchable without uploading the source material to a third-party service.

The beta is validating whether another person can:

1. install or launch the app
2. choose the correct export
3. understand the preflight result
4. complete or safely stop an import
5. review the archive
6. review the dataset output
7. search prior imported material

## Gate status

- Gate 1: Complete
- Gate 2: Complete
- Gate 3: Complete
- Gate 4: Active
- Gate 5: Pending
- Gate 6: Planned

## Gate 1: Data integrity

**Status:** complete

Completed outcomes:

- canonical topic-segment identity
- malformed JSONL recovery with explicit diagnostics
- authoritative write hardening through atomic replacement
- regression coverage for delimiter collisions and atomic writes

## Gate 2: Real Electron walkthrough

**Status:** complete

Completed outcomes:

- fresh output-root import walkthrough
- archive review
- dataset review
- cross-screen activity continuity
- no major blocker in the July 15, 2026 walkthrough

## Gate 3: Reproducible private-beta build

**Status:** complete

Completed outcomes:

- repeatable Windows packaging path is in place
- packaged app validation has been completed for the current beta path
- optional local AI is not required for the deterministic workflow

## Gate 4: First-run and tester support

**Status:** active

Current focus:

- product-first README and docs cleanup
- beta guide and known limitations
- clearer audience split across user, project, and technical docs
- supported-export guidance and diagnostics guidance for testers

Current scheduling note:

- the first general-user walkthrough has been moved to next week so the initial tester session can happen at a better time and produce more representative usability feedback

## Gate 5: Internal release rehearsal

**Status:** pending

Minimum rehearsal:

- clean-machine or clean-user-profile launch where possible
- one ordinary export
- one large export
- one rerun
- one wrong or unsupported source
- one stopped import
- archive, dataset, and retrieval handoff
- diagnostic collection

## Gate 6: Private beta launch

**Status:** planned

Suggested order:

1. one cooperative general-use tester, currently planned for next week
2. one tester with a different vendor or conversation style
3. one more formal professional-context tester after the first support issues are understood

## Current priorities

1. finish the documentation refresh for private beta readiness
2. keep the Windows packaging path reproducible and understandable
3. complete tester-facing support artifacts
4. continue improving activity-history clarity where it helps trust
5. let private beta observation shape non-blocking UX polish
