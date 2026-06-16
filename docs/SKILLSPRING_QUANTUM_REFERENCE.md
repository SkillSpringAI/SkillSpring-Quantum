# SkillSpring Quantum Reference

SkillSpring Quantum is a local-first Electron + Vite + React desktop application and TypeScript processing engine for turning ChatGPT export JSON files into structured, auditable knowledge assets and datasets.

## Implemented Spine

- ChatGPT export parsing and raw conversation normalization
- intent-based topic segmentation that can split a mislabeled or topic-shifting thread into multiple segments
- topic scoring, topic filtering, and canonical topic normalization
- deterministic deduplication and text fingerprinting
- human-readable markdown organized by inferred topic, with relative timestamps beside absolute message timestamps
- archive notification artifacts for human-readable markdown output events
- desktop archive notification panel on Imports and Organized Output screens
- desktop markdown archive browser grouped by inferred topic folder
- governance rule loading, validation, editing, and write reports
- tiered database storage for raw, processed, curated, and private-review records
- anonymized versioned dataset records derived from segmented conversation content
- review queue build and manual approve/reject decision scripts
- curated promotion scripts with manifest snapshots
- batch run, batch diagnostics, and batch delta scripts
- diagnostics preflight and reporting
- purge restore and topic folder merge helpers
- Electron desktop bridge / IPC preload for backend workflows
- React desktop screens for imports, diagnostics, governance, DB browsing, datasets, organized output, review queue, and settings

## Current Build Emphasis

- deterministic processing before smart enrichment
- auditability through manifests, diagnostics, and governance reports
- governance-first design with machine-readable rules
- UI controls mapped to real backend workflows, not placeholder lifecycle actions
- user-visible capability growth should stay ahead of governance/documentation drag
- MVP direction and anti-drift reference: see `docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md`

## Current Gaps / Next Build Targets

- continue replacing demo/static UI states with file-backed or IPC-backed data
- expand desktop bridge coverage when new backend scripts are added
- improve review queue screen states for empty, missing, and failed queue files
- add richer markdown archive filtering/search and file-open actions
- add direct UI controls for curated promotion, purge restore, and folder merge flows
- tighten README command formatting and keep docs aligned with implemented scripts

## Adjacent Project Signals

These are future-facing notes only. PathWarden and SkillSpring Transformer are separate projects and should not dictate Quantum implementation details.

- PathWarden reinforces an MVP discipline: keep governance useful, but do not let approvals, policy, or documentation outrun visible user capability.
- SkillSpring Transformer implies Quantum may later need a `capabilities.v1.json` contract describing import, archive, dataset, diagnostics, governance, and review workflows.
- Quantum should stay independently useful first, then expose stable capability metadata for federation/orchestration later.
- Future interop should prefer explicit schemas, permission boundaries, and traceable command results over shared monolithic code.
