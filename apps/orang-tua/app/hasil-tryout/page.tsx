import { prisma, UserRole } from '@sh/db';
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

export default async function HasilTryoutPage() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const childFilter = {
    user: {
      childParents: {
        some: {
          parentId: user.id,
          isActive: true,
        },
      },
    },
  };

  const [attempts, attemptOrders] = await Promise.all([
    prisma.attempt.findMany({
      where: childFilter,
      include: { user: true, tryout: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    prisma.attempt.findMany({
      where: childFilter,
      select: { id: true, userId: true, tryoutId: true, startedAt: true },
      orderBy: { startedAt: 'asc' },
    }),
  ]);
  const attemptNumberMap = buildAttemptNumberMap(attemptOrders);

  return (
    <div className="stack">
      <PageHero eyebrow="Hasil tryout" title="Riwayat hasil anak" description="Laporan semua percobaan tryout dari anak yang terhubung, termasuk percobaan pertama, kedua, dan seterusnya." />
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr><th>Anak</th><th>Kelas</th><th>Tryout</th><th>Percobaan</th><th>Mulai</th><th>Selesai</th><th>Skor</th><th>Warning</th><th>Status</th></tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.user.fullName}</td>
                <td>{attempt.user.className || '-'}</td>
                <td>{attempt.tryout.title}</td>
                <td>Percobaan ke-{attemptNumberMap.get(attempt.id) || 1}</td>
                <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                <td>{attempt.submittedAt ? attempt.submittedAt.toLocaleString('id-ID') : '-'}</td>
                <td>{attempt.submittedAt ? attempt.score.toFixed(0) : '-'}</td>
                <td>{attempt.warnings}</td>
                <td>{attempt.submittedAt ? 'Selesai' : 'Berjalan'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
