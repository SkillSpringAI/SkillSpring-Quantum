# UI App

This folder contains the React desktop application for SkillSpring Quantum.

## Purpose

The desktop app should become the primary operating environment for:

- imports
- import history and import result visibility
- pipeline runs
- organized output browsing
- dataset inspection
- diagnostics
- review queue
- governance editing
- tiered DB inspection

## Current state

The app has a working Electron preload/IPC bridge for core backend workflows, plus screens for imports, diagnostics, governance, tiered DB browsing, datasets, organized output, review queue, and settings.

Current implemented desktop capabilities include:

- browse for import files and folders through Electron dialogs
- inspect source paths before import
- run general local import flows
- review import history and file-level import results
- receive plain-English recovery guidance for failed, skipped, and fallback imports
- persist a configurable output root through app settings
- search full import history and reopen named retrieval investigations
- open created archive, dataset, import, and DB paths from the UI
- browse markdown archive output with topic/source/date filtering, file-open actions, archive-event handoff, and dataset-context handoff
- browse tiered DB collections through a file-backed bridge
- read latest dataset manifest summaries
- review dataset trust context, redaction summaries, current dataset previews, and current-versus-historical dataset handoff cues in-app

Some advanced controls are still earlier than the core import/archive/dataset workflow. The main product value is now much more visible than it was in earlier placeholder-heavy snapshots, but there is still room to deepen historical dataset review and cross-screen trust continuity.

## Current priority

The current MVP working order is:

1. finish the intake promise
2. make the import experience trustworthy
3. broaden parser coverage beyond ChatGPT
4. make archived output genuinely useful
5. tighten the privacy-aware dataset workflow and historical handoff clarity

See [../../docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md](../../docs/SKILLSPRING_QUANTUM_MVP_DIRECTION.md) for the working anti-drift reference.

## Likely direction

- desktop shell via Electron
- React front end
- local-first services
- extension as a bridge, not the main interface
