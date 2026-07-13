# SkillSpring Quantum External Review — Refined Recommendations

This document converts the 12 July 2026 external improvement review into recommendations that match the current repository and the private-beta target.

The original review was useful as an outside engineering input, but parts of it described an older repository state and treated speculative concerns as confirmed defects. This refinement separates verified direction, concerns requiring inspection, beta observations, and deferred work.

## Decision standard

A recommendation enters the active roadmap only when it meets one of these tests:

1. it prevents likely data loss, corruption, privacy failure, or unrecoverable ordinary-flow crashes
2. it is required for another person to install, launch, import, find outputs, or provide usable diagnostics
3. repeated outside-user evidence shows that the current behaviour blocks understanding or value

A plausible concern without current evidence belongs in verification or the beta evidence backlog.

## Verify before beta

### Status update: 13 July 2026

- item 1 is confirmed and addressed: delimiter-joined topic-segment identity paths were consolidated into one structured browser-safe helper with regression coverage
- item 2 is confirmed and addressed for authoritative review flows: review-queue and promotion paths now quarantine malformed JSONL with diagnostics, while manual review decisions block when the authoritative queue is malformed
- item 4 is partially addressed as part of items 1 and 2 through shared identity and shared JSONL recovery helpers
- item 3 is now addressed for authoritative text-file state: shared writes use same-directory atomic replacement and have regression coverage for replacement behavior

### 1. Canonical record identity

Inspect promotion, review queue, and rejection paths for delimiter-joined composite keys.

Risk if confirmed:

- two distinct records can produce the same textual identity when user-controlled fields contain the delimiter
- promotion or review decisions can be applied inconsistently across duplicated implementations

Preferred correction:

- define one canonical structured identity helper
- serialize an explicit object with stable field names and order
- hash the canonical form only when a fixed-length key is useful
- add tests containing delimiter text, Unicode, multiline content, and near-duplicate ranges

Do not call this a cryptographic hash collision unless hashing is actually involved.

### 2. Recoverable JSONL parsing

Inspect every JSONL reader used for authoritative review, promotion, datasets, and tier records.

Unsafe outcomes include:

- one malformed line crashes the entire operation without recovery evidence
- malformed lines are skipped with only console output
- the operation is reported as successful despite missing records

Preferred correction:

- retain source path and line number
- quarantine the malformed raw line
- emit an explicit diagnostic artifact
- mark the result partial or failed according to the output contract
- continue only where partial processing is safe and visible
- add malformed-line regression tests

### 3. Atomic authoritative writes

Identify manifests, ledgers, review decisions, and tier records whose partial write would damage a later run.

Preferred correction:

- write to a unique temporary file in the same directory
- flush and close successfully
- replace the destination through a platform-tested rename strategy
- clean up abandoned temporary files
- add interruption and replacement tests for the most important state files

Do not add atomic-write machinery to every regenerable output without a clear benefit.

### 4. Shared helpers

Where identity, JSONL parsing, or rejection-count logic is duplicated, consolidate it only after confirming the implementations are intended to share identical semantics.

The goal is not abstraction for its own sake. The goal is to stop integrity fixes drifting between related workflows.

## Pre-beta readiness

### Packaged application

The major missing product layer is a reproducible Windows beta build.

Required:

- one documented packaging command
- launch outside the repository
- no hardcoded development paths
- stable settings and log locations
- visible application version
- diagnostics that can be shared without automatically exposing source conversations
- deterministic operation without Ollama

### Focused first-run guidance

Use a small tester guide and stable walkthrough before building a large onboarding system.

The guide should cover:

- supported export shapes
- how to export data from the tested vendor
- choosing an output root
- approximate expectations for large imports
- rerun reuse
- safe stopping
- where archive and dataset outputs appear
- known limitations
- privacy and consent boundaries

### Diagnostics with measured values

Where health checks currently expose only booleans, include the measured value, threshold, and short explanation when that information helps diagnose a failure.

This is useful hardening, but it is secondary to packaging and confirmed integrity defects.

## Observe during private beta

The following concerns should be measured through real use before becoming implementation projects:

- whether long import duration is unacceptable
- whether users need estimated duration ranges
- whether the interface contains too much explanation
- whether archive and dataset terminology is confusing
- whether users need dry-run previews
- whether advanced promotion, purge restore, or folder merge controls matter
- whether users want cross-platform support
- whether large real exports require streaming JSON
- whether an embedding cache grows enough to create instability
- whether professional users need different retrieval evidence from general users

Collect the task the user was trying to complete, where they stopped, what they expected, and whether live help was needed.

## Optional local AI boundary

The local assistant is an enhancement, not the first beta dependency.

Appropriate near-term AI work:

- detect whether the configured local runtime is available
- explain that AI is optional
- report compatible installed models
- keep unsupported requests inside deterministic boundaries
- provide official setup guidance
- allow the deterministic app to work normally when AI is disabled

Do not prioritise before core beta:

- app-managed Ollama installation
- remote install scripts executed by the app
- rigid RAM-to-model tables without benchmarks
- universal CPU-only settings
- fixed thread counts
- unloading models after every request
- making semantic processing part of canonical import completion

Any future capability scanner should report measured facts first and label model recommendations as tested guidance, not hardware truth.

## Deferred

Keep these outside the private-beta path unless evidence changes:

- Rust core rewrite
- Tauri migration
- full Rust UI
- native inference replacement for Ollama
- broad vendor expansion
- marketed generic document ingestion
- governance configuration as an ordinary-user workflow
- enterprise or procurement-specific features

Performance rewrites require profiling. Language choice alone does not establish a 10x or 20x gain.

## Professional-context testing

A procurement-background tester is valuable because formal work language can expose weaknesses in:

- topic grouping
- project continuity
- source-context preservation
- retrieval evidence
- archive-to-dataset handoff
- privacy explanation

Do not use confidential employer or supplier information without clear authorisation.

The session should test whether the general product works under professional language. It should not silently redefine the MVP as procurement software.

## Recommended execution order

1. inspect the four narrow integrity concerns
2. fix confirmed defects and add tests
3. complete the real Electron walkthrough
4. package the Windows beta
5. create the tester guide, privacy note, known limitations, and feedback template
6. run a clean internal rehearsal
7. invite a small staged cohort by 15 August 2026
8. build the next roadmap from repeated observations

## Outcome labels for beta findings

Use one of these labels for every finding:

- **P0 blocker** — data integrity, privacy, launch, or unrecoverable ordinary-flow failure
- **P1 readiness** — prevents a tester completing the core flow independently
- **P2 observed friction** — tester completes the flow but with confusion or avoidable help
- **P3 request** — desired capability that is not required for the current promise
- **Not reproducible**
- **Expected limitation**

This keeps one tester's preference from becoming an emergency feature and makes repeated patterns visible.
