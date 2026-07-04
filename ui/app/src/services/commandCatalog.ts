import type { DesktopCommandName } from "../types/bridge";

export interface CommandCatalogEntry {
  name: DesktopCommandName;
  description: string;
  backendCommand: string;
}

export const COMMAND_CATALOG: CommandCatalogEntry[] = [
  {
    name: "agent.start",
    description: "Start the local assistant server",
    backendCommand: 'npm run agent:server -- --output "<outputRoot>"'
  },
  {
    name: "agent.health",
    description: "Check local assistant availability and prerequisites",
    backendCommand: "npm run agent:health"
  },
  {
    name: "agent.index",
    description: "Index archive and dataset artifacts for the local assistant",
    backendCommand: 'npm run agent:index -- --output "<outputRoot>"'
  },
  {
    name: "pipeline.runFile",
    description: "Run the pipeline on a single export shard",
    backendCommand: 'npm run run:file -- "<inputFile>" "<outputRoot>"'
  },
  {
    name: "batch.run",
    description: "Run the pipeline across all export shards",
    backendCommand: 'npm run batch:run'
  },
  {
    name: "batch.diagnostics",
    description: "Build aggregate batch diagnostics",
    backendCommand: 'npm run batch:diag'
  },
  {
    name: "batch.delta",
    description: "Build batch delta diagnostics",
    backendCommand: 'npm run batch:delta'
  },
  {
    name: "db.review.buildQueue",
    description: "Build the review queue from processed records",
    backendCommand: 'npm run db:review'
  },
  {
    name: "db.review.decide",
    description: "Approve or reject a review queue record",
    backendCommand: 'npm run db:review:decide -- "<outputRoot>" "<decision>" "<queueKey>" "<reason>"'
  },
  {
    name: "db.promote",
    description: "Promote curated records from processed store",
    backendCommand: 'npm run db:promote'
  },
  {
    name: "db.listCollections",
    description: "List DB collections across tiers",
    backendCommand: 'npm run db:list'
  },
  {
    name: "db.readCollection",
    description: "Read records from a DB collection",
    backendCommand: 'npm run db:read -- "<outputRoot>" "<tier>" "<collection>" "<limit>"'
  },
  {
    name: "governance.listRules",
    description: "List governance rule files",
    backendCommand: 'npm run governance:list'
  },
  {
    name: "governance.readRule",
    description: "Read a governance rule file",
    backendCommand: 'npm run governance:read -- "<filePath>"'
  },
  {
    name: "governance.writeRule",
    description: "Write a governance rule file",
    backendCommand: 'npm run governance:write -- "<filePath>" "<rawJsonText>"'
  },
  {
    name: "diagnostics.run",
    description: "Generate run-level diagnostics report",
    backendCommand: 'npm run diag:run'
  },
  {
    name: "folders.merge",
    description: "Merge topic folders into canonical destinations",
    backendCommand: 'npm run folders:merge'
  },
  {
    name: "purge.restore",
    description: "Restore a purged file into restore queue",
    backendCommand: 'npm run purge:restore -- "<sourceFile>" "<outputRoot>"'
  }
];
