import { prisma, UserRole } from '@sh/db';
import { calculateTryoutStatistics, requireRole } from '@sh/core';
import { TryoutStatisticsPanel } from '../../components/tryout-statistics-panel';

export default async function StatistikTryoutAdminPage({ searchParams }: { searchParams: Promise<{ tryout?: string }> }) {
  await requireRole(UserRole.SUPER_ADMIN);
  const params = await searchParams;
  const tryouts = await prisma.tryout.findMany({
    include: {
      author: { select: { fullName: true } },
      attempts: {
        where: { submittedAt: { not: null } },
        select: { userId: true, score: true },
        orderBy: { submittedAt: 'desc' },
      },
      _count: { select: { questions: true } },
    },
    orderBy: [{ startAt: 'desc' }, { title: 'asc' }],
  });

  const selected = tryouts.find((item) => item.id === params.tryout) || tryouts[0];
  const selectedAttempts = selected?.attempts || [];
  const statistics = calculateTryoutStatistics(selectedAttempts.map((attempt) => attempt.score));
  const participantCount = new Set(selectedAttempts.map((attempt) => attempt.userId)).size;

  return (
    <TryoutStatisticsPanel
      eyebrow="Ujian • Statistik Tryout"
      title="Statistik deskriptif seluruh tryout"
      description="Super Admin dapat meninjau seluruh percobaan pada satu paket tryout. Siswa boleh mengulang tryout dan setiap percobaan selesai dihitung sebagai observasi terpisah."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item.author.fullName} • ${item._count.questions} soal • ${item.attempts.length} percobaan` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
      participantCount={participantCount}
    />
  );
}
