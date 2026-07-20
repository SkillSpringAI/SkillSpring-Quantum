# Beta Guide

## Audience

This guide is for private beta testers.

## Current beta status

As of July 20, 2026, Quantum's `0.1.0-beta.1` Build Week snapshot has been submitted and private-beta preparation continues on Windows.

The primary beta path is still:

`Imports -> Readable Archive -> Datasets -> Find Imports`

`Ask Quantum` is currently experimental and should not yet be treated as the most reliable way to inspect, verify, or recover imported conversation history.

## What Quantum does

Quantum imports supported AI conversation exports and turns them into:

- readable local archives
- searchable local history
- privacy-aware dataset outputs

## Safe test data

Use only exports you are comfortable reviewing locally and are authorized to use.

Avoid:

- confidential employer material
- supplier or procurement data you are not cleared to use
- other people's personal data unless you have clear permission

## Recommended tester path

1. Open Quantum
2. Read the relevant [Export Guide](exports/README.md) before downloading if your vendor flow is unfamiliar
3. Go to `Imports`
4. Choose the export you downloaded
5. Run `Export Check` first
6. If the result looks right, import from that same path
7. Review `Readable Archive` first
8. Review `Datasets` second
9. Use `Find Imports` if you want to revisit earlier material
10. Check `Activity History` when you want to verify or recover what happened

## Large import expectations

For large workspaces, different screens become usable at different times.

What testers should expect:

- `Find Imports` usually becomes the quickest follow-up screen immediately after import
- `Readable Archive` can take around 2 to 3 minutes to become fully usable when the current workspace contains more than 12,000 readable slices
- `Datasets` should be treated as a later step and can remain effectively blocked until the readable archive layer has finished loading for that workspace

Time can vary by machine size, export size, and how many prior readable slices already exist in the selected output root.

## Experimental tools

These are currently secondary tools for follow-up inspection, not the main beta path:

- `Ask Quantum`
- `Diagnostics`
- `Governance`
- other extra tools under the advanced/hidden workflow area

What this means for testers:

- start with Imports, Readable Archive, Datasets, and Find Imports first
- use `Ask Quantum` only as an experimental assistant layer
- do not treat `Ask Quantum` as the authoritative answer when it conflicts with the deterministic archive, dataset, or activity-history outputs
- defer `Diagnostics` during normal beta walkthroughs unless the maintainer specifically asks for it
- treat `Governance` as an advanced follow-up area rather than part of the core beta walkthrough

Current caveats:

- `Diagnostics` files can still exist on disk even when the packaged app UI does not surface them correctly
- batch comparison outputs are not yet reliable enough to treat as part of the main evaluator path
- governance rule files can load and be reviewed in the app, but the current beta expectation should still be that governance is an advanced follow-up workflow rather than the main onboarding path

## How to use the Readable Archive screen

The `Readable Archive` screen is not just a file browser.

It is the first review lane after import and usually the best place to recover your memory of what a conversation was about before you jump into structured datasets.

What to look for:

- topic groups act as memory anchors
- dates help you place the conversation in time
- file names and preview snippets help you recognize the right conversation slice quickly
- repeated slices are normal for long conversations because Quantum creates review windows rather than one giant unreadable file

Why this screen matters:

- it helps you confirm Quantum segmented the conversation in a way that still makes human sense
- it makes the later `Datasets` view easier to understand because you have already seen the readable source slices those dataset entries came from
- it is often the easiest place to answer "yes, this is the conversation I meant"

Suggested tester behavior:

1. start with the topic group and date that best jog your memory
2. open one or two matching slices
3. confirm the preview text and markdown content feel like the conversation you expected
4. only then move to `Datasets` if you want the structured follow-through

Useful feedback here:

- whether the topic names helped you remember the conversation
- whether the dates helped narrow the search quickly
- whether the archive made the dataset output easier to understand
- whether any label on this screen made the workflow harder to follow

## What feedback is useful

Please note:

- what you expected to happen
- what actually happened
- whether the result felt trustworthy
- whether any step felt confusing
- whether you would use the archive or dataset output again

Include screenshots when possible.

## If something looks wrong

- check `Activity History`
- return to `Imports` and re-check the path
- note the exact screen and action
- capture diagnostics if requested by the maintainer

## Related docs

- [User Guide](USER_GUIDE.md)
- [Known Limitations](KNOWN_LIMITATIONS.md)
- [Export Guides](exports/README.md)
