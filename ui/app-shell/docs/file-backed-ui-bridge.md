# File-Backed UI Bridge

## Goal
Move UI data displays from fake hardcoded examples toward real local file-backed records.

## Current state
The DB browser now routes through a file-backed bridge contract.

The implementation is still stubbed, but it now:
- understands output root
- understands tier/collection mapping
- computes file paths
- prepares for real shell-side file IO

## Intended next step
The desktop shell should implement:
- list files under db tiers
- read JSONL collections
- return parsed records
- enforce load limits and pagination

## Principle
The UI should read actual local artifacts through a bounded bridge, not import backend internals directly.
