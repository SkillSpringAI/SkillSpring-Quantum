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

- ChatGPT / OpenAI export JSON
- Claude export JSON
- Gemini export JSON
- Grok export manifest JSON
- Microsoft Copilot activity CSV for the proven tested export shape

Gemini My Activity HTML remains a narrower fallback route.

## Near-term priorities

### Priority 1: Archive usability

Continue making the readable archive something users actively work from instead of merely inspect.

Current focus:

- file-level attachment trust inside archive review
- direct open actions for preserved attachments referenced by a selected archive file
- stronger archive search and review affordances tied to real trust evidence

Likely next slices:

- open all preserved attachments for a selected archive file
- improve preview affordances for previewable preserved files
- tighten archive-to-dataset handoff language around exact file context

### Priority 2: Dataset usability

Keep strengthening the dataset side of the same workflow rather than branching into adjacent product surfaces.

Current focus:

- historical-run dataset preview
- source-context trust carried into dataset review
- clearer redaction and trust explanation

Likely next slices:

- direct dataset export/open controls for selected run artifacts
- clearer historical-run versus current-bundle explanation
- tighter archive-selected context inside dataset previews

### Priority 3: Trust hardening

Now that the MVP vendor set is largely first-class, the next trust work should harden behavior and explanation, not just add more parser labels.

Focus:

- attachment preservation traceability
- partial-package clarity
- failure and retry guidance
- exact export-shape honesty in UI and docs

## Advanced surface rule

These remain real product capabilities, but should stay behind deliberate Advanced Tools access or contextual troubleshooting:

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
