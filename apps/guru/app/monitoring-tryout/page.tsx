import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { LiveSessionBoard } from '../../components/live-session-board';

type AttemptOrder = { id: string; userId: string; tryoutId: string; startedAt: Date };

function buildAttemptNumberMap(attempts: AttemptOrder[]) {
  const groups = new Map<string, AttemptOrder[]>();
  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.tryoutId}`;
    const current = groups.get(key) || [];
    current.push(attempt);
    groups.set(key, current);
  }

  const numberMap = new Map<string, number>();
  for (const rows of groups.values()) {
    rows
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .forEach((attempt, index) => numberMap.set(attempt.id, index + 1));
  }
  return numberMap;
}

export default async function MonitoringTryoutPage() {
  await requireRole(UserRole.GURU);
  const tryouts = await prisma.tryout.findMany({
    where: {
      author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } },
      status: { in: [TryoutStatus.OPEN, TryoutStatus.PAUSED, TryoutStatus.SCHEDULED, TryoutStatus.ENDED] },
    },
    include: {
      attempts: { include: { user: true }, orderBy: { startedAt: 'desc' } },
      incidents: true,
    },
    orderBy: { title: 'asc' },
  });

  const attemptNumberMap = buildAttemptNumberMap(
    tryouts.flatMap((item) => item.attempts.map((attempt) => ({ id: attempt.id, userId: attempt.userId, tryoutId: attempt.tryoutId, startedAt: attempt.startedAt }))),
  );

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
        className: attempt.user.className || '-',
        attemptNumber: attemptNumberMap.get(attempt.id) || 1,
        score: attempt.score,
        warnings: attempt.warnings,
        startedAt: attempt.startedAt.toLocaleString('id-ID'),
        submittedAt: attempt.submittedAt ? attempt.submittedAt.toLocaleString('id-ID') : '',
        status: attempt.submittedAt ? 'Selesai' : 'Berjalan',
      })),
    ]),
  );

  return <LiveSessionBoard initialTryouts={initialTryouts} initialParticipants={initialParticipants} />;
}
