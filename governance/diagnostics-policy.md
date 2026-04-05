# Diagnostics Policy

## Scope
This policy governs the internal record keeping of SkillSpring Quantum.

## Required artifacts
- latest-run.json
- historical run logs
- failure logs
- health-report.json

## Required metrics
- files processed
- conversations found
- segments created
- segments purged
- duplicates skipped
- backup writes
- archive moves
- dataset counts
- private-review counts
- warning and error totals

## Threshold checks
The system should flag:
- high duplicate rate
- high private-review rate
- low segment yield
- high purge rate

## Principle
Diagnostics are part of the product, not an afterthought.
