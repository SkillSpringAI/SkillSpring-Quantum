# Beta Documentation & Onboarding Implementation

## Status

Temporary implementation plan.

## Audience

This document is for contributors and maintainers coordinating beta-readiness work.

## Purpose

Consolidate documentation, onboarding improvements, and UX observations identified before and immediately after the private beta.

This file exists to coordinate work and should be removed or archived once the work has been folded into permanent documentation.

## Guiding Principle

Design documentation around the user's journey, not the application's internal architecture.

That means the path from "I have AI conversations" to "I can find them again" should stay clearer than the path through internal subsystems, implementation layers, or maintainer vocabulary.

## Goals

- reduce friction before users launch Quantum
- explain how to obtain conversation exports
- improve the first-run experience
- collect terminology observations from beta
- produce README screenshots from a clean installation

## Current context

As of **Monday, July 20, 2026**:

- the README has already been reshaped into a product-first landing page
- the user, project, technical, and reference docs have been separated more clearly
- the first general-user walkthrough has been pushed to next week so the session can happen at a better time and produce more representative usability feedback
- the Build Week snapshot, demo video, and clean-install screenshot set have been completed
- export guides now exist for all currently supported vendors; live-interface screenshots and verification dates remain follow-up work

The Build Week submission record lives in [`../project/BUILD_WEEK_SUBMISSION.md`](../project/BUILD_WEEK_SUBMISSION.md). This file remains the longer-term onboarding and external-testing follow-up tracker.

## Priority 1 - Documentation Refresh

### README

Objectives:

- keep the product-first opening
- explain what Quantum does
- explain who it is for
- show the ordinary workflow
- keep developer detail out of the landing page
- add screenshots from a clean installation
- link cleanly to the User Guide and vendor export guides

Status:

- [x] Product-first rewrite complete
- [x] Clean-install screenshots selected, privacy-reviewed, and added to README assets
- [x] Export-guide links added

### User Guide

Add or strengthen:

- installing Quantum
- first launch
- import walkthrough
- archive overview
- datasets overview
- search workflow
- common questions

Status:

- [x] Base User Guide created
- [ ] Installation steps updated to match final beta packaging flow
- [ ] First-launch walkthrough expanded
- [ ] Search and retrieval explanation deepened

### FAQ

Add or strengthen:

- what Quantum is for
- local-first behavior
- supported vendors
- archive versus datasets
- whether local AI is required
- current beta limitations

Status:

- [x] Base FAQ created
- [ ] Expand with real beta questions once they appear

## Priority 2 - Export Guides

Create one guide per supported vendor under `docs/user/exports/`.

Supported guides:

- [x] ChatGPT
- [x] Claude
- [x] Gemini
- [x] Grok
- [x] Microsoft Copilot

Each guide should include:

- where the export is located
- desktop versus mobile notes where relevant
- expected export format
- typical wait time
- screenshots where useful
- common problems
- importing into Quantum

Follow-up: verify each guide against the current live vendor interface and add a `last verified` date. Do not treat this as a reason to delay the first ChatGPT-focused beta session.

## Priority 3 - Screenshot Collection

Capture from a clean installation and clean output root.

Current delivery note:

- clean screenshots can be produced from an internal maintainer walkthrough before the first general-user walkthrough
- that is acceptable for near-term presentation needs such as an OpenAI Build Week submission
- screenshots should still avoid development artifacts and should be replaced later if the external walkthrough reveals a clearer or more intuitive product path

Recommended capture order:

1. fresh app launch / first useful landing view
2. imports screen before selecting a file
3. export check result for a valid export
4. import in progress
5. activity history during or immediately after import
6. archive overview
7. archive selected-file view
8. datasets overview
9. search / retrieval results
10. any final dashboard or summary view worth using in README

Before import:

- [ ] Dashboard
- [ ] Imports
- [ ] Export Check

During import:

- [ ] Import progress
- [ ] Activity History

After import:

- [ ] Archive
- [ ] Datasets
- [ ] Search
- [ ] Retrieval

Rules:

- replace any screenshots containing development artifacts
- prefer realistic but non-sensitive example data
- avoid screenshots that expose maintainer-specific paths unless those paths are intentionally part of the guide

### Concrete screenshot checklist

Use this exact order during the internal clean walkthrough so the README and user docs can be assembled without re-running the flow unnecessarily.

Preparation:

- [ ] use a clean install or clean app state
- [ ] use a clean output root
- [ ] use realistic but non-sensitive export data
- [ ] close unrelated windows, debug overlays, and developer tools
- [ ] confirm no maintainer-specific filesystem paths are unnecessarily visible

Capture sequence:

- [x] installer completion - clean installer completion state
- [ ] dashboard or landing - recapture only if it is stronger than the current product gallery
- [ ] imports empty - retain for the User Guide if a first-run step needs it
- [x] export check valid - valid export check result
- [x] import progress - import visibly running
- [x] activity history - activity history showing workflow progression
- [x] readable archive overview - archive screen with useful content loaded
- [ ] archive detail - deferred pending a final privacy review
- [x] datasets overview - datasets screen with a useful loaded state
- [x] find imports overview - searchable imported history
- [ ] `10-dashboard-summary.png` - optional end-state dashboard or summary screen if it is better than the first dashboard shot

Per-shot quality check:

- [ ] primary action or purpose of the screen is obvious
- [ ] no broken states or placeholder-looking empty panels dominate the frame
- [ ] no unnecessary personal information is visible
- [ ] copy is readable at GitHub README scale
- [ ] window size is consistent across the set unless a different crop is intentional

Post-capture:

- [x] choose one screenshot per major workflow for the README
- [x] keep reviewed extras available for the User Guide or Build Week submission
- [ ] replace any screenshot that shows a workflow you no longer want users to imitate
- [ ] note any terminology or UX friction discovered while taking the screenshots

### README / Build Week shortlist

If time is limited, capture these first.

Priority 1:

- [x] export check valid
- [x] readable archive overview
- [x] datasets overview
- [x] find imports overview

Priority 2:

- [x] import progress
- [x] activity history

Recommended usage:

- README hero/product section:
  - dashboard or landing
  - export check
  - archive overview
  - datasets overview

- Build Week submission extras:
  - import progress
  - search / retrieval results

Why this order:

- `dashboard-or-landing` quickly shows that Quantum is a real desktop product
- `export-check-valid` explains the trust step before import
- `archive-overview` shows the most immediately understandable user value
- `datasets-overview` shows the differentiator beyond simple archive browsing
- `import-progress` proves the workflow is real and active
- `search-results` shows the return-to-history use case that makes Quantum sticky

Screenshots to skip unless they are especially strong:

- weak empty states
- screens that expose too much internal terminology
- views that require too much explanation to understand
- duplicate screens that do not add a distinct product story beat

## Priority 4 - Beta Observation List

Observe without redesigning the application during testing.

Look for:

- terminology confusion
- navigation confusion
- import expectations
- first search behavior
- failed searches
- unexpected workflows
- confusion around Archive, Datasets, Import, and Search naming

Instructions:

- record evidence
- prefer notes tied to concrete actions or quotes
- do not redesign during testing
- do not promote one tester's preference into a product change without repeated evidence

## Priority 5 - Candidate Post-Beta Improvements

Potential only. Do not treat these as pre-beta obligations.

Documentation:

- export documentation expansion
- FAQ expansion from real user questions

UI:

- review `Find Import` naming
- consider `Search Imports` or equivalent clearer language
- review terminology for `Archive`, `Datasets`, and `Import`

Support:

- user-controlled support bundles
- local diagnostics packaging
- optional feedback export

Privacy:

- maintain no telemetry
- keep evidence explicit and user-controlled

## Out of Scope

Do not begin until beta evidence supports them.

- telemetry
- automatic analytics
- ranking optimization
- advanced search features
- large UI redesigns

## Success Criteria

Private beta users should be able to:

1. obtain an export
2. install Quantum
3. import successfully
4. find previous conversations
5. understand Archive and Datasets
6. provide useful feedback

## Exit Rule

When the permanent docs cover this work well enough, remove or archive this file rather than letting it become a second long-term source of truth.
