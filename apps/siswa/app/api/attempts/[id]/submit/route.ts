import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

async function ensureStudent() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SISWA ? user : null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await ensureStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      answers: { include: { selectedOption: true, question: { include: { options: true } } } },
      tryout: { include: { questions: true } },
    },
  });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }

  const totalQuestions = attempt.tryout.questions.length || 1;
  let correct = 0;
  for (const answer of attempt.answers) {
    const correctOption = answer.question.options.find((option) => option.isCorrect);
    if (correctOption && answer.selectedOptionId === correctOption.id) {
      correct += 1;
    }
  }

  const score = (correct / totalQuestions) * 100;

  const updated = await prisma.attempt.update({
    where: { id },
    data: {
      score,
      submittedAt: new Date(),
    },
  });

  await prisma.tryoutIncident.create({
    data: {
      tryoutId: attempt.tryoutId,
      attemptId: attempt.id,
      userId: user.id,
      type: 'ATTEMPT_SUBMITTED',
      message: `Skor akhir ${score.toFixed(0)}`,
    },
  });

  return NextResponse.json({ score: updated.score });
}
