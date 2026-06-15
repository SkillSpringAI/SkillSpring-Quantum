interface Props {
  fileName?: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onReset?: () => void;
  status?: string;
  disabled?: boolean;
  isDirty?: boolean;
}

export default function RuleEditor(props: Props) {
  const canEdit = !!props.fileName;

  return (
    <div className="panel">
      <h2>Rule Editor</h2>
      <p className="muted">{props.fileName ?? "No rule file selected."}</p>
      <p className="muted">
        {props.isDirty ? "Unsaved changes present." : "Editor matches live saved content."}
      </p>

      <textarea
        className="text-area rule-editor"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={!canEdit}
        placeholder={canEdit ? "Edit canonical JSON here." : "Select a rule file to begin editing."}
      />

      <div className="action-bar">
        <button
          className="primary-btn"
          onClick={props.onSave}
          disabled={props.disabled || !props.fileName}
        >
          Save Rule
        </button>

        <button
          className="secondary-btn"
          onClick={props.onReset}
          disabled={props.disabled || !props.fileName || !props.isDirty}
        >
          Reset to Live
        </button>
      </div>

      {props.status ? <p className="muted">{props.status}</p> : null}
    </div>
  );
}
