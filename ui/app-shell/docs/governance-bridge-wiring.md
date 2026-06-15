# Governance Bridge Wiring

## Goal
Align the Governance UI to the real backend command contract before the desktop shell is fully implemented.

## Current state
The Governance screen now uses:
- governance.listRules
- governance.readRule
- governance.writeRule

through the desktop bridge service.

## Temporary execution mode
A mock desktop executor currently returns placeholder responses using the same command names and result shapes that the real shell will use later.

## Why this matters
This keeps the UI honest:
- the screen talks to the bridge
- the bridge talks in real command names
- the future shell only needs to replace execution, not redesign flow

## Next step
Replace mock execution with Electron or Tauri command execution and surface actual governance file reads/writes.
