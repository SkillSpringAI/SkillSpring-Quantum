# SkillSpring Quantum

SkillSpring Quantum is a local-first desktop app and TypeScript processing engine for turning AI conversation exports into readable archives, privacy-aware datasets, and auditable local artifacts.

The current desktop experience is designed around a guided local loop:

1. choose a vendor or use auto-detect
2. point Quantum at the downloaded export file or folder
3. check whether the export shape looks usable
4. import from that exact path
5. review the readable archive first
6. review structured dataset output when you need it

The current product shape is centered on one core promise:

1. inspect a recognizable AI export
2. import it locally
3. review readable archive output
4. review privacy-aware dataset output
5. understand trust, fallback handling, and failures without reading raw logs

## Current MVP shape

The first user-facing MVP stays intentionally narrow:

- import major AI conversation exports
- preserve readable local archive output
- produce inspectable privacy-aware dataset artifacts
- explain partial imports, fallback recovery, and package-companion handling in plain English

This is not yet a general document-ingestion product or a parser zoo. Governance remains part of Quantum's internal operating discipline, but ordinary users should experience it through sensible defaults, traceable results, plain-language explanations, and recovery options rather than policy machinery.

The product hierarchy is:

1. import, readable archive, and privacy-aware dataset are the primary user product
2. retrieval supports that product
3. diagnostics and internal governance explain, verify, and recover that product
4. advanced governance, review, curation, and tiered-storage controls remain available through deliberate advanced access

## Current support tiers

### MVP first-class now

- ChatGPT / OpenAI export folders and JSON shards, including multi-file export folders and `chat.html`-style dumps that Quantum now recognizes through source inspection
- Claude export JSON
- Gemini export JSON
- Grok export manifest JSON, including referenced attachment blob preservation when vendor blob folders are present
- Microsoft Copilot activity CSV for the proven fixture-backed export shape

### MVP compatibility fallback now

- Gemini My Activity HTML where the export structure is recoverable

### Not yet first-class

- no major AI export vendor in the current MVP set remains fallback-only

## What Quantum currently produces

- human-readable markdown archives grouped by inferred topic
- archive notifications and archive event logs
- privacy-aware JSONL dataset artifacts
- dataset manifests and current dataset snapshots
- tiered local DB records for raw, processed, curated, and private-review material
- import history, retrieval indexes, diagnostics, and related audit artifacts

## Current desktop capabilities

The desktop app can currently:

1. start imports from a vendor-first flow instead of reasoning about file mode first
2. choose a file or folder, or enter a path directly
3. inspect what Quantum found before import and see import-ready, recovery-path, partial-match, or wrong-vendor feedback
4. run a local import into a configurable output root
5. review recent import history with per-file results, guarded output links, and retrieval handoff
6. search prior imports by vendor, topic, text, date, and status
7. get plain-English recovery guidance for failed, skipped, and fallback imports before retrying
8. browse readable archive output with topic, source, and date filters
9. review a selected archive slice with guided next-step cues, attachment evidence, file details, and matching dataset/import handoff actions
10. open archive files, archive event logs, topic folders, and preserved attachment locations from the UI when those paths actually exist
11. jump from archive and import views into related retrieval and dataset investigations
12. review dataset manifests, source context, redaction summaries, in-app previews, and historical-versus-latest alignment cues inside the app
13. inspect extra-care review and diagnostics paths when a run needs more caution
14. keep secondary screens calmer by hiding import history, deeper check results, raw dataset file actions, segment review, and other operator-heavy panels until the user chooses to open them

## Desktop runtime note

The real import and inspection workflow depends on running the Electron desktop shell, not just the renderer in isolation.

Recent hardening included:

- honest failure when the desktop bridge is unavailable instead of silent mock fallback
- Windows-safe Electron command spawning for paths under locations like `C:\Program Files\...`
- guarded file-open buttons so the UI avoids pointing users at paths that do not exist yet
- calmer loaded-state UI on Imports, Find Imports, and Datasets so the first working view stays closer to the primary task instead of opening every secondary panel at once
- clearer archive selected-file review flow so attachment context and dataset handoff are easier to follow
- clearer dataset preview alignment messaging so users can tell when they are seeing an exact historical snapshot versus a latest-bundle fallback

## Use cases the project currently fits best

- local review of exported AI conversations without uploading them to a third-party service
- building readable topic-organized archives from ChatGPT, Claude, Gemini, and Grok exports
- generating structured dataset artifacts from the same import run
- tracing fallback recovery, attachment preservation, and package-companion handling across imports, archives, and datasets
- following archive context into the matching dataset view without losing vendor/topic trust clues
- investigating prior imports and linked dataset segments from one desktop workflow
- working from exported ChatGPT folders that may contain multiple shards or `chat.html`-style dumps instead of only a single canonical file

## Internal and experimental coverage beyond the MVP story

Quantum already contains broader internal coverage that is useful for development and future expansion:

- generic conversation JSON detection beyond named vendor packages
- extracted conversation JSON recovery for DeepSeek-, Kimi-, and Perplexity-style shapes
- generic JSON, text-like document, and PDF intake with archive-first fallback behavior

Those paths should be treated as expansion assets, not as the primary release promise.

## Core pipeline

Inspect -> Import -> Parse or Archive -> Store Tier0 -> Segment Conversations -> Export Readable Archive -> Export Datasets -> Route Tiered DB Records -> Write Import History -> Write Diagnostics

## Advanced internal assurance workflows

Quantum also contains internal and power-user workflows that support assurance, diagnosis, review, and later enterprise use:

- review queue generation for near-curated records
- manual approve/reject workflow for queue items
- manifest-backed promotion from processed to curated
- rule-backed governance editing and validation
- private-review separation for more sensitive dataset segments
- diagnostics and artifacts that may later be interpreted by a local assistant in plain language

These workflows do not define the ordinary MVP journey. They should be reached deliberately through Advanced Tools, settings, contextual troubleshooting, or a future local assistant acting on the user's request.

## Current UX note

The current UI is materially better aligned to the MVP flow than earlier builds, but it still needs another polish stage before it is ready for a strong first external-user impression.

What is working now:

- vendor-first import guidance is clearer
- import-ready versus mismatch and recovery-path states are more honest
- archive selected-file review is more guided
- archive, retrieval, and dataset screens keep more secondary detail behind optional reveals
- dataset preview makes historical-run versus latest-bundle alignment easier to understand

What still needs a future UX pass:

- tighter visual hierarchy and spacing consistency
- fewer moments where users feel they need to study the product before acting
- clearer differentiation between primary actions and power-user inspection surfaces
- continued simplification of loaded states once real data is present

## Morning Note

The next recommended validation step is a full manual walkthrough of the desktop app in Electron using real or realistic fixture-backed exports.

That walkthrough should cover the whole ordinary user flow:

1. Imports
2. import history
3. Readable Archive
4. Datasets
5. retrieval / Find Imports
6. diagnostics only when needed

The goal is not only to check correctness. It is also to document the interaction flow, friction points, confusing labels, dead-end actions, and moments where the UI still feels too internal or too dense. That documentation should feed the next UI/UX polish pass.

Use [docs/MORNING_MANUAL_TEST_NOTE.md](docs/MORNING_MANUAL_TEST_NOTE.md) as the checklist and capture template for that walkthrough.

The first walkthrough pass has now been recorded here:

- [docs/MANUAL_WALKTHROUGH_2026-06-28.md](docs/MANUAL_WALKTHROUGH_2026-06-28.md)

The next morning retest should start from that record and confirm the import-to-archive-to-dataset handoff in a fresh Electron session.

## Current scripts

### Process a single ChatGPT export shard
```powershell
npm run run:file -- "C:\Users\Laptop\Desktop\ChatGPT Exports\conversations-000.json" "organized_output"
```

### Run full ChatGPT shard batch
```powershell
npm run batch:run
npm run batch:diag
npm run batch:delta
```

### Inspect a file or folder before import
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\inspectImportSource.ts "C:\path\to\source"
```

### Inspect a conversation export fixture shape
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\inspectConversationFixture.ts "tests\fixtures\sample-generic-conversation.json"
```

Tracked fixture examples should stay small and curated under `tests/fixtures/`.

Local raw vendor exports belong in `tests/fixtures/vendor-exports/`, which is intentionally git-ignored except for its README.

For Grok vendor exports, inspect the root manifest JSON such as `prod-grok-backend.json` rather than a UUID blob folder.

### Run the general import flow
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\runImportSource.ts "C:\path\to\source" "organized_output"
```

### Read import history
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\readImportHistory.ts "organized_output" 8
```

### Query full import history for an investigation
```powershell
npm run imports:history:query -- --vendor claude --topic crypto --from 2026-02-01 --to 2026-05-31
```

### Read the latest dataset summary
```powershell
node .\node_modules\tsx\dist\cli.mjs core\pipeline\readLatestDatasetRun.ts "organized_output"
```

### Read archive notifications
```powershell
node .\node_modules\tsx\dist\cli.mjs core\notifications\readArchiveNotifications.ts "organized_output"
```

### Read the markdown archive index
```powershell
node .\node_modules\tsx\dist\cli.mjs core\notifications\readMarkdownArchive.ts "organized_output"
```

### Build review queue
```powershell
npm run db:review
```

### Decide a review queue record
```powershell
npm run db:review:decide -- "organized_output" approve "conversationId|topic|startIndex|endIndex" "Promote after manual review"
```

### Promote curated records
```powershell
npm run db:promote
```

### Run diagnostics report
```powershell
npm run diag:run
```

### Restore a purged file
```powershell
npm run purge:restore -- "organized_output\purge\some_folder\some_file.md" "organized_output"
```

## Direction

- working product direction: [docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md](docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md)
- implementation/status reference: [docs/SKILLSPRING_QUANTUM_REFERENCE.md](docs/SKILLSPRING_QUANTUM_REFERENCE.md)
- anti-drift scope lock: [docs/SKILLSPRING_MVP_SCOPE_LOCK.md](docs/SKILLSPRING_MVP_SCOPE_LOCK.md)
- checkable MVP roadmap: [docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md](docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md)
- future-scope PIE boundary: [docs/SKILLSPRING_PIE_FUTURE_SCOPE.md](docs/SKILLSPRING_PIE_FUTURE_SCOPE.md)
- morning manual walkthrough note: [docs/MORNING_MANUAL_TEST_NOTE.md](docs/MORNING_MANUAL_TEST_NOTE.md)
- first walkthrough record: [docs/MANUAL_WALKTHROUGH_2026-06-28.md](docs/MANUAL_WALKTHROUGH_2026-06-28.md)

