# SkillSpring Quantum

SkillSpring Quantum is a local-first desktop application and processing engine for turning AI exports and general documents into structured, auditable knowledge assets.

It is designed to import local files and folders, preserve readable archived versions, and produce anonymized dataset artifacts from the same workflow.

## Current purpose

The system converts raw exported conversation data into:

- human-readable archived markdown
- topic-organized conversation output
- anonymized dataset-ready JSONL records
- source document dataset records for generic local files
- diagnostics, manifests, and audit artifacts
- tiered local data storage for raw, processed, curated, and private-review records
- import history and file-level import result visibility
- review, promotion, and governance workflows for higher-signal records

## Current intake support

SkillSpring Quantum currently supports:

- ChatGPT export JSON files
- generic JSON documents
- text-like local files such as `.txt`, `.md`, `.markdown`, `.csv`, and `.log`
- PDF files with best-effort local text extraction plus intact archive fallback behavior
- single-file or mixed-folder import flows through the desktop UI

## Current desktop workflow

A user can currently:

1. Browse to a file or folder from the desktop app, or enter a path directly.
2. Inspect what Quantum found before import.
3. Run the import locally.
4. Review import history and per-file results.
5. Open created archive, import, dataset, and DB locations from the UI.

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

### Run the general import flow
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\runImportSource.ts "C:\path\to\source" "organized_output"
```

### Read import history
```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\readImportHistory.ts "organized_output" 8
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

