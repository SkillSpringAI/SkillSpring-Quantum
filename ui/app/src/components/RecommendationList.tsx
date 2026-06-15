import type { DiagnosticsRecommendation } from "../types/diagnostics";

interface RecommendationListProps {
  items: DiagnosticsRecommendation[];
}

export default function RecommendationList(props: RecommendationListProps) {
  return (
    <div className="panel">
      <h2>Recommendations</h2>

      {props.items.length === 0 ? (
        <p className="muted">No recommendations available.</p>
      ) : (
        <ul className="list">
          {props.items.map((item) => (
            <li key={item.id}>{item.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
