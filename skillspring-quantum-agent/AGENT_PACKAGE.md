# Package.json Additions for Agent

Add the following to the existing `package.json` in the SkillSpring Quantum repo:

## New Scripts

```json
{
  "scripts": {
    "agent": "tsx skillspring-quantum-agent/agent/main.ts",
    "agent:health": "tsx skillspring-quantum-agent/agent/main.ts --health",
    "agent:index": "tsx skillspring-quantum-agent/agent/main.ts --index",
    "agent:server": "tsx skillspring-quantum-agent/agent/main.ts --server",
    "agent:query": "tsx skillspring-quantum-agent/agent/main.ts --query"
  }
}
```

## Dependencies to Add

```json
{
  "dependencies": {},
  "devDependencies": {}
}
```

**Note:** The agent uses only Node.js built-in modules and the existing `tsx` dev dependency. No additional npm packages are required. The agent relies on:

- `node:sqlite` (built-in, Node.js 22+)
- `node:fs/promises` (built-in)
- `node:path` (built-in)
- `node:http` (built-in)
- `node:readline` (built-in)
- `tsx` (already in devDependencies)

## tsconfig.json Update

The existing `tsconfig.json` should be updated to include the agent directory:

```json
{
  "include": [
    "core/**/*.ts",
    "skillspring-quantum-agent/agent/**/*.ts",
    "governance/**/*.json",
    "config/**/*.json"
  ]
}
```

Or alternatively, add `agent/**/*` to the include array:

```json
{
  "include": [
    "core/**/*.ts",
    "skillspring-quantum-agent/agent/**/*.ts",
    "skillspring-quantum-agent/agent/**/*.json",
    "governance/**/*.json",
    "config/**/*.json"
  ]
}
```

## Current Repo Note

The package is currently nested under `skillspring-quantum-agent/agent/` rather than living at a top-level `agent/` path.

That means every integration example in this package should be interpreted relative to the current repo layout unless and until the package is flattened into a canonical top-level `agent/` directory.
