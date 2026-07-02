# SkillSpring Quantum Reference

SkillSpring Quantum is a local-first Electron + Vite + React desktop application and TypeScript processing engine for turning AI conversation exports into structured, auditable knowledge assets and datasets.

## First User-Facing MVP Boundary

The first user-facing MVP should be framed around a narrow AI-export workflow:

- ChatGPT / OpenAI
- Claude
- Gemini
- Grok
- Microsoft Copilot activity CSV for the proven tested export shape

Compatibility fallback can still recover Gemini My Activity HTML, but that should not be described as the same thing as first-class vendor support.

This is narrower than the full internal parser and document-ingestion surface already present in the codebase. The distinction matters. Current internal coverage helps development, fixture work, and future expansion, but the product promise for early users should stay centered on a clear export-to-archive-to-dataset workflow for recognizable vendors.

## Implemented Spine

- ChatGPT export parsing and raw conversation normalization
- ChatGPT source inspection now recognizes both multi-file export folders and `chat.html`-style dumps instead of only a single expected file shape
- named Claude export detection and parser path
- named Gemini export detection and parser path
- named Microsoft Copilot activity CSV detection and parser path
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
- Claude now promoted to MVP first-class trust labeling across source inspection, import metadata, import results, and dataset source context
- Gemini export JSON now promoted to MVP first-class trust labeling while Gemini My Activity HTML remains a narrower fallback route
- Microsoft Copilot activity CSV now promoted to MVP first-class trust labeling for the proven tested export shape
- import history query utility for vendor/topic/text/date/status investigations
- import retrieval index manifests for search-ready file-level records
- segment retrieval index manifests for linked dataset segment lookup
- latest dataset summary reader
- dataset source-context handoff that now carries recovery-path status and package-companion handling into the datasets screen
- desktop archive notification panel on Imports and Organized Output screens
- desktop import history panel with recent-run browsing, full-history investigation search, direct retrieval handoff, and per-file output links
- clearer vendor-specific intake labeling across source inspection and import history for ChatGPT, Grok, Claude, Gemini, and proven Copilot fallback paths
- recovery guidance across imports and import history so failed, skipped, and fallback runs explain the next useful checks in plain English
- vendor-first import entry that now starts moving the UI toward expected export source before file-mode reasoning
- clearer import match feedback for ready-now, recovery-path, and mismatch states
- desktop retrieval screen with vendor/topic/date narrowing, linked segment inspection, and saved investigations
- retrieval loaded-state simplification so saved searches, tips, import details, and segment inspection stay optional until the user asks for them
- desktop markdown archive browser grouped by inferred topic folder
- archive-to-dataset handoff from selected markdown files into matched dataset context
- calmer imports and datasets loaded states so secondary panels, deeper checks, and raw file actions do not all open by default
- governance rule loading, validation, editing, and write reports
- tiered database storage for raw, processed, curated, and private-review records
- privacy-aware versioned dataset records derived from segmented conversation content
- review queue build and manual approve/reject decision scripts
- curated promotion scripts with manifest snapshots
- batch run, batch diagnostics, and batch delta scripts
- diagnostics preflight and reporting
- purge restore and topic folder merge helpers
- Electron desktop bridge / IPC preload for backend workflows
- Electron desktop command spawning now runs safely against Windows paths with spaces, including `process.execPath` under `C:\Program Files\...`
- desktop bridge honesty so import/source inspection fails explicitly when the Electron bridge is unavailable instead of silently falling back to mock behavior
- React desktop screens for imports, diagnostics, governance, DB browsing, datasets, organized output, review queue, and settings

## Current Build Emphasis

- deterministic processing before smart enrichment
- internal assurance through manifests, diagnostics, governance rules, and traceable reports
- ordinary-user explanations before visible governance machinery
- deliberate Extra Tools access for power-user, enterprise, maintainer, and diagnostic workflows
- UI controls mapped to real backend workflows, not placeholder lifecycle actions
- user-visible capability growth should stay ahead of governance/documentation drag
- diagnostic artifacts structured for future local-assistant interpretation
- user-facing scope should stay narrower than experimental internal parser coverage
- MVP direction and anti-drift reference: see `docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md`
- future-scope intent-engine reference: see `docs/SKILLSPRING_PIE_FUTURE_SCOPE.md`
- contributor philosophy reference: see `docs/SKILLSPRING_QUANTUM_PRODUCT_PHILOSOPHY.md`

## Current Gaps / Next Build Targets

- keep hardening the now-expanded first-class vendor set so the app promise and real behavior stay matched at the exact export-shape level
- continue reshaping the imports screen so ordinary users can choose a vendor, check the export shape, and import without learning Quantum vocabulary first
- keep simplifying empty states and first-read density across imports, archive, and datasets before broader external-user exposure
- use the current internal walkthrough records to remove obvious friction first, then let outside test users shape the next heavier UX pass
- make schema-match outcomes more visual and decisive than text-only explanation
- carry archive-selected trust context deeper into dataset review and preview layers so users can tell exactly what came from the archive handoff versus the latest current bundle
- improve archive usability further so preserved attachments and source references are directly useful during review, not only summarized
- connect import summaries, archive browsing, and dataset browsing even more tightly across screens, especially around stable historical versus rolling-current dataset scope
- continue clarifying historical-run versus rolling-current dataset scope
- keep reducing dead-end file actions by only surfacing secondary artifact actions when the backing path exists and the user actually needs them
- keep curated promotion, purge restore, folder merge, governance editing, and tiered database inspection behind deliberate Extra Tools access
- define a stable diagnostic explanation contract for future local-assistant use without making assistant integration an MVP blocker
- decide whether archive-only versus archive-plus-dataset import controls are worth exposing after the current dataset clarity work settles

The latest internal pass on July 2, 2026 also clarified an important sequencing point:

- major layout collision issues on the core four-screen flow were resolved well enough that the next work should prioritize beta-legibility, interpretation quality, and first-run clarity over more large layout surgery
- topic and intent segmentation remain promising deterministic foundations, but they are also a likely future leverage point for a local retrieval assistant or chat-style interface layered on top of Quantum's evidence artifacts
- parser and retrieval hardening now need an explicit cross-user generalization pass so the current quality does not depend too heavily on the maintainer's own conversation patterns, favorite topics, or recurring vocabulary
- the next parser-quality bar should be corpus-agnostic behavior across technical, personal-admin, hobby, and mixed-topic exports rather than only stronger performance on today's internal fixtures
- if a future assistant layer is added, it should refine interpretation of grounded records rather than replace the deterministic import, archive, and dataset spine
- first-run onboarding may benefit from a short walkthrough or tutorial video that demonstrates the ordinary import -> archive -> dataset path, especially for outside users who would otherwise face too much explanatory text on first contact

## Internal Coverage Beyond MVP

Quantum already contains internal or experimental coverage that is broader than the first user-facing promise, including:

- generic conversation export detection beyond vendor-specific packages
- extracted conversation JSON coverage for DeepSeek, Kimi, and Perplexity-style shapes
- generic JSON, text-like document, and PDF intake

Those paths should be treated as expansion assets, not as the main story for the first general-user release.

## Current Desktop Product Shape

The desktop product now has a clearer end-to-end shape than earlier reference snapshots:

- Settings can persist a configurable output root across the app
- Imports can inspect sources, run local imports, show recent import history with file-level outcomes, and now begin from a more vendor-first entry flow
- Imports now give a more concrete "check this export, then import this path" flow instead of forcing file-mode reasoning and internal vocabulary up front
- Imports and import history now explain recovery-path, failed, and skipped outcomes with concrete next-step guidance
- Retrieval can search prior imports and linked dataset segments, save named investigations, and reopen them later
- Readable Archive browsing now supports topic/source/date filtering, in-app file navigation, archive-event file opening, preserved-attachment handoff, direct dataset-context handoff from selected archive files, and lighter first-use guidance
- Readable Archive selected-file review now adds clearer next-step guidance, attachment cues, matching dataset/import actions, and a read-first layout that puts the markdown body ahead of the denser downstream actions
- Datasets now include source-context trust summaries, redaction/trust cards, in-app previews of topic segments, prompt/response pairs, micro segments, and private-review records, plus current-bundle versus historical-run handoff controls, clearer preview-alignment explanation, lighter guide content, and fewer default file-action choices
- Imports, Find Imports, and Datasets now lean more on progressive disclosure so the first loaded screen stays closer to the main next action and the denser operator surfaces open deliberately

This means the current product is no longer just "pipeline wrappers plus file-open buttons." It now provides a more coherent local review workflow across imports, archives, and datasets.

## Continue Tomorrow

The current UX is improved, the visible collision regression from the July 2, 2026 pass was resolved, and the ordinary screen sequence is holding together better after a real import.

That means the next phase should be framed less as "repair the shell" and more as "prepare the product for a small outside beta without losing traceability."

The next explicit UX continuation slices are:

- finish shifting Imports toward a clear vendor-first workflow with stronger export-schema validation cues
- reduce the amount of required reading on first load across Imports, Readable Archive, and Datasets
- collapse secondary panels until the user has actual import output to work from
- make mismatch and recovery-path states visually obvious enough that users can act quickly
- keep smoothing visual density, hierarchy, and button emphasis across the general-user surface
- keep fixing the remaining alignment, spacing, and "old operator screen" feel that still shows up once users start scrolling through loaded states
- keep advanced assurance tools contextual and avoid making the ordinary flow feel like a product to be studied
- run a full manual Electron walkthrough across Imports, Readable Archive, Datasets, Find Imports, and contextual diagnostics, documenting the interaction flow and friction points for the next UI/UX pass
- after the next internal stabilization pass, run a small outside test-user walkthrough round so the next UX decisions are based on fresh-user behavior instead of maintainer familiarity

The highest-value next slices toward that beta goal are:

1. corpus-agnostic parser and segmentation hardening across more varied user export shapes
2. user-natural topic/intent interpretation and retrieval labeling improvements grounded in deterministic evidence
3. first-run import clarity plus a reusable walkthrough or tutorial path for outside beta sessions

## User and Governance Surface Model

Quantum should maintain three distinct surfaces:

1. **General-user product surface**: import, results, readable archive, datasets, search, and plain-language recovery.
2. **Advanced assurance surface**: diagnostics, governance, tiered DB, review, promotion, manifests, and detailed evidence entered deliberately.
3. **Future assistant interpretation surface**: evidence-backed access that lets a local assistant explain outcomes and recovery options without bypassing Quantum's rules or inventing conclusions.

The general-user surface is the MVP priority. The advanced surface remains real product capability but should not dominate ordinary navigation. The assistant surface is a future integration contract, not a reason to delay the standalone product.

## Adjacent Project Signals

These are future-facing notes only. PathWarden and SkillSpring Transformer are separate projects and should not dictate Quantum implementation details.

- PathWarden reinforces an MVP discipline: keep governance useful, but do not let approvals, policy, or documentation outrun visible user capability.
- SkillSpring Transformer implies Quantum may later need a `capabilities.v1.json` contract describing import, archive, dataset, diagnostics, governance, and review workflows.
- Quantum should stay independently useful first, then expose stable capability metadata for federation/orchestration later.
- Future interop should prefer explicit schemas, permission boundaries, and traceable command results over shared monolithic code.
