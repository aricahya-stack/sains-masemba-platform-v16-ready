export function PageHero({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode; }) {
  return (
    <section className="page-hero">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      {actions ? <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div> : null}
    </section>
  );
}
