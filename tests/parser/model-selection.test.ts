import assert from "node:assert";
import {
  isCompatibleModel,
  selectBestAvailableModel,
} from "../../skillspring-quantum-agent/agent/core/modelSelection.js";

assert.equal(isCompatibleModel("llama3.2:latest", "llama3.2"), true);
assert.equal(isCompatibleModel("nomic-embed-text:latest", "nomic-embed-text"), true);
assert.equal(isCompatibleModel("mistral", "llama3.2"), false);

const requestedMatch = selectBestAvailableModel({
  requestedModel: "llama3.2",
  installedModels: ["llama3.2:latest", "nomic-embed-text:latest"],
  compatibleModels: ["llama3.2", "llama3.1", "mistral"],
  fallbackToFirstAvailable: true,
});

assert.equal(requestedMatch.selectedModel, "llama3.2:latest");
assert.equal(requestedMatch.reason, "requested");

const compatibleMatch = selectBestAvailableModel({
  requestedModel: "llama3.2",
  installedModels: ["mistral:latest", "nomic-embed-text:latest"],
  compatibleModels: ["llama3.2", "llama3.1", "mistral"],
  fallbackToFirstAvailable: true,
});

assert.equal(compatibleMatch.selectedModel, "mistral:latest");
assert.equal(compatibleMatch.reason, "compatible");

const fallbackMatch = selectBestAvailableModel({
  requestedModel: "llama3.2",
  installedModels: ["phi4:latest"],
  compatibleModels: ["llama3.2", "llama3.1", "mistral"],
  fallbackToFirstAvailable: true,
  allowAnyInstalledFallback: true,
});

assert.equal(fallbackMatch.selectedModel, "phi4:latest");
assert.equal(fallbackMatch.reason, "fallback");

const noEmbeddingFallback = selectBestAvailableModel({
  requestedModel: "nomic-embed-text",
  installedModels: ["llama3.1:8b"],
  compatibleModels: ["nomic-embed-text", "mxbai-embed-large"],
  fallbackToFirstAvailable: true,
  allowAnyInstalledFallback: false,
});

assert.equal(noEmbeddingFallback.selectedModel, null);
assert.equal(noEmbeddingFallback.reason, null);

console.log("model-selection.test.ts passed");
