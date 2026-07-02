# Parser And Retrieval Hardening Plan - 2026-07-02

This note captures the next parser-quality priorities before external beta testing.

The core principle is simple:

Quantum should not look good only on the maintainer's own conversations.

It should stay understandable across unfamiliar users, unfamiliar phrasing, and mixed-topic exports while remaining deterministic and evidence-grounded.

## Primary Risk

The current deterministic pipeline is already useful, but it has a clear beta risk:

- internal testing has mostly happened on one person's corpus
- some labels are still shaped by familiar technical/product vocabulary
- retrieval quality can look stronger than it really is when the test corpus repeats the same topics and naming patterns

This is not a failure. It is the normal point where internal quality needs to be converted into cross-user quality.

## Next Three Priority Slices

1. **Corpus-agnostic segmentation**
   - reduce dependence on recurring maintainer topics and shorthand
   - prefer user-phrase-led labels over hand-tuned familiar labels
   - keep deterministic topic splitting, but make the visible summaries feel natural for more than one kind of user

2. **Cross-corpus fixture coverage**
   - add more tests and fixtures for technical, personal-admin, hobby, writing, support, and mixed-topic conversations
   - include exports with unfamiliar nouns, weaker titles, and less tidy prompt structure
   - use this suite as the real parser confidence gate before beta

3. **Retrieval ranking and explanation**
   - improve how retrieval shows why a result matched
   - keep ranking grounded in import metadata, archive context, and dataset context
   - make good matches obvious even when the user's search terms differ from the parser's normalized topic wording

## What To Look For During Manual Checks

- summary labels should use the conversation's own language when possible
- results should still be understandable when the user topic is non-technical
- mixed-topic threads should split without producing generic filler labels everywhere
- retrieval should return the right file or segment even when the search wording is adjacent rather than exact
- labels should not feel like they only make sense if you already know Quantum's internal taxonomy

## Guardrails

- do not replace deterministic evidence with speculative AI labeling
- do not optimize only for the current maintainer corpus
- do not make the retrieval layer depend on hidden interpretation that cannot be traced back to source artifacts
- do keep future local-agent help in mind as a second-pass explainer that sits on top of stable parser and retrieval outputs
