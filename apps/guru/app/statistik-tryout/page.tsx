import { prisma, UserRole } from '@sh/db';
import { calculateTryoutStatistics, requireRole } from '@sh/core';
import { TryoutStatisticsPanel } from '../../components/tryout-statistics-panel';

export default async function StatistikTryoutGuruPage({ searchParams }: { searchParams: Promise<{ tryout?: string }> }) {
  const user = await requireRole(UserRole.GURU);
  const params = await searchParams;
  const tryouts = await prisma.tryout.findMany({
    where: { authorId: user.id },
    include: {
      attempts: {
        where: { submittedAt: { not: null } },
        select: { score: true },
        orderBy: { submittedAt: 'desc' },
      },
      _count: { select: { questions: true } },
    },
    orderBy: [{ startAt: 'desc' }, { title: 'asc' }],
  });

  const selected = tryouts.find((item) => item.id === params.tryout) || tryouts[0];
  const statistics = calculateTryoutStatistics(selected?.attempts.map((attempt) => attempt.score) || []);

  return (
    <TryoutStatisticsPanel
      eyebrow="Ujian • Statistik Tryout"
      title="Statistik deskriptif pengerjaan tryout"
      description="Analisis distribusi skor siswa untuk setiap tryout yang Anda kelola. Pilihan tryout dihitung secara terpisah, bukan digabungkan."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item._count.questions} soal • ${item.attempts.length} attempt selesai` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
    />
  );
}
