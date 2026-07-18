# ChatGPT Export Guide

Verification pending. Confirm against the current ChatGPT interface before private-beta distribution.

Source to re-check: [OpenAI Help Center: export ChatGPT history and data](https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data%25252525252525252525252525252525252525252525252525252523.otf).

## Where To Export

Open ChatGPT while signed in to the account you want to export.

Open your profile menu, then go to `Settings` -> `Data Controls` -> `Export Data`.

OpenAI also provides a Privacy Portal path for data requests.

## What To Request

Request a full data export for your consumer ChatGPT account.

OpenAI notes that Chat exports are not available for ChatGPT Business or Enterprise accounts through this flow.

## What To Expect

The export is delivered later by email or SMS. OpenAI says exports can take up to 7 days, and the download link expires 24 hours after delivery.

Expected download: a `.zip` file containing chat history and related account data.

## What To Select In Quantum

In `Imports`, select the downloaded ChatGPT `.zip` file first. If `Export Check` asks for an extracted folder or you already extracted the archive, select the top-level extracted folder that contains the ChatGPT export files.

Then continue:

`Imports -> Readable Archive -> Datasets -> Find Imports`

## Common Mistakes

- Selecting a random file from inside the archive before trying the top-level `.zip`
- Using an expired download link
- Requesting a new export and assuming an older pending request will still arrive
- Trying to use a Business or Enterprise account export path for the private-beta consumer workflow

## Screenshot Placeholders

- Pending: ChatGPT profile menu
- Pending: `Settings` -> `Data Controls`
- Pending: export confirmation
- Pending: downloaded `.zip` selected in Quantum `Export Check`
