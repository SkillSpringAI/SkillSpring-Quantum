import type { ImportJobForm, ImportMode } from "../types/imports";

interface ImportFormProps {
  value: ImportJobForm;
  onChange: (next: ImportJobForm) => void;
  onSubmit: () => void;
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
      <h2>Import Controls</h2>

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
          Input File
          <input
            className="text-input"
            value={props.value.inputFile}
            onChange={(e) => update("inputFile", e.target.value)}
            placeholder="C:\Users\Laptop\Desktop\ChatGPT Exports\conversations-000.json"
            disabled={props.disabled}
          />
        </label>
      ) : (
        <label className="form-label">
          Input Folder
          <input
            className="text-input"
            value={props.value.inputFolder}
            onChange={(e) => update("inputFolder", e.target.value)}
            placeholder="C:\Users\Laptop\Desktop\ChatGPT Exports"
            disabled={props.disabled}
          />
        </label>
      )}

      <label className="form-label">
        Output Root
        <input
          className="text-input"
          value={props.value.outputRoot}
          onChange={(e) => update("outputRoot", e.target.value)}
          placeholder="organized_output"
          disabled={props.disabled}
        />
      </label>

      <button
        className="primary-btn"
        onClick={props.onSubmit}
        disabled={props.disabled}
      >
        Run Import
      </button>
    </div>
  );
}
