import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

async function ensureStudent() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SISWA ? user : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await ensureStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const attempt = await prisma.attempt.findUnique({ where: { id } });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }

  const updated = await prisma.attempt.update({
    where: { id },
    data: { warnings: { increment: 1 } },
  });

  await prisma.tryoutIncident.create({
    data: {
      tryoutId: attempt.tryoutId,
      attemptId: attempt.id,
      userId: user.id,
      type: String(body.type || 'WARNING'),
      message: body.message ? String(body.message) : null,
    },
  });

  return NextResponse.json({ warnings: updated.warnings });
}
