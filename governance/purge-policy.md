# Purge Policy

## Scope
This policy governs what low-value material should be moved into purge.

## Purge candidates
- trivial acknowledgements
- empty or near-empty segments
- short low-signal general fragments
- assistant-only fragments with weak value
- repeated filler

## Rules
1. Purge is quarantine, not deletion.
2. Purged items must be recorded in purge-manifest.jsonl.
3. Purged items must be restorable.
4. Purge rules should be conservative enough to avoid removing meaningful workflow turns.

## Restore principle
Any purged file may be moved to restore_queue for later review.
