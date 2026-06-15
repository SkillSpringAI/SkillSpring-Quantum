# Tests

This folder contains lightweight verification scaffolds for SkillSpring Quantum.

## Current purpose

These tests are not yet a full test harness.
They provide starter coverage for:
- parsing
- segmentation
- topic normalization
- waste classification
- topic scoring
- topic filtering
- governance rule loading
- DB fingerprint stability

## Current gap

Batch, aggregate, delta, promotion, and tiered DB write-path behavior are not yet fully covered by automated tests.
That should be added in a later pass once those workflows stabilize.

## Principle

Tests should confirm deterministic behavior for the core pipeline before model-assisted enrichment is introduced.
