import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

type AttemptOrder = { id: string; userId: string; tryoutId: string; startedAt: Date };

function buildAttemptNumberMap(attempts: AttemptOrder[]) {
  const groups = new Map<string, AttemptOrder[]>();
  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.tryoutId}`;
    const current = groups.get(key) || [];
    current.push(attempt);
    groups.set(key, current);
  }

  const numberMap = new Map<string, number>();
  for (const rows of groups.values()) {
    rows
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .forEach((attempt, index) => numberMap.set(attempt.id, index + 1));
  }
  return numberMap;
}

export default async function MonitoringPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [liveTryouts, incidents, attempts, attemptOrders] = await Promise.all([
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
      take: 50,
      include: { user: true, tryout: { include: { author: true } } },
    }),
    prisma.attempt.findMany({
      select: { id: true, userId: true, tryoutId: true, startedAt: true },
      orderBy: { startedAt: 'asc' },
    }),
  ]);
  const attemptNumberMap = buildAttemptNumberMap(attemptOrders);
  const latestAttempts = attempts.slice(0, 10);

  return (
    <div className="stack">
      <PageHero
        eyebrow="Monitoring"
        title="Monitoring dan laporan tryout"
        description="Pantauan lintas tryout dari perspektif super admin, termasuk histori percobaan siswa dan kelasnya."
      />
      <div className="grid-2">
        <section className="card stack">
          <strong>Tryout aktif</strong>
          {liveTryouts.length === 0 ? <div className="empty-state">Tidak ada tryout live.</div> : null}
          {liveTryouts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item._count.attempts} percobaan • status {item.status}</div>
            </div>
          ))}
        </section>
        <section className="card stack">
          <strong>Attempt terbaru</strong>
          {latestAttempts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.user.fullName}</strong>
              <div className="muted">{item.user.className || '-'} • {item.tryout.title} • Percobaan ke-{attemptNumberMap.get(item.id) || 1}</div>
              <div className="muted">Skor: {item.submittedAt ? item.score.toFixed(0) : '-'} • Warning: {item.warnings} • {item.submittedAt ? 'Selesai' : 'Berjalan'}</div>
            </div>
          ))}
        </section>
      </div>
      <section className="card stack">
        <div>
          <div className="eyebrow">Laporan tryout</div>
          <strong>Riwayat percobaan siswa</strong>
          <p className="muted">Menampilkan maksimal 50 percobaan terbaru dari semua tryout, termasuk percobaan pertama, kedua, dan seterusnya.</p>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Tryout</th>
                <th>Guru</th>
                <th>Percobaan</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th>Skor</th>
                <th>Warning</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 ? (
                <tr><td colSpan={10}><div className="empty-state">Belum ada percobaan tryout.</div></td></tr>
              ) : attempts.map((item) => (
                <tr key={item.id}>
                  <td>{item.user.fullName}</td>
                  <td>{item.user.className || '-'}</td>
                  <td>{item.tryout.title}</td>
                  <td>{item.tryout.author.fullName}</td>
                  <td>Percobaan ke-{attemptNumberMap.get(item.id) || 1}</td>
                  <td>{item.startedAt.toLocaleString('id-ID')}</td>
                  <td>{item.submittedAt ? item.submittedAt.toLocaleString('id-ID') : '-'}</td>
                  <td>{item.submittedAt ? item.score.toFixed(0) : '-'}</td>
                  <td>{item.warnings}</td>
                  <td>{item.submittedAt ? 'Selesai' : 'Berjalan'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
