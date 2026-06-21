# SkillSpring Quantum Reference

SkillSpring Quantum is a local-first Electron + Vite + React desktop application and TypeScript processing engine for turning AI conversation exports into structured, auditable knowledge assets and datasets.

## First User-Facing MVP Boundary

The first user-facing MVP should be framed around a narrow AI-export workflow:

- ChatGPT / OpenAI
- Grok

Compatibility fallback can still recover some Claude- and Gemini-shaped conversation JSON, and now also proven Microsoft Copilot activity CSV exports, but that should not be described as the same thing as first-class vendor support.

This is narrower than the full internal parser and document-ingestion surface already present in the codebase. The distinction matters. Current internal coverage helps development, fixture work, and future expansion, but the product promise for early users should stay centered on a clear export-to-archive-to-dataset workflow for recognizable vendors.

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
- vendor-package hardening for Claude and Gemini export folders so one main import file can represent the package while companion files are handled intentionally
- import history query utility for vendor/topic/text/date/status investigations
- import retrieval index manifests for search-ready file-level records
- segment retrieval index manifests for linked dataset segment lookup
- latest dataset summary reader
- dataset source-context handoff that now carries recovery-path status and package-companion handling into the datasets screen
- desktop archive notification panel on Imports and Organized Output screens
- desktop import history panel with recent-run browsing, full-history investigation search, direct retrieval handoff, and per-file output links
- desktop retrieval screen with vendor/topic/date narrowing, linked segment inspection, and saved investigations
- desktop markdown archive browser grouped by inferred topic folder
- governance rule loading, validation, editing, and write reports
- tiered database storage for raw, processed, curated, and private-review records
- privacy-aware versioned dataset records derived from segmented conversation content
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
- user-facing scope should stay narrower than experimental internal parser coverage
- MVP direction and anti-drift reference: see `docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md`
- contributor philosophy reference: see `docs/SKILLSPRING_QUANTUM_PRODUCT_PHILOSOPHY.md`

## Current Gaps / Next Build Targets

- harden the first user-facing major vendor set so the app promise and real behavior match
- continue improving source-context trust handoff inside dataset browsing so recovery-path caution and vendor-package handling stay visible at the record-review layer
- add stronger direct dataset export controls beyond file-open actions
- connect import summaries, archive browsing, and dataset browsing even more tightly across screens, especially from archive browsing forward
- surface preserved conversation attachments more clearly inside archive and dataset trust flows
- add direct UI controls for curated promotion, purge restore, and folder merge flows when they become more central to user value
- decide whether archive-only versus archive-plus-dataset import controls are worth exposing after the current dataset trust work settles

## Internal Coverage Beyond MVP

Quantum already contains internal or experimental coverage that is broader than the first user-facing promise, including:

- generic conversation export detection beyond vendor-specific packages
- extracted conversation JSON coverage for DeepSeek, Kimi, and Perplexity-style shapes
- generic JSON, text-like document, and PDF intake

Those paths should be treated as expansion assets, not as the main story for the first general-user release.

## Current Desktop Product Shape

The desktop product now has a clearer end-to-end shape than earlier reference snapshots:

- Settings can persist a configurable output root across the app
- Imports can inspect sources, run local imports, and show recent import history with file-level outcomes
- Retrieval can search prior imports and linked dataset segments, save named investigations, and reopen them later
- Readable Archive browsing now supports topic/source/date filtering, in-app file navigation, archive-event file opening, and preserved-attachment handoff
- Datasets now include source-context trust summaries, redaction/trust cards, and in-app previews of topic segments, prompt/response pairs, micro segments, and private-review records

This means the current product is no longer just "pipeline wrappers plus file-open buttons." It now provides a more coherent local review workflow across imports, archives, and datasets.

## Adjacent Project Signals

These are future-facing notes only. PathWarden and SkillSpring Transformer are separate projects and should not dictate Quantum implementation details.

- PathWarden reinforces an MVP discipline: keep governance useful, but do not let approvals, policy, or documentation outrun visible user capability.
- SkillSpring Transformer implies Quantum may later need a `capabilities.v1.json` contract describing import, archive, dataset, diagnostics, governance, and review workflows.
- Quantum should stay independently useful first, then expose stable capability metadata for federation/orchestration later.
- Future interop should prefer explicit schemas, permission boundaries, and traceable command results over shared monolithic code.
