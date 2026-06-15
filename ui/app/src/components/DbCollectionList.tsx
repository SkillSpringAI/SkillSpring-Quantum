import type { DbCollection } from "../types/db";

interface Props {
  collections: DbCollection[];
  selected?: string;
  onSelect: (c: DbCollection) => void;
}

export default function DbCollectionList(props: Props) {
  return (
    <div className="panel">
      <h2>Collections</h2>
      <ul className="list collection-list">
        {props.collections.map((c) => {
          const key = c.tier + ":" + c.name;
          return (
            <li
              key={key}
              className={props.selected === key ? "selected-row collection-item" : "collection-item"}
              onClick={() => props.onSelect(c)}
            >
              <div><strong>{c.name}</strong></div>
              <div className="muted">[{c.tier}]</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
