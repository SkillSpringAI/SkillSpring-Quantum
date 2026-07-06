# SkillSpring Quantum MVP Roadmap

This roadmap is the short operational companion to the scope lock and reference docs.

It should track the next few slices that move the ordinary user workflow forward without letting governance become the main product surface.

## Current MVP state

The core MVP loop is now:

1. inspect a recognizable AI export
2. import it locally
3. read the archive output
4. review the privacy-aware dataset output
5. understand trust, fallback handling, and failures in plain English

The current first-class vendor set is:

- ChatGPT / OpenAI export folders and JSON shards
- Claude export JSON
- Gemini export JSON
- Grok export manifest JSON
- Microsoft Copilot activity CSV for the proven tested export shape

Gemini My Activity HTML remains a narrower fallback route.

## Current Beta-Hardening Status

The July 5, 2026 slice sequence is now substantially complete:

1. visible import progress
2. vendor smoke-test suite
3. corpus-agnostic parser hardening
4. retrieval quality and evidence-grounded labeling
5. narrow natural-language command bridge v1

Why this matters:

- import work now feels alive instead of frozen
- parser changes have a faster regression net across current first-class vendors
- topic and segment quality are less dependent on the maintainer's own conversation habits
- retrieval can explain both why something matched and where the user should go next
- `Ask Quantum` now helps with supported workflow actions without bypassing deterministic execution

Since that July 5 sequence completed, the repo has also landed a first assistant-runtime follow-through pass:

- local Ollama model compatibility detection for chat and embeddings
- clearer assistant prerequisite summaries instead of raw model-not-found failures
- in-app install guidance for missing recommended local models
- drawer-state fixes so a running local assistant is reflected honestly instead of appearing stopped

This does not change the core priority order.

It means the assistant is now a more realistic secondary explainer surface, while parser trust, retrieval trust, and first-run clarity remain the next MVP-facing priorities.

By end of day on July 6, 2026, the first two items in that next priority chain are also materially in place:

- parser/classifier behavior is now more corpus-agnostic across unfamiliar user phrasing, especially personal-admin, consumer, household, and mixed-topic language
- retrieval now explains match evidence more clearly at both import and segment level and preserves a better handoff into dataset review

That leaves the next morning queue centered on:

1. first-run beta onboarding and reusable walkthrough path
2. assistant source-grounding and deterministic-boundary hardening
3. assistant install/runtime completion pass

## Near-term priorities

## Continue Tomorrow

The app is now materially more stable, the major card-collision regression from the July 2, 2026 internal pass was resolved, and the ordinary four-screen workflow is holding together better after a real import.

That changes the immediate goal.

The next milestone is no longer "repair obvious screen breakage."

The next milestone is "make the current MVP surface legible and trustworthy enough for a small outside beta pass."

The next beta-leaning slices should continue from these explicit UX targets:

- keep pushing the vendor-first import flow so users start from `ChatGPT`, `Claude`, `Grok`, `Gemini`, `Copilot`, or `Auto Detect` instead of reasoning about file mode first
- make export-schema match results more visual and decisive, especially for mismatch, recovery-path, and ready-now states
- collapse or defer secondary guidance panels until they are backed by real data from an actual import
- simplify archive and dataset empty states further so they feel like result screens, not instructions manuals
- trim or restructure source-summary, import-history, and dataset explanation density so a first-time user can act without studying the product
- keep reducing dead-end output buttons by only surfacing raw file actions when the path exists and the action helps the current step
- continue calming the visual hierarchy so primary actions stand out and secondary actions stop competing with them
- keep diagnostics, governance, and other advanced surfaces subordinate and contextual
- do a dedicated follow-up polish pass on Imports, Find Imports, and Datasets for minor spacing, alignment, and loaded-state clarity issues that are better handled in the UI's next evolution stage

### Beta-readiness next three slices

1. **First-run beta onboarding**
   - Keep the current guided import framing, but plan a short walkthrough or tutorial video that demonstrates the ordinary import -> archive -> dataset -> find-imports path with a real example.
   - Use onboarding to reduce perceived complexity instead of adding more static explanation copy.
   - Keep advanced/operator surfaces hidden unless directly useful.
   - Prepare one stable walkthrough path that can be reused in outside beta sessions.

2. **Assistant source-grounding and deterministic boundary hardening**
   - Keep `Ask Quantum` attached to the existing workflow instead of letting it drift into a parallel product surface.
   - Require stronger evidence pointers, narrower supported-action behavior, and better refusal/clarification for ambiguous requests.
   - Make trust drift the main thing being reduced, not raw assistant breadth.

3. **Assistant install/runtime completion**
   - Finish the install/start/degraded-state loop so the drawer behaves like a beta-facing feature instead of a partial maintainer tool.
   - Make low-memory, missing-model, and healthy-running states visibly distinct.
   - Keep the assistant optional and non-blocking for the main import -> archive -> dataset -> retrieval workflow.

### Outside-test implementation notes

One early outside test session also produced a useful "minor implementation" backlog covering progress reporting, smoke tests, type-safety tightening, cached filesystem checks, controlled concurrency, streaming large imports, and resume-oriented hardening.

Those notes should be treated as supporting slices for the same beta-readiness goal rather than as a separate roadmap.

Working note: `docs/EXTERNAL_TEST_IMPLEMENTATION_NOTES_2026-07-04.md`

Concrete execution note: `docs/NEXT_FIVE_SLICES_2026-07-05.md`
Updated continuation note: `docs/NEXT_FIVE_SLICES_2026-07-06.md`

### Local agent incorporation rule

The newly added local-agent package should be integrated in a way that simplifies the current product, not one that adds another product surface to learn.

Near-term rule:

- use the agent as a contextual explainer and retrieval helper attached to the existing four-screen workflow
- do not add it as a competing first-class screen before the core parser/retrieval hardening work is stronger
- prefer `Ask Quantum`-style contextual help over long static explanatory panels
- require source-grounded answers that point back to imports, archive files, dataset previews, or retrieval results

Current implementation note:

- the first assistant slice now follows this rule by trying a validated command catalog before falling back to general explanation
- that boundary is intentional because outside beta trust depends more on predictable action routing than on open-ended assistant behavior
- a follow-through runtime pass now also handles local-model compatibility checks, install guidance, and more honest running-state reflection in the drawer
- the next assistant work should therefore focus less on basic startup plumbing and more on source-grounding, deterministic boundary hardening, and finishing the install/runtime experience cleanly

Working note: `docs/LOCAL_AGENT_INTEGRATION_PLAN_2026-07-04.md`
Broader action plan: `docs/LOCAL_AI_INTEGRATION_ACTION_PLAN_2026-07-05.md`

### Priority 1: Archive usability

Continue making the readable archive something users actively work from instead of merely inspect.

Current focus:

- file-level attachment trust inside archive review
- direct open actions for preserved attachments referenced by a selected archive file
- stronger archive search and review affordances tied to real trust evidence
- lighter archive empty states and less always-visible explanation text

Likely next slices:

- continue reducing explanatory overload in archive empty and first-use states
- make the selected-file pane feel more like a guided review flow than a technical detail dump
- tighten archive-to-dataset handoff language around exact file context

### Priority 2: Dataset usability

Keep strengthening the dataset side of the same workflow rather than branching into adjacent product surfaces.

Current focus:

- historical-run dataset preview
- source-context trust carried into dataset review
- clearer redaction and trust explanation
- lighter dataset guidance with optional deeper explanation instead of mandatory reading

Likely next slices:

- continue reducing first-read density across dataset notes, outputs, and preview framing
- preserve strong trust explanation while moving secondary teaching content behind optional reveals
- tighten archive-selected context inside dataset previews

### Priority 3: Trust hardening

Now that the MVP vendor set is largely first-class, the next trust work should harden behavior and explanation, not just add more parser labels.

Focus:

- attachment preservation traceability
- partial-package clarity
- failure and retry guidance
- exact export-shape honesty in UI and docs
- schema-match clarity inside the vendor-first import flow
- parser and retrieval behavior that stays stable across unfamiliar user corpora rather than only the maintainer's own exports

## Advanced surface rule

These remain real product capabilities, but should stay behind deliberate Extra Tools access or contextual troubleshooting:

- diagnostics
- governance
- tiered DB inspection
- review queue
- promotion and assurance workflows

If a task makes those systems more prominent than the main import -> archive -> dataset loop, it is probably not the next MVP slice.

## Deferred after MVP loop hardening

- broader AI vendor expansion beyond the current first-class set
- marketed generic document ingestion
- enterprise/support-platform imports
- governance expansion without direct user workflow benefit
- assistant interpretation layers that outrun the standalone product
