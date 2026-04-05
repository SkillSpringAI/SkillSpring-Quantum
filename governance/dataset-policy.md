# Dataset Policy

## Scope
This policy governs how structured datasets are generated from conversation exports.

## Rules
1. Dataset records must be smaller than raw conversations where practical.
2. Dataset records must include schema version fields.
3. Dataset outputs must be versioned.
4. Per-run manifests must be generated.
5. High-signal, low-signal, and private-review material must remain separable.
6. Raw archival value and dataset value are not the same thing.

## Current dataset classes
- topic segments
- prompt-response pairs
- micro-segments

## Future classes
- curated datasets
- workflow sequences
- evaluation fixtures
- governance test records
