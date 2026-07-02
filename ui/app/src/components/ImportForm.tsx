import type { ImportJobForm, ImportMode, ImportVendorChoice } from "../types/imports";

interface ImportFormProps {
  value: ImportJobForm;
  importReady?: boolean;
  latestRunSummary?: {
    runAt: string;
    vendorLabel: string;
    path: string;
    outputLabel: string;
    modeLabel: string;
  } | null;
  onChange: (next: ImportJobForm) => void;
  onOutputRootChange: (nextOutputRoot: string) => void;
  onRestoreLatestRun?: () => void;
  onSubmit: () => void;
  onBrowseSource: () => void;
  onBrowseOutput: () => void;
  onInspectSource: () => void;
  disabled?: boolean;
}

export default function ImportForm(props: ImportFormProps) {
  const vendorConfig = IMPORT_VENDOR_CONFIG[props.value.expectedVendor];

  function update<K extends keyof ImportJobForm>(key: K, nextValue: ImportJobForm[K]) {
    props.onChange({
      ...props.value,
      [key]: nextValue
    });
  }

  function updateOutputRoot(nextValue: string) {
    props.onOutputRootChange(nextValue);
  }

  function updateVendor(nextVendor: ImportVendorChoice) {
    const nextConfig = IMPORT_VENDOR_CONFIG[nextVendor];
    props.onChange({
      ...props.value,
      expectedVendor: nextVendor,
      mode: nextConfig.recommendedMode,
      inputFile: nextConfig.recommendedMode === "single_file" ? props.value.inputFile : "",
      inputFolder: nextConfig.recommendedMode === "batch" ? props.value.inputFolder : ""
    });
  }

  const mode = props.value.mode;

  return (
    <div className="panel">
      <h2>Start Here</h2>
      <p className="muted">
        {props.latestRunSummary
          ? "Keep going from the latest import below, or switch to a different export when you want to start a fresh check."
          : "Pick the export source, choose the downloaded file or folder, then check it before you import."}
      </p>

      {props.latestRunSummary ? (
        <div className="detail-box follow-up-card">
          <strong>Latest import still available</strong>
          <p className="muted">
            {new Date(props.latestRunSummary.runAt).toLocaleString()} | {props.latestRunSummary.vendorLabel} | {props.latestRunSummary.modeLabel}
          </p>
          <p className="muted">
            Path: {props.latestRunSummary.path}
          </p>
          <p className="muted">
            Output: {props.latestRunSummary.outputLabel}
          </p>
          {props.onRestoreLatestRun ? (
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={props.onRestoreLatestRun} disabled={props.disabled}>
                Use Latest Import Path
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="detail-box">
        <strong>1. Pick export source</strong>
        <div className="choice-grid">
          {(Object.keys(IMPORT_VENDOR_CONFIG) as ImportVendorChoice[]).map((vendor) => (
            <button
              key={vendor}
              className={props.value.expectedVendor === vendor ? "primary-btn" : "secondary-btn"}
              type="button"
              onClick={() => updateVendor(vendor)}
              disabled={props.disabled}
            >
              {IMPORT_VENDOR_CONFIG[vendor].label}
            </button>
          ))}
        </div>
        <p className="muted">{vendorConfig.guidance}</p>
      </div>

      <div className="detail-box">
        <strong>2. Choose the downloaded file or folder</strong>
        <p className="muted">
          Use the exact export you downloaded, then keep the same path through check and import.
        </p>
      </div>

      <label className="form-label">
        File or folder mode
        <select
          className="text-input"
          value={mode}
          onChange={(e) => update("mode", e.target.value as ImportMode)}
          disabled={props.disabled}
        >
          <option value="single_file">Single File</option>
          <option value="batch">Batch</option>
        </select>
      </label>

      {mode === "single_file" ? (
        <label className="form-label">
          {vendorConfig.fileLabel}
          <div className="input-with-action">
            <input
              className="text-input"
              value={props.value.inputFile}
              onChange={(e) => update("inputFile", e.target.value)}
              placeholder={vendorConfig.filePlaceholder}
              disabled={props.disabled}
            />
            <button className="primary-btn" type="button" onClick={props.onBrowseSource} disabled={props.disabled}>
              Browse
            </button>
          </div>
        </label>
      ) : (
        <label className="form-label">
          {vendorConfig.folderLabel}
          <div className="input-with-action">
            <input
              className="text-input"
              value={props.value.inputFolder}
              onChange={(e) => update("inputFolder", e.target.value)}
              placeholder={vendorConfig.folderPlaceholder}
              disabled={props.disabled}
            />
            <button className="primary-btn" type="button" onClick={props.onBrowseSource} disabled={props.disabled}>
              Browse
            </button>
          </div>
        </label>
      )}

      <label className="form-label">
        Output Root
        <div className="input-with-action">
          <input
            className="text-input"
            value={props.value.outputRoot}
            onChange={(e) => updateOutputRoot(e.target.value)}
            placeholder="organized_output"
            disabled={props.disabled}
          />
          <button className="primary-btn" type="button" onClick={props.onBrowseOutput} disabled={props.disabled}>
            Browse
          </button>
          </div>
        </label>

      <div className="detail-box follow-up-card">
        <strong>3. Check first, then import from the same path</strong>
        <p className="muted">
          `Check This Export` should be the normal first action. `Run Import` becomes the next step after Quantum confirms the path looks usable.
        </p>
      </div>

      <div className="action-bar import-action-bar">
        <button
          className="primary-btn"
          type="button"
          onClick={() => props.onInspectSource()}
          disabled={props.disabled}
        >
          Check This Export
        </button>
        <button
          className={props.importReady ? "primary-btn" : "secondary-btn"}
          type="button"
          onClick={props.onSubmit}
          disabled={props.disabled || !props.importReady}
        >
          Run Import
        </button>
      </div>
    </div>
  );
}

const IMPORT_VENDOR_CONFIG: Record<
  ImportVendorChoice,
  {
    label: string;
    recommendedMode: ImportMode;
    guidance: string;
    fileLabel: string;
    folderLabel: string;
    filePlaceholder: string;
    folderPlaceholder: string;
  }
> = {
  auto_detect: {
    label: "Auto Detect",
    recommendedMode: "batch",
    guidance: "Best when you have a mixed exports folder and want Quantum to figure out which vendor package is present.",
    fileLabel: "Export file",
    folderLabel: "Export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\conversation.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports"
  },
  chatgpt: {
    label: "ChatGPT",
    recommendedMode: "batch",
    guidance: "Most ChatGPT exports arrive as folders. Start with the folder so Quantum can see the whole export clearly.",
    fileLabel: "ChatGPT export file",
    folderLabel: "ChatGPT export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\chatgpt\\conversations.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\chatgpt"
  },
  claude: {
    label: "Claude",
    recommendedMode: "batch",
    guidance: "Claude exports are easiest to validate from the downloaded folder, including expected companion files.",
    fileLabel: "Claude export file",
    folderLabel: "Claude export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\claude\\conversations.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\claude"
  },
  grok: {
    label: "Grok",
    recommendedMode: "batch",
    guidance: "Grok is best checked from the whole export folder so attached files and supporting records stay connected.",
    fileLabel: "Grok export file",
    folderLabel: "Grok export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\grok\\manifest.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\grok"
  },
  gemini: {
    label: "Gemini",
    recommendedMode: "batch",
    guidance: "Gemini often arrives as a folder. Quantum will tell you whether it is ready to import now or needs a narrower recovery path.",
    fileLabel: "Gemini export file",
    folderLabel: "Gemini export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\gemini\\conversations.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\gemini"
  },
  copilot: {
    label: "Copilot",
    recommendedMode: "single_file",
    guidance: "Copilot is currently strongest when you point Quantum at the activity CSV export file directly.",
    fileLabel: "Copilot activity CSV",
    folderLabel: "Copilot export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\copilot\\activity.csv",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\copilot"
  }
};
