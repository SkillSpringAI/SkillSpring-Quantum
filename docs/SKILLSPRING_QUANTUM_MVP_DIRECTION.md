# SkillSpring Quantum MVP Direction

This document is the working product-direction reference for SkillSpring Quantum.

Use it to keep implementation focused on the smallest version of Quantum that general users could realistically use and prefer over stitching together multiple existing tools.

## Product test

Before adding meaningful new work, ask:

- Does this make Quantum more usable for a general local user?
- Does this strengthen the core value of "import once, get both readable archives and privacy-aware datasets"?
- Does this help Quantum stand apart from a generic file organizer, note app, or standalone parser?
- Is this more important than finishing the intake, trust, archive, and dataset flows already promised?

If the answer is no, defer it.

## MVP positioning

SkillSpring Quantum should be:

- local-first
- privacy-aware
- focused first on major AI conversation exports
- able to produce intact human-readable archives
- able to produce privacy-aware dataset artifacts from the same import flow
- traceable through manifests, diagnostics, and import results

Quantum should not try to compete first as a generic note-taking app, a general-purpose document manager, or a broad local ingestion engine before the core export-to-archive-to-dataset loop is complete.

## MVP promise

A general user should be able to:

1. Add a major AI export file or export folder from their machine.
2. Let Quantum detect the vendor package and what it can process.
3. Run the import locally.
4. See what succeeded, failed, or was archived-only.
5. Browse readable archived outputs.
6. Browse privacy-aware dataset outputs.
7. Trust that privacy-sensitive details were handled in a deterministic, inspectable way.

If any of those steps are weak or confusing, that is usually higher priority than adding adjacent features.

## Priority order

### 1. Finish the AI export MVP intake promise

This is the highest-priority MVP work.

Quantum must reliably handle the major AI export sources it claims to support and clearly report what it did with each one.

Priority items:

- stable first-class import handling for ChatGPT and Grok export packages
- honest compatibility fallback handling for Claude and Gemini-shaped conversation JSON
- honest compatibility fallback handling for proven Microsoft Copilot activity CSV exports
- vendor detection and routing that is easy to understand in the app
- attachment preservation where vendor exports include uploaded files or blob references
- source-level manifests for imported, skipped, archived-only, and failed files
- graceful handling of partial or messy export packages

Why this matters:

Without this, users are better served by combining export downloads, ad hoc scripts, and separate archive workflows themselves.

### 2. Make the import experience trustworthy

Users need to understand what happened after clicking import.

Priority items:

- import history screen
- full-history investigation search for prior imports
- per-file import results in plain English
- clear failure states and recovery guidance
- "what was created" summaries with links to archive and dataset outputs

Why this matters:

This is what turns Quantum from a developer-facing pipeline wrapper into a usable desktop product.

### 3. Strengthen vendor coverage inside the MVP boundary

Quantum becomes more defensible when it handles the most recognizable AI vendors well before it expands into a parser zoo.

Priority items:

- official export adapters where vendor packages meaningfully differ
- generic threaded JSON recovery where that improves Claude or Gemini fallback intake
- keep Copilot support narrowly scoped to the proven activity CSV shape until a stronger official export path exists
- preserve referenced attachments and uploaded files when vendor exports include them
- stronger vendor package inspection and result labeling

Why this matters:

If Quantum only handles one export format, users will compare it to narrower tools that already do that job simply. If it tries to handle every format too early, the product becomes harder to explain and trust.

### 4. Make the archived output genuinely useful

The readable archive should be something users return to, not just an output artifact.

Priority items:

- archive search
- filter by source type, date, topic, and signal
- open archived files from the UI
- better preview for imported AI-export attachments and preserved source references

Why this matters:

If the archive is genuinely useful, Quantum starts behaving like a durable knowledge tool rather than just a converter.

### 5. Tighten the privacy-aware dataset workflow

This is one of Quantum's strongest differentiators.

Priority items:

- dataset browser improvements
- direct dataset export controls
- explain what was redacted and why
- import options for archive-only versus archive-plus-dataset behavior where appropriate

Why this matters:

Many tools can organize files. Fewer can produce reusable, privacy-aware datasets locally in the same workflow.

### 6. Defer adjacent ingestion and advanced workflow controls until the above are solid

These matter, but they are not the first MVP priority for general users.

Examples:

- generic JSON, PDF, text, CSV, log, and mixed-document intake as a marketed capability
- Kimi, DeepSeek, Perplexity, and other secondary AI vendors
- enterprise conversation systems and support-platform imports
- deeper review queue workflows
- richer promotion controls
- merge and restore polishing beyond core usability
- governance expansion that outruns visible user value

Why this matters:

These features become valuable after the main product loop is already reliable and understandable.

## Near-term build order

Use this as the practical sequence unless a clear blocking dependency changes it:

1. Import inspection, import history, and import result visibility for major AI exports
2. Full-history investigation search and retrieval-ready visibility across imported runs
3. Support-tier labeling and vendor-package hardening for ChatGPT, Grok, and current fallback vendors
4. Attachment preservation and preview usability for vendor exports
5. Archive search and open actions
6. Defer generic document and broader ingestion work until the AI export loop is clearly strong

## Anti-drift rules

Avoid spending the next major blocks of work on:

- new governance complexity without direct user-facing import/archive/dataset benefit
- cosmetic screens that do not improve the intake-to-output loop
- automation around curation/promotion before general users can easily import and browse results
- abstractions for future federation/orchestration before the local product loop is strong
- adding many edge-case formats before the major AI export sources are complete and trustworthy

## Definition of MVP progress

Quantum is moving in the right direction when:

- a non-technical user can import a major AI export without touching scripts
- the app clearly explains what it found and what it produced
- archives are readable and easy to inspect
- preserved attachments and uploaded files remain traceable when the source export includes them
- privacy-aware datasets are visible and understandable
- failed and partial imports are explainable without reading code or raw logs

## Current implementation implication

When choosing the next task, prefer work that improves one of these areas:

- major-vendor intake completeness
- import trust and visibility
- parser quality inside the MVP vendor set
- archive usability
- dataset usability

If a task does not clearly improve one of those, it is probably not the next MVP task.
