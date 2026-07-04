import Link from 'next/link';
import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function HasilPage() {
  const user = await requireRole(UserRole.SISWA);
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id },
    include: { tryout: true },
    orderBy: { startedAt: 'desc' },
  });

  return (
    <div className="stack">
      <PageHero eyebrow="Hasil" title="Riwayat hasil tryout" description="Lihat skor, jumlah warning, dan akses pembahasan." />
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr><th>Tryout</th><th>Mulai</th><th>Skor</th><th>Warning</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.tryout.title}</td>
                <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                <td>{attempt.score.toFixed(0)}</td>
                <td>{attempt.warnings}</td>
                <td>{attempt.submittedAt ? 'Selesai' : 'Berjalan'}</td>
                <td><Link className="button-secondary" href={`/pembahasan?attempt=${attempt.id}`}>Pembahasan</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
