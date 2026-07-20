# Beta Readiness Implementation

## Status

Active pre-private-beta checklist, updated July 20, 2026.

This is the short operational companion to the [MVP Roadmap](../project/MVP_ROADMAP.md). It records only the remaining local verification, bounded fixes, and walkthrough evidence needed before external testers receive Quantum.

## Evidence already recorded

- `0.1.0-beta.1` is submitted to OpenAI Build Week and published as a GitHub prerelease.
- The installer has been downloaded from GitHub and installed on a separate laptop.
- A full fresh walkthrough completed with both a real ChatGPT export and the synthetic Build Week demo export.
- The core workflow, Activity History, and the hidden advanced-tools screen were exercised.
- Governance redaction worked during manual testing. Its phrase matching is intentionally conservative today; for example, a rule for `bank` also matches `Reserve Bank of New Zealand`.
- Fresh Grok and Claude exports imported into the same output root as existing ChatGPT data; all three vendors remained viewable in the app.

## Confirmed issue: current Microsoft Copilot CSV

**Status: pre-beta compatibility fix**

The current `copilot-activity-history.csv` downloaded from Microsoft is non-empty and otherwise matches Quantum's named activity-CSV shape:

- 565 lines / 28.7 KB
- columns: `Conversation,Time,Author,Message`
- populated Human and AI rows

It begins with a UTF-8 byte-order mark (BOM). Quantum currently compares the first header literally, so it sees `\uFEFFConversation` instead of `Conversation` and reports a vendor mismatch.

Required implementation:

1. Strip one leading UTF-8 BOM before Copilot CSV header detection and parsing.
2. Add a regression fixture or test that preserves the BOM.
3. Run the current raw Copilot export through `Export Check`, import it, and verify archive, datasets, and Find Imports in the shared output root.

Do not broaden Copilot parsing beyond this proven issue until new evidence appears.

## Confirmed issue: Gemini attachment-only Takeout

**Status: pre-beta intake hardening**

The inspected Google Takeout root contains a Gemini Apps attachment folder but no parseable Gemini conversation-history export:

- 202 JPGs, 17 PNGs, 39 PDFs, 5 DOCX files, and 1 XLSX file
- two 11-byte Gemini HTML placeholders for Gems and scheduled actions
- no Gemini conversation JSON, CSV, or activity-history HTML containing conversation text

Quantum currently processes the attachment PDFs through the generic document path when the user selects Gemini. This is not a valid Gemini conversation import and should not be presented as one.

Required implementation:

1. Detect a Google Takeout / Gemini Apps root before generic document handling.
2. Require parseable Gemini activity or conversation content before marking the source import-ready.
3. When only Gemini attachments are present, stop at Export Check with a clear recovery message: re-export with **My Activity -> Gemini Apps** selected for chat activity.
4. Keep generic PDF import separate from the named Gemini vendor path.
5. Add an attachment-only Gemini Takeout regression fixture or equivalent intake test.

Google's current export instructions distinguish the `Gemini` selection for Gems from `My Activity -> Gemini Apps` for Gemini chats, generated media, and uploads. Verify the live export guide before changing the user-facing wording.

## Required local automated gate

Run these from the release-candidate commit:

```bash
npm run build
npm run test:ci
npm run package:win
```

If the combined test wrapper exceeds the local command window, run and record the grouped suites instead:

```bash
npm run test:parser:coverage
npm run test:imports
npm run test:smoke:vendors
npm run test:retrieval
npm run test:pipeline
npm run test:assistant
npm run test:governance
```

For every installer given to a tester, record the version, commit, filename, and SHA-256 checksum.

## Required local walkthroughs

Use a fresh output root outside the repository unless the scenario explicitly tests shared-workspace behaviour.

| Scenario | Expected result | Status |
| --- | --- | --- |
| Download and install the GitHub prerelease on a clean Windows environment | Launches without Node, npm, Git, or repository files | Passed for `0.1.0-beta.1` |
| Synthetic demo export | Export Check, import, archive, datasets, and Find Imports complete | Passed |
| Fresh real ChatGPT export | Core workflow completes in a new output root | Passed |
| Fresh Grok export in an existing ChatGPT output root | Both vendors remain visible and usable | Passed |
| Current raw Copilot activity CSV | Recognizes, imports, and remains visible with other vendors | Blocked by BOM fix |
| Gemini attachment-only Takeout | Stops at Export Check without processing attachment documents as Gemini conversations | Blocked by intake hardening |
| Fresh Claude export in the shared output root | Claude and existing vendor content remain visible and usable | Passed: ChatGPT, Grok, and Claude visible together |
| Same-export rerun | Honest reuse is shown without duplicated outputs | Required per candidate |
| Stop an active large import | App remains usable; rerun can recover safely | Required per candidate |
| Clearly wrong source or wrong vendor selection | Export Check explains the issue without importing | Required per candidate |
| Uninstall and reinstall | Record retained local workspace behaviour and any SmartScreen friction | Required before wider beta distribution |

## Support-readiness check

Before the first external tester, confirm the maintainer can tell a tester:

- where their chosen output root is shown
- how to record the version and failed action
- which diagnostics may contain private conversation content
- which screenshots or metadata are safe to share
- that the app does not send telemetry or conversation content automatically

## Explicitly defer

- Redaction word-boundary or context-aware matching.
- Search ranking changes based on one maintainer query.
- Renaming `Find Imports` before repeated tester evidence.
- New vendor formats beyond the specific Copilot BOM compatibility fix.
- Broad UI redesigns, telemetry, or advanced support-bundle automation.

## Exit condition

Quantum is ready to start the small private beta when the Copilot CSV and Gemini intake regressions are fixed and tested, the required walkthrough rows are complete for the release candidate, support guidance is usable, and no unresolved import-integrity issue remains.
