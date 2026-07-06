# Next Five Slices - 2026-07-06

This note translates the current roadmap and recent manual validation into the next implementation sequence after the July 5 beta-hardening pass and the July 6 assistant runtime follow-through.

It is based on:

- `docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md`
- `docs/SKILLSPRING_QUANTUM_REFERENCE.md`
- `docs/LOCAL_AI_INTEGRATION_ACTION_PLAN_2026-07-05.md`
- `docs/LOCAL_AGENT_RUNTIME_CONTRACT_2026-07-04.md`
- `docs/PARSER_RETRIEVAL_HARDENING_PLAN_2026-07-02.md`

## Baseline Checkpoint

As of 2026-07-06, the previous five-slice sequence is substantially complete:

1. visible import progress
2. vendor smoke-test suite
3. corpus-agnostic parser hardening
4. retrieval quality and evidence-grounded labeling
5. narrow natural-language command bridge v1

Additional assistant-runtime follow-through is now also in place:

- local model compatibility detection for Ollama-backed LLM and embedding setup
- clearer assistant prerequisite summaries
- in-app model install guidance
- assistant start/status fixes so a running local server is reflected honestly in the drawer

That means the next work should not restart from "make the shell function."

The next work should focus on making the product more trustworthy for unfamiliar users while keeping the assistant grounded, secondary, and evidence-backed.

## Status Update - End Of Day 2026-07-06

The first two slices in this sequence are now materially implemented.

### Slice 1 now landed

- parser and classifier behavior were hardened against unfamiliar personal-admin, hobby, household, and mixed-topic phrasing
- summary-label generation now avoids more helper-word-heavy or maintainer-specific output
- topic and intent handling now has broader regression coverage for everyday-user phrasing instead of only repo-shaped internal language

### Slice 2 now landed

- retrieval entries now carry clearer structured evidence details instead of only flat source cues
- import and segment ranking now explain match reasons in more human terms
- adjacent wording drift is handled better for retrieval matching
- retrieval can now hand users into dataset review with a clearer preserved intent path instead of losing the meaning of the selected result

### Tomorrow morning queue

1. first-run beta onboarding and reusable walkthrough path
2. assistant source-grounding and deterministic-boundary hardening
3. assistant install/runtime completion pass

## Priority Order

1. corpus-agnostic parser and segmentation hardening
2. retrieval interpretation and trust labeling refinement
3. first-run beta onboarding and reusable walkthrough path
4. assistant source-grounding and deterministic-boundary hardening
5. assistant install/runtime completion pass

This order keeps deterministic trust and user comprehension ahead of deeper assistant behavior.

## Slice 1: Corpus-Agnostic Parser And Segmentation Hardening

### Goal

Make deterministic topic and intent handling hold up across unfamiliar user corpora rather than looking strong mainly on the maintainer's own exports.

### Why this comes first

- the docs repeatedly describe overfitting to the current internal corpus as a beta blocker
- better segmentation improves archive reading, dataset previews, retrieval, and future assistant usefulness all at once
- this is still the highest-leverage trust issue before outside beta

### Likely code targets

- `core/pipeline/segmenter.ts`
- `core/pipeline/topicDriftSegmenter.ts`
- `core/pipeline/topicNormalizer.ts`
- `core/pipeline/signalScorer.ts`
- `core/pipeline/exporter.ts`
- `tests/pipeline/segmenter.test.ts`
- `tests/pipeline/topic-drift-segmenter.test.ts`
- `tests/pipeline/corpus-agnostic-segmenter.test.ts`
- expanded fixtures under `tests/fixtures/`

### Implementation shape

- widen fixture coverage across:
  - technical conversations
  - personal admin conversations
  - hobby and consumer conversations
  - mixed-topic conversations
  - shorter low-context exchanges
- reduce label and segment behavior that quietly depends on recurring maintainer-specific vocabulary
- prefer readable, user-phrase-led summary labels where deterministic evidence allows it
- keep segmentation deterministic and testable rather than compensating with speculative AI inference

### Acceptance criteria

- mixed-topic exports produce sensible shifts without collapsing distinct threads into one bucket
- unfamiliar vocabulary still yields readable topic and intent labels
- the parser does not need recurring maintainer project names or domain language to perform well
- new fixtures pass through the same pipeline without per-corpus hacks

## Slice 2: Retrieval Interpretation And Trust Labeling Refinement

### Goal

Make Find Imports and linked review surfaces easier for outside users to understand, trust, and act on.

### Why this comes second

- retrieval is the bridge between deterministic outputs and future assistant explanation
- the docs consistently treat grounded retrieval as more important than broader assistant autonomy
- outside users need to find what they mean, not only what the parser happened to call it

### Likely code targets

- `core/imports/importRetrievalIndex.ts`
- `core/imports/readImportRetrievalIndex.ts`
- `core/pipeline/segmentRetrievalIndex.ts`
- `core/pipeline/readSegmentRetrievalIndex.ts`
- `ui/app/src/screens/RetrievalScreen.tsx`
- `ui/app/src/utils/datasetIntent.ts`
- retrieval-related tests under `tests/parser/` and `tests/pipeline/`

### Implementation shape

- improve result labeling so users can see:
  - why the record matched
  - whether evidence came from import metadata, archive output, or dataset segments
  - what next action makes sense from that result
- tighten the archive-to-dataset handoff cues from retrieval records
- improve adjacent-wording discovery so good results remain visible even when the user's search phrasing differs from parser-normalized labels
- keep every label traceable to deterministic evidence rather than assistant-only interpretation

### Acceptance criteria

- retrieval results explain match evidence in plain language
- users can move into archive or dataset context without losing the meaning of the result
- ranking and labels hold up better across unfamiliar wording
- saved investigations remain stable after the label improvements

## Slice 3: First-Run Beta Onboarding And Reusable Walkthrough Path

### Goal

Make the first-use story simpler for outside testers by showing the ordinary path clearly and reusing one stable walkthrough flow.

### Why this comes third

- the docs explicitly call for a stronger first-run story before outside beta
- you already identified the walkthrough or tutorial concept as a practical complexity-reduction tool
- this helps fresh users understand the product without adding more dense static copy

### Likely code targets

- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/components/FirstRunGuide.tsx`
- `ui/app/src/state/navigationContext.tsx`
- optional supporting assets or docs for a walkthrough script
- `docs/MANUAL_TEST_SCRIPT_2026-07-02.md`
- `docs/MORNING_MANUAL_TEST_NOTE.md`

### Implementation shape

- keep the ordinary path explicit:
  - import
  - readable archive
  - dataset review
  - find imports when needed
- refine the first-run overlay so it feels like one short orienting moment, not another dense instruction wall
- define a stable walkthrough path that can support:
  - internal manual checks
  - outside beta onboarding
  - a future tutorial video or embedded example walkthrough
- continue hiding or deferring operator-only explanation unless the user actually needs it

### Acceptance criteria

- a first-time user can understand the recommended path without prior repo context
- the first-run surface reinforces the current workflow instead of competing with it
- one walkthrough path can be reused consistently in manual and outside beta sessions
- onboarding reduces confusion without introducing another permanent dense panel

## Slice 4: Assistant Source-Grounding And Deterministic-Boundary Hardening

### Goal

Make `Ask Quantum` more trustworthy by strengthening its evidence contract and keeping its command scope explicit.

### Why this comes fourth

- the assistant foundation is now usable enough that the next risk is trust drift, not missing plumbing
- the runtime contract says the assistant should interpret evidence, not invent diagnoses or become the main product
- this slice directly supports outside beta confidence

### Likely code targets

- `skillspring-quantum-agent/agent/core/agent.ts`
- `skillspring-quantum-agent/agent/tools/archiveTools.ts`
- `skillspring-quantum-agent/agent/tools/datasetTools.ts`
- `skillspring-quantum-agent/agent/types/index.ts`
- `ui/app/src/components/AgentAssistantDrawer.tsx`
- `ui/app/src/services/commandCatalog.ts`
- assistant-related tests to verify supported command routing and source surfacing

### Implementation shape

- tighten the supported-action contract before freeform explanation runs
- ensure every assistant answer shown in the drawer points back to evidence artifacts when possible
- improve refusal or clarification behavior for ambiguous requests
- keep the assistant attached to the current four-screen workflow instead of letting it become a parallel control surface

### Acceptance criteria

- supported actions remain explicit, validated, and deterministic
- assistant answers point back to imports, archive files, dataset previews, or retrieval records
- unsupported or risky requests are clarified or refused instead of improvised
- the assistant feels like a contextual explainer, not a second product

## Slice 5: Assistant Install/Runtime Completion Pass

### Goal

Finish the local assistant readiness path so it behaves like a complete beta-facing feature instead of a partial operator tool.

### Why this comes fifth

- the recent runtime fixes solved important confusion, but the install/start/degraded loop still needs completion
- this should happen after the more important parser, retrieval, and onboarding trust slices stay on track
- the assistant should help the beta workflow, not become the next long detour

### Likely code targets

- `electron/ipc/registerIpc.cjs`
- `electron/preload.cjs`
- `ui/app/src/components/AgentAssistantDrawer.tsx`
- `ui/app/src/services/desktopBridge.ts`
- `ui/app/src/services/mockDesktopExecutor.ts`
- `skillspring-quantum-agent/agent/README.md`
- assistant setup/runtime docs if needed

### Implementation shape

- show clearer install progress and post-install refresh behavior
- improve degraded-state copy when the assistant cannot run well on low-memory hardware
- make low-memory warnings honest without making the install path feel broken
- ensure the drawer can distinguish:
  - assistant not started
  - assistant started and healthy
  - assistant installed but not fully capable
  - missing compatible model
  - low-memory caution
- keep auto-start attempts scoped to assistant use rather than app launch

### Acceptance criteria

- install actions visibly do something when triggered
- running, waiting, degraded, and blocked states are distinct in the drawer
- low-memory systems get honest guidance rather than dead-end controls
- the assistant remains optional and non-blocking for the main product loop

## Guardrails Across All Five Slices

- do not make the assistant more prominent than the ordinary import -> archive -> dataset -> retrieval loop
- do not trade deterministic trust for smarter-looking but less explainable behavior
- do not let onboarding become another dense instruction surface
- keep retrieval and assistant interpretation grounded in traceable artifacts
- prefer small reversible slices with tests or walkthrough checks

## Recommended Completion Check

When these five slices are done, the product should be in a stronger position for outside beta if:

- parser and segmentation quality no longer depend heavily on the maintainer's own corpus
- retrieval results are easier to trust, interpret, and follow
- a first-time user can understand the ordinary path quickly
- the assistant behaves like a grounded explainer attached to the workflow
- assistant setup/runtime states feel understandable rather than experimental
