# Next Five Slices - 2026-07-05

This note turns the current roadmap direction into a practical working sequence with code targets and acceptance criteria.

It is based on:

- `docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md`
- `docs/EXTERNAL_TEST_IMPLEMENTATION_NOTES_2026-07-04.md`
- `docs/LOCAL_AI_INTEGRATION_ACTION_PLAN_2026-07-05.md`

## Progress Note

As of 2026-07-05:

- slice 1 is implemented
- slice 2 is implemented
- slice 3 is implemented
- slice 4 is implemented
- slice 5 is implemented as a narrow v1 command bridge

Recent outcomes from slices 3 and 4:

- topic and segment labeling is less dependent on maintainer-specific technical phrasing
- mixed-domain segmenting is now covered by a dedicated deterministic test
- retrieval entries now carry evidence-source cues and recommended next-step labels
- Find Imports explains match reasons more clearly and points users toward archive or dataset follow-up
- Ask Quantum now routes a narrow set of plain-language requests into validated Quantum actions before falling back to freeform explanation

## Priority Order

1. visible import progress
2. vendor smoke-test suite
3. corpus-agnostic parser hardening
4. retrieval quality and evidence-grounded labeling
5. natural-language command bridge v1

This order keeps import trust and deterministic quality ahead of deeper assistant behavior.

## Slice 1: Visible Import Progress

### Goal

Make long-running import and indexing work feel active instead of silent.

### Why this comes first

- directly improves outside-user trust
- supports manual testing immediately
- reduces the "did it freeze?" problem before deeper parser work

### Likely code targets

- `core/imports/runImportSource.ts`
- `core/pipeline/pipeline.ts`
- `electron/ipc/registerIpc.cjs`
- `electron/preload.cjs`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/types/bridge.ts`
- `ui/app/src/services/desktopBridge.ts`

### Implementation shape

- expose deterministic stage updates such as:
  - checking source
  - reading export
  - normalizing records
  - segmenting conversations
  - writing archive
  - writing datasets
  - writing import history
- surface stage text first
- add percentage only if it can be defended honestly
- keep progress visible in Imports without turning it into an operator console

### Acceptance criteria

- users see stage updates while an import is running
- the UI never pretends work is finished before the import result exists
- error states still show the last meaningful stage reached
- clean imports, fallback imports, and failed imports all surface understandable progress text

## Slice 2: Vendor Smoke-Test Suite

### Goal

Add a small deterministic safety net for the ordinary import path across the current MVP vendor set.

### Why this comes second

- protects parser changes
- lowers regression risk before generalization work
- creates a stable base for future agent-assisted explanation

### Likely code targets

- `tests/parser/chatgpt-source-intake.test.ts`
- `tests/parser/claude-source-intake.test.ts`
- `tests/parser/copilot-source-intake.test.ts`
- `tests/parser/vendor-package-source-intake.test.ts`
- `tests/parser/import-history-filter.test.ts`
- `tests/parser/import-metadata.test.ts`
- `tests/fixtures/vendor-exports/`
- `package.json`

### Implementation shape

- create one smoke entry point for the ordinary flow
- verify:
  - source inspection works
  - import completes or honestly falls back
  - archive output artifacts exist
  - dataset summary artifacts exist where expected
  - import history and retrieval index records are written
- prefer fixture-backed assertions over fragile text snapshots for everything

### Acceptance criteria

- one command runs the vendor smoke checks for the current first-class vendor set
- failures clearly identify which vendor path regressed
- the suite stays fast enough for routine use during parser work

## Slice 3: Corpus-Agnostic Parser Hardening

### Goal

Reduce overfitting to the maintainer's own wording, topics, and conversation habits.

### Why this comes third

- this is the highest-risk quality issue for outside beta
- it improves both archive usefulness and dataset usefulness
- it should happen before more ambitious semantic layering

### Likely code targets

- `core/pipeline/segmenter.ts`
- `core/pipeline/topicNormalizer.ts`
- `core/pipeline/topicScorer.ts`
- `core/pipeline/signalScorer.ts`
- `core/pipeline/filters.ts`
- `core/pipeline/exporter.ts`
- `tests/pipeline/segmenter.test.ts`
- `tests/pipeline/topic-drift-segmenter.test.ts`
- new cross-domain fixtures under `tests/fixtures/`

### Implementation shape

- widen fixture coverage across:
  - technical conversations
  - admin and life-management conversations
  - hobby and casual conversations
  - mixed-topic conversations
- reduce narrow hand-tuned labels when they depend too much on familiar vocabulary
- prefer user-phrase-led summaries when possible
- preserve deterministic behavior rather than adding speculative inference

### Acceptance criteria

- mixed-topic fixtures produce sensible boundaries without collapsing everything into one theme
- topic labels remain readable across unfamiliar domains
- the parser does not depend on your personal recurring project names to look good
- new fixtures pass through the same deterministic path without special-case hacks

## Slice 4: Retrieval Quality And Evidence-Grounded Labeling

### Goal

Make Find Imports and related retrieval views easier to trust and easier to act on.

### Why this comes fourth

- retrieval is the bridge between deterministic parsing and future assistant usefulness
- better match explanations reduce confusion for outside users
- this improves standalone product value even before deeper AI integration

### Likely code targets

- `core/imports/importRetrievalIndex.ts`
- `core/imports/readImportRetrievalIndex.ts`
- `core/pipeline/segmentRetrievalIndex.ts`
- `core/pipeline/readSegmentRetrievalIndex.ts`
- `ui/app/src/screens/RetrievalScreen.tsx`
- `ui/app/src/services/commandCatalog.ts`
- `ui/app/src/utils/datasetIntent.ts`
- retrieval-related parser tests

### Implementation shape

- improve result summaries so users can tell:
  - why a record matched
  - whether the evidence came from archive, import metadata, or dataset segments
  - what next action makes sense
- strengthen archive-to-dataset handoff cues in retrieval results
- keep labels grounded in deterministic evidence artifacts rather than speculative enrichment

### Acceptance criteria

- search results explain match evidence in plain language
- users can follow a result into archive or dataset context without losing the thread
- retrieval labels are more helpful than raw internal topic names alone
- saved investigations still behave predictably after label improvements

## Slice 5: Natural-Language Command Bridge V1

### Goal

Ship the first meaningful local-AI integration milestone without making the agent a competing product surface.

### Why this comes fifth

- the docs explicitly say AI should not outrun import reliability
- by this point the app will be more stable, more tested, and easier to explain
- this begins the assistant layer at the correct deterministic boundary

### Likely code targets

- `skillspring-quantum-agent/agent/main.ts`
- `skillspring-quantum-agent/agent/core/agent.ts`
- `skillspring-quantum-agent/agent/core/agentFactory.ts`
- `skillspring-quantum-agent/agent/types/index.ts`
- `skillspring-quantum-agent/agent/config/agentManifest.json`
- `ui/app/src/components/AgentAssistantDrawer.tsx`
- `ui/app/src/state/agentContext.tsx`
- `electron/ipc/registerIpc.cjs`
- `electron/preload.cjs`

### Implementation shape

- define a narrow capability registry
- translate plain-language requests into supported structured commands
- validate commands before execution
- keep first supported actions narrow:
  - inspect export
  - import export
  - explain import result
  - open output location
  - search completed outputs
  - rebuild derived outputs
- require clarification for ambiguous or risky requests
- keep every answer source-grounded

### Acceptance criteria

- the app still works normally when the local agent is unavailable
- a user can ask for a supported action in normal language
- the request becomes a validated structured command
- Quantum runs the deterministic action rather than a freeform agent shortcut
- the assistant explains the result and points back to evidence artifacts

## Guardrails Across All Five Slices

- do not make diagnostics or governance more prominent than the ordinary loop
- do not let the agent become the main product before retrieval quality is stronger
- do not trade deterministic trust for smarter-looking but less explainable behavior
- prefer small reversible slices with clear tests or walkthrough checks

## Recommended Completion Check

When these five slices are done, the product should be ready for a stronger outside beta pass if:

- imports feel alive and understandable while running
- the current first-class vendors have a reliable smoke-test safety net
- parser quality no longer depends heavily on your own corpus
- retrieval results are easier to trust and act on
- the first chat-style assistant actions stay within a deterministic command boundary
