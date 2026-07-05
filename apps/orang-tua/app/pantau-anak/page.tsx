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

export default async function PantauAnakPage() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    include: {
      student: {
        include: {
          attempts: { orderBy: { startedAt: 'desc' }, take: 5, include: { tryout: true } },
        },
      },
    },
  });

  const studentIds = links.map((link) => link.studentId);
  const attemptOrders = studentIds.length
    ? await prisma.attempt.findMany({
        where: { userId: { in: studentIds } },
        select: { id: true, userId: true, tryoutId: true, startedAt: true },
        orderBy: { startedAt: 'asc' },
      })
    : [];
  const attemptNumberMap = buildAttemptNumberMap(attemptOrders);

  return (
    <div className="stack">
      <PageHero eyebrow="Pantau anak" title="Ringkasan anak yang terhubung" description="Pantauan ringkas aktivitas ujian, skor terbaru, dan nomor percobaan tryout." />
      {links.map((link) => (
        <article key={link.id} className="card stack">
          <div className="item-head">
            <div>
              <strong>{link.student.fullName}</strong>
              <div className="muted">{link.relationType} • {link.student.className || 'Kelas belum diisi'}</div>
            </div>
            <span className="badge">{link.student.status}</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr><th>Tryout</th><th>Percobaan</th><th>Mulai</th><th>Skor</th><th>Warning</th><th>Status</th></tr>
              </thead>
              <tbody>
                {link.student.attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.tryout.title}</td>
                    <td>Percobaan ke-{attemptNumberMap.get(attempt.id) || 1}</td>
                    <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                    <td>{attempt.submittedAt ? attempt.score.toFixed(0) : '-'}</td>
                    <td>{attempt.warnings}</td>
                    <td>{attempt.submittedAt ? 'Selesai' : 'Berjalan'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  );
}
