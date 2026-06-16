# SkillSpring Quantum MVP Direction

This document is the working product-direction reference for SkillSpring Quantum.

Use it to keep implementation focused on the smallest version of Quantum that general users could realistically use and prefer over stitching together multiple existing tools.

## Product test

Before adding meaningful new work, ask:

- Does this make Quantum more usable for a general local user?
- Does this strengthen the core value of "import once, get both readable archives and anonymized datasets"?
- Does this help Quantum stand apart from a generic file organizer, note app, or standalone parser?
- Is this more important than finishing the intake, trust, archive, and dataset flows already promised?

If the answer is no, defer it.

## MVP positioning

SkillSpring Quantum should be:

- local-first
- privacy-aware
- able to ingest mixed source material
- able to produce intact human-readable archives
- able to produce anonymized dataset artifacts from the same import flow
- traceable through manifests, diagnostics, and import results

Quantum should not try to compete by being a generic note-taking app, a general-purpose document manager, or an overbuilt governance system before core intake and output usability are complete.

## MVP promise

A general user should be able to:

1. Add a file or folder from their machine.
2. Let Quantum detect what it can process.
3. Run the import locally.
4. See what succeeded, failed, or was archived-only.
5. Browse readable archived outputs.
6. Browse anonymized dataset outputs.
7. Trust that privacy-sensitive details were handled in a deterministic, inspectable way.

If any of those steps are weak or confusing, that is usually higher priority than adding adjacent features.

## Priority order

### 1. Finish the intake promise

This is the highest-priority MVP work.

Quantum must reliably handle the file types it claims to support and clearly report what it did with each one.

Priority items:

- robust PDF text extraction
- mixed-folder import with supported and unsupported file handling
- source-level manifests for imported, skipped, archived-only, and failed files
- stable import handling for ChatGPT exports, generic JSON, text, markdown, and similar local files

Why this matters:

Without this, users are better served by combining a file picker, a parser, and a separate archive workflow themselves.

### 2. Make the import experience trustworthy

Users need to understand what happened after clicking import.

Priority items:

- import history screen
- per-file import results in plain English
- clear failure states and recovery guidance
- "what was created" summaries with links to archive and dataset outputs

Why this matters:

This is what turns Quantum from a developer-facing pipeline wrapper into a usable desktop product.

### 3. Broaden parser coverage beyond ChatGPT

Quantum becomes more defensible when it handles mixed AI and non-AI source material in one local workflow.

Priority items:

- Claude export parser
- Gemini export parser
- generic threaded JSON adapters where possible
- stronger generic document classification during intake

Why this matters:

If Quantum only handles one export format, users will compare it to narrower tools that already do that job simply.

### 4. Make the archived output genuinely useful

The readable archive should be something users return to, not just an output artifact.

Priority items:

- archive search
- filter by source type, date, topic, and signal
- open archived files from the UI
- better preview for generic documents and PDFs

Why this matters:

If the archive is genuinely useful, Quantum starts behaving like a durable knowledge tool rather than just a converter.

### 5. Tighten the anonymized dataset workflow

This is one of Quantum's strongest differentiators.

Priority items:

- dataset browser improvements
- direct dataset export controls
- explain what was redacted and why
- import options for archive-only versus archive-plus-dataset behavior where appropriate

Why this matters:

Many tools can organize files. Fewer can produce reusable, privacy-aware datasets locally in the same workflow.

### 6. Defer advanced workflow controls until the above are solid

These matter, but they are not the first MVP priority for general users.

Examples:

- deeper review queue workflows
- richer promotion controls
- merge and restore polishing beyond core usability
- governance expansion that outruns visible user value

Why this matters:

These features become valuable after the main product loop is already reliable and understandable.

## Near-term build order

Use this as the practical sequence unless a clear blocking dependency changes it:

1. PDF extraction plus mixed-folder import completion
2. Import inspection, import history, and import result visibility
3. Claude and Gemini parser support
4. Archive search and open actions
5. Dataset browser and export usability

## Anti-drift rules

Avoid spending the next major blocks of work on:

- new governance complexity without direct user-facing import/archive/dataset benefit
- cosmetic screens that do not improve the intake-to-output loop
- automation around curation/promotion before general users can easily import and browse results
- abstractions for future federation/orchestration before the local product loop is strong
- adding many edge-case formats before the core supported formats are complete and trustworthy

## Definition of MVP progress

Quantum is moving in the right direction when:

- a non-technical user can browse to a folder and run an import
- the app clearly explains what it found and what it produced
- archives are readable and easy to inspect
- anonymized datasets are visible and understandable
- failed and partial imports are explainable without reading code or raw logs

## Current implementation implication

When choosing the next task, prefer work that improves one of these areas:

- intake completeness
- import trust and visibility
- parser coverage
- archive usability
- dataset usability

If a task does not clearly improve one of those, it is probably not the next MVP task.
