export function Timeline({ items }: { items: Array<{ title: string; subtitle: string; time: string; danger?: boolean }> }) {
  return (
    <div className="timeline-list">
      {items.map((item) => (
        <div className="timeline-item" key={`${item.title}-${item.time}`}>
          <div className="dot" style={item.danger ? { background: 'var(--danger)' } : undefined} />
          <div>
            <strong>{item.title}</strong>
            <div className="muted">{item.subtitle}</div>
          </div>
          <span className={`badge${item.danger ? ' danger' : ''}`}>{item.time}</span>
        </div>
      ))}
    </div>
  );
}
