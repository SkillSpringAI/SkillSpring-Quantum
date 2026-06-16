import { useEffect, useState } from "react";
import { loadLatestDatasetRun } from "../services/datasetRunBridge";
import { revealDesktopPath } from "../services/pathBridge";
import type { DatasetRunResult } from "../types/datasetRun";

export default function DatasetsScreen() {
  const [datasetRun, setDatasetRun] = useState<DatasetRunResult | null>(null);

  useEffect(() => {
    loadLatestDatasetRun("organized_output").then(setDatasetRun);
  }, []);

  return (
    <section className="screen-grid">
      <div className="panel">
        <h2>Datasets</h2>
        {!datasetRun?.latest ? (
          <p className="muted">
            No dataset run manifest found yet. Run an import that produces dataset output first.
          </p>
        ) : (
          <>
            <div className="stats-grid two-col">
              <div className="stat-card">
                <span className="label">Topic Segments</span>
                <strong>{datasetRun.latest.topic_segments}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Prompt/Response</span>
                <strong>{datasetRun.latest.prompt_response_pairs}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Micro Segments</span>
                <strong>{datasetRun.latest.micro_segments}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Private Review</span>
                <strong>{datasetRun.latest.private_review_segments}</strong>
              </div>
            </div>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(datasetRun.datasetsRoot)}>
                Open Datasets Root
              </button>
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(datasetRun.manifestPath)}>
                Open Dataset Manifest
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Dataset Notes</h2>
        {datasetRun?.latest ? (
          <>
            <p className="muted">Run ID: {datasetRun.latest.run_id}</p>
            <p className="muted">Dataset version: {datasetRun.latest.dataset_version}</p>
            <p className="muted">Filtered out: {datasetRun.latest.filtered_out_segments}</p>
          </>
        ) : (
          <p className="muted">
            Versioned dataset browsing, manifests, filters, and export subsets will continue growing here.
          </p>
        )}
      </div>
    </section>
  );
}
