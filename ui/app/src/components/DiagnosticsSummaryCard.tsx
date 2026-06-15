interface DiagnosticsSummaryCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string | number;
  }>;
}

export default function DiagnosticsSummaryCard(props: DiagnosticsSummaryCardProps) {
  return (
    <div className="panel">
      <h2>{props.title}</h2>
      <div className="stats-grid two-col">
        {props.items.map((item) => (
          <div key={item.label} className="stat-card">
            <span className="label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
