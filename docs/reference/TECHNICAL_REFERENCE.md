# Technical Reference

## Audience

This document is for contributors, developers, and maintainers who need a compact inventory of the current implementation surface.

## Product boundary

Quantum's current product promise is narrow:

- import supported AI conversation exports
- preserve readable local archives
- provide searchable local history
- generate privacy-aware dataset artifacts

The product story is intentionally narrower than the full internal parser and workflow surface.

## Current supported export path

First-class support:

- ChatGPT / OpenAI
- Claude
- Gemini export JSON
- Grok
- Microsoft Copilot activity CSV for the validated export shape

Compatibility fallback:

- Gemini My Activity HTML

## Current implementation surface

- source inspection before import
- vendor-aware import routing
- readable markdown archive generation
- archive notifications and archive browsing
- import history and retrieval indexes
- retrieval search across prior imports and linked dataset segments
- privacy-aware dataset generation and preview
- attachment preservation where supported exports include attachment references
- rerun, retry, and resume handling for large imports
- diagnostics, manifests, and authoritative write safety
- optional local assistant support through a narrow deterministic boundary

## Core technical areas

- `core/`: import, pipeline, retrieval, governance, diagnostics
- `ui/`: React desktop screens
- `electron/`: desktop runtime bridge
- `tests/`: parser, import, retrieval, pipeline, assistant, governance regression coverage
- `skillspring-quantum-agent/`: optional local AI layer

## Main runtime commands

Run the Electron app in development:

```bash
npm run electron:dev
```

Build the desktop app:

```bash
npm run build:desktop
```

Build a Windows installer:

```bash
npm run package:win
```

Run the full regression suite:

```bash
npm run test:ci
```

Run diagnostics:

```bash
npm run diag:run
```

## Related docs

- [Architecture](../technical/ARCHITECTURE.md)
- [Development Guide](../technical/DEVELOPMENT_GUIDE.md)
- [Testing](../technical/TESTING.md)
- [Pipeline](../technical/PIPELINE.md)
- [Local AI](../technical/LOCAL_AI.md)
- [MVP Direction](../project/MVP_DIRECTION.md)
- [MVP Scope Lock](../project/MVP_SCOPE_LOCK.md)
- [Future Scope](../architecture/FUTURE_SCOPE.md)
