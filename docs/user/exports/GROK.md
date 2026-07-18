# Grok Export Guide

Verification pending. Confirm against the current Grok, xAI, and X interfaces before private-beta distribution.

Sources to re-check:

- [xAI legal FAQ: data controls](https://x.ai/legal/faq)
- [X Help: About Grok](https://help.x.com/en/using-x/about-grok)
- [X Help: download your X data](https://help.x.com/en/managing-your-account/accessing-your-x-data)

## Where To Export

xAI says users can go to Grok mobile apps or Grok.com `Settings` / `Data Controls` to delete or download their data.

X separately documents an X archive flow under `Settings and privacy` -> `Your account` -> `Download an archive of your data`.

Treat these as separate paths unless a current maintainer-verified Grok guide says otherwise.

## What To Request

For the private-beta Grok path, start with the Grok.com or Grok app data controls download.

Do not assume that an X account archive is the same thing as a Grok conversation export.

## What To Expect

Expected download: a Grok data export archive or file from the Grok data controls path. The exact file naming and folder shape still needs maintainer screenshot verification.

## What To Select In Quantum

In `Imports`, select the downloaded Grok export file first. If you extracted an archive, select the top-level extracted folder that contains the Grok export data.

Then continue:

`Imports -> Readable Archive -> Datasets -> Find Imports`

## Common Mistakes

- Selecting an X archive when the test asked for Grok conversation export data
- Mixing Grok.com, Grok inside X, and X account data paths without checking the resulting file shape
- Importing before `Export Check` confirms Quantum recognizes the export

## Screenshot Placeholders

- Pending: Grok settings
- Pending: Grok `Data Controls`
- Pending: downloaded Grok export file or folder
- Pending: Grok export selected in Quantum `Export Check`
