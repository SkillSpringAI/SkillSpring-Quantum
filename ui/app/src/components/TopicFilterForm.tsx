import type { TopicFilterFormState } from "../types/governanceForms";

interface Props {
  value: TopicFilterFormState;
  onChange: (next: TopicFilterFormState) => void;
  onApplyToEditor: () => void;
  disabled?: boolean;
  active?: boolean;
}

export default function TopicFilterForm(props: Props) {
  function update<K extends keyof TopicFilterFormState>(key: K, value: TopicFilterFormState[K]) {
    props.onChange({
      ...props.value,
      [key]: value
    });
  }

  return (
    <div className="panel">
      <h2>Guided Topic Filter Form</h2>
      <p className="muted">{props.active ? "Form is active and editable." : "Select a supported rule file to use this form."}</p>

      <label className="form-label">
        Version
        <input
          className="text-input"
          value={props.value.version}
          onChange={(e) => update("version", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Include Topics (comma separated)
        <input
          className="text-input"
          value={props.value.include_topics_text}
          onChange={(e) => update("include_topics_text", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Exclude Topics (comma separated)
        <input
          className="text-input"
          value={props.value.exclude_topics_text}
          onChange={(e) => update("exclude_topics_text", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={props.value.exclude_general_by_default}
          onChange={(e) => update("exclude_general_by_default", e.target.checked)}
          disabled={!props.active}
        />
        <span>Exclude general by default</span>
      </label>

      <div className="action-bar">
        <button
          className="primary-btn"
          onClick={props.onApplyToEditor}
          disabled={props.disabled || !props.active}
        >
          Apply Form to JSON Editor
        </button>
      </div>
    </div>
  );
}
