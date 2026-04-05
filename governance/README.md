# Governance

This folder defines the operating rules for SkillSpring Quantum.

It exists to separate:
- policy from implementation
- stable rules from changing code
- human-readable governance from machine-readable rule files

## Purpose

The governance layer defines:
- what data should be retained
- what should be purged
- what should be routed to private review
- how datasets should be treated
- how diagnostics should be recorded
- how topic normalization should behave

## Structure

- principles.md -> core operating stance
- data-policy.md -> rules for handling raw exported conversations
- dataset-policy.md -> rules for dataset creation and versioning
- purge-policy.md -> rules for low-value and waste material
- diagnostics-policy.md -> rules for system self-monitoring
- retention-policy.md -> rules for archive, backup, purge, and dataset persistence
- rules/ -> machine-readable configuration inputs

## Design stance

Governance should be deterministic first.

If the code changes but the rules do not, the system should still have a stable operational spine.
