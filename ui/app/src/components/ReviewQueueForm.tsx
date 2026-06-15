import type { ReviewQueueFormState } from "../types/governanceForms";

interface Props {
  value: ReviewQueueFormState;
  onChange: (next: ReviewQueueFormState) => void;
  onApplyToEditor: () => void;
  disabled?: boolean;
  active?: boolean;
}

export default function ReviewQueueForm(props: Props) {
  function update<K extends keyof ReviewQueueFormState>(key: K, value: ReviewQueueFormState[K]) {
    props.onChange({
      ...props.value,
      [key]: value
    });
  }

  return (
    <div className="panel">
      <h2>Guided Review Queue Form</h2>
      <p className="muted">{props.active ? "Form is active and editable." : "Select review-queue-rules.json to use this form."}</p>

      <label className="form-label">
        Version
        <input
          className="text-input"
          value={props.value.version}
          onChange={(e) => update("version", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={props.value.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
          disabled={!props.active}
        />
        <span>Review queue enabled</span>
      </label>

      <label className="form-label">
        Allowed signal tiers
        <input
          className="text-input"
          value={props.value.allowed_signal_tiers_text}
          onChange={(e) => update("allowed_signal_tiers_text", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Minimum signal score
        <input
          className="text-input"
          type="number"
          value={props.value.minimum_signal_score}
          onChange={(e) => update("minimum_signal_score", Number(e.target.value))}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Maximum signal score
        <input
          className="text-input"
          type="number"
          value={props.value.maximum_signal_score}
          onChange={(e) => update("maximum_signal_score", Number(e.target.value))}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Max redaction count
        <input
          className="text-input"
          type="number"
          value={props.value.max_redaction_count}
          onChange={(e) => update("max_redaction_count", Number(e.target.value))}
          disabled={!props.active}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={props.value.exclude_private_review}
          onChange={(e) => update("exclude_private_review", e.target.checked)}
          disabled={!props.active}
        />
        <span>Exclude private review</span>
      </label>

      <label className="form-label">
        Excluded topics
        <input
          className="text-input"
          value={props.value.excluded_topics_text}
          onChange={(e) => update("excluded_topics_text", e.target.value)}
          disabled={!props.active}
        />
      </label>

      <label className="form-label">
        Collection
        <input
          className="text-input"
          value={props.value.collection}
          onChange={(e) => update("collection", e.target.value)}
          disabled={!props.active}
        />
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
