import type {
  DesktopCommandName,
  DesktopCommandResponse,
  GovernanceListRulesPayload,
  GovernanceReadRulePayload,
  GovernanceWriteRulePayload,
  DbListCollectionsPayload,
  DbReadCollectionPayload,
  RunFilePayload,
  BatchRunPayload,
  ReviewDecisionPayload,
  PromotePayload,
  MergeFoldersPayload,
  RestorePayload,
  ArchiveNotificationsPayload,
  MarkdownArchivePayload
} from "../types/bridge";

import type {
  GovernanceListRulesResult,
  GovernanceReadRuleResult,
  GovernanceWriteRuleResult
} from "../types/governanceBridge";

function ok<TResult>(
  command: DesktopCommandName,
  result: TResult,
  message?: string
): DesktopCommandResponse<TResult> {
  return {
    ok: true,
    command,
    result,
    message
  };
}

function fromBridge(response: unknown): DesktopCommandResponse {
  return response as DesktopCommandResponse;
}

export async function executeMockDesktopCommand(
  command: DesktopCommandName,
  payload: unknown
): Promise<DesktopCommandResponse> {
  const bridge = window.skillspringDesktop;

  if (bridge) {
    switch (command) {
      case "governance.listRules":
        return fromBridge(await bridge.governance.listRules());
      case "governance.readRule": {
        const p = payload as GovernanceReadRulePayload;
        return fromBridge(await bridge.governance.readRule(p.filePath));
      }
      case "governance.writeRule": {
        const p = payload as GovernanceWriteRulePayload;
        return fromBridge(await bridge.governance.writeRule(p.filePath, p.rawText));
      }
      case "db.listCollections":
        return fromBridge(await bridge.db.listCollections());
      case "db.readCollection": {
        const p = payload as DbReadCollectionPayload;
        return fromBridge(await bridge.db.readCollection(p.outputRoot, p.tier, p.collection, p.limit));
      }
      case "db.review.buildQueue": {
        const p = payload as { outputRoot: string };
        return fromBridge(await bridge.db.buildReviewQueue(p.outputRoot));
      }
      case "db.review.decide": {
        const p = payload as ReviewDecisionPayload;
        return fromBridge(await bridge.db.decideReviewQueueRecord(p.outputRoot, p.decision, p.queueKey, p.reason));
      }
      case "db.promote": {
        const p = payload as PromotePayload;
        return fromBridge(await bridge.db.promoteCurated(p.outputRoot));
      }
      case "diagnostics.run":
        return fromBridge(await bridge.diagnostics.run());
      case "batch.diagnostics":
        return fromBridge(await bridge.diagnostics.batchDiag());
      case "batch.delta":
        return fromBridge(await bridge.diagnostics.batchDelta());
      case "notifications.archive": {
        const p = payload as ArchiveNotificationsPayload;
        return fromBridge(await bridge.notifications.archive(p.outputRoot, p.limit));
      }
      case "archive.markdown": {
        const p = payload as MarkdownArchivePayload;
        return fromBridge(await bridge.notifications.markdownArchive(p.outputRoot, p.filePath));
      }
      case "pipeline.runFile": {
        const p = payload as RunFilePayload;
        return fromBridge(await bridge.pipeline.runFile(p.inputFile, p.outputRoot));
      }
      case "batch.run":
        return fromBridge(await bridge.pipeline.runBatch());
      case "folders.merge": {
        const p = payload as MergeFoldersPayload;
        return fromBridge(await bridge.pipeline.mergeFolders(p.outputRoot));
      }
      case "purge.restore": {
        const p = payload as RestorePayload;
        return fromBridge(await bridge.pipeline.restorePurgedFile(p.sourceFile, p.outputRoot));
      }
      default:
        break;
    }
  }

  switch (command) {
    case "governance.listRules": {
      const p = payload as GovernanceListRulesPayload;
      const result: GovernanceListRulesResult = {
        rootPath: p.rootPath,
        files: [
          { name: "signal-thresholds.json", path: "governance/rules/signal-thresholds.json" },
          { name: "topic-filter-rules.json", path: "governance/rules/topic-filter-rules.json" },
          { name: "curation-rules.json", path: "governance/rules/curation-rules.json" },
          { name: "review-queue-rules.json", path: "governance/rules/review-queue-rules.json" },
          { name: "review-decision-rules.json", path: "governance/rules/review-decision-rules.json" }
        ]
      };

      return ok(command, result, "Mock governance rule list returned.");
    }

    case "governance.readRule": {
      const p = payload as GovernanceReadRulePayload;
      const result: GovernanceReadRuleResult = {
        filePath: p.filePath,
        rawText:
          '{\n  "note": "Mock desktop bridge. Replace with real shell execution.",\n  "filePath": "' +
          p.filePath.replace(/\\/g, "\\\\") +
          '"\n}'
      };

      return ok(command, result, "Mock governance rule content returned.");
    }

    case "governance.writeRule": {
      const p = payload as GovernanceWriteRulePayload;
      const result: GovernanceWriteRuleResult = {
        filePath: p.filePath,
        saved: true
      };

      return ok(command, result, "Mock governance write accepted.");
    }

    case "db.listCollections": {
      const _p = payload as DbListCollectionsPayload;
      return ok(command, { outputRoot: "organized_output", dbRoot: "organized_output/db", collections: [] }, "Mock DB collection list returned.");
    }

    case "db.readCollection": {
      const p = payload as DbReadCollectionPayload;
      return ok(
        command,
        {
          outputRoot: p.outputRoot,
          tier: p.tier,
          collection: p.collection,
          limit: p.limit,
          records: []
        },
        "Mock DB collection read returned."
      );
    }

    case "pipeline.runFile": {
      const _p = payload as RunFilePayload;
      return ok(command, {}, "Mock pipeline run acknowledged.");
    }

    case "batch.run": {
      const _p = payload as BatchRunPayload;
      return ok(command, {}, "Mock batch run acknowledged.");
    }

    case "notifications.archive": {
      const p = payload as ArchiveNotificationsPayload;
      return ok(
        command,
        {
          outputRoot: p.outputRoot,
          notificationsRoot: p.outputRoot + "/notifications",
          eventsFile: p.outputRoot + "/notifications/archive-events.jsonl",
          latestFile: p.outputRoot + "/notifications/latest-archive-event.json",
          latest: null,
          events: []
        },
        "Mock archive notifications returned."
      );
    }

    case "archive.markdown": {
      const p = payload as MarkdownArchivePayload;
      return ok(
        command,
        {
          outputRoot: p.outputRoot,
          topics: [],
          selectedFile: null,
          content: ""
        },
        "Mock markdown archive returned."
      );
    }

    default:
      return {
        ok: true,
        command,
        result: {},
        message: "Mock desktop executor acknowledged command."
      };
  }
}
