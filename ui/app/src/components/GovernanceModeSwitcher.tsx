import type { GovernanceEditorMode } from "../types/governanceForms";

interface Props {
  mode: GovernanceEditorMode;
  onChange: (mode: GovernanceEditorMode) => void;
}

export default function GovernanceModeSwitcher(props: Props) {
  const modes: GovernanceEditorMode[] = ["guided", "natural-language", "raw-json"];

  return (
    <div className="panel">
      <h2>Editor Mode</h2>
      <div className="action-bar">
        {modes.map((mode) => (
          <button
            key={mode}
            className={props.mode === mode ? "nav-btn active" : "nav-btn"}
            onClick={() => props.onChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
