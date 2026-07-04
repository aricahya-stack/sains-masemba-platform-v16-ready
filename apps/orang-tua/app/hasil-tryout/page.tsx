import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function HasilTryoutPage() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const attempts = await prisma.attempt.findMany({
    where: {
      user: {
        childParents: {
          some: {
            parentId: user.id,
            isActive: true,
          },
        },
      },
    },
    include: { user: true, tryout: true },
    orderBy: { startedAt: 'desc' },
    take: 30,
  });

  return (
    <div className="stack">
      <PageHero eyebrow="Hasil tryout" title="Riwayat hasil anak" description="Semua hasil tryout dari anak yang terhubung." />
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr><th>Anak</th><th>Tryout</th><th>Waktu</th><th>Skor</th><th>Warning</th></tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.user.fullName}</td>
                <td>{attempt.tryout.title}</td>
                <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                <td>{attempt.score.toFixed(0)}</td>
                <td>{attempt.warnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
