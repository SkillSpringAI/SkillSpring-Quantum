# Next Five Slices - 2026-07-12

This note updates the implementation sequence after the July 12, 2026 full-repo assessment and verification pass.

It is based on:

- `docs/SKILLSPRING_QUANTUM_REFERENCE.md`
- `docs/SKILLSPRING_QUANTUM_MVP_ROADMAP.md`
- `docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md`
- `README.md`
- Full test suite verification (36/36 tests passing)
- Full TypeScript compilation verification (zero errors)
- Full Vite production build verification (successful)

## Baseline Checkpoint

As of July 12, 2026, the repo has been verified to be in a materially stronger state than earlier in the month:

1. **Settings output root persistence** is fully wired across all 8+ screens (Dashboard, Imports, Organized Output, Datasets, Diagnostics, Review Queue, DB Browser, Retrieval)
2. **Hardcoded dev paths have been eliminated** from the UI layer
3. **Archive filtering is richer** with source dropdown, date range, and clear-all controls
4. **Attachment visibility is clearer** in Dashboard and import history
5. **Screen handoffs are tighter** with auto-select newest file in archive and auto-sync dataset run selection
6. **Review queue empty states** provide contextual guidance instead of generic messages
7. **36/36 tests pass** cleanly
8. **TypeScript compiles without errors**
9. **Vite production build succeeds**
10. **The import-hardening work from July 8-9** (rerun reuse, resume checkpoints, retry ordering) is verified present and functional

## What This Assessment Changed

The full-repo read-through surfaced that several items previously flagged as "next slices" were already implemented in the July 9 commit:

- Settings output root persistence and hardcoded-path removal
- Richer archive filtering (source, date range)
- Attachment metadata surfacing in Dashboard and import history
- Auto-select behaviors in archive and dataset screens
- Review queue contextual empty states

This means the immediate priority list should shift forward rather than re-implementing what is already in place.

## Priority Order

1. **Heavy-import progress trust and retry explanation**
2. **Cache correctness and reuse invalidation hardening**
3. **Focused Electron manual retest**
4. **UI controls for promotion, purge restore, and folder merge**
5. **Reusable first-run onboarding and walkthrough path**

## Slice 1: Heavy-Import Progress Trust And Retry Explanation

### Goal

Make long-running shard retries feel explainable, active, and honest instead of merely busy.

### Why this comes first

- The July 8 pass moved the user pain from already-imported shards to the remaining heavy failed shards
- The roadmap already calls this the next beta-readiness slice
- Clearer progress language improves trust immediately without requiring another architecture swing
- This is the single highest-impact user-facing improvement remaining before outside beta

### Likely code targets

- `core/imports/sourceIntake.ts`
- `core/imports/runImportSource.ts`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/utils/importTrust.ts`
- Import-result wording tests under `tests/parser/`

### Implementation shape

- Distinguish:
  - preparing files
  - verifying previous output
  - reusing completed shard
  - resuming interrupted shard
  - retrying failed shard
  - actively parsing conversation X of Y
  - writing archive output
  - writing dataset output
- Prefer honest elapsed time or duration-range guidance over fake precision
- Make it clearer what has already been safely preserved or reused before the current long step

### Acceptance criteria

- Heavy reruns no longer read like a frozen generic import
- Retry versus resume state is visible in both backend messages and UI wording
- Users can tell what work was skipped, resumed, retried, or newly processed
- Progress language stays honest when exact ETA is unknown

## Slice 2: Cache Correctness And Reuse Invalidation Hardening

### Goal

Make "already imported successfully" a trustworthy statement even when the code, schema, or relevant processing behavior changes.

### Why this comes second

- The current fast identity based on file path, size, and modification time is useful for lookup but too weak as the final authority for reuse
- The July 8 optimization work is only aligned with the MVP if reused outputs stay trustworthy
- Stale cache reuse would quietly damage the product's trust promise more than a slow rerun would
- This is foundational but should not block user-facing progress improvements

### Likely code targets

- `core/imports/sourceIntake.ts`
- `core/imports/importMetadata.ts`
- `core/imports/readImportHistory.ts`
- Any success-ledger helpers under `core/imports/`
- Tests around sharded reruns and import metadata under `tests/parser/`

### Implementation shape

- Add stronger reuse metadata such as:
  - source hash
  - parser version
  - pipeline version
  - output schema version
  - relevant config hash
- Keep a fast metadata lookup for candidate reuse detection
- Require stronger verification before authoritative reuse when possible
- Treat older ledger entries without the stronger fields as legacy records that may need upgrade or revalidation

### Acceptance criteria

- Unchanged reruns still skip quickly
- Reruns after meaningful parser or pipeline changes do not silently reuse stale outputs
- Legacy reuse records degrade safely instead of being trusted forever
- Tests cover both valid reuse and forced invalidation paths

## Slice 3: Focused Electron Manual Retest

### Goal

Validate that the ordinary Quantum workflow communicates the hardened import behavior clearly in the real desktop shell.

### Why this comes third

- The repo has a stronger deterministic baseline, but the user-facing trust question is still a UI and workflow question
- The next onboarding pass should be informed by direct observation of the hardened flow
- This keeps us from polishing explanatory copy around behavior that still feels wrong in practice
- The July 12 assessment verified code correctness; now verify user experience

### Likely code targets

- `docs/MORNING_MANUAL_TEST_NOTE.md`
- `docs/MANUAL_TEST_SCRIPT_2026-07-09.md`
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/screens/OrganizedOutputScreen.tsx`
- `ui/app/src/screens/DatasetsScreen.tsx`
- `ui/app/src/screens/RetrievalScreen.tsx`

### Implementation shape

- Run the ordinary path:
  - inspect
  - import
  - import history
  - readable archive
  - dataset review
  - find imports
- Explicitly validate:
  - quick rerun acknowledgement for already imported files
  - visible heavy retry versus resume state
  - archive handoff clarity
  - dataset handoff clarity
  - retrieval continuity from a real import
  - settings output root persistence works across screens

### Acceptance criteria

- The real Electron workflow reflects the new import behavior honestly
- Any remaining trust gaps are written down concretely for follow-up
- The walkthrough can be reused for both internal verification and outside beta prep

## Slice 4: UI Controls For Promotion, Purge Restore, And Folder Merge

### Goal

Surface the existing backend capabilities (promotion, purge restore, folder merge) through deliberate UI controls in their relevant screens.

### Why this comes fourth

- These capabilities exist in the backend and are documented in CLI scripts but lack UI controls
- `db:promote` is available via `npm run db:promote` but has no UI button in Review Queue or Datasets
- `purge:restore` is available via `npm run purge:restore` but has no UI control in Organized Output
- `folders:merge` is available via `npm run folders:merge` but has no UI control in Organized Output
- Adding these controls completes the workflow without adding new backend complexity
- These should stay behind deliberate access (Extra Tools or contextual menus) to avoid cluttering the primary surface

### Likely code targets

- `ui/app/src/screens/ReviewQueueScreen.tsx` — add Promote button after review decisions
- `ui/app/src/screens/OrganizedOutputScreen.tsx` — add Purge Restore and Folder Merge behind Extra Tools
- `ui/app/src/screens/DatasetsScreen.tsx` — add Promote button for curated records
- `ui/app/src/services/dbBridge.ts` or new bridge files for promotion/purge/merge IPC

### Implementation shape

- Wire existing IPC endpoints to new UI buttons
- Keep buttons contextual (only show when relevant)
- Add confirmation dialogs for destructive operations (purge restore, merge)
- Show status feedback after operations complete

### Acceptance criteria

- Promotion is reachable from Review Queue and Datasets screens
- Purge restore is reachable from Organized Output Extra Tools
- Folder merge is reachable from Organized Output Extra Tools
- Operations show clear status feedback
- No new backend code required (pure UI wiring)

## Slice 5: Reusable First-Run Onboarding And Walkthrough Path

### Goal

Keep the first-use story simple and reusable once the import-hardening foundation above is stable enough to present cleanly.

### Why this comes fifth

- Onboarding still matters, but it should reinforce a trustworthy workflow rather than distract from unresolved import behavior
- The roadmap already positions onboarding as a beta-readiness slice
- A stable walkthrough path will help both outside testers and future tutorial material
- This should come after the UI control slice because the complete workflow (including promotion, restore, merge) should be part of the walkthrough context

### Likely code targets

- `ui/app/src/components/FirstRunGuide.tsx` (if it exists, or create)
- `ui/app/src/screens/ImportsScreen.tsx`
- `ui/app/src/state/navigationContext.tsx`
- `docs/MORNING_MANUAL_TEST_NOTE.md`
- Optional new walkthrough-support docs or media notes

### Implementation shape

- Keep the ordinary path explicit:
  - import
  - readable archive
  - dataset review
  - find imports
- Reduce first-run explanation density
- Keep advanced/operator surfaces hidden unless they become relevant
- Define one reusable walkthrough flow for internal retests and outside beta sessions
- Consider a short tutorial video or animated walkthrough demonstrating the import → archive → dataset path

### Acceptance criteria

- A first-time user can understand the path without studying internal terminology first
- Onboarding supports the real workflow instead of competing with it
- The walkthrough is stable enough to reuse in future manual sessions
- Advanced controls (promotion, purge, merge, governance) are discoverable but not front-and-center

## Guardrails Across All Five Slices

- Do not let cache reuse become faster at the cost of trust
- Do not use fake progress precision where honest ranges or step wording are better
- Do not leave new import-hardening tests outside the default regression gate
- Do not let walkthrough polish outrun real heavy-import behavior
- Keep the assistant secondary to the deterministic import → archive → dataset → retrieval loop during this sequence
- Keep promotion, purge restore, and folder merge behind deliberate access rather than primary surface

## Recommended Completion Check

When these five slices are in place, the product should be in a stronger position for a small outside beta if:

- Heavy retries feel active and understandable rather than frozen
- Reused import output is invalidated safely when meaningful behavior changes
- The Electron workflow demonstrates the ordinary path clearly after a real import
- UI controls exist for promotion, purge restore, and folder merge
- Onboarding reinforces the current product shape instead of fighting it
- The default regression command covers the import-hardening work that now matters most

## What Changed Since July 9

The July 12 full-repo assessment verified the following were already in place from the July 9 commit:

1. **Settings output root persistence** — `settingsContext.tsx` with localStorage, wired across all screens
2. **Hardcoded path removal** — all screens use `settings.outputRoot` instead of `"organized_output"`
3. **Richer archive filtering** — source dropdown, date range inputs, clear-all button
4. **Attachment visibility** — Dashboard and import history show attachment reference counts
5. **Auto-select behaviors** — newest file auto-selected in archive, latest run auto-synced in datasets
6. **Review queue empty states** — contextual guidance for loading, error, not-built, empty, and all-reviewed

These items were previously flagged as "next slices" but are now verified complete. The priority list above shifts forward accordingly.
