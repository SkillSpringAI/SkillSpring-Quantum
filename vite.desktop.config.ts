import { defineConfig } from "vite";
import path from "node:path";

const appRoot = path.resolve(__dirname, "ui", "app");

export default defineConfig({
  root: appRoot,
  base: "./",
  build: {
    outDir: path.resolve(appRoot, "dist"),
    emptyOutDir: true
  }
});
