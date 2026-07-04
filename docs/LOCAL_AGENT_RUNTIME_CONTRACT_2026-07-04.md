# Local Agent Runtime Contract - 2026-07-04

This note defines the repo-side runtime contract for the local agent before deeper Electron or UI integration begins.

## Canonical Path

For the current repo state, the canonical runtime entrypoint is:

- `skillspring-quantum-agent/agent/main.ts`

The package is not yet flattened into a top-level `agent/` folder, so all scripts and integration references should use the explicit nested path.

## Script Contract

The repo-level scripts should be:

- `npm run agent`
- `npm run agent:health`
- `npm run agent:index`
- `npm run agent:server`
- `npm run agent:query -- "<question>"`

These scripts are for operator and maintainer use first. They do not imply that the assistant is a primary end-user feature yet.

## Availability Contract

Quantum must remain usable when the local agent stack is unavailable.

Expected degraded-mode behavior:

- imports still work
- readable archive still works
- datasets still work
- retrieval still works
- assistant entry points should either hide gracefully or show a clear unavailable state

The local agent is optional enhancement, not a boot dependency.

## Deterministic And Semantic Layer Contract

The agent runtime operates on top of a two-layer model:

- canonical source layer:
  import facts, source preservation, vendor boundaries, archive outputs, dataset outputs, manifests, validation, and reproducible records
- semantic organisation layer:
  optional AI-generated titles, summaries, labels, segments, groupings, alias suggestions, and other derived metadata

The runtime must not silently replace canonical facts with semantic suggestions.

## Startup Contract

Near-term preferred startup behavior:

- do not auto-start the agent server unconditionally on every Electron app launch
- allow explicit start from a controlled integration point
- once stable, optionally auto-start only when a user invokes `Ask Quantum` or enables assistant features

This reduces startup complexity and prevents local-model availability from feeling like a required app dependency.

## Indexing Contract

The first agent indexing contract should be:

- index archive output
- index dataset output
- run indexing asynchronously
- never block the visible import completion flow on embedding or vector-store work

Until real incremental indexing is fully wired, manual indexing remains acceptable.

## Source-Grounding Contract

Every agent response shown in the UI should:

- be grounded in archive files, dataset records, import summaries, or diagnostics
- expose sources in the response surface
- prefer "I don’t have enough evidence here" over invented confidence

The agent is an explainer of Quantum artifacts, not an unbounded general chat layer.

## Capability-Bound Command Contract

Near-term natural-language control should route through a constrained capability registry.

The agent should translate user requests into supported actions such as:

- inspect export
- import export
- open output location
- explain import result
- search completed outputs
- rebuild the local search index
- open archive
- open datasets
- open imports

Current repo status:

- a first narrow command catalog is now wired into the `Ask Quantum` drawer
- those supported actions are attempted before the app falls back to broader freeform assistant explanation
- this protects the deterministic boundary while still giving users a chat-shaped control surface

Unsupported actions should be refused or clarified rather than invented.

## Logging And Storage Contract

The agent may store local session and vector data inside the chosen Quantum output root, but that storage should remain:

- local-only
- user-controlled
- clearly separable from the core deterministic outputs

Recommended location pattern:

- `<selected-output-root>/agent_store/...`

## Immediate Next Technical Slice

The next implementation slice after this contract should be:

1. health-check verification through repo scripts
2. Electron main-process wrapper for start/stop/health
3. preload bridge for agent IPC access
4. one contextual UI entry point, not a full new screen

These baseline slices are now in place. The next runtime concern is not "add more autonomy" but "keep the supported command boundary explicit, testable, and source-grounded."
