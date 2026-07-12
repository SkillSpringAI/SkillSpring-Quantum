# SkillSpring Quantum

SkillSpring Quantum is a local-first Electron + Vite + React desktop app and TypeScript processing engine for turning AI conversation exports into readable archives, privacy-aware datasets, and auditable local artifacts.

The current desktop experience is designed around a guided local loop:

1. Choose a vendor or use auto-detect
2. Point Quantum at the downloaded export file or folder
3. Check whether the export shape looks usable
4. Import from that exact path
5. Review the readable archive first
6. Review structured dataset output when you need it

## Current Product Shape

The first user-facing MVP stays intentionally narrow:

- Import major AI conversation exports (ChatGPT, Claude, Gemini, Grok, Copilot CSV)
- Preserve readable local archive output organized by inferred topic
- Produce inspectable privacy-aware dataset artifacts
- Explain partial imports, fallback recovery, and package-companion handling in plain English
- Search prior imports by vendor, topic, text, date, and status
- Review structured datasets with source context, redaction summaries, and trust cues
- Save and replay named retrieval investigations
- Govern and review sensitive content through optional advanced workflows

This is not yet a general document-ingestion product or a parser zoo. Governance remains part of Quantum's internal operating discipline, but ordinary users should experience it through sensible defaults, traceable results, plain-language explanations, and recovery options rather than policy machinery.

The product hierarchy is:

1. Import, readable archive, and privacy-aware dataset are the primary user product
2. Retrieval supports that product
3. Diagnostics and internal governance explain, verify, and recover that product
4. Advanced governance, review, curation, and tiered-storage controls remain available through deliberate advanced access

## Local AI Boundary

Quantum contains an early local AI integration path under `skillspring-quantum-agent/`.

That layer is **optional**.

The deterministic pipeline remains authoritative for:

- Vendor detection
- Source preservation
- Schema validation
- Record extraction
- Message ordering
- Archive creation
- Dataset generation
- Output validation
- Reproducible execution

The local AI layer is intended to help with:

- Natural-language workflow control
- Clearer labels and summaries
- Retrieval explanation
- Topic-shift suggestions
- Project and alias suggestions
- Grounded explanation of results and failures

The app must continue working normally without the local AI stack.

AI-generated metadata belongs to a separate semantic layer and must not silently replace canonical source facts.

As of July 5, 2026, the first deterministic-first assistant milestone is in place:

- `Ask Quantum` can route a narrow set of plain-language requests into validated Quantum actions
- Supported examples include inspecting an export path, starting an import, opening core workflow screens, opening output locations, searching completed outputs, and rebuilding the local search index
- Unsupported or underspecified requests still fall back to explanation rather than invented execution

This matters because it keeps the assistant useful without letting it outrun the canonical import → archive → dataset workflow.

## Current Support Tiers

### MVP First-Class (now)

- **ChatGPT / OpenAI** — export folders and JSON shards, including multi-file export folders and `chat.html`-style dumps recognized through source inspection
- **Claude** — export JSON
- **Gemini** — export JSON
- **Grok** — export manifest JSON, including referenced attachment blob preservation when vendor blob folders are present
- **Microsoft Copilot** — activity CSV for the proven fixture-backed export shape

### MVP Compatibility Fallback (now)

- **Gemini My Activity HTML** — recoverable where the export structure is intact

### Not Yet First-Class

- No major AI export vendor in the current MVP set remains fallback-only
- DeepSeek, Kimi, Perplexity shapes are detected internally but not yet marketed as first-class

## What Quantum Currently Produces

- Human-readable markdown archives grouped by inferred topic
- Archive notifications and archive event logs
- Privacy-aware JSONL dataset artifacts (topic segments, prompt/response pairs, micro segments)
- Dataset manifests and current dataset snapshots
- Tiered local DB records for raw, processed, curated, and private-review material
- Import history with per-file results, retrieval handoff, and trust scoring
- Retrieval indexes for imports and linked dataset segments
- Diagnostics, audit artifacts, and batch health reports
- Saved named retrieval investigations with replay

## Current Desktop Capabilities

The desktop app can currently:

1. **Start imports** from a vendor-first flow (ChatGPT, Claude, Gemini, Grok, Copilot, or Auto Detect)
2. **Choose a file or folder**, or enter a path directly
3. **Inspect what Quantum found** before import and see import-ready, recovery-path, partial-match, or wrong-vendor feedback
4. **Run a local import** into a configurable output root (persisted in Settings)
5. **Review recent import history** with per-file results, guarded output links, and retrieval handoff
6. **Search prior imports** by vendor, topic, text, date, and status with saved investigations
7. **Get plain-English recovery guidance** for failed, skipped, and fallback imports before retrying
8. **Browse readable archive output** with topic, source, date, and text filters
9. **Review a selected archive slice** with guided next-step cues, attachment evidence, file details, and matching dataset/import handoff actions
10. **Open archive files, event logs, topic folders, and preserved attachments** from the UI when those paths exist
11. **Jump from archive and import views into related retrieval and dataset investigations**
12. **Review dataset manifests, source context, redaction summaries, in-app previews, and historical-vs-latest alignment cues**
13. **Inspect extra-care review and diagnostics paths** when a run needs more caution
14. **Keep secondary screens calmer** by hiding import history, deeper checks, raw dataset actions, segment review, and other operator-heavy panels until the user chooses to open them
15. **Configure output root** through Settings so the app works on any machine, not just the dev environment

## Desktop Runtime Note

The real import and inspection workflow depends on running the Electron desktop shell, not just the renderer in isolation.

Recent hardening included:

- Honest failure when the desktop bridge is unavailable instead of silent mock fallback
- Windows-safe Electron command spawning for paths under locations like `C:\Program Files\...`
- Guarded file-open buttons so the UI avoids pointing users at paths that do not exist yet
- Calmer loaded-state UI on Imports, Find Imports, and Datasets so the first working view stays closer to the primary task
- Clearer archive selected-file review flow with attachment context and dataset handoff
- Clearer dataset preview alignment messaging so users can tell when they are seeing an exact historical snapshot versus a latest-bundle fallback
- Visible deterministic import progress inside Imports so long-running work no longer feels frozen
- Vendor smoke-test coverage for the current first-class vendor set so parser changes have a fast regression guard
- Corpus-agnostic parser hardening so segment labels and topic boundaries depend less on the maintainer's own corpus
- Retrieval evidence cues and recommended next-step labels so Find Imports is easier to trust and act on
- Configurable output root via Settings, persisted across sessions, replacing hardcoded dev paths
- Richer archive filtering (source, date range, clear-all) making the archive browser more useful for review
- Improved attachment visibility in Dashboard and import history so users know when conversation exports contain references
- Auto-select newest archive file on screen entry so the archive is immediately useful
- Auto-sync dataset run selection so the latest run is always pre-selected
- Improved review queue empty states with contextual guidance for error, not-built, empty, and all-reviewed scenarios

## Test Coverage

The repo contains 36+ test files covering:

- Parser correctness (ChatGPT, Claude, Gemini, Grok, Copilot, generic conversation JSON)
- Import source intake and vendor package detection
- Import history filtering and retrieval index generation
- Pipeline segmentation, topic drift, and topic normalization
- Archive notification and markdown archive reader behavior
- Dataset source context, intent matching, and latest-run reading
- PDF text extraction
- Governance (waste classification, topic scoring, filtering, curation, fingerprinting, review queue rules, review decisions, path utilities, filesystem operations, rule validation, report writing)
- Retrieval ranking and saved views
- Attachment archive handling

Run the full regression gate:

```bash
npm run test:ci
```

This covers parser coverage, import suites, vendor smoke tests, retrieval, pipeline, assistant boundary, and governance.

## Current Scripts

### Process a single ChatGPT export shard
```bash
npm run run:file -- "C:\Users\...\conversations-000.json" "organized_output"
```

### Run full ChatGPT shard batch
```bash
npm run batch:run
npm run batch:diag
npm run batch:delta
```

### Inspect a file or folder before import
```bash
npx tsx core/imports/inspectImportSource.ts "C:\path\to\source"
```

### Inspect a conversation export fixture shape
```bash
npx tsx core/imports/inspectConversationFixture.ts "tests\fixtures\sample-generic-conversation.json"
```

Tracked fixture examples should stay small and curated under `tests/fixtures/`.

Local raw vendor exports belong in `tests/fixtures/vendor-exports/`, which is intentionally git-ignored except for its README.

For Grok vendor exports, inspect the root manifest JSON such as `prod-grok-backend.json` rather than a UUID blob folder.

### Run the general import flow
```bash
npx tsx core/imports/runImportSource.ts "C:\path\to\source" "organized_output"
```

### Read import history
```bash
npx tsx core/imports/readImportHistory.ts "organized_output" 8
```

### Query full import history for an investigation
```bash
npm run imports:history:query -- --vendor claude --topic crypto --from 2026-02-01 --to 2026-05-31
```

### Read the latest dataset summary
```bash
npx tsx core/pipeline/readLatestDatasetRun.ts "organized_output"
```

### Read archive notifications
```bash
npm run notifications:archive
```

### Read the markdown archive index
```bash
npm run archive:markdown
```

### Build review queue
```bash
npm run db:review
```

### Decide a review queue record
```bash
npm run db:review:decide -- "organized_output" approve "conversationId|topic|startIndex|endIndex" "Promote after manual review"
```

### Promote curated records
```bash
npm run db:promote
```

### Run diagnostics report
```bash
npm run diag:run
```

### Restore a purged file
```bash
npm run purge:restore -- "organized_output\purge\some_folder\some_file.md" "organized_output"
```

### Merge topic folders
```bash
npm run folders:merge
```

## Direction

- Working product direction: [docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md](docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md)
- Implementation/status reference: [docs/SKILLSPRING_QUANTUM_REFERENCE.md](docs/SKILLSPRING_QUANTUM_REFERENCE.md)
- Anti-drift scope lock: [docs/SKILLSPRING_MVP_SCOPE_LOCK.md](docs/SKILLSPRING_MVP_SCOPE_LOCK.md)
- Checkable MVP roadmap: [docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md](docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md)
- Future-scope PIE boundary: [docs/SKILLSPRING_PIE_FUTURE_SCOPE.md](docs/SKILLSPRING_PIE_FUTURE_SCOPE.md)
- Next implementation note: [docs/NEXT_FIVE_SLICES_2026-07-09.md](docs/NEXT_FIVE_SLICES_2026-07-09.md)
- Morning manual walkthrough note: [docs/MORNING_MANUAL_TEST_NOTE.md](docs/MORNING_MANUAL_TEST_NOTE.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Next Priority Slices

See [docs/NEXT_FIVE_SLICES_2026-07-09.md](docs/NEXT_FIVE_SLICES_2026-07-09.md) for the detailed July 9 sequence.

The immediate next five slices are:

1. **Cache correctness and reuse invalidation hardening** — stronger reuse metadata so reruns do not silently trust stale outputs
2. **Heavy-import progress trust and retry explanation** — clearer per-step wording and honest retry/resume states
3. **Complete regression-gate coverage** — ensure `test:ci` exercises the import-hardening work that matters most
4. **Focused Electron manual retest** — validate the ordinary workflow communicates improvements clearly
5. **Reusable first-run onboarding and walkthrough path** — prepare a stable walkthrough for outside beta sessions

## Use Cases the Project Currently Fits Best

- Local review of exported AI conversations without uploading them to a third-party service
- Building readable topic-organized archives from ChatGPT, Claude, Gemini, and Grok exports
- Generating structured dataset artifacts from the same import run
- Tracing fallback recovery, attachment preservation, and package-companion handling across imports, archives, and datasets
- Following archive context into the matching dataset view without losing vendor/topic trust clues
- Investigating prior imports and linked dataset segments from one desktop workflow
- Working from exported ChatGPT folders that may contain multiple shards or `chat.html`-style dumps instead of only a single canonical file

## Internal and Experimental Coverage Beyond the MVP Story

Quantum already contains broader internal coverage that is useful for development and future expansion:

- Generic conversation JSON detection beyond named vendor packages
- Extracted conversation JSON recovery for DeepSeek-, Kimi-, and Perplexity-style shapes
- Generic JSON, text-like document, and PDF intake with archive-first fallback behavior

Those paths should be treated as expansion assets, not as the primary release promise.

## Core Pipeline

Inspect → Import → Parse or Archive → Store Tier0 → Segment Conversations → Export Readable Archive → Export Datasets → Route Tiered DB Records → Write Import History → Write Diagnostics

## Advanced Internal Assurance Workflows

Quantum also contains internal and power-user workflows that support assurance, diagnosis, review, and later enterprise use:

- Review queue generation for near-curated records
- Manual approve/reject workflow for queue items
- Manifest-backed promotion from processed to curated
- Rule-backed governance editing and validation
- Private-review separation for more sensitive dataset segments
- Diagnostics and artifacts that may later be interpreted by a local assistant in plain language

These workflows do not define the ordinary MVP journey. They should be reached deliberately through Extra Tools, settings, contextual troubleshooting, or a future local assistant acting on the user's request.

## Current UX Note

The current UI is materially better aligned to the MVP flow than earlier builds, but it still needs another polish stage before it is ready for a strong first external-user impression.

What is working now:

- Vendor-first import guidance is clearer
- Import-ready versus mismatch and recovery-path states are more honest
- Archive selected-file review is more guided and gets users to the markdown body sooner
- Archive, retrieval, and dataset screens keep more secondary detail behind optional reveals
- Dataset preview makes historical-run versus latest-bundle alignment easier to understand
- Settings screen lets users configure their output root instead of relying on hardcoded dev paths
- Archive filtering now supports source, date range, and clear-all controls
- Review queue shows contextual guidance for empty/error states instead of generic messages
- Dashboard and import history now surface attachment reference counts when present

What still needs a future UX pass:

- Tighter visual hierarchy and spacing consistency
- Fewer moments where users feel they need to study the product before acting
- Clearer differentiation between primary actions and power-user inspection surfaces
- Continued simplification of loaded states once real data is present
- Promotion, purge restore, and folder merge UI controls still need to be surfaced in the relevant screens
- Archive search could be richer (full-text search across file contents, not just names and previews)
- Dataset redaction explanations could explain which segments were affected

The next heavier UX round should likely happen after some outside test-user sessions, not only internal walkthroughs. Internal passes are still useful for obvious friction, but broader simplification decisions will be stronger once they are grounded in how fresh users actually move through the product.
