import type { ImportJobForm, ImportMode } from "../types/imports";

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
  function update<K extends keyof ImportJobForm>(key: K, nextValue: ImportJobForm[K]) {
    props.onChange({
      ...props.value,
      [key]: nextValue
    });
  }

  const mode = props.value.mode;

  return (
    <div className="panel">
      <h2>Start Here</h2>
      <p className="muted">
        Choose a file or folder, inspect what Quantum recognizes, then run the import when the path looks right.
      </p>

      <label className="form-label">
        Mode
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
          Source File
          <div className="input-with-action">
            <input
              className="text-input"
              value={props.value.inputFile}
              onChange={(e) => update("inputFile", e.target.value)}
              placeholder="C:\Users\Laptop\Desktop\AI Exports\claude\conversation.json"
              disabled={props.disabled}
            />
            <button className="primary-btn" onClick={props.onBrowseSource} disabled={props.disabled}>
              Browse
            </button>
          </div>
        </label>
      ) : (
        <label className="form-label">
          Source Folder
          <div className="input-with-action">
            <input
              className="text-input"
              value={props.value.inputFolder}
              onChange={(e) => update("inputFolder", e.target.value)}
              placeholder="C:\Users\Laptop\Desktop\AI Exports"
              disabled={props.disabled}
            />
            <button className="primary-btn" onClick={props.onBrowseSource} disabled={props.disabled}>
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
          <button className="primary-btn" onClick={props.onBrowseOutput} disabled={props.disabled}>
            Browse
          </button>
        </div>
      </label>

      <div className="action-bar">
        <button
          className="primary-btn"
          onClick={props.onInspectSource}
          disabled={props.disabled}
        >
          Inspect First
        </button>
        <button
          className="primary-btn"
          onClick={props.onSubmit}
          disabled={props.disabled}
        >
          Run Import
        </button>
      </div>
    </div>
  );
}
