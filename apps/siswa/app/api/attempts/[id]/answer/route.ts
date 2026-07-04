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
  const attempt = await prisma.attempt.findUnique({ where: { id }, include: { tryout: true } });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }

  if (!body.questionId) return NextResponse.json({ error: 'Question ID wajib ada.' }, { status: 400 });

  await prisma.attemptAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: id,
        questionId: String(body.questionId),
      },
    },
    update: {
      selectedOptionId: body.selectedOptionId ? String(body.selectedOptionId) : null,
      answeredAt: new Date(),
    },
    create: {
      attemptId: id,
      questionId: String(body.questionId),
      selectedOptionId: body.selectedOptionId ? String(body.selectedOptionId) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
