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
      title="Statistik deskriptif seluruh tryout"
      description="Super Admin dapat membandingkan karakter distribusi skor pada setiap paket tryout tanpa mencampurkan data antartryout."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item.author.fullName} • ${item._count.questions} soal • ${item.attempts.length} attempt` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
    />
  );
}
