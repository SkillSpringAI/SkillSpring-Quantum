# State Model

## Primary state domains
- navigation state
- run state
- diagnostics state
- review queue state
- dataset browsing state
- governance editing state

## Backend-connected action state
The following actions should use the desktop command bridge:
- run file
- run batch
- build diagnostics
- build review queue
- approve review queue record
- reject review queue record
- promote curated records
- merge folders
- restore purged file

## Guiding principle
UI state should reflect backend artifacts, not invent parallel truth.
