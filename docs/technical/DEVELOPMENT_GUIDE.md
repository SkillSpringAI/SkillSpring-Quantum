# Development Guide

## Audience

This guide is for developers and contributors.

## Environment

- Node.js
- npm
- Windows for the current packaged-app path

## Install

```bash
npm install
```

## Common commands

Build TypeScript:

```bash
npm run build
```

Build desktop package assets:

```bash
npm run build:desktop
```

Run the Electron app in development:

```bash
npm run electron:dev
```

Build a Windows installer:

```bash
npm run package:win
```

Build an unpacked directory:

```bash
npm run package:dir
```

## Key project areas

- `core/`: deterministic import and processing pipeline
- `ui/`: renderer UI
- `electron/`: desktop runtime
- `tests/`: parser, pipeline, retrieval, assistant, and governance coverage

## Related docs

- [Architecture](ARCHITECTURE.md)
- [Testing](TESTING.md)
- [Pipeline](PIPELINE.md)
- [Technical Reference](../reference/TECHNICAL_REFERENCE.md)
