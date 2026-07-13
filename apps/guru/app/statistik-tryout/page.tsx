import { prisma, UserRole } from '@sh/db';
import { calculateTryoutStatistics, requireRole } from '@sh/core';
import { TryoutStatisticsPanel } from '../../components/tryout-statistics-panel';

export default async function StatistikTryoutGuruPage({ searchParams }: { searchParams: Promise<{ tryout?: string }> }) {
  await requireRole(UserRole.GURU);
  const params = await searchParams;
  const tryouts = await prisma.tryout.findMany({
    where: { author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } } },
    include: {
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
      title="Statistik deskriptif pengerjaan tryout"
      description="Analisis distribusi seluruh percobaan siswa untuk setiap tryout pada bank bersama guru. Satu siswa dapat mengulang tryout, tetapi data antartryout tidak pernah digabungkan."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item._count.questions} soal • ${item.attempts.length} percobaan selesai` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
      participantCount={participantCount}
    />
  );
}
