# Pipeline

## Audience

This document is for developers and maintainers.

## Core flow

Quantum's current deterministic spine is:

Inspect export -> Import source -> Normalize conversations -> Segment content -> Generate archive -> Generate dataset artifacts -> Write history and retrieval records -> Emit diagnostics

## Current module layout

The pipeline orchestration now lives in focused modules rather than one large implementation file.

- `core/pipeline/pipeline.ts`
  - owns top-level orchestration
  - runs preflight
  - chooses between the standard import lane and the ChatGPT streaming lane
  - coordinates diagnostics, dataset export, and post-import health signals

- `core/pipeline/streamingChatGptPipeline.ts`
  - owns the streaming ChatGPT import lane
  - handles shard progress persistence and reuse-safe resume behavior
  - batches dataset writes during large legacy HTML and shard-first imports
  - finalizes streaming dataset summary metadata

- `core/pipeline/conversationSegmentProcessing.ts`
  - owns per-conversation segment work
  - applies waste filtering
  - writes markdown archive output
  - records archive notifications and local index updates

- `core/pipeline/pipelineInput.ts`
  - loads raw import input
  - determines when HTML and CSV should stay as raw text
  - summarizes package companion context used in import metadata

## Execution lanes

### Standard import lane

Use this for imports that can be parsed into a complete in-memory conversation set first.

High-level flow:

1. preflight resolves the input file and output root
2. the source is loaded and vendor detection runs
3. conversations are normalized and optional attachment archiving runs
4. raw conversations are ingested
5. per-conversation segment processing writes archive output
6. dataset artifacts, retrieval data, and diagnostics are finalized

### Streaming ChatGPT lane

Use this for large ChatGPT exports where full eager parsing is less trustworthy or less memory-friendly.

High-level flow:

1. source text is inspected for streamable ChatGPT structure
2. conversations are iterated one at a time
3. raw ingest and segment processing happen per conversation
4. dataset writes are flushed in batches
5. shard progress is persisted so reruns can resume safely
6. final dataset summary and diagnostics are written at the end

This is the lane that now handles restored legacy `chat.html` support as well as shard-first ChatGPT exports.

## Main outcomes

- readable markdown archives
- import history
- retrieval indexes
- privacy-aware dataset artifacts
- diagnostic artifacts

## Design rules

- source material remains local
- import results must be inspectable
- retries and reruns should be trustworthy
- downstream outputs must stay grounded in canonical source facts

## Maintenance notes

- Keep orchestration concerns in `pipeline.ts` and push lane-specific logic into helper modules.
- Treat the streaming ChatGPT lane as a separate execution path with its own resume and batching behavior.
- Prefer updating this document when the module layout changes instead of creating long-lived temporary implementation notes.
