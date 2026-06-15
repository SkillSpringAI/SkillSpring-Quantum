# DB Command Bridge

## Goal
Connect the Tiered DB Browser UI to real backend DB commands.

## Commands

### db.listCollections
Payload:
- outputRoot

Maps to:
npm run db:list

Expected result:
- outputRoot
- dbRoot
- collections[]

### db.readCollection
Payload:
- outputRoot
- tier
- collection
- limit

Maps to:
npm run db:read -- "<outputRoot>" "<tier>" "<collection>" "<limit>"

Expected result:
- outputRoot
- tier
- collection
- limit
- records[]

## Principle
The DB browser should not guess file paths once the desktop shell is in place.
It should request collection metadata and records through the bridge contract.
