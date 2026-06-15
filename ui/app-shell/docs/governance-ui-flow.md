# Governance UI Flow

## Goal
Expose governance rule files as editable control inputs within the desktop UI.

## Core flow
1. List rule files from governance/rules
2. Select a rule file
3. Load its raw content
4. Edit raw JSON/text
5. Save back through desktop bridge
6. Later: validate before write and optionally run post-save diagnostics

## Bridge mapping
List rules maps to:
- command: governance.listRules

Read rule maps to:
- command: governance.readRule

Write rule maps to:
- command: governance.writeRule

## Principle
Governance UI should edit the actual rule layer, not a copy or shadow settings model.
