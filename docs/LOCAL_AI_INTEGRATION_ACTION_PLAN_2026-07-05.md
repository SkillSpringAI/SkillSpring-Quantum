# Local AI Integration Action Plan - 2026-07-05

This note captures the current intended direction for integrating a local AI layer into SkillSpring Quantum.

It is the broader product and architecture companion to:

- `docs/LOCAL_AGENT_INTEGRATION_PLAN_2026-07-04.md`
- `docs/LOCAL_AGENT_RUNTIME_CONTRACT_2026-07-04.md`
- `docs/LOCAL_AGENT_UI_INCORPORATION_NOTES_2026-07-04.md`

## Purpose

Integrate a local AI layer into SkillSpring Quantum without weakening the deterministic import, parsing, validation, archive, and dataset pipeline.

The local AI should make the product easier to use, improve semantic organisation, and allow user datasets to become progressively more valuable over time.

The deterministic system remains authoritative.

The AI assists with interpretation, labelling, grouping, topic segmentation, and natural-language control.

## Deterministic-First Product Principle

SkillSpring Quantum should operate as:

> a deterministic import and archive system with a local AI interface, semantic enrichment layer, and adaptive dataset context

The product must not depend on an LLM to perform its core import workflow.

The non-LLM layer remains responsible for:

- vendor detection
- source preservation
- schema validation
- record extraction
- message ordering
- attachment references
- vendor conversation boundaries
- archive creation
- dataset generation
- output validation
- error reporting
- reproducible execution

The local AI layer may assist with:

- natural-language workflow launching
- human-readable labels
- topic detection
- subject-change segmentation
- project grouping
- alias recognition
- entity suggestions
- semantic summaries
- low-confidence schema analysis
- explanation of results and errors

## Target Architecture

```text
User
  -> Chat or standard interface
  -> Intent translation layer
  -> Validated structured command
  -> Deterministic Quantum pipeline
  -> Canonical archive and dataset
  -> Optional local AI enrichment
  -> Semantic labels, segments, groups, and explanations
  -> User review and correction
  -> Local preference and context store
  -> Improved future imports
```

The chatbot must not bypass the deterministic pipeline.

It should translate user intent into supported Quantum actions.

## Two-Layer Data Authority Model

Quantum should maintain two distinct data layers.

### 1. Canonical source layer

This is the reproducible source-of-truth layer.

It includes:

- original conversation identifiers
- vendor-provided conversation boundaries
- message order
- timestamps
- roles
- source titles
- attachment references
- raw or normalised source fields
- import manifests
- validation results

This layer must remain reproducible and independent of the local AI.

### 2. Semantic organisation layer

This is the derived interpretation layer.

It may include:

- suggested titles
- project assignments
- topic labels
- semantic segments
- entity aliases
- conversation relationships
- summaries
- confidence scores
- model or method used
- user approval status

AI-generated metadata must never silently replace canonical source facts.

## Primary Integration Uses

The near-term local AI uses should be:

1. natural-language workflow control for supported deterministic actions
2. optional human-readable labels and summaries
3. topic-change detection as a suggestion layer
4. project and topic grouping backed by user-approved evidence
5. conservative identity and alias assistance
6. schema recovery assistance that still routes through deterministic validation

## Dataset Reuse Model

The user dataset should become a local semantic asset over time.

The first implementation should prefer:

- embeddings
- local retrieval
- structured entity tables
- alias dictionaries
- topic profiles
- user-approved examples
- confidence thresholds
- deterministic validation rules

This should come before any fine-tuning or cloud-dependent approach.

## Learning And Correction Loop

```text
User imports data
  -> Quantum creates canonical outputs
  -> Local AI suggests semantic enrichment
  -> User accepts, edits, merges, or rejects suggestions
  -> Corrections are stored locally
  -> Future imports retrieve relevant prior examples
  -> Suggestions become more accurate for that user
```

User corrections must count as stronger evidence than unreviewed AI outputs.

## Integration Phases

### Phase 0: Documentation and architectural alignment

- update documentation to match the actual repository structure
- define the local AI as optional
- confirm the app works without the agent
- define canonical paths and package boundaries
- document experimental versus deferred features
- remove obsolete structural warnings
- keep README language clear that importing does not require the AI layer

### Phase 1: Natural-language command layer

Deliverables:

- capability registry
- structured intent schema
- command validator
- chat-to-command translation
- confirmation rules for ambiguous or risky actions
- deterministic execution bridge
- result explanation

Current status:

- this phase now exists in a narrow v1 form through the `Ask Quantum` drawer command catalog
- the current implementation favors explicit supported actions over open-ended command invention
- that tradeoff is deliberate because the product is moving toward outside beta and trust matters more than looking broadly autonomous

### Phase 2: Optional labels and summaries

Deliverables:

- semantic metadata schema
- enrichment service
- review UI
- provenance fields
- local model availability checks

### Phase 3: Dataset-backed contextual retrieval

Deliverables:

- local semantic index
- context retrieval service
- correction store
- preference management
- rebuild and reset controls

### Phase 4: Topic segmentation

Preferred method:

1. use deterministic message windows
2. calculate semantic similarity between adjacent windows
3. identify candidate shifts
4. ask the local AI to classify only the candidate region
5. produce suggested boundaries
6. allow user correction
7. store accepted examples for future retrieval

### Phase 5: Project, topic, and entity grouping

Create useful cross-conversation organisation without rewriting canonical records.

### Phase 6: AI-assisted schema analysis

AI may propose mappings, but deterministic validation must approve them before use.

### Phase 7: Optional contribution pathway

Any product-wide parser contribution pathway should avoid user conversation content by default and remain explicit opt-in.

## Technical Guardrails

### Deterministic-first rule

Every core import must be possible without a local model.

### Non-blocking enrichment

AI labelling, summarisation, grouping, and indexing must occur after canonical outputs are safely written, or in parallel where failure cannot affect import success.

### Provenance

Every AI-generated field should record:

- model
- model version when available
- generation timestamp
- input scope
- confidence
- user confirmation status
- last edit source

### Reversibility

Users must be able to:

- disable AI enrichment
- remove generated metadata
- reset semantic memory
- rebuild the local index
- revert to source titles
- undo entity merges
- remove accepted aliases
- re-run segmentation

### Minimal context principle

The model should receive only the smallest relevant slice of data needed for the current task.

### Confidence-aware behaviour

The early product should favour visible suggestions over silent automatic application.

### Local privacy boundary

User datasets, embeddings, semantic memory, and corrections should remain local by default.

Any cloud analysis or contribution path must require explicit opt-in.

## Non-Goals

The integration should not become:

- a general-purpose desktop assistant
- an unrestricted autonomous agent
- an LLM-only parser
- a replacement for the deterministic importer
- a mandatory Ollama setup during first launch
- a cloud-dependent workflow
- a system that rewrites source data
- an opaque personal identity profiler
- a generic chatbot over every file on the machine
- a second product competing with the Quantum MVP

## Immediate Work Order

### Next documentation session

1. reconcile docs with the actual repository structure
2. remove outdated cleanup references
3. confirm the canonical local AI package path
4. clarify that the AI layer is optional
5. add the deterministic-first integration principle
6. add the two-layer data model
7. add this phased integration roadmap
8. keep advanced semantic capabilities clearly post-MVP

### Next implementation priority

The immediate sequence should remain:

```text
External workflow validation
-> visible import progress
-> vendor smoke tests
-> packaging and first-run reliability
-> natural-language command bridge
-> optional labels and summaries
-> dataset-backed semantic context
-> topic segmentation
-> entity and project grouping
-> schema recovery assistance
```

The local AI should not move ahead of import reliability.

## MVP Boundary

The first meaningful local AI milestone should prove:

1. the application works normally without a local model
2. the user can issue a natural-language request
3. the request is translated into a supported structured command
4. Quantum validates and runs the deterministic process
5. the AI explains the result
6. the AI may optionally suggest a title or summary
7. AI failure does not invalidate the import

That milestone is now materially demonstrated in the repo:

- the app still works without the local assistant
- supported plain-language requests can be translated into validated actions
- Quantum still owns the real execution path
- the assistant layer remains secondary to deterministic outputs

Everything beyond that belongs to later phases.

## Success Criteria

The integration is successful when:

- users can use familiar chat language without losing deterministic reliability
- datasets become more useful to non-technical users
- repeated imports improve semantic organisation
- user corrections improve future suggestions
- source records remain unchanged and recoverable
- AI-generated metadata is transparent and reversible
- the app still works without an LLM
- parsing improvements can become reusable deterministic rules
- the local AI reduces friction rather than adding setup burden
- Quantum becomes more useful over time without becoming less trustworthy
