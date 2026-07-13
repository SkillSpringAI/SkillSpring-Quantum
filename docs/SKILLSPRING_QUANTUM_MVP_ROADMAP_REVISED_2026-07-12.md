# SkillSpring Quantum MVP Roadmap

This is the living execution roadmap for the first private beta.

It replaces chronological accumulation with a small number of current gates. Completed work belongs in the reference docs and changelog, not in the active queue.

## Private beta target

**Target:** begin a small private beta no later than **15 August 2026**.

Initial tester lanes:

1. **General-use lane** — family or friends with ordinary AI exports containing casual questions, research, planning, creativity, and personal administration.
2. **Professional-context lane** — a trusted tester such as the maintainer's aunty, whose procurement background can test whether archive structure, retrieval, source context, and dataset explanations remain useful under more formal work patterns.
3. **Mixed-vendor lane** — a tester or controlled dataset covering more than one supported vendor where practical.

Professional testing must not require confidential employer, supplier, procurement, or personally sensitive material. Use personal exports, sanitised samples, or material the tester is clearly authorised to use.

## Product promise being tested

> Import major AI conversation exports, turn them into readable local archives and privacy-aware datasets, and make the results understandable and searchable without uploading the source material to a third-party service.

The beta is not testing whether Quantum can satisfy every future product idea. It is testing whether another person can:

1. install or launch the app
2. choose the correct export
3. understand the preflight result
4. complete or safely stop an import
5. find and read the archive
6. inspect the related dataset output
7. search prior imported material
8. understand failures, partial results, reuse, retry, and recovery

## Current verified baseline

As of 12 July 2026:

- first-class support exists for ChatGPT, Claude, Gemini, Grok, and the proven Microsoft Copilot CSV shape
- the deterministic import -> archive -> dataset -> retrieval workflow is implemented in Electron
- output-root settings persist across the main screens
- archive filters, attachment visibility, archive auto-selection, dataset run synchronisation, and contextual review-queue states are implemented
- large ChatGPT imports have visible progress, retry/resume handling, checkpointing, and reusable completed output
- reuse validation includes stronger source, parser, pipeline, schema, and configuration identity
- a real large ChatGPT export completed in roughly 90 minutes and an unchanged rerun completed in under 30 seconds
- the full TypeScript build, Vite build, and current regression suite have passed at the latest verified checkpoint
- the local assistant remains optional and subordinate to deterministic execution

These items are complete unless a regression or outside-user observation proves otherwise. Do not repeatedly reopen them as roadmap work merely because an older note still lists them.

## Work classification rule

Every proposed task must be placed in one of four buckets.

### A. Pre-beta blocker

Fix before inviting testers when evidence shows:

- possible silent data loss or corruption
- an unrecoverable crash in the ordinary workflow
- incorrect reuse of stale output
- inability to install, launch, import, or locate results
- a security or privacy defect
- misleading status that causes users to make a harmful choice

### B. Pre-beta readiness

Complete before beta when it directly improves:

- reproducible installation or launch
- first-run understanding
- the ordinary import -> archive -> dataset -> retrieval handoff
- tester consent, instructions, feedback capture, or support

### C. Observe during beta

Do not fix pre-emptively when the concern is mainly:

- explanation density
- screen hierarchy or terminology preferences
- advanced-control discoverability
- model recommendations
- optional AI setup friction
- uncommon recovery controls
- performance that is slow but still safe and understandable

Promote these to active work only when observation shows repeated user difficulty or meaningful risk.

### D. Deferred

Keep outside the beta path unless evidence changes:

- new vendor expansion
- marketed general document ingestion
- Rust or Tauri rewrites
- app-managed Ollama installation
- broad governance expansion
- advanced promotion, purge, or folder-merge workflows without demonstrated tester need

## Gate 1: Verify narrow data-integrity concerns

**Target window:** 13-19 July

The external review raised several plausible concerns. Treat them as verification tasks, not confirmed defects.

### Status update: 13 July 2026

- canonical topic-segment identity is now shared through one structured browser-safe helper used by review queue, promotion, manual review decision matching, and the UI bridge
- delimiter-collision regression coverage is in place
- authoritative review and promotion JSONL readers now use recovery with explicit diagnostics and partial-result manifest status when malformed lines are quarantined
- manual review decisions now block on malformed queue JSONL instead of acting on a partial authoritative queue
- authoritative text-file writes now go through same-directory atomic replacement, covering manifests, governance rule writes, fingerprint indexes, and full-file queue rewrites
- atomic-write regression coverage is in place for clean replacement and fresh-file creation
- Gate 1 should not reopen identity-key or JSONL-recovery investigation unless new evidence shows a regression

### Verify

- whether record identity is built from ambiguous delimiter-joined fields in promotion, review, or rejection paths
- whether malformed JSONL can crash a whole operation or be skipped without an explicit partial-result record
- whether authoritative manifests or tier records are written directly without atomic replacement
- whether duplicated identity or JSONL parsing helpers can drift across files

### Fix only when confirmed

- use one canonical structured record identity function
- add regression cases containing delimiter text and near-duplicate records
- quarantine malformed JSONL lines with source and line evidence
- mark affected operations partial or failed instead of silently discarding records
- use atomic writes for authoritative state and manifest files where interruption could corrupt the next run

### Exit criteria

- each concern is marked confirmed, already handled, not applicable, or deferred with evidence
- confirmed defects have regression coverage
- `npm run test:ci`, TypeScript build, and renderer build pass

## Gate 2: Complete the real Electron walkthrough

**Target window:** 13-22 July

Run the ordinary workflow in the actual desktop shell using realistic exports.

### Status update: 13 July 2026

- the Imports screen now resets to a clean draft on fresh app launch while preserving in-session form state during normal navigation
- stale last-run hydration no longer silently overwrites the current import form
- force-stop controls are wired into the main running-import path and leave a visible interrupted-run trail in activity history
- current checked-path or failed-path context now takes precedence over older historical success panels on the Imports screen
- import planning now distinguishes safe reuse from files that need reuse revalidation, and unsupported companion files no longer inflate "new work" counts
- walkthrough guidance has been moved higher on the Imports screen so the main help card appears before deeper historical follow-up panels

Required lanes:

- unchanged rerun using preserved output
- fresh or partially fresh import
- import history
- readable archive
- dataset review
- Find Imports
- return to Imports
- safe stop control

Record observed friction as one of:

- blocker
- readiness issue
- observe in beta
- cosmetic

Do not convert every cosmetic preference into immediate implementation work.

### Exit criteria

- no known ordinary-flow breakage remains
- output-root continuity is understandable
- long imports remain visibly active and honestly described
- reused output reads as intentional success
- archive, dataset, and retrieval handoffs preserve enough context to avoid guesswork

## Gate 3: Produce a reproducible private-beta build

**Target window:** 20-31 July

This is the main missing product layer.

Required work:

- define a repeatable Windows build and packaging command
- ensure the packaged app can launch outside the development workspace
- decide where settings, logs, output roots, and temporary files live
- verify that no development-only paths are required
- include a version identifier visible to testers and in diagnostics
- provide a clean uninstall or removal explanation
- ensure optional local-AI absence does not block the deterministic workflow

Cross-platform packaging is not required for the first private beta unless a chosen tester cannot use Windows.

### Exit criteria

- a tester can receive one build and launch it without cloning the repository or using PowerShell
- failures produce enough local evidence for the maintainer to diagnose them
- the beta build does not require Ollama for the primary workflow

## Gate 4: Prepare first-run and tester support

**Target window:** 25 July-7 August

Keep onboarding small and observational.

Required artifacts:

- one-page tester guide
- supported-export instructions for each beta vendor used
- privacy and consent note
- known limitations
- feedback form or structured feedback template
- instructions for finding diagnostic artifacts without exposing source content unnecessarily
- one stable walkthrough of import -> archive -> dataset -> retrieval

Do not build a large onboarding wizard before observing testers.

### Exit criteria

- testers know what data is safe to use
- testers can begin without a live training call
- feedback distinguishes defects, confusion, missing value, and feature requests

## Gate 5: Internal release rehearsal

**Target window:** 1-7 August

Run the packaged build as though the maintainer were an outside tester.

Minimum rehearsal:

- clean-machine or clean-user-profile launch where possible
- one ordinary general-use export
- one large export
- one rerun
- one intentionally wrong or unsupported source
- one stopped import
- full archive, dataset, and retrieval handoff
- diagnostic collection

### Exit criteria

- no P0 data-integrity or launch defect remains
- all known beta limitations are written down
- the installer/build and tester guide match actual behaviour

## Gate 6: Private beta launch

**Target window:** 8-15 August

Start with a small cohort rather than inviting everyone at once.

Suggested order:

1. one cooperative family or friend tester with an ordinary export
2. one tester with a different conversation style or vendor
3. the procurement-background tester after the first support issues are understood

The professional-context session should test:

- whether topic grouping remains useful under formal work language
- whether source context and archive-to-dataset continuity are credible
- whether retrieval results can be trusted and explained
- whether privacy language is sufficiently clear
- whether outputs are useful without requiring advanced governance knowledge

It should not assume that procurement-specific features belong in the MVP.

## Beta success criteria

The first private beta is successful when:

- at least three outside users complete the primary workflow
- at least two users do so without live step-by-step intervention
- no tester experiences silent source loss or unexplained stale reuse
- failures and partial imports produce understandable recovery evidence
