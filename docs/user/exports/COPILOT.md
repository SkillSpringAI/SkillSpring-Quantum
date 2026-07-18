# Microsoft Copilot Export Guide

Verification pending. Confirm against the current Microsoft privacy dashboard before private-beta distribution.

Source to re-check: [Microsoft Support: manage Copilot activity history in the privacy dashboard](https://support.microsoft.com/en-US/Privacy/manage-your-copilot-activity-history-in-the-privacy-dashboard).

## Where To Export

Sign in to the Microsoft privacy dashboard with the Microsoft account that owns the Copilot activity.

Microsoft documents the personal-account path as `Privacy` -> `Empower your productivity` -> `Copilot` -> `Your Copilot app activity history` -> `Copilot apps`.

## What To Request

Choose `Export all activity history` for Copilot apps.

Quantum's current private-beta promise is narrower than every Microsoft or Microsoft 365 Copilot export shape. Start with the Copilot apps activity-history CSV path unless the maintainer asks you to test another Microsoft export.

## What To Expect

Microsoft says the Copilot apps export downloads a comma-separated values file.

Expected download: a `.csv` file.

## What To Select In Quantum

In `Imports`, select the downloaded Copilot `.csv` file and run `Export Check`.

Then continue:

`Imports -> Readable Archive -> Datasets -> Find Imports`

## Common Mistakes

- Assuming every Microsoft 365 Copilot export is supported
- Selecting a general Microsoft account archive instead of the Copilot activity-history CSV
- Using a work or school account flow when the private-beta test was meant for a personal Microsoft account
- Importing before `Export Check` confirms the CSV shape

## Screenshot Placeholders

- Pending: Microsoft privacy dashboard Copilot section
- Pending: `Export all activity history`
- Pending: downloaded CSV in the file picker
- Pending: Copilot CSV selected in Quantum `Export Check`
