# SkillSpring Quantum

SkillSpring Quantum is a local-first desktop app and TypeScript processing engine for turning AI conversation exports into readable archives, privacy-aware datasets, and auditable local artifacts.

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

This is not yet a general document-ingestion product, a parser zoo, or a governance-first workflow. Broader document intake and secondary vendor expansion still exist internally, but they are not the main release story.

## Current support tiers

### MVP first-class now

- ChatGPT / OpenAI export JSON
- Grok export manifest JSON, including referenced attachment blob preservation when vendor blob folders are present

### MVP compatibility fallback now

- Claude-shaped conversation JSON where the threaded structure is recoverable
- Gemini-shaped conversation JSON where the threaded structure is recoverable
- Microsoft Copilot activity CSV only where the fixture-backed recoverable shape is proven

### Not yet first-class

- named Claude adapter
- named Gemini adapter
- named Copilot adapter beyond the current narrow CSV fallback path

## What Quantum currently produces

- human-readable markdown archives grouped by inferred topic
- archive notifications and archive event logs
- privacy-aware JSONL dataset artifacts
- dataset manifests and current dataset snapshots
- tiered local DB records for raw, processed, curated, and private-review material
- import history, retrieval indexes, diagnostics, and related audit artifacts

## Current desktop capabilities

The desktop app can currently:

1. choose a file or folder, or enter a path directly
2. inspect what Quantum found before import
3. run a local import into a configurable output root
4. review recent import history with per-file results and output links
5. search prior imports by vendor, topic, text, date, and status
6. get plain-English recovery guidance for failed, skipped, and fallback imports before retrying
7. browse readable archive output with topic, source, and date filters
8. open archive files, archive event logs, topic folders, and preserved attachment locations from the UI
9. jump from archive and import views into related retrieval and dataset investigations
10. review dataset manifests, dataset trust context, redaction summaries, current dataset previews, and current-versus-historical handoff controls inside the app
11. inspect private-review and diagnostics paths when a run needs more caution

## Use cases the project currently fits best

- local review of exported AI conversations without uploading them to a third-party service
- building readable topic-organized archives from ChatGPT and Grok exports
- generating structured dataset artifacts from the same import run
- tracing fallback recovery, attachment preservation, and package-companion handling across imports, archives, and datasets
- following archive context into the matching dataset view without losing vendor/topic trust clues
- investigating prior imports and linked dataset segments from one desktop workflow

## Internal and experimental coverage beyond the MVP story

Quantum already contains broader internal coverage that is useful for development and future expansion:

- generic conversation JSON detection beyond named vendor packages
- extracted conversation JSON recovery for DeepSeek-, Kimi-, and Perplexity-style shapes
- generic JSON, text-like document, and PDF intake with archive-first fallback behavior

Those paths should be treated as expansion assets, not as the primary release promise.

## Core pipeline

Inspect -> Import -> Parse or Archive -> Store Tier0 -> Segment Conversations -> Export Readable Archive -> Export Datasets -> Route Tiered DB Records -> Write Import History -> Write Diagnostics

## Review and governance workflows

- review queue generation for near-curated records
- manual approve/reject workflow for queue items
- manifest-backed promotion from processed to curated
- rule-backed governance editing and validation
- private-review separation for more sensitive dataset segments

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

