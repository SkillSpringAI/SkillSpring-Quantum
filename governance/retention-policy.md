# Retention Policy

## Scope
This policy governs where output artifacts are stored and how they should be treated.

## Output classes
- primary organized snippets
- backup copies
- archived replaced files
- purged low-value files
- restore queue files
- dataset outputs
- diagnostics artifacts

## Rules
1. One backup copy is acceptable.
2. Replaced primary files should move to archive.
3. Low-value segments should move to purge, not disappear silently.
4. Diagnostics history should be retained.
5. Dataset manifests should be retained per run.
6. Future curated datasets should be retained separately from processed datasets.
