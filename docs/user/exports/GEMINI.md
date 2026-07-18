# Gemini Export Guide

Verification pending. Confirm against the current Google Takeout and Gemini interfaces before private-beta distribution.

Sources to re-check:

- [Google Gemini Apps Help: download Gemini Apps data](https://support.google.com/gemini/answer/16920332?hl=en-GB)
- [Google Gemini Apps Help: manage Gemini Apps activity](https://support.google.com/gemini/answer/13278892)

## Where To Export

Use Google Takeout at `takeout.google.com` while signed in to the same Google Account you use for Gemini Apps.

Google documents two relevant selections:

- `Gemini` for Gemini Gems data
- `My Activity` -> `Gemini Apps` for Gemini Apps activity such as chats, generated media, and uploads

## What To Request

For the private-beta conversation path, include `My Activity` and narrow it to `Gemini Apps`.

Only include the top-level `Gemini` category as well if you specifically need Gems-related data. Do not assume that selecting only `Gemini` is enough for conversation history.

## What To Expect

Google Takeout lets you choose delivery method and archive format. `.zip` is the easiest Windows choice.

Google says delivery can take from a few hours to a few days, with many exports arriving the same day.

Expected download: a Takeout archive, often a `.zip`, containing a `My Activity` area for Gemini Apps activity.

## What To Select In Quantum

In `Imports`, select the downloaded Takeout `.zip` first. If you extracted it, select the top-level extracted Takeout folder or the Gemini Apps activity file if `Export Check` points you there.

Then continue:

`Imports -> Readable Archive -> Datasets -> Find Imports`

## Common Mistakes

- Selecting only the top-level `Gemini` Takeout category and missing `My Activity` -> `Gemini Apps`
- Expecting Google Takeout to behave like a single in-app chat export
- Choosing `.tgz` and then struggling to open it on Windows
- Selecting a blank or unrelated activity file without running `Export Check`

## Screenshot Placeholders

- Pending: Google Takeout product selection
- Pending: `My Activity` details dialog
- Pending: `Gemini Apps` selected
- Pending: Takeout archive selected in Quantum `Export Check`
