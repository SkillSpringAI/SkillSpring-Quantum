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
      governance: {
        listRules: () => Promise<unknown>;
        readRule: (filePath: string) => Promise<unknown>;
        writeRule: (filePath: string, rawText: string) => Promise<unknown>;
      };
      db: {
        listCollections: () => Promise<unknown>;
        readCollection: (outputRoot: string, tier: string, collection: string, limit: number) => Promise<unknown>;
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
