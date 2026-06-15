# SkillSpring Quantum

SkillSpring Quantum is a local-first conversation parsing, segmentation, organization, and dataset extraction engine built to turn exported AI chats into structured, auditable knowledge assets.

It is designed to process bulk ChatGPT exports deterministically first, then support smarter enrichment later.

## Current purpose

The system converts raw exported conversation data into:

- organized markdown snippets
- canonical topic folders
- deduplicated output sets
- dataset-ready JSONL records
- diagnostics and audit artifacts
- purge and restore workflows for low-value material
- tiered local data storage for raw, processed, curated, and private-review records
- manifest-backed curated promotion workflows
- a review queue for near-curated records
- manual approve/reject decisions for review queue records

## Core pipeline

Parse -> Normalize Raw -> Store Tier0 -> Segment -> Group -> Deduplicate -> Purge or Retain -> Export -> Extract Datasets -> Route to Tiered DB -> Build Review Queue -> Approve/Reject Review Queue -> Promote Curated Records -> Log Diagnostics

## Review and promotion
- review queue for near-curated records
- manual approve/reject workflow for queue items
- manifest-backed promotion from processed to curated
- rule-based review and promotion controls
- explicit rejection reasons
- latest manifests plus historical manifest snapshots

## Current scripts

### Process a single export shard
```powershell
npm run run:file -- "C:\Users\Laptop\Desktop\ChatGPT Exports\conversations-000.json" "organized_output"
```

### Run full batch
```powershell
npm run batch:run
npm run batch:diag
npm run batch:delta
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

