# Diagnostics UI Flow

## Goal
Expose real system health actions and artifacts through the desktop UI.

## Core actions
- run diagnostics
- build batch diagnostics
- build batch delta

## Core displays
- latest run summary
- batch aggregate summary
- batch delta summary
- recommendations

## Bridge mapping
Run diagnostics maps to:
- command: diagnostics.run

Build batch diagnostics maps to:
- command: batch.diagnostics

Build batch delta maps to:
- command: batch.delta

## Principle
Diagnostics UI should show system health clearly and should never invent health state outside backend artifacts.
