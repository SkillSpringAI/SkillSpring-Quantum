const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const { registerIpc } = require("./ipc/registerIpc.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Renderer failed to load:", {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process exited:", details);
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("Renderer console:", { level, message, line, sourceId });
  });

  win.loadFile(path.join(__dirname, "..", "ui", "app", "dist", "index.html"));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
