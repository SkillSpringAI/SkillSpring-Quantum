export interface StatusCard {
  label: string;
  value: string;
}

export interface RecommendationItem {
  id: string;
  message: string;
}

declare global {
  interface Window {
    skillspringDesktop?: {
      ping: () => Promise<unknown>;
      dialogs: {
        pickFile: () => Promise<unknown>;
        pickFolder: () => Promise<unknown>;
      };
      shell: {
        openPath: (targetPath: string) => Promise<unknown>;
        pathExists: (targetPath: string) => Promise<unknown>;
      };
      imports: {
        inspectSource: (inputPath: string) => Promise<unknown>;
        runSource: (inputPath: string, outputRoot: string) => Promise<unknown>;
        readHistory: (outputRoot: string, limit: number) => Promise<unknown>;
        queryHistory: (outputRoot: string, filters: {
          vendor?: string;
          topic?: string;
          text?: string;
          from?: string;
          to?: string;
          status?: "all" | "imported" | "skipped" | "failed";
        }) => Promise<unknown>;
        readRetrievalIndex: (outputRoot: string) => Promise<unknown>;
      };
      retrieval: {
        readSavedViews: (outputRoot: string) => Promise<unknown>;
        saveSavedView: (outputRoot: string, name: string, filters: {
          text: string;
          vendor: string;
          topic: string;
          status: "all" | "imported" | "skipped" | "failed";
          from: string;
          to: string;
        }, selectedRecord?: {
          runAt: string;
          filePath: string;
        }, selectedSegment?: {
          runId: string;
          conversationId: string;
          startIndex: number;
          endIndex: number;
        }) => Promise<unknown>;
        deleteSavedView: (outputRoot: string, id: string) => Promise<unknown>;
      };
      datasets: {
        readLatestRun: (outputRoot: string, limit?: number) => Promise<unknown>;
        readPreview: (
          outputRoot: string,
          runId: string,
          kind: "topic_segments" | "prompt_response_pairs" | "micro_segments" | "private_review",
          limit?: number,
          offset?: number
        ) => Promise<unknown>;
        readSegmentRetrievalIndex: (outputRoot: string) => Promise<unknown>;
      };
      governance: {
        listRules: () => Promise<unknown>;
        readRule: (filePath: string) => Promise<unknown>;
        writeRule: (filePath: string, rawText: string) => Promise<unknown>;
      };
      db: {
        listCollections: () => Promise<unknown>;
        readCollection: (
          outputRoot: string,
          tier: string,
          collection: string,
          limit: number,
          offset?: number
        ) => Promise<unknown>;
        buildReviewQueue: (outputRoot: string) => Promise<unknown>;
        decideReviewQueueRecord: (
          outputRoot: string,
          decision: "approve" | "reject",
          queueKey: string,
          reason: string
        ) => Promise<unknown>;
        promoteCurated: (outputRoot: string) => Promise<unknown>;
      };
      diagnostics: {
        run: () => Promise<unknown>;
        batchDiag: () => Promise<unknown>;
        batchDelta: () => Promise<unknown>;
      };
      notifications: {
        archive: (outputRoot: string, limit: number) => Promise<unknown>;
        markdownArchive: (outputRoot: string, filePath?: string) => Promise<unknown>;
      };
      pipeline: {
        runFile: (inputFile: string, outputRoot: string) => Promise<unknown>;
        runBatch: () => Promise<unknown>;
        mergeFolders: (outputRoot: string) => Promise<unknown>;
        restorePurgedFile: (sourceFile: string, outputRoot: string) => Promise<unknown>;
      };
    };
  }
}

export {};
