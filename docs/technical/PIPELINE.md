# Pipeline

## Audience

This document is for developers and maintainers.

## Core flow

Quantum's current deterministic spine is:

Inspect export -> Import source -> Normalize conversations -> Segment content -> Generate archive -> Generate dataset artifacts -> Write history and retrieval records -> Emit diagnostics

## Main outcomes

- readable markdown archives
- import history
- retrieval indexes
- privacy-aware dataset artifacts
- diagnostic artifacts

## Design rules

- source material remains local
- import results must be inspectable
- retries and reruns should be trustworthy
- downstream outputs must stay grounded in canonical source facts
