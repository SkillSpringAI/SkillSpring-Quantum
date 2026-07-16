# Local AI

## Audience

This document is for contributors, developers, and maintainers.

This document records the current architectural boundary for Quantum's optional local AI layer.

## Core rule

The deterministic import -> archive -> dataset workflow remains authoritative.

The local AI layer is optional and must not silently replace canonical source facts, import results, or recovery decisions.

## What the assistant can help with

- natural-language workflow control for supported actions
- clearer labels and summaries
- retrieval explanation
- grounded explanation of import, archive, and dataset outcomes
- contextual help locating outputs, diagnostics, or next steps

## What the assistant must not do

- invent diagnoses that are not grounded in Quantum artifacts
- bypass validated backend workflows
- make the primary import path depend on model availability
- replace deterministic import results with AI-only interpretations

## Integration stance

The preferred order remains:

1. deterministic workflow first
2. narrow command bridge for supported actions
3. evidence-backed explanation layer
4. broader conversational help only if it still respects deterministic boundaries

## Runtime expectations still in force

- the desktop app must continue working without the local AI stack
- model compatibility checks and setup guidance are helpful, but they are not part of the primary product promise
- missing local models should degrade into explanation, not workflow failure
- local assistant state should be reflected honestly in the UI

## UI expectations still in force

- assistant help should remain attached to the existing workflow, not act like a competing product surface
- supported commands should translate into structured Quantum actions
- unsupported or underspecified requests should fall back to explanation rather than invented execution

## Near-term implication

Local AI is useful as an explainer and lightweight control surface, but it remains secondary to:

- import trust
- archive and dataset review
- retrieval clarity
- beta launch readiness
