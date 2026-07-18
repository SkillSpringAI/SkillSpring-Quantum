# Pipeline Refactor Implementation

## Status

Temporary implementation plan.

## Audience

This document is for contributors and maintainers working on `core/pipeline/pipeline.ts`.

## Purpose

Capture the intended refactor of the main conversation pipeline before code is moved.

This file exists to prevent drift while the refactor is in progress and should be removed or archived once the new structure is stable and reflected in permanent technical documentation.

## Current context

As of **Saturday, July 18, 2026**:

- `core/pipeline/pipeline.ts` has grown into the main orchestration point for multiple distinct responsibilities
- legacy ChatGPT `chat.html` support has just been restored and moved onto the streaming import lane
- the file is now carrying orchestration, streaming execution, segment export behavior, dataset summary handling, and source-loading helpers in one place
- the immediate goal is structure and maintainability, not behavior change

## Guiding principle

Refactor around stable responsibilities, not around arbitrary line-count targets.

The pipeline should stay easy to reason about during incidents, regressions, and importer changes.

## Goals

- reduce the responsibility load inside `core/pipeline/pipeline.ts`
- keep runtime behavior stable while code moves
- make the ChatGPT streaming lane easier to test in isolation
- isolate segment-processing side effects from high-level pipeline orchestration
- leave a clearer path for future vendor-specific pipeline helpers

## Non-goals

- no product behavior redesign
- no dataset schema changes
- no import history format changes unless required by the refactor
- no broad renaming just for style

## Candidate extraction order

### Priority 1 - ChatGPT streaming module

Move the streaming-specific logic out first.

Candidate responsibilities:

- `runStreamingChatGptPipeline(...)`
- streaming checkpoint load/save/clear helpers
- streaming aggregate helpers
- streaming dataset flush/finalize helpers

Candidate destination:

- `core/pipeline/streamingChatGptPipeline.ts`

Why first:

- this is already a self-contained execution lane
- it owns its own batching and checkpoint behavior
- it is the clearest source of future drift if left embedded in the main file

Status:

- [x] Complete

### Priority 2 - Segment processing module

Move per-conversation segment export work into a dedicated helper module.

Candidate responsibilities:

- `processConversationSegments(...)`
- waste filtering path
- markdown export path
- archive notification writes
- index updates that are local to segment export

Candidate destination:

- `core/pipeline/conversationSegmentProcessing.ts`

Why second:

- this is the main side-effect-heavy unit
- it should be testable separately from vendor detection and streaming flow

Status:

- [x] Complete

### Priority 3 - Input and source-context helpers

Move source-loading helpers that do not belong to orchestration.

Candidate responsibilities:

- `readConversationImportSource(...)`
- `summarizePackageCompanionContext(...)`

Candidate destination:

- `core/pipeline/pipelineInput.ts`

Why third:

- smaller win than the two modules above
- useful once the larger execution paths are extracted

Status:

- [x] Complete

## Guardrails

- keep public function signatures stable unless there is a strong reason to change them
- preserve the current import result behavior for legacy ChatGPT HTML and shard-first ChatGPT packages
- keep streaming resume behavior intact
- run focused tests after each extraction, not only at the end
- avoid mixing refactor-only commits with broader docs or UI work

## Verification checklist

- [ ] `npm run test:import:intake`
- [ ] `npx tsx tests/parser/chatgpt-streaming-shard-resume.test.ts`
- [ ] `npm run build`
- [ ] legacy ChatGPT HTML smoke path still passes
- [ ] shard-first ChatGPT reuse path still passes

## Done criteria

This temporary plan can be removed or archived when:

- `core/pipeline/pipeline.ts` is materially smaller
- ChatGPT streaming behavior lives outside the main file
- segment-processing side effects live outside the main file
- the compile and targeted import tests remain green
- the technical docs describe the new layout instead of this temporary plan
