# SkillSpring Quantum Reference

SkillSpring Quantum is a local-first Electron + Vite + React desktop application and TypeScript processing engine for turning mixed AI conversation exports and general local documents into structured, auditable knowledge assets and datasets.

## Implemented Spine

- ChatGPT export parsing and raw conversation normalization
- generic conversation export detection across ChatGPT, Grok manifests, and conversation-shaped JSON
- parser coverage for Claude-shaped, Gemini-shaped, DeepSeek-shaped, Kimi-shaped, and Perplexity-shaped extracted conversation JSON
- Grok vendor export parsing through root manifest JSON files
- Grok attachment blob preservation via `file_attachments` when referenced blob folders are present
- Grok attachment manifest output recording archived versus missing attachment blobs
- generic local document intake for JSON, text-like files, and PDFs
- intent-based topic segmentation that can split a mislabeled or topic-shifting thread into multiple segments
- topic scoring, topic filtering, and canonical topic normalization
- deterministic deduplication and text fingerprinting
- human-readable markdown organized by inferred topic, with relative timestamps beside absolute message timestamps
- human-readable markdown now includes preserved conversation attachment references when available
- archive notification artifacts for human-readable markdown output events
- source archive output for generic imported documents
- import history manifests and latest import summaries
- latest dataset summary reader
- desktop archive notification panel on Imports and Organized Output screens
- desktop import history panel with per-file output links
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

- enrich preserved attachment metadata with better preview and file labeling
- surface preserved conversation attachments more clearly in desktop history and archive browsing
- connect import summaries, archive browsing, and dataset browsing more tightly across screens
- improve review queue screen states for empty, missing, and failed queue files
- add richer markdown archive filtering/search and file-open actions
- add direct UI controls for curated promotion, purge restore, and folder merge flows
- explain redaction and dataset outputs more clearly in the app

## Adjacent Project Signals

These are future-facing notes only. PathWarden and SkillSpring Transformer are separate projects and should not dictate Quantum implementation details.

- PathWarden reinforces an MVP discipline: keep governance useful, but do not let approvals, policy, or documentation outrun visible user capability.
- SkillSpring Transformer implies Quantum may later need a `capabilities.v1.json` contract describing import, archive, dataset, diagnostics, governance, and review workflows.
- Quantum should stay independently useful first, then expose stable capability metadata for federation/orchestration later.
- Future interop should prefer explicit schemas, permission boundaries, and traceable command results over shared monolithic code.
