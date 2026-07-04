export function StatGrid({ items }: { items: Array<{ label: string; value: string; note: string; badge?: string }> }) {
  return (
    <div className="grid-4">
      {items.map((item) => (
        <div key={item.label} className="card">
          {item.badge ? <div className="badge">{item.badge}</div> : null}
          <div className="stat-value">{item.value}</div>
          <strong>{item.label}</strong>
          <div className="muted" style={{ marginTop: 6 }}>{item.note}</div>
        </div>
      ))}
    </div>
  );
}
