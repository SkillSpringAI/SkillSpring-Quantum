# Testing

## Audience

This guide is for developers, contributors, and maintainers.

## Main regression command

Run the full regression suite:

```bash
npm run test:ci
```

## Important grouped commands

Parser coverage:

```bash
npm run test:parser:coverage
```

Import coverage:

```bash
npm run test:imports
```

Vendor smoke tests:

```bash
npm run test:smoke:vendors
```

Retrieval coverage:

```bash
npm run test:retrieval
```

Pipeline coverage:

```bash
npm run test:pipeline
```

Assistant coverage:

```bash
npm run test:assistant
```

Governance coverage:

```bash
npm run test:governance
```

## Testing priority

Before widening scope, keep regressions guarded around:

- supported vendor intake
- archive generation
- dataset generation
- retrieval continuity
- authoritative write safety
- rerun and resume behavior
