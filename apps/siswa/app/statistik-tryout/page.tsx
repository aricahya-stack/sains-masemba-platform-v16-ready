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
  const statistics = calculateTryoutStatistics(selected?.attempts.map((attempt) => attempt.score) || []);
  const ownLatest = selected?.attempts.find((attempt) => attempt.userId === user.id);

  return (
    <TryoutStatisticsPanel
      eyebrow="Ujian • Statistik Tryout"
      title="Posisi nilai Anda dalam distribusi tryout"
      description="Diagram menunjukkan distribusi seluruh attempt selesai pada tryout terpilih. Garis vertikal merah menunjukkan nilai dari percobaan terakhir Anda pada tryout tersebut."
      tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item._count.questions} soal • ${item.attempts.length} attempt selesai` }))}
      selectedTryoutId={selected?.id || ''}
      statistics={statistics}
      marker={ownLatest ? { label: 'Nilai Anda', score: ownLatest.score } : null}
      emptyTryoutMessage="Anda belum menyelesaikan tryout sehingga statistik individual belum tersedia."
    />
  );
}
