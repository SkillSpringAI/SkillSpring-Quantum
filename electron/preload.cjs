const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("skillspringDesktop", {
  ping: () => ipcRenderer.invoke("app:ping"),

  governance: {
    listRules: () => ipcRenderer.invoke("governance:listRules"),
    readRule: (filePath) => ipcRenderer.invoke("governance:readRule", { filePath }),
    writeRule: (filePath, rawText) => ipcRenderer.invoke("governance:writeRule", { filePath, rawText })
  },

  db: {
    listCollections: () => ipcRenderer.invoke("db:listCollections"),
    readCollection: (outputRoot, tier, collection, limit) =>
      ipcRenderer.invoke("db:readCollection", { outputRoot, tier, collection, limit }),
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
