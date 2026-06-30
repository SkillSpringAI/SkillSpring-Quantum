# SkillSpring Quantum MVP Scope Lock

This note exists to stop scope drift during implementation.

## First user-facing promise

SkillSpring Quantum should first be explained as:

> Import major AI conversation exports, turn them into readable local archives, and produce inspectable privacy-aware dataset artifacts.

The MVP is not a generic document-ingestion platform. It is not a browser-extension-first product. It is not a governance-console-first product. It is not a parser zoo.

Governance remains part of the product's internal assurance layer. It should protect, explain, and recover the ordinary workflow without becoming a prerequisite for using it.

## Workflow to prove

The MVP only needs to prove one clear loop:

1. Choose export
2. Inspect what Quantum found
3. Import locally
4. Read archive output
5. Review dataset output
6. Understand failures or partial imports without reading code

Expected vendor-package companion files should be explained as normal handling, not as scary failures.

If a feature does not make that loop clearer, more trustworthy, more recoverable, or more complete, it should not block MVP.

Ordinary users should receive plain-language outcomes. Detailed governance rules, tiered records, review controls, manifests, and diagnostics should remain available through deliberate Extra Tools access, contextual troubleshooting, or future agent-assisted explanation.

As the UX gets closer to a public MVP shape, use internal walkthroughs to remove obvious friction first, then prefer outside test-user observation for the next deeper round of simplification. The goal is to avoid tuning only for people who already understand the product's internal model.

## Current support tiers

### MVP first-class now

- ChatGPT / OpenAI
- Claude
- Gemini
- Grok
- Microsoft Copilot activity CSV where the fixture-backed export shape is proven

### MVP compatibility fallback now

- Gemini My Activity HTML via a narrower recovery path

Recognized vendor export folders may route through one main import file while companion files are skipped intentionally and described plainly in the UI.

### Explicit coming soon

- no remaining major AI-export vendor in the current MVP set is blocked on fallback-only handling

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
- Claude
- Gemini
- Grok

with fallback recovery still available for Gemini My Activity HTML where needed

Goal: prove the workflow.

### Stage 1.5: First-class vendor completion

Completed for the current MVP vendor set, with first-class handling now in place for:

- ChatGPT
- Claude
- Gemini export JSON
- Grok
- Microsoft Copilot activity CSV for the proven tested shape

Goal: keep the product promise honest about exact export shapes while continuing to harden those paths.

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
