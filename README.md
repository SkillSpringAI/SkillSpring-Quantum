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

## Core pipeline

Parse -> Normalize -> Segment -> Group -> Deduplicate -> Purge or Retain -> Export -> Extract Datasets -> Log Diagnostics

## Current capabilities

### Parsing
- Bulk ChatGPT export parsing
- Multi-file shard handling such as conversations-000.json
- Full message extraction from conversation mappings
- Support for multiple conversations per file

### Segmentation and grouping
- Deterministic topic segmentation
- Window-based snippet extraction
- Canonical topic normalization
- Folder grouping for similar snippets
- Topic drift splitting so mixed conversations do not stay as one blob

### Export and file handling
- Markdown snippet export
- Primary file write logic
- Duplicate suppression by content hash
- Single-backup allowance
- Archive handling for replaced files
- Purge routing for low-value segments
- Restore queue for purged files

### Dataset extraction
- Versioned dataset output
- Topic segment JSONL export
- Prompt-response pair JSONL export
- Micro-segment JSONL export
- Current rolling dataset outputs
- Run manifests for dataset generation

### Dataset hygiene
- Signal scoring
- High-signal / low-signal / private-review routing
- Basic redaction hooks
- Private review escalation
- Waste classification and purge handling

### Diagnostics and internal record keeping
- Run diagnostics per execution
- Latest-run and historical diagnostic artifacts
- Failure logging
- Health reports
- Threshold warnings for:
  - duplicate rate
  - private review rate
  - low segment yield
  - purge rate

## Output structure

A typical output root looks like this:

`	ext
organized_output/
+-- archive/
+-- backup/
+-- purge/
¦   +-- purge-manifest.jsonl
¦   +-- <topic folders>
+-- restore_queue/
+-- diagnostics/
¦   +-- latest-run.json
¦   +-- health-report.json
¦   +-- history/
¦   +-- failures/
+-- datasets/
¦   +-- current/
¦   +-- manifests/
¦   +-- topic_segments/
¦   ¦   +-- v1/
¦   +-- prompt_response_pairs/
¦   ¦   +-- v1/
¦   +-- micro_segments/
¦       +-- v1/
+-- <topic folders>
+-- index.jsonDesign stance

SkillSpring Quantum follows a simple rule:

deterministic first
auditable before clever
enrichment later, not as a crutch

The parser, segmentation logic, dedupe, purge, dataset routing, and diagnostics should stand on their own before local model enrichment is introduced.

Current scripts
Process a single export shard
npm run dev -- "C:\Users\Laptop\Desktop\ChatGPT Exports\conversations-000.json" "organized_output"
Run diagnostics report
npm run diag:run
Restore a purged file
npm run purge:restore -- "organized_output\purge\some_folder\some_file.md" "organized_output"
Current configuration source of truth

Program-level versioning is tracked in:

config/programManifest.json

This currently records:

program version
pipeline version
dataset version
topic rules version
segmentation version
redaction version
diagnostics version
What the system is not yet

The project is not yet:

semantically clustered with local embeddings
Ollama-enriched
curated for production-grade training use
fully redaction-hardened
semantically deduplicated
equipped with dataset promotion workflows
Near-term roadmap
1. Tighten grouping
alias collapse
more aggressive canonical topic merging
near-duplicate detection beyond exact hash matches
2. Tighten datasets
include/exclude topic filters
processed vs curated dataset layers
dataset promotion path
smaller and cleaner reusable records
3. Tighten governance
stronger internal diagnostics
run-level integrity checks
version-aware migration notes
output sanity guards
4. Add enrichment later
local Ollama summaries
cleaner topic naming
semantic grouping assist
optional enrichment only after deterministic pipeline quality is stable
Practical principle

Raw exports are not datasets.
Raw exports are feedstock.

SkillSpring Quantum exists to refine that feedstock into something structured, smaller, reusable, and inspectable.
