interface Props {
  fileName?: string;
  instruction: string;
  onInstructionChange: (value: string) => void;
  onGenerate: () => void;
  generatedJson: string;
  onUseGenerated: () => void;
  onUseLiveAsBase?: () => void;
  status: string;
  disabled?: boolean;
}

export default function GovernanceComposer(props: Props) {
  const canEdit = !!props.fileName;

  return (
    <div className="panel">
      <h2>Natural Language Composer</h2>
      <p className="muted">
        Use plain language to draft a structured rule. The system generates preview JSON first. It does not save directly from free text.
      </p>

      <p className="muted">
        Active file: {props.fileName ?? "No rule selected"}
      </p>

      <textarea
        className="text-area"
        value={props.instruction}
        onChange={(e) => props.onInstructionChange(e.target.value)}
        placeholder={
          canEdit
            ? 'Example: Exclude general by default and include "ai", "governance", "finance"'
            : "Select a rule file first, then draft in common language."
        }
        disabled={!canEdit}
      />

      <div className="action-bar">
        <button
          className="primary-btn"
          onClick={props.onGenerate}
          disabled={props.disabled || !props.fileName || !props.instruction.trim()}
        >
          Generate Structured Draft
        </button>

        <button
          className="secondary-btn"
          onClick={props.onUseGenerated}
          disabled={props.disabled || !props.generatedJson.trim()}
        >
          Use Draft in Editor
        </button>

        <button
          className="secondary-btn"
          onClick={props.onUseLiveAsBase}
          disabled={props.disabled || !props.fileName}
        >
          Use Live as Base
        </button>
      </div>

      <p className="muted">{props.status}</p>

      <h3>Structured Preview</h3>
      <pre className="record-block">{props.generatedJson || "No structured draft generated yet."}</pre>
    </div>
  );
}
