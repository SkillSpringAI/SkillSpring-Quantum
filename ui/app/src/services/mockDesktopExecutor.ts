import type {
  DesktopCommandName,
  DesktopCommandResponse,
  ImportPathPayload,
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
  MarkdownArchivePayload,
  InspectImportSourcePayload,
  ImportHistoryPayload,
  QueryImportHistoryPayload,
  ImportRetrievalIndexPayload,
  RetrievalSavedViewsPayload,
  SaveRetrievalViewPayload,
  DeleteRetrievalViewPayload,
  OpenPathPayload,
  DatasetLatestRunPayload
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
      case "dialog.pickFile":
        return fromBridge(await bridge.dialogs.pickFile());
      case "dialog.pickFolder":
        return fromBridge(await bridge.dialogs.pickFolder());
      case "shell.openPath": {
        const p = payload as OpenPathPayload;
        return fromBridge(await bridge.shell.openPath(p.targetPath));
      }
      case "imports.inspect": {
        const p = payload as InspectImportSourcePayload;
        return fromBridge(await bridge.imports.inspectSource(p.inputPath));
      }
      case "imports.run": {
        const p = payload as ImportPathPayload;
        return fromBridge(await bridge.imports.runSource(p.inputPath, p.outputRoot));
      }
      case "imports.history": {
        const p = payload as ImportHistoryPayload;
        return fromBridge(await bridge.imports.readHistory(p.outputRoot, p.limit));
      }
      case "imports.historyQuery": {
        const p = payload as QueryImportHistoryPayload;
        return fromBridge(await bridge.imports.queryHistory(p.outputRoot, p));
      }
      case "imports.retrievalIndex": {
        const p = payload as ImportRetrievalIndexPayload;
        return fromBridge(await bridge.imports.readRetrievalIndex(p.outputRoot));
      }
      case "retrieval.savedViews.read": {
        const p = payload as RetrievalSavedViewsPayload;
        return fromBridge(await bridge.retrieval.readSavedViews(p.outputRoot));
      }
      case "retrieval.savedViews.save": {
        const p = payload as SaveRetrievalViewPayload;
        return fromBridge(
          await bridge.retrieval.saveSavedView(
            p.outputRoot,
            p.name,
            p.filters,
            p.selectedRecord,
            p.selectedSegment
          )
        );
      }
      case "retrieval.savedViews.delete": {
        const p = payload as DeleteRetrievalViewPayload;
        return fromBridge(await bridge.retrieval.deleteSavedView(p.outputRoot, p.id));
      }
      case "datasets.latestRun": {
        const p = payload as DatasetLatestRunPayload;
        return fromBridge(await bridge.datasets.readLatestRun(p.outputRoot));
      }
      case "datasets.preview": {
        const p = payload as { outputRoot: string; runId: string; kind: string; limit?: number; offset?: number };
        return fromBridge(await bridge.datasets.readPreview(p.outputRoot, p.runId, p.kind, p.limit, p.offset));
      }
      case "datasets.segmentRetrievalIndex": {
        const p = payload as DatasetLatestRunPayload;
        return fromBridge(await bridge.datasets.readSegmentRetrievalIndex(p.outputRoot));
      }
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
        return fromBridge(
          await bridge.db.readCollection(
            p.outputRoot,
            p.tier,
            p.collection,
            p.limit,
            p.offset
          )
        );
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
    case "dialog.pickFile":
    case "dialog.pickFolder":
      return ok(command, { canceled: true, path: null }, "Mock dialog returned no path.");

    case "shell.openPath": {
      const p = payload as OpenPathPayload;
      return ok(command, { targetPath: p.targetPath }, "Mock path open accepted.");
    }

    case "imports.inspect": {
      const p = payload as InspectImportSourcePayload;
      return ok(command, {
        inputPath: p.inputPath,
        inputType: "missing",
        totalFiles: 0,
        supportedFiles: 0,
        unsupportedFiles: 0,
        countsByKind: {
          chatgpt_export: 0,
          conversation_json: 0,
          gemini_activity_html: 0,
          json_document: 0,
          text_document: 0,
          pdf_document: 0,
          unsupported: 0
        },
        notes: ["Mock inspection only. Launch through Electron for real path inspection."],
        sampleFiles: [],
        vendorSummaries: []
      }, "Mock import source inspection returned.");
    }

    case "imports.run": {
      const p = payload as ImportPathPayload;
      return ok(command, {
        runAt: new Date().toISOString(),
        inputPath: p.inputPath,
        outputRoot: p.outputRoot,
        filesDiscovered: 0,
        filesImported: 0,
        filesFailed: 0,
        conversationFilesProcessed: 0,
        genericDocumentsProcessed: 0,
        pdfFilesArchived: 0,
        archivedOnlyFiles: 0,
        recoveryPathFiles: 0,
        unsupportedFilesSkipped: 0,
        artifacts: [],
        results: [],
        retrievalSummary: null
      }, "Mock import run accepted.");
    }

    case "imports.history": {
      const p = payload as ImportHistoryPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        importsRoot: p.outputRoot + "/imports",
        latestFile: p.outputRoot + "/imports/latest-import-run.json",
        historyDir: p.outputRoot + "/imports/history",
        latest: null,
        runs: []
      }, "Mock import history returned.");
    }

    case "imports.historyQuery": {
      const p = payload as QueryImportHistoryPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        importsRoot: p.outputRoot + "/imports",
        historyDir: p.outputRoot + "/imports/history",
        filters: {
          vendor: p.vendor ?? "",
          topic: p.topic ?? "",
          text: p.text ?? "",
          from: p.from ?? "",
          to: p.to ?? "",
          status: p.status ?? "all"
        },
        runs: []
      }, "Mock import history query returned.");
    }

    case "imports.retrievalIndex": {
      const p = payload as ImportRetrievalIndexPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        importsRoot: p.outputRoot + "/imports",
        latestFile: p.outputRoot + "/imports/latest-retrieval-index.json",
        latest: null
      }, "Mock import retrieval index returned.");
    }

    case "retrieval.savedViews.read": {
      const p = payload as RetrievalSavedViewsPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        retrievalRoot: p.outputRoot + "/retrieval",
        latestFile: p.outputRoot + "/retrieval/saved-views.json",
        latest: null
      }, "Mock retrieval saved views returned.");
    }

    case "retrieval.savedViews.save": {
      const p = payload as SaveRetrievalViewPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        retrievalRoot: p.outputRoot + "/retrieval",
        latestFile: p.outputRoot + "/retrieval/saved-views.json",
        latest: {
          schemaVersion: "retrieval_saved_views.v1",
          updatedAt: new Date().toISOString(),
          outputRoot: p.outputRoot,
          views: [
            {
              id: "mock-view",
              name: p.name,
              filters: p.filters,
              selectedRecord: p.selectedRecord,
              selectedSegment: p.selectedSegment,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      }, "Mock retrieval saved view stored.");
    }

    case "retrieval.savedViews.delete": {
      const p = payload as DeleteRetrievalViewPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        retrievalRoot: p.outputRoot + "/retrieval",
        latestFile: p.outputRoot + "/retrieval/saved-views.json",
        latest: {
          schemaVersion: "retrieval_saved_views.v1",
          updatedAt: new Date().toISOString(),
          outputRoot: p.outputRoot,
          views: []
        }
      }, "Mock retrieval saved view deleted.");
    }

    case "datasets.latestRun": {
      const p = payload as DatasetLatestRunPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        datasetsRoot: p.outputRoot + "/datasets",
        manifestPath: p.outputRoot + "/db/manifests/latest-dataset-run.json",
        latest: null,
        runs: []
      }, "Mock dataset summary returned.");
    }

    case "datasets.preview": {
      const p = payload as { outputRoot: string; runId: string; kind: string; limit?: number; offset?: number };
      return ok(command, {
        outputRoot: p.outputRoot,
        runId: p.runId,
        kind: p.kind,
        scope: "historical_run",
        sourcePath: p.outputRoot + "/datasets/runs/" + p.runId + "/" + p.kind + ".jsonl",
        limit: p.limit ?? 25,
        offset: p.offset ?? 0,
        totalRecords: 0,
        hasMore: false,
        records: []
      }, "Mock dataset preview returned.");
    }

    case "datasets.segmentRetrievalIndex": {
      const p = payload as DatasetLatestRunPayload;
      return ok(command, {
        outputRoot: p.outputRoot,
        retrievalRoot: p.outputRoot + "/retrieval",
        latestFile: p.outputRoot + "/retrieval/latest-segment-index.json",
        latest: null
      }, "Mock segment retrieval index returned.");
    }

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
          offset: p.offset ?? 0,
          totalRecords: 0,
          hasMore: false,
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
