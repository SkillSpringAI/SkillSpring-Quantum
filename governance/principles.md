# Principles

## 1. Deterministic first
The pipeline should work without model dependency.

## 2. Auditable before clever
Every major routing decision should be explainable from rule logic, diagnostics, or manifest state.

## 3. Preserve before enrich
Raw content may be transformed into smaller units, but the system should not depend on speculative reconstruction.

## 4. Smaller is better for reuse
Dense chunks are acceptable for archival purposes but not ideal for datasets.

## 5. Waste should be quarantined, not silently erased
Low-value material should be routed to purge unless policy requires retention.

## 6. Sensitive material must not flow unchecked
Potentially private content should be redacted or routed to private review.

## 7. Version everything that matters
Datasets, rules, and program behavior should be trackable through explicit versions.

## 8. Diagnostics are part of the system, not an optional extra
If the system cannot describe its own output quality, it is not trustworthy.
