import { prisma, UserRole } from '@sh/db';
import { calculateTryoutStatistics, requireRole } from '@sh/core';
import { TryoutStatisticsPanel } from '../../components/tryout-statistics-panel';

export default async function StatistikTryoutSiswaPage({ searchParams }: { searchParams: Promise<{ tryout?: string }> }) {
  const user = await requireRole(UserRole.SISWA);
  const params = await searchParams;
  const tryouts = await prisma.tryout.findMany({
    where: { attempts: { some: { userId: user.id, submittedAt: { not: null } } } },
    include: {
      attempts: {
        where: { submittedAt: { not: null } },
        select: { userId: true, score: true, submittedAt: true },
        orderBy: { submittedAt: 'desc' },
      },
      _count: { select: { questions: true } },
    },
    orderBy: [{ startAt: 'desc' }, { title: 'asc' }],
  });

  const selected = tryouts.find((item) => item.id === params.tryout) || tryouts[0];
  const selectedAttempts = selected?.attempts || [];
  const ownAttempts = selectedAttempts.filter((attempt) => attempt.userId === user.id);
  const ownBestScore = ownAttempts.length ? Math.max(...ownAttempts.map((attempt) => attempt.score)) : 0;
  const statistics = calculateTryoutStatistics(selectedAttempts.map((attempt) => attempt.score));
  const participantCount = new Set(selectedAttempts.map((attempt) => attempt.userId)).size;

  return (
    <TryoutStatisticsPanel
      eyebrow="Ujian • Statistik Tryout"
      title="Posisi nilai Anda dalam distribusi tryout"
      description="Diagram menunjukkan seluruh percobaan selesai pada tryout terpilih. Anda dapat mengulang tryout; garis vertikal merah menunjukkan nilai maksimal yang pernah Anda peroleh pada tryout tersebut."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item._count.questions} soal • ${item.attempts.length} percobaan selesai` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
      participantCount={participantCount}
      marker={ownAttempts.length ? { label: 'Nilai maksimal Anda', score: ownBestScore } : null}
      individualSummary={ownAttempts.length ? { label: 'Anda', attemptCount: ownAttempts.length, bestScore: ownBestScore } : null}
      emptyTryoutMessage="Anda belum menyelesaikan tryout sehingga statistik individual belum tersedia."
    />
  );
}
