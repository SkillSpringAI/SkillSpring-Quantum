import type { ImportJobForm, ImportMode, ImportVendorChoice } from "../types/imports";

interface ImportFormProps {
  value: ImportJobForm;
  onChange: (next: ImportJobForm) => void;
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
        Pick the export source first, choose the downloaded file or folder, then let Quantum check whether it matches before you import.
      </p>

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

      <label className="form-label">
        Import shape
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
            onChange={(e) => update("outputRoot", e.target.value)}
            placeholder="organized_output"
            disabled={props.disabled}
          />
          <button className="primary-btn" type="button" onClick={props.onBrowseOutput} disabled={props.disabled}>
            Browse
          </button>
        </div>
      </label>

      <div className="action-bar">
        <button
          className="primary-btn"
          type="button"
          onClick={props.onInspectSource}
          disabled={props.disabled}
        >
          Check Match
        </button>
        <button
          className="primary-btn"
          type="button"
          onClick={props.onSubmit}
          disabled={props.disabled}
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
    guidance: "Most ChatGPT exports arrive as folders. Start with the folder so Quantum can validate the package shape.",
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
    guidance: "Grok is best checked from the whole export folder so manifests and preserved blobs stay connected.",
    fileLabel: "Grok export file",
    folderLabel: "Grok export folder",
    filePlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\grok\\manifest.json",
    folderPlaceholder: "C:\\Users\\Laptop\\Desktop\\AI Exports\\grok"
  },
  gemini: {
    label: "Gemini",
    recommendedMode: "batch",
    guidance: "Gemini often arrives as a folder. Quantum will tell you whether it matches the ready-now JSON path or a narrower fallback route.",
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
