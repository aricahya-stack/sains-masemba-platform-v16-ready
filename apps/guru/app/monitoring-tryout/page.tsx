import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { LiveSessionBoard } from '../../components/live-session-board';

export default async function MonitoringTryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const tryouts = await prisma.tryout.findMany({
    where: { authorId: user.id, status: { in: [TryoutStatus.OPEN, TryoutStatus.PAUSED, TryoutStatus.SCHEDULED, TryoutStatus.ENDED] } },
    include: {
      attempts: { include: { user: true }, orderBy: { startedAt: 'desc' } },
      incidents: true,
    },
    orderBy: { title: 'asc' },
  });

  const initialTryouts = tryouts.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    attemptCount: item.attempts.length,
    warningCount: item.attempts.reduce((sum, attempt) => sum + attempt.warnings, 0),
  }));

  const initialParticipants = Object.fromEntries(
    tryouts.map((item) => [
      item.id,
      item.attempts.map((attempt) => ({
        id: attempt.id,
        studentName: attempt.user.fullName,
        score: attempt.score,
        warnings: attempt.warnings,
        submittedAt: attempt.submittedAt ? attempt.submittedAt.toLocaleString('id-ID') : '',
      })),
    ]),
  );

  return <LiveSessionBoard initialTryouts={initialTryouts} initialParticipants={initialParticipants} />;
}
