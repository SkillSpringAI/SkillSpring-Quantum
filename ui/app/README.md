# UI App

This folder contains the React desktop application for SkillSpring Quantum.

## Purpose

The desktop app should become the primary operating environment for:

- imports
- pipeline runs
- organized output browsing
- diagnostics
- review queue
- governance editing
- tiered DB inspection

## Current state

The app has a working Electron preload/IPC bridge for core backend workflows, plus screens for imports, diagnostics, governance, tiered DB browsing, datasets, organized output, review queue, and settings.

Some screens are still early and should continue moving from static placeholders to file-backed or IPC-backed data.

## Likely direction

- desktop shell via Electron
- React front end
- local-first services
- extension as a bridge, not the main interface
