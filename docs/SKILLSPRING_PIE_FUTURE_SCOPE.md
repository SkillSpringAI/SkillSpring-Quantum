# SkillSpring Quantum PIE Future Scope

This document records the intended future shape of the Parser and Intent Engine (PIE) so Quantum can grow into richer intent parsing later without losing MVP discipline now.

It exists to answer two separate questions clearly:

1. What should Quantum improve now to make segment labels, search topics, and prioritization more useful?
2. What broader PIE capabilities are worth preserving as future scope, but should not become the current MVP center of gravity?

## Current stance

For the current MVP, PIE should stay lightweight.

Quantum's near-term product promise remains:

- import major AI conversation exports locally
- produce readable archive output
- produce privacy-aware dataset artifacts
- explain trust, fallback, and partial-import behavior in plain language

PIE work should strengthen that loop rather than expand Quantum into a generic ingestion framework too early.

## MVP PIE-lite

The MVP-appropriate version of PIE is a focused enrichment layer that sits on top of the existing export parsing and segmentation pipeline.

Its job is to improve:

- segment labeling quality
- topic readability
- search usefulness
- importance triage
- intent-aware metadata for archives and datasets

The MVP PIE-lite layer should stay:

- heuristic-first
- deterministic
- inspectable
- easy to extend later
- narrowly scoped to supported AI conversation exports

### MVP PIE-lite capabilities

- intent labeling for segments such as troubleshooting, planning, review, research, decision, implementation, or request
- lightweight importance scoring such as high, medium, or low
- domain hints such as product, engineering, governance, finance, privacy, or support
- human-readable summary labels that are more useful than raw token piles
- selective label upgrades when the existing topic output is too vague
- retrieval-friendly metadata that improves search chips, topic hints, and segment review

### MVP PIE-lite non-goals

- no separate replacement pipeline
- no generic JSON, CSV, text, Slack, or mixed-document marketed intake
- no full trigger framework implementation
- no mandatory model inference layer
- no heavy NER or compliance subsystem beyond current redaction needs
- no cross-thread orchestration engine
- no large abstraction rewrite that duplicates the existing pipeline

## Future full PIE scope

The broader PIE architecture is still valuable as a future expansion path after the AI-export workflow is strong and trustworthy.

That future scope can include:

- broader normalization adapters for additional source formats
- richer trigger families for intent, ambiguity, emotion, and risk
- stronger domain extraction and cross-reference logic
- more advanced privacy and entity detection
- configurable grouping strategies across threads and domains
- batch orchestration and performance controls for larger corpora

Those capabilities should remain future scope until they clearly improve the ordinary user workflow more than the next slice of import, archive, or dataset hardening.

## Expansion path

To keep MVP PIE-lite expandable, code should prefer:

- small typed classification objects attached to segments
- optional fields added to existing artifacts rather than breaking schema replacements
- isolated classifier helpers that can swap heuristics for richer logic later
- deterministic ranking and labeling that can be tested with fixtures
- additive metadata fields that UI surfaces can adopt progressively

## Working implementation direction

The intended implementation sequence is:

1. Improve segment-level human labels and importance scoring.
2. Flow those labels into import metadata, retrieval indexes, archive metadata, and dataset context.
3. Tune heuristics against real exported conversations.
4. Only after that, decide whether a broader PIE module boundary is justified.

## Decision rule

When evaluating future PIE work, ask:

- Does it make the current AI-export workflow more understandable or useful?
- Does it improve trust, recovery, search, archive review, or dataset review?
- Is it more important than finishing the current MVP product loop?

If not, defer it.
