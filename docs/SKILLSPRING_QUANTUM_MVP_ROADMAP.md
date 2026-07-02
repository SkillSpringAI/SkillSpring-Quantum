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

1. **Corpus-agnostic parser hardening**
   - Make topic and intent segmentation less dependent on the maintainer's own conversation habits, recurring subjects, or preferred vocabulary.
   - Prefer user-phrase-led summaries and broader cross-domain examples over narrow hand-tuned labels.
   - Expand fixture coverage so consumer, admin, hobby, technical, and mixed-topic conversations all pass through the same deterministic pipeline cleanly.
   - Treat overfitting to today's internal corpus as a beta blocker because it can look strong internally while failing on fresh outside exports.

2. **Retrieval quality and evidence-grounded labeling**
   - Improve retrieval-facing labels, grouping, ranking, and summary cues so users can find what they mean, not only what the parser named.
   - Keep retrieval grounded in deterministic evidence artifacts rather than speculative enrichment.
   - Strengthen the handoff between import metadata, archive context, and dataset context so search results explain why they matched.
   - Treat a future local agent as a second-pass explainer on top of grounded retrieval, not as a substitute for stable indexing.

3. **First-run beta onboarding**
   - Keep the current guided import framing, but plan a short walkthrough or tutorial video that demonstrates the ordinary import -> archive -> dataset -> find-imports path with a real example.
   - Use onboarding to reduce perceived complexity instead of adding more static explanation copy.
   - Keep advanced/operator surfaces hidden unless directly useful.
   - Prepare one stable walkthrough path that can be reused in outside beta sessions.

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
