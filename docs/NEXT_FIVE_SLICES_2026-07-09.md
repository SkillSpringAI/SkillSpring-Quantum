# Next Five Slices - 2026-07-09

This note updates the implementation sequence after the July 8, 2026 heavy-import hardening pass.

It is based on:

- `docs/SKILLSPRING_QUANTUM_REFERENCE.md`
- `docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md`
- `docs/MORNING_MANUAL_TEST_NOTE.md`
- `README.md`

## Baseline Checkpoint

As of end of day 2026-07-08, the repo is no longer blocked by whole-folder rerun waste in the same way it was earlier in the week.

The latest import-hardening pass materially improved:

1. rerun-aware reuse of already imported ChatGPT shard files
2. recovery of reusable-success state from recent import history when the success ledger is missing
3. per-conversation resume checkpoints for interrupted streaming ChatGPT shard imports
4. retry ordering so lighter failed shards can run before the heaviest retry candidate
5. import progress counts that better match supported import-ready files

That is meaningful progress, but it does not finish the large-import trust story.

The remaining frustration is now concentrated in:

- whether reused output can be trusted strongly enough
- whether long heavy-shard retries feel legible instead of frozen
- whether the regression gate actually covers the import-hardening work that now matters most
- whether the Electron workflow communicates these improvements clearly enough
- whether onboarding can explain the ordinary path without competing with the import-hardening work

## Priority Order

1. cache correctness and reuse invalidation hardening
2. heavy-import progress trust and retry explanation
3. complete regression-gate coverage for release-relevant suites
4. focused Electron manual retest of the ordinary import workflow
5. reusable onboarding and walkthrough path for outside beta

This order keeps deterministic trust and honest import behavior ahead of broader presentation polish.

## Slice 1: Cache Correctness And Reuse Invalidation Hardening

### Goal

Make "already imported successfully" a trustworthy statement even when the code, schema, or relevant processing behavior changes.

### Why this comes first

- the current fast identity based on file path, size, and modification time is useful for lookup but too weak as the final authority for reuse
- the July 8 optimization work is only aligned with the MVP if reused outputs stay trustworthy
- stale cache reuse would quietly damage the product's trust promise more than a slow rerun would

### Likely code targets

- `core/imports/sourceIntake.ts`
- `core/imports/importMetadata.ts`
- `core/imports/readImportHistory.ts`
- any success-ledger helpers under `core/imports/`
- tests around sharded reruns and import metadata under `tests/parser/`

### Implementation shape

- add stronger reuse metadata such as:
  - source hash
  - parser version
  - pipeline version
  - output schema version
  - relevant config hash
- keep a fast metadata lookup for candidate reuse detection
- require stronger verification before authoritative reuse when possible
- treat older ledger entries without the stronger fields as legacy records that may need upgrade or revalidation

### Acceptance criteria

- unchanged reruns still skip quickly
- reruns after meaningful parser or pipeline changes do not silently reuse stale outputs
- legacy reuse records degrade safely instead of being trusted forever
- tests cover both valid reuse and forced invalidation paths

## Slice 2: Heavy-Import Progress Trust And Retry Explanation

### Goal

Make long-running shard retries feel explainable, active, and honest instead of merely busy.

### Why this comes second

- the July 8 pass moved the user pain from already imported shards to the remaining heavy failed shards
- the roadmap already calls this the next beta-readiness slice
- clearer progress language improves trust immediately without requiring another architecture swing

### Likely code targets

- `core/imports/sourceIntake.ts`
- `core/imports/runImportSource.ts`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/utils/importTrust.ts`
- import-result wording tests under `tests/parser/`

### Implementation shape

- distinguish:
  - preparing files
  - verifying previous output
  - reusing completed shard
  - resuming interrupted shard
  - retrying failed shard
  - actively parsing conversation X of Y
  - writing archive output
  - writing dataset output
- prefer honest elapsed time or duration-range guidance over fake precision
- make it clearer what has already been safely preserved or reused before the current long step

### Acceptance criteria

- heavy reruns no longer read like a frozen generic import
- retry versus resume state is visible in both backend messages and UI wording
- users can tell what work was skipped, resumed, retried, or newly processed
- progress language stays honest when exact ETA is unknown

## Slice 3: Complete Regression-Gate Coverage

### Goal

Make one default test command prove the release-relevant import system rather than only an older subset of suites.

### Why this comes third

- the current `test:all` script misses important newer suites
- import-hardening work is now moving fast enough that an incomplete gate can create false confidence
- this is a small but high-leverage maintenance slice

### Likely code targets

- `package.json`
- `tests/parser/chatgpt-sharded-import-smoke.test.ts`
- `tests/parser/chatgpt-streaming-shard-resume.test.ts`
- `tests/parser/import-metadata.test.ts`
- `tests/parser/import-retrieval-index.test.ts`
- `tests/parser/vendor-import-smoke.test.ts`
- `tests/parser/command-catalog.test.ts`
- `tests/parser/agent-config-path.test.ts`
- `tests/parser/model-selection.test.ts`

### Implementation shape

- either expand `test:all` or introduce clearer release-gate commands such as:
  - `test:core`
  - `test:imports`
  - `test:assistant`
  - `test:ci`
- ensure the sharded import, resume, metadata, retrieval, smoke, and assistant-boundary suites are part of the release gate

### Acceptance criteria

- one command covers the suites needed for today’s MVP-facing hardening work
- "all tests passed" means the current import and rerun system was actually exercised
- the command structure remains readable for daily use

## Slice 4: Focused Electron Manual Retest

### Goal

Validate that the ordinary Quantum workflow communicates the new import-hardening behavior clearly in the real desktop shell.

### Why this comes fourth

- the repo already has a stronger deterministic baseline, but the user-facing trust question is still a UI and workflow question
- the next onboarding pass should be informed by direct observation of the hardened flow
- this keeps us from polishing explanatory copy around behavior that still feels wrong in practice

### Likely code targets

- `docs/MORNING_MANUAL_TEST_NOTE.md`
- `docs/MANUAL_TEST_SCRIPT_2026-07-02.md`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/screens/OrganizedOutputScreen.tsx`
- `ui/app/src/screens/DatasetsScreen.tsx`
- `ui/app/src/screens/RetrievalScreen.tsx`

### Implementation shape

- run the ordinary path:
  - inspect
  - import
  - import history
  - readable archive
  - dataset review
  - find imports
- explicitly validate:
  - quick rerun acknowledgement for already imported files
  - visible heavy retry versus resume state
  - archive handoff clarity
  - dataset handoff clarity
  - retrieval continuity from a real import

### Acceptance criteria

- the real Electron workflow reflects the new import behavior honestly
- any remaining trust gaps are written down concretely for follow-up
- the walkthrough can be reused for both internal verification and outside beta prep

## Slice 5: Reusable First-Run Onboarding And Walkthrough Path

### Goal

Keep the first-use story simple and reusable once the import-hardening foundation above is stable enough to present cleanly.

### Why this comes fifth

- onboarding still matters, but it should reinforce a trustworthy workflow rather than distract from unresolved import behavior
- the roadmap already positions onboarding as a beta-readiness slice
- a stable walkthrough path will help both outside testers and future tutorial material

### Likely code targets

- `ui/app/src/components/FirstRunGuide.tsx`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/state/navigationContext.tsx`
- `docs/MORNING_MANUAL_TEST_NOTE.md`
- optional new walkthrough-support docs or media notes

### Implementation shape

- keep the ordinary path explicit:
  - import
  - readable archive
  - dataset review
  - find imports
- reduce first-run explanation density
- keep advanced/operator surfaces hidden unless they become relevant
- define one reusable walkthrough flow for internal retests and outside beta sessions

### Acceptance criteria

- a first-time user can understand the path without studying internal terminology first
- onboarding supports the real workflow instead of competing with it
- the walkthrough is stable enough to reuse in future manual sessions

## Guardrails Across All Five Slices

- do not let cache reuse become faster at the cost of trust
- do not use fake progress precision where honest ranges or step wording are better
- do not leave new import-hardening tests outside the default regression gate
- do not let walkthrough polish outrun real heavy-import behavior
- keep the assistant secondary to the deterministic import -> archive -> dataset -> retrieval loop during this sequence

## Recommended Completion Check

When these five slices are in place, the product should be in a stronger position for a small outside beta if:

- reused import output is invalidated safely when meaningful behavior changes
- heavy retries feel active and understandable rather than frozen
- the default regression command covers the import-hardening work that now matters most
- the Electron workflow demonstrates the ordinary path clearly after a real import
- onboarding reinforces the current product shape instead of fighting it
