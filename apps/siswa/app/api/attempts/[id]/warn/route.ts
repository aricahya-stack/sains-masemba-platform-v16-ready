import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, truncateLogValue } from '@sh/core';
import { attemptAccessState, finalizeAttempt } from '../../../../../lib/attempt-security';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.SISWA) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { tryout: { select: { status: true, startAt: true, endAt: true, durationMinutes: true } } },
  });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }
  const accessState = attemptAccessState(attempt, attempt.tryout);
  if (accessState === 'EXPIRED') {
    await finalizeAttempt(id, user.id);
    return NextResponse.json({ error: 'Tryout telah berakhir.' }, { status: 409 });
  }
  if (accessState !== 'ACTIVE') {
    return NextResponse.json({ error: accessState === 'PAUSED' ? 'Tryout sedang dijeda.' : 'Tryout belum dapat dikerjakan.' }, { status: 423 });
  }

  const type = truncateLogValue(body.type || 'WARNING', 60).replace(/[^A-Z0-9_-]/gi, '_').toUpperCase();
  const message = body.message ? truncateLogValue(body.message, 300) : null;
  const updated = await prisma.attempt.update({ where: { id }, data: { warnings: { increment: 1 } } });
  await prisma.tryoutIncident.create({
    data: { tryoutId: attempt.tryoutId, attemptId: attempt.id, userId: user.id, type, message },
  });
  return NextResponse.json({ warnings: updated.warnings });
}
