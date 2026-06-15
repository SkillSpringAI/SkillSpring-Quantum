# Governance Change Log

## Initial entries

### Entry 001
Date: TBD
Change: Governance folder populated with baseline policies and machine-readable rule files.
Impact: Established a stable policy layer separate from implementation logic.

### Entry 002
Date: TBD
Change: Core pipeline updated to read rule values from governance/rules/.
Impact: Governance became active control, not static documentation.

### Entry 003
Date: TBD
Change: Batch processing policy and dataset routing rules added.
Impact: Prepared the system for coordinated multi-file execution and clearer dataset handling.

### Entry 004
Date: TBD
Change: Batch aggregate diagnostics added.
Impact: Enabled corpus-level health checks across full export runs instead of file-by-file blind spots.

### Entry 005
Date: TBD
Change: Batch delta diagnostics added.
Impact: Enabled comparison between current and previous batch snapshots to detect directional drift.

### Entry 006
Date: TBD
Change: Topic filtering and tiered DB routing added.
Impact: Enabled narrower dataset extraction and separated processed, curated, and private-review records into distinct storage tiers.

### Entry 007
Date: TBD
Change: Curated promotion workflow added.
Impact: Made movement from processed to curated a deliberate, manifest-backed process instead of an implicit side effect.

### Entry 008
Date: TBD
Change: Record-level DB fingerprints added.
Impact: Prevented silent DB growth from repeated reruns by deduplicating records per tier and collection.

### Entry 009
Date: TBD
Change: Review queue workflow added.
Impact: Created a human-judgment lane for near-curated records instead of forcing all decisions into automatic promotion or exclusion.

### Entry 010
Date: TBD
Change: UI app scaffold and desktop shell planning added.
Impact: Established the first formal UI direction for a desktop-first application with a lightweight extension bridge.

### Entry 011
Date: TBD
Change: Manual review decision workflow added.
Impact: Completed the first explicit approve/reject path for near-curated records with manifest-backed operator decisions.

### Entry 012
Date: TBD
Change: Desktop command bridge contract added.
Impact: Established a typed boundary between UI actions and backend commands so the desktop shell can wire real actions cleanly later.

### Entry 013
Date: TBD
Change: Imports screen scaffold aligned to desktop command bridge.
Impact: Gave the UI a real intake surface mapped to single-file and batch backend commands instead of placeholder-only controls.

### Entry 014
Date: TBD
Change: Diagnostics screen scaffold aligned to desktop command bridge.
Impact: Added a real system-health surface for latest run, batch aggregate, batch delta, and diagnostics actions.

### Entry 015
Date: TBD
Change: Tiered DB browser scaffold moved onto a file-backed bridge contract.
Impact: Prepared the UI to inspect real local DB artifacts through a bounded shell layer instead of fake inline data.

### Entry 016
Date: TBD
Change: Tiered DB browser aligned to real backend db:list and db:read command contract.
Impact: Reduced future shell wiring risk by matching UI collection browsing to actual backend DB read surfaces.

### Entry 017
Date: TBD
Change: Governance rules editor screen scaffold aligned to desktop command bridge.
Impact: Added the final major operator surface so governance can be inspected and edited through the same bounded control model as the rest of the app.

### Entry 018
Date: TBD
Change: Navigation state added across desktop UI scaffold.
Impact: Replaced manual AppShell rewrites with proper screen switching and unified the multi-screen control plane.

### Entry 019
Date: TBD
Change: Real governance backend list/read/write commands added.
Impact: Completed the first real governance editing loop on the backend side with boundary checks and JSON validation.

### Entry 020
Date: TBD
Change: Governance writes hardened with backup, write report, and post-write diagnostics hook.
Impact: Reduced the risk of governance edits causing silent breakage and established a safer operational control loop.

### Entry 021
Date: TBD
Change: File-specific governance validation added.
Impact: Upgraded governance writes from generic JSON acceptance to rule-aware validation, reducing the risk of semantically invalid policy edits.

### Entry 022
Date: TBD
Change: Governance UI bridge aligned to real backend command surface.
Impact: Removed more dummy-only flow and prepared the Governance screen to transition into actual desktop-shell execution cleanly.

### Entry 023
Date: TBD
Change: BOM-safe governance validation and richer command result handling added.
Impact: Eliminated a Windows encoding edge case and improved UI/backend truth alignment by returning stdout, stderr, and code from Electron command execution.

### Entry 024
Date: TBD
Change: Governance UI upgraded with save-result visibility and natural-language drafting flow.
Impact: Improved operator usability while preserving canonical JSON as the authority layer.

### Entry 025
Date: TBD
Change: Governance screen upgraded with live reload, dirty tracking, and reset-to-live controls.
Impact: Closed the operator trust loop by showing what is actually live after save instead of only what was attempted.

### Entry 026
Date: TBD
Change: Governance screen upgraded with guided form mode for selected rule files.
Impact: Reduced dependence on raw JSON editing by giving operators structured controls for common governance changes.
