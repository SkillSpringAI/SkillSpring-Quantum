# Architecture

## Audience

This document is for contributors, developers, and maintainers.

## Product architecture in one line

Quantum is a local-first Electron desktop application with a deterministic TypeScript processing pipeline for AI export import, archive generation, retrieval, and dataset generation.

## Main layers

- `electron/`: desktop shell and bridge
- `ui/`: React renderer and user-facing workflow screens
- `core/`: deterministic import, pipeline, retrieval, governance, and diagnostics logic
- `tests/`: regression and workflow coverage
- `skillspring-quantum-agent/`: optional local AI assistant path

## Architectural rules

- deterministic import results are authoritative
- archive and dataset generation stay grounded in local source material
- local AI is optional and must not replace canonical source facts
- user-facing product scope stays narrower than internal parser coverage

## Related technical docs

- [Pipeline](PIPELINE.md)
- [Local AI](LOCAL_AI.md)
- [Diagnostics](DIAGNOSTICS.md)
- [Technical Reference](../reference/TECHNICAL_REFERENCE.md)
- [Future Scope](../architecture/FUTURE_SCOPE.md)
