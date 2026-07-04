import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

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

  return (
    <div className="stack">
      <PageHero eyebrow="Pantau anak" title="Ringkasan anak yang terhubung" description="Pantauan ringkas aktivitas ujian dan skor terbaru." />
      {links.map((link) => (
        <article key={link.id} className="card stack">
          <div className="item-head">
            <div>
              <strong>{link.student.fullName}</strong>
              <div className="muted">{link.relationType}</div>
            </div>
            <span className="badge">{link.student.status}</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr><th>Tryout</th><th>Mulai</th><th>Skor</th><th>Warning</th></tr>
              </thead>
              <tbody>
                {link.student.attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.tryout.title}</td>
                    <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                    <td>{attempt.score.toFixed(0)}</td>
                    <td>{attempt.warnings}</td>
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
