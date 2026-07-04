import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function MonitoringPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [liveTryouts, incidents, attempts] = await Promise.all([
    prisma.tryout.findMany({
      where: { status: { in: [TryoutStatus.OPEN, TryoutStatus.PAUSED] } },
      include: { _count: { select: { attempts: true } } },
      orderBy: { title: 'asc' },
    }),
    prisma.tryoutIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { tryout: true },
    }),
    prisma.attempt.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: { user: true, tryout: true },
    }),
  ]);

  return (
    <div className="stack">
      <PageHero
        eyebrow="Monitoring"
        title="Pantau sesi ujian dan incident"
        description="Pantauan lintas tryout dari perspektif super admin."
      />
      <div className="grid-2">
        <section className="card stack">
          <strong>Tryout aktif</strong>
          {liveTryouts.length === 0 ? <div className="empty-state">Tidak ada tryout live.</div> : null}
          {liveTryouts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item._count.attempts} attempt • status {item.status}</div>
            </div>
          ))}
        </section>
        <section className="card stack">
          <strong>Attempt terbaru</strong>
          {attempts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.user.fullName}</strong>
              <div className="muted">{item.tryout.title}</div>
              <div className="muted">Skor: {item.score.toFixed(0)} • Warning: {item.warnings}</div>
            </div>
          ))}
        </section>
      </div>
      <section className="card stack">
        <strong>Incident terbaru</strong>
        {incidents.length === 0 ? <div className="empty-state">Belum ada incident.</div> : null}
        {incidents.map((item) => (
          <div key={item.id} className="item-card">
            <strong>{item.type}</strong>
            <div className="muted">{item.tryout.title}</div>
            <div className="muted">{item.message || '-'}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
