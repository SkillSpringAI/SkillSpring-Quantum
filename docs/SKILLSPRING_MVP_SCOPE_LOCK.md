# SkillSpring Quantum MVP Scope Lock

This note exists to stop scope drift during implementation.

## First user-facing promise

SkillSpring Quantum should first be explained as:

> Import major AI conversation exports, turn them into readable local archives, and produce inspectable privacy-aware dataset artifacts.

The MVP is not a generic document-ingestion platform. It is not a browser-extension-first product. It is not a governance editor. It is not a parser zoo.

## Workflow to prove

The MVP only needs to prove one clear loop:

1. Choose export
2. Inspect what Quantum found
3. Import locally
4. Read archive output
5. Review dataset output
6. Understand failures or partial imports without reading code

If a feature does not make that loop clearer, more trustworthy, or more complete, it should not block MVP.

## Current support tiers

### MVP first-class now

- ChatGPT / OpenAI
- Grok

### MVP compatibility fallback now

- Claude via generic conversation parser
- Gemini via generic conversation parser
- Microsoft Copilot activity CSV where fixture and test coverage prove the recoverable shape

### Explicit coming soon

- Claude adapter
- Gemini adapter
- Copilot adapter beyond the current CSV fallback path

## Public readiness rule

A vendor should not be called first-class supported unless it has:

- named parser or named adapter path
- fixture
- parser test
- detection test
- import result label
- archive output
- dataset output

## Explicitly deferred from the first user-facing MVP

Keep these as roadmap items, not as the core release promise:

- Kimi
- DeepSeek
- Perplexity
- generic conversation JSON as marketed intake
- generic JSON documents
- PDFs
- CSV, logs, and text-document parsing
- mixed document folders as a marketed capability
- Meta, Messenger, support platforms, and enterprise systems
- third-party browser exporters

## Wording correction

Prefer:

- privacy-aware dataset artifacts
- redacted dataset artifacts
- deterministic redaction for common sensitive patterns

Avoid:

- fully anonymized datasets
- complete privacy removal
- guaranteed de-identification

## Stage model

### Stage 1: AI Export MVP

- ChatGPT
- Grok

with fallback recovery for Claude and Gemini until named adapters exist

Goal: prove the workflow.

### Stage 1.5: First-class vendor completion

- Claude adapter
- Gemini adapter
- Copilot adapter beyond the current CSV fallback path

Goal: expand from a polished two-vendor MVP into a true five-vendor first-class promise.

### Stage 2: AI Export Expansion

- Kimi
- DeepSeek
- Perplexity
- Mistral
- Poe and third-party AI exporters

Goal: broaden vendor coverage after users understand the product.

### Stage 3: General Knowledge Intake

- PDF
- Markdown
- TXT
- CSV
- logs
- generic JSON
- folders
- mixed document imports

Goal: evolve Quantum from AI export processor into broader local knowledge infrastructure.

### Stage 4: Enterprise and support imports

- Meta
- Tidio
- Drift
- Genesys
- Birdeye
- Modjo
- Dynamics
- call transcripts
- support tickets

Goal: business-grade and institutional ingestion.

## Rule

MVP does not mean maximum parser coverage. MVP means the clearest useful workflow for the most recognizable export sources.
