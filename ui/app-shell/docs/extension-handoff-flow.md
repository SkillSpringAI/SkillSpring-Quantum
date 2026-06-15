# Extension Handoff Flow

## Goal
Enable the extension to hand off lightweight conversation metadata or export-ready payloads to the desktop app.

## Basic flow
1. User clicks extension action
2. Extension gathers page metadata
3. Extension sends payload to desktop app bridge
4. Desktop app creates import job or review entry
5. User runs processing from desktop app

## Principle
The extension should trigger, not process.
