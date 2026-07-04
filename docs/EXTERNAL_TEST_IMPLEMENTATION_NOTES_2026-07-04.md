# External Test Implementation Notes (July 4, 2026)

This note captures minor implementation and hardening ideas that came out of one early outside test session, using follow-up notes written after that session.

The source `.docx` described the ideas as a personal game plan. This repo note translates them into Quantum-facing backlog language so they can be prioritized alongside the current beta-readiness work.

## How to use this note

- Treat these as supporting implementation slices, not as replacements for the current beta priorities.
- Use them to improve speed, resilience, developer confidence, and first-run clarity.
- Prefer adding them in the order below unless a concrete bug or user-facing bottleneck forces a change.

## Tier 1: Quick wins worth pulling forward

These are small improvements with low product risk and clear immediate value.

1. Configurable segmentation window
   - Stop relying on one hardcoded segmentation window size.
   - Expose a controlled configuration path for import segmentation granularity.
   - Prefer an advanced setting or internal import option over a user-facing control on the ordinary path.
   - This supports the broader parser-generalization goal because different corpora may need different chunking behavior.

2. Cache file-exists and output-path checks
   - Avoid repeated duplicate filesystem checks during import and artifact writing.
   - Preload existing output names and trust paths into in-memory sets where safe.
   - This should reduce unnecessary disk churn during larger imports.

3. Add visible progress reporting
   - Surface clear progress during import and indexing instead of long silent waits.
   - Start with deterministic stage progress and status messaging before trying to estimate perfect percentages.
   - This is both a DX improvement and a user-trust improvement during outside testing.

## Tier 2: Performance hardening with near-term product value

These should be treated as serious hardening candidates before broader outside beta usage.

4. Controlled concurrent conversation processing
   - Introduce concurrency with explicit limits rather than purely serial per-conversation processing.
   - Protect shared index or manifest state so concurrency does not create race conditions or corrupted outputs.
   - This likely belongs behind a small concurrency controller rather than scattered `Promise.all` usage.

5. Batch markdown and artifact writes
   - Reduce one-write-per-record behavior where safe.
   - Accumulate eligible writes and flush in bounded batches.
   - Keep manifest and notification semantics deterministic even if batching is added underneath.

6. Stream large JSON imports
   - Avoid loading giant export files fully into memory when the source shape allows incremental processing.
   - Keep this behind careful parser parity checks so streaming does not silently change output behavior.
   - This is especially relevant for real-user exports that may be far larger than internal fixtures.

## Tier 3: Robustness and developer experience

These improve confidence, maintainability, and troubleshooting.

7. Centralized logger with levels
   - Replace scattered `console.log` output with a real logger contract.
   - Support at least normal, verbose, and quiet modes.
   - Align log categories with import, archive, dataset, retrieval, and agent work so support and debugging remain readable.

8. Smoke-test suite for the ordinary flow
   - Add small fixture-driven tests that run recognizable imports and assert key archive/dataset outputs.
   - Start with deterministic snapshots or manifest assertions, not broad end-to-end UI automation.
   - This should become one of the main guardrails for parser-generalization work.

9. Stronger type safety and runtime validation
   - Continue removing vague `any` or loose record typing from parser and pipeline layers.
   - Add stricter interfaces or runtime schema validation where unknown external data enters the system.
   - This is especially important for outside-user exports because shape drift is guaranteed over time.

## Tier 4: Stretch goals after the current beta-hardening pass

These are promising, but they should follow the current parser, retrieval, and first-run stabilization work.

10. Worker-thread offloading for heavy topic work
   - Consider moving the heaviest segmentation or topic-inference work off the main thread once the current logic is stable.
   - Only do this after baseline correctness, logging, and tests are stronger.

11. Resume / checkpointed import capability
   - Persist enough import state to recover from partial failures on large runs.
   - This becomes more important once Quantum is used on larger outside corpora rather than maintainer-sized tests.

12. Local dashboard or richer local operator surface
   - A richer local dashboard can help maintainers and power users later.
   - For now, the Electron app already fills much of this role, so this should not outrank current UX simplification and evidence-grounded retrieval work.

## Recommended integration order

To stay aligned with current beta goals, the best adoption order is:

1. progress reporting
2. smoke tests
3. stronger type safety / schema validation
4. cached filesystem checks
5. controlled concurrency
6. streaming for very large JSON imports
7. batched writes
8. segmentation-window configurability
9. centralized logger
10. resume support
11. worker-thread offloading
12. broader dashboard expansion

## Why this order fits the current roadmap

- Progress reporting directly improves first-run trust during outside sessions.
- Smoke tests and stronger validation protect the parser hardening work we already know is needed.
- Cached checks, concurrency, streaming, and batching improve scale without changing the product promise.
- Segmentation configurability matters, but should follow evidence that a fixed default is hurting outside-user corpora.
- Resume, worker threads, and broader dashboard work are valuable, but are better after the current beta-readiness pass.

## Product-shape guardrail

These ideas should make Quantum feel more reliable and easier to trust.

They should not:

- add more operator-facing controls to the ordinary workflow without evidence
- make the import screen more technical for first-time users
- replace deterministic retrieval and review with opaque automation
- turn performance work into a visible surface before the core user path is stable
