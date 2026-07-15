# Manual Test Current

This is the current manual walkthrough script for private-beta readiness checks.

## Goal

Verify that an ordinary user can move through the main Quantum workflow with a real export and a fresh output root:

1. Imports
2. Export Check
3. Import
4. Activity History
5. Readable Archive
6. Datasets
7. Find Imports
8. Return to Imports

## Setup rules

- use the export exactly as it was downloaded
- prefer a fresh output root outside the repository workspace
- do not delete older manual output folders just to simulate freshness
- when practical, test with a current real-world export package rather than a maintainer-only fixture

## Recommended test shape

### Primary run

Use:

- one newly downloaded supported vendor export
- one brand-new output root outside the repo

Verify:

- the output-root explanation feels like a fresh local workspace rather than missing memory
- Export Check clearly distinguishes import-ready files from expected extra package files
- long-running import states feel active and honest
- Activity History remains available while navigating away from Imports
- Readable Archive and Datasets load coherently from the same run

### Current proven scenario

The latest successful walkthrough used:

- export path: `C:\Users\Laptop\Desktop\new export test`
- output root: `C:\Users\Laptop\Desktop\New folder (2)`

The export was a newly downloaded free-account ChatGPT package that included an `ads.json` companion file.

Observed result:

- Quantum treated the package as a shard-first ChatGPT export
- companion files were handled automatically instead of being treated like failures
- the fresh-workspace flow remained understandable
- the most valuable next improvement was broader Activity History coverage across Archive and Datasets

### Installed-build follow-up

The same export and output root were then used to validate the Windows packaged build and installer.

Observed result:

- the unpacked packaged app completed a full import and walkthrough cleanly
- the installed build recognized the same output root as an existing workspace
- rerunning the same import triggered expected reuse instead of acting like a fresh import
- Activity History explained the reuse path clearly, including file-by-file reuse and reused archive/dataset state
- Archive, Datasets, and Find Imports all remained coherent after installer-based reuse

## What to record

Capture these items:

1. export path tested
2. output root used
3. whether the output root was outside the repo
4. whether Imports correctly read as a fresh workspace before import
5. whether Export Check felt decisive and understandable
6. whether import-state honesty held up during longer steps
7. whether Activity History stayed useful after leaving Imports
8. whether Archive, Datasets, and Find Imports still felt connected to the same run
9. whether any issue is a blocker, readiness issue, observe-in-beta item, or cosmetic preference
10. whether the installed build behaves the same as the unpacked packaged app when pointed at an existing output root

## Success condition

This walkthrough succeeds if:

- Quantum reads like a fresh workspace in the new output root
- that fresh-workspace state does not feel like missing memory
- the first import populates history, archive, and datasets coherently
- Activity History helps explain what Quantum has done even after the user navigates across screens
