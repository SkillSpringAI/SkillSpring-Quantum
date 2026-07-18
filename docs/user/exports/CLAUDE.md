# Claude Export Guide

Verification pending. Confirm against the current Claude interface before private-beta distribution.

Source to re-check: [Anthropic Help Center: export Claude data](https://support.anthropic.com/en/articles/9450526-how-can-i-export-my-claude-data).

## Where To Export

Open Claude on the web app or Claude Desktop while signed in.

For individual users and Team plan Primary Owners, Anthropic documents the path as `Settings` -> `Privacy` -> `Export data`.

Anthropic says Claude mobile apps do not provide this export flow.

## What To Request

Request a data export for the account or workspace you are authorized to export.

For Enterprise Primary Owners, Anthropic documents a separate `Settings` -> `Data management` -> `Export Data` organization export path.

## What To Expect

Anthropic sends a download link by email after processing. The link must be used while signed in and expires 24 hours after delivery.

Expected download: a Claude export archive containing conversation data and account data.

## What To Select In Quantum

In `Imports`, select the downloaded Claude export archive first. If you extracted it, select the top-level extracted folder that contains the Claude conversation data.

Then continue:

`Imports -> Readable Archive -> Datasets -> Find Imports`

## Common Mistakes

- Looking for the export flow in the Claude mobile app
- Downloading while signed out of the account that requested the export
- Waiting too long and using an expired email link
- Selecting a nested file before trying the top-level export archive or folder

## Screenshot Placeholders

- Pending: Claude account menu
- Pending: `Settings` -> `Privacy`
- Pending: `Export data`
- Pending: Claude export selected in Quantum `Export Check`
