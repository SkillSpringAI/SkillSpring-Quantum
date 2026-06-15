# Extension Bridge

## Role
The extension should remain lightweight.

## Good responsibilities
- detect that the user is viewing an AI conversation page
- offer quick send/export action
- capture page metadata
- hand off to desktop application
- optionally mark conversations for later ingest

## Bad responsibilities
- heavy processing
- local database logic
- segmentation
- diagnostics
- dataset building

## End state
The extension should behave like a bridge into the desktop app, not a duplicate of it.
