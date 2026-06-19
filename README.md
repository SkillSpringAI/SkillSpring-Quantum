# SkillSpring Quantum

SkillSpring Quantum is a local-first desktop application and processing engine for turning AI conversation exports into structured, auditable knowledge assets.

It is designed to import local exports, preserve readable archived versions, and produce privacy-aware dataset artifacts from the same workflow.

## First user-facing MVP scope

The first real user-facing iteration of SkillSpring Quantum is focused on a narrow, trustworthy AI-export workflow:

- import major AI conversation exports
- produce readable local archives
- produce inspectable privacy-aware dataset artifacts
- explain failures and partial imports in plain English

The user-facing workflow should stay simple:

1. Choose an export file or export folder.
2. Inspect what Quantum found.
3. Run the import locally.
4. Review readable archives and structured dataset output.
5. Understand what succeeded, failed, or used fallback recovery.

Other intake types such as Kimi, DeepSeek, Perplexity, generic JSON, PDFs, mixed local documents, and enterprise conversation systems remain useful expansion paths, but they are not the first user-facing MVP promise.

For MVP discipline, broader document intake such as PDFs, CSVs, Excel files, and Word documents should stay out of the first public/user-facing scope unless actual user demand proves they are a higher priority than the major AI export workflow.

## Current support tiers

### MVP first-class now

- ChatGPT / OpenAI
- Grok

### MVP compatibility fallback now

- Claude via generic conversation parsing
- Gemini via generic conversation parsing
- Microsoft Copilot only where recoverable conversation JSON is proven by fixture and test coverage

### Explicitly deferred from first-class MVP support

- named Claude adapter
- named Gemini adapter
- named Copilot adapter

## Current purpose

The system converts raw exported conversation data into:

- human-readable archived markdown
- topic-organized conversation output
- privacy-aware dataset-ready JSONL records
- diagnostics, manifests, and audit artifacts
- tiered local data storage for raw, processed, curated, and private-review records
- import history and file-level import result visibility
- review, promotion, and governance workflows for higher-signal records

## Current intake support

There is a difference between the user-facing MVP scope and current internal support.

### User-facing MVP intake

- ChatGPT export JSON files
- Grok export manifest JSON files with referenced attachment blob preservation when the blob folders are present
- Claude- and Gemini-shaped conversation JSON only as compatibility fallback where conversational structure is recoverable
- Microsoft Copilot conversation JSON only where recoverable shapes are actually proven

### Internal and experimental intake already present

- ChatGPT export JSON files
- Grok export manifest JSON files with referenced attachment blob preservation when the blob folders are present
- generic conversation JSON files, including third-party or manually extracted conversation records from tools like Claude, Gemini, DeepSeek, Kimi, and Perplexity
- generic JSON documents
- text-like local files such as `.txt`, `.md`, `.markdown`, `.csv`, and `.log`
- PDF files with best-effort local text extraction plus intact archive fallback behavior
- single-file or mixed-folder import flows through the desktop UI

## Current desktop workflow

A user can currently:

1. Browse to a file or folder from the desktop app, or enter a path directly.
2. Inspect what Quantum found before import.
3. Run the import locally.
4. Review recent import history and per-file results.
5. Run a full-history investigation search across prior imports by vendor, topic, text, date, and status.
6. Jump directly from an import-history investigation into Retrieval with the current filters and selected conversation file carried over.
7. Narrow retrieval results across indexed import records and linked dataset segments.
8. Save named retrieval investigations and reopen them later.
9. Open created archive, import, dataset, and DB locations from the UI.

## Core pipeline

Import -> Inspect -> Parse or Archive -> Store Tier0 -> Segment Conversations -> Export Human Archive -> Extract Datasets -> Route to Tiered DB -> Write Import History -> Review / Promote / Govern -> Log Diagnostics

## Review and promotion
- review queue for near-curated records
- manual approve/reject workflow for queue items
- manifest-backed promotion from processed to curated
- rule-based review and promotion controls
- explicit rejection reasons
- latest manifests plus historical manifest snapshots

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

