# Next Five Slices - 2026-07-14

This note updates the implementation sequence after the July 13, 2026 integrity and import-trust checkpoint.

It is based on:

- `docs/SKILLSPRING_QUANTUM_MVP_ROADMAP_REVISED_2026-07-12.md`
- `docs/SKILLSPRING_QUANTUM_EXTERNAL_REVIEW_REFINED_2026-07-12.md`
- `docs/SKILLSPRING_QUANTUM_REFERENCE.md`
- `docs/SKILLSPRING_MVP_SCOPE_LOCK.md`
- `docs/MANUAL_WALKTHROUGH_2026-07-12.md`
- Commit `63ab24e` on July 13, 2026: `Tighten import reuse planning and walkthrough flow`

## Baseline Checkpoint

As of July 14, 2026, the priority picture has shifted again:

1. The narrow Gate 1 integrity concerns are largely addressed, not merely hypothesized.
2. Canonical topic-segment identity is now shared across the authoritative review and promotion paths.
3. Recoverable JSONL handling and malformed-line diagnostics now exist for the key review flows.
4. Atomic replacement coverage now exists for authoritative text-file writes that would otherwise risk corrupting later runs.
5. The Imports screen is more honest about checked-path context, revalidation, reuse, and historical follow-up states.
6. Unchanged rerun trust is materially stronger than it was before the July 13 pass.

This means the repo should not spend today's main momentum re-litigating already-closed integrity work unless new evidence appears.

## What Changed Since The July 12 Slice Order

The July 12 queue still placed two items very high:

- heavy-import trust and retry explanation
- cache correctness and reuse invalidation hardening

Those remain important, but the July 13 commit clarified that the next planning step should now be shaped more directly by:

- remaining real-user trust gaps in long-running import states
- output-root and reuse-scope clarity
- package-shape differences within the ChatGPT lane
- the need to complete Gate 2 before jumping too early into operator-only workflow surfacing
- the private-beta requirement for a reproducible packaged build

## Priority Order

1. **Heavy-import retry and resume trust**
2. **Output-root and reuse-scope clarity**
3. **Legacy ChatGPT package handling and wrong-lane safety**
4. **Full Gate 2 Electron walkthrough**
5. **Reproducible Windows beta packaging baseline**

## Slice 1: Heavy-Import Retry And Resume Trust

### Goal

Make long-running retries and interrupted-shard resumes feel active, truthful, and safely bounded.

### Why this comes first

- the unchanged-rerun path is now much stronger than before
- the remaining trust gap is concentrated in heavy work that cannot finish quickly
- the roadmap still treats long-import honesty as core beta readiness
- this improves the main ordinary-user flow without reopening already-resolved architecture questions

### Focus

- sharpen wording for retry versus resume versus revalidation
- surface what has already been preserved safely before the current long step
- keep elapsed-time honesty ahead of fake ETA precision
- make it easier to tell whether Quantum is actively parsing, retrying, or resuming

### Acceptance criteria

- heavy reruns no longer read like a frozen generic import
- retry, resume, and revalidation states are distinguishable in both backend progress and UI copy
- users can tell what work is already safe, what is being retried, and what remains unknown

### Concrete implementation checklist

1. Tighten backend progress semantics in `core/imports/sourceIntake.ts`.
2. Make the initial plan message more explicit about what Quantum already knows before heavy work starts.
3. Distinguish retry, resume, reuse, and revalidation more visibly in `ui/app/src/screens/ImportsScreen.tsx`.
4. Add clearer status-panel lead and next-step language for long-running paths.
5. Add or extend regression coverage for sharded rerun messaging in `tests/parser/chatgpt-sharded-import-smoke.test.ts`.
6. Verify that any new progress state wording still matches `ui/app/src/types/imports.ts`.

### File-level work plan

#### `core/imports/sourceIntake.ts`

- review the `source_ready` and per-file progress messages as one sequence instead of isolated strings
- make the planning step explain the balance of:
  - ready to reuse
  - needs reuse recheck
  - ready to resume
  - full retry
  - new work
- ensure heavy retry messaging says what is already preserved before the active long step
- ensure resume messaging emphasizes checkpointed progress already saved safely
- check whether the writing-history and finalization messages can remind the user that reused output is already being preserved

#### `ui/app/src/screens/ImportsScreen.tsx`

- refine `formatProgressStateLabel()` so long-running states read distinctly at a glance
- refine `buildRunningExpectation()` so users know when waiting is normal versus when they should intervene
- refine `buildRunningStatusDetail()` and `buildRunningStatusBadges()` so preserved work is visible during long retries
- refine `buildRunningNextStepSummary()` so the panel tells the user what Quantum is deciding or preserving right now
- keep stop guidance explicit when the path appears to be the wrong lane or output root

#### `ui/app/src/types/imports.ts`

- keep the progress-state union synchronized with any additional wording or state refinements

#### `tests/parser/chatgpt-sharded-import-smoke.test.ts`

- assert the import-plan wording for mixed reuse/resume/retry cases where possible
- assert that rerun progress remains honest when some work is reused and some is retried

### Suggested execution order

1. Adjust the backend progress message sequence first.
2. Update the Imports-screen interpretation helpers second.
3. Add or update smoke/regression assertions third.
4. Run the focused import-related tests.
5. Do a quick TypeScript build if the message-shape or type surface changed materially.

### Ready-to-build definition

Slice 1 is ready to implement once we agree to keep the work tightly scoped to:

- messaging and visible progress trust
- no new persistence format changes
- no broad import-architecture rewrite
- no unrelated UI reshuffle outside the running-import path

## Slice 2: Output-Root And Reuse-Scope Clarity

### Goal

Prevent users from mistaking output-root changes for lost history or broken reuse.

### Why this comes second

- the July 12 walkthrough exposed a real trust failure mode here
- this is not only technical behavior; it affects whether users believe Quantum remembers prior work
- it sits directly inside the ordinary import flow and can confuse even a successful rerun

### Focus

- explain more plainly that import history and reuse are scoped to the selected output root
- make output-root context more visible during check, import, rerun, and follow-up states
- reduce the chance that a user switches workspaces and concludes Quantum forgot earlier imports

### Acceptance criteria

- output-root scope is visible enough that reuse behavior feels explainable
- switching output roots no longer creates an ambiguous “forgot my work” moment
- rerun and history language stays grounded in the current local workspace

## Slice 3: Legacy ChatGPT Package Handling And Wrong-Lane Safety

### Goal

Handle older `chat.html`-heavy ChatGPT exports more intentionally and let users escape the wrong heavy path safely.

### Why this comes third

- the walkthrough now clearly distinguishes newer sharded exports from older heavyweight HTML bundles
- one generic “ChatGPT export” story is no longer precise enough for beta trust
- safe stop and clearer lane recognition matter more than silently forcing the old package through a confusing path

### Focus

- make the package-shape distinction clearer during source inspection
- explain when Quantum is taking the heavier legacy HTML route
- keep force-stop and recovery behavior explicit when the user realizes they chose the wrong path
- treat version-specific export differences as a real product explanation problem, not just a parser detail

### Acceptance criteria

- users can tell when they are importing a legacy ChatGPT package rather than a newer shard-first package
- the heavier path is explained before it feels like unexplained slowness or failure
- the wrong-lane stop/retry story is safe and understandable

## Slice 4: Full Gate 2 Electron Walkthrough

### Goal

Run the actual desktop workflow across all required ordinary-user lanes and classify the findings cleanly.

### Why this comes fourth

- the current walkthrough record strongly validates unchanged reruns, but it does not replace the full Gate 2 pass
- the revised roadmap makes the Electron walkthrough a gating activity, not optional polish
- we should verify the real shell before over-investing in surrounding explanatory layers

### Required lanes

- unchanged rerun using preserved output
- fresh or partially fresh import
- import history
- readable archive
- dataset review
- Find Imports
- return to Imports
- safe stop control

### Acceptance criteria

- every finding is labeled as blocker, readiness issue, observe in beta, or cosmetic
- no known ordinary-flow breakage remains hidden behind the stronger rerun story
- the walkthrough becomes reusable for beta rehearsal and tester support artifacts

## Slice 5: Reproducible Windows Beta Packaging Baseline

### Goal

Produce the first repeatable packaged build path for private beta distribution.

### Why this now outranks operator-only UI surfacing

- the revised roadmap names packaging as the main missing product layer
- outside testers cannot validate the real beta promise if the app still depends on the repo and dev shell
- advanced tools like promotion, purge restore, and folder merge matter less than launchability for the first beta

### Focus

- define the packaging command
- verify launch outside the repository
- decide settings, log, output-root, and temporary-file locations
- make version identity visible
- ensure missing local AI does not block the deterministic workflow

### Acceptance criteria

- one packaged Windows build can be handed to a tester
- it launches without cloning the repository
- diagnostics and versioning are visible enough to support private-beta debugging

## Explicitly De-Prioritized For Today

The previous slice about UI controls for promotion, purge restore, and folder merge should move down the queue for now.

Reason:

- those capabilities are real, but they belong to deliberate advanced access
- they do not outrank the core import -> archive -> dataset -> retrieval beta path
- the scope-lock and revised roadmap both point toward launchability and ordinary-flow trust first

## Guardrails Across These Five Slices

- do not reopen closed Gate 1 concerns without fresh evidence
- do not make reuse faster at the cost of trust
- do not rely on fake ETA precision where honest step language is stronger
- do not let operator-surface completeness outrun beta launch readiness
- keep the deterministic workflow primary and the optional assistant secondary

## Recommended Completion Check

When these five slices are in place, Quantum should be in a stronger position for a small private beta if:

- long imports feel honest rather than frozen
- output-root-scoped reuse is understandable
- legacy and newer ChatGPT package lanes are explainable separately
- the real Electron walkthrough is complete across the full ordinary path
- a Windows tester can receive and launch a packaged build without the development workspace
