import type { GovernanceRuleFile } from "../types/governance";

interface Props {
  files: GovernanceRuleFile[];
  selectedPath?: string;
  onSelect: (file: GovernanceRuleFile) => void;
}

export default function RuleFileList(props: Props) {
  return (
    <div className="panel">
      <h2>Rule Files</h2>
      <ul className="list collection-list">
        {props.files.map((file) => (
          <li
            key={file.path}
            className={props.selectedPath === file.path ? "collection-item selected-row" : "collection-item"}
            onClick={() => props.onSelect(file)}
          >
            <div><strong>{file.name}</strong></div>
            <div className="muted">{file.path}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
