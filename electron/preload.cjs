const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("skillspringDesktop", {
  ping: () => ipcRenderer.invoke("app:ping"),

  dialogs: {
    pickFile: () => ipcRenderer.invoke("dialog:pickFile"),
    pickFolder: () => ipcRenderer.invoke("dialog:pickFolder")
  },

  shell: {
    openPath: (targetPath) => ipcRenderer.invoke("shell:openPath", { targetPath }),
    pathExists: (targetPath) => ipcRenderer.invoke("shell:pathExists", { targetPath })
  },

  imports: {
    inspectSource: (inputPath) => ipcRenderer.invoke("imports:inspect", { inputPath }),
    runSource: (inputPath, outputRoot) => ipcRenderer.invoke("imports:run", { inputPath, outputRoot }),
    readHistory: (outputRoot, limit) => ipcRenderer.invoke("imports:history", { outputRoot, limit }),
    queryHistory: (outputRoot, filters) => ipcRenderer.invoke("imports:history:query", { outputRoot, filters }),
    readRetrievalIndex: (outputRoot) => ipcRenderer.invoke("imports:retrievalIndex", { outputRoot })
  },

  retrieval: {
    readSavedViews: (outputRoot) => ipcRenderer.invoke("retrieval:savedViews:read", { outputRoot }),
    saveSavedView: (outputRoot, name, filters, selectedRecord, selectedSegment) =>
      ipcRenderer.invoke("retrieval:savedViews:save", { outputRoot, name, filters, selectedRecord, selectedSegment }),
    deleteSavedView: (outputRoot, id) =>
      ipcRenderer.invoke("retrieval:savedViews:delete", { outputRoot, id })
  },

  datasets: {
    readLatestRun: (outputRoot, limit) => ipcRenderer.invoke("datasets:latestRun", { outputRoot, limit }),
    readPreview: (outputRoot, runId, kind, limit, offset) =>
      ipcRenderer.invoke("datasets:preview", { outputRoot, runId, kind, limit, offset }),
    readSegmentRetrievalIndex: (outputRoot) => ipcRenderer.invoke("datasets:segmentRetrievalIndex", { outputRoot })
  },

  governance: {
    listRules: () => ipcRenderer.invoke("governance:listRules"),
    readRule: (filePath) => ipcRenderer.invoke("governance:readRule", { filePath }),
    writeRule: (filePath, rawText) => ipcRenderer.invoke("governance:writeRule", { filePath, rawText })
  },

  db: {
    listCollections: () => ipcRenderer.invoke("db:listCollections"),
    readCollection: (outputRoot, tier, collection, limit, offset) =>
      ipcRenderer.invoke("db:readCollection", { outputRoot, tier, collection, limit, offset }),
    buildReviewQueue: (outputRoot) =>
      ipcRenderer.invoke("db:review:buildQueue", { outputRoot }),
    decideReviewQueueRecord: (outputRoot, decision, queueKey, reason) =>
      ipcRenderer.invoke("db:review:decide", { outputRoot, decision, queueKey, reason }),
    promoteCurated: (outputRoot) =>
      ipcRenderer.invoke("db:promote", { outputRoot })
  },

  diagnostics: {
    run: () => ipcRenderer.invoke("diagnostics:run"),
    batchDiag: () => ipcRenderer.invoke("batch:diag"),
    batchDelta: () => ipcRenderer.invoke("batch:delta")
  },

  notifications: {
    archive: (outputRoot, limit) =>
      ipcRenderer.invoke("notifications:archive", { outputRoot, limit }),
    markdownArchive: (outputRoot, filePath) =>
      ipcRenderer.invoke("archive:markdown", { outputRoot, filePath })
  },

  pipeline: {
    runFile: (inputFile, outputRoot) =>
      ipcRenderer.invoke("pipeline:runFile", { inputFile, outputRoot }),
    runBatch: () => ipcRenderer.invoke("batch:run"),
    mergeFolders: (outputRoot) =>
      ipcRenderer.invoke("folders:merge", { outputRoot }),
    restorePurgedFile: (sourceFile, outputRoot) =>
      ipcRenderer.invoke("purge:restore", { sourceFile, outputRoot })
  }
});
