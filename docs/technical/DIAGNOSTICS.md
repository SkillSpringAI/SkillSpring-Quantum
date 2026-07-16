# Diagnostics

## Audience

This document is for developers, contributors, maintainers, and support during beta.

## Purpose

Diagnostics exist to explain what Quantum did, help recover from failures, and make beta issues reproducible without turning the ordinary workflow into a developer-only experience.

## Main command

```bash
npm run diag:run
```

## Diagnostic expectations

- failures should leave enough local evidence to inspect
- diagnostics should support import, archive, dataset, and retrieval troubleshooting
- optional local AI may explain diagnostics later, but it must not replace the underlying evidence
