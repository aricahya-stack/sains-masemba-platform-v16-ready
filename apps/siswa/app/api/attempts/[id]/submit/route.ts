import { NextResponse } from 'next/server';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';
import { scoreQuestionAnswer } from '../../../../../lib/question-scoring';

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
      answers: { include: { selectedOption: true, question: { include: { options: { orderBy: { label: 'asc' } } } } } },
      tryout: { include: { questions: { include: { question: { include: { options: { orderBy: { label: 'asc' } } } } } } } },
    },
  });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }

  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  let earned = 0;
  let possible = 0;
  const answerUpdates: Array<Promise<unknown>> = [];

  for (const row of attempt.tryout.questions) {
    const question = row.question;
    const answer = answerMap.get(question.id);
    const value = !answer
      ? null
      : question.questionType === QuestionType.TRUE_FALSE
        ? answer.trueFalseAnswers
        : question.questionType === QuestionType.MULTIPLE_CHOICE
          ? answer.selectedOptionIds
          : answer.selectedOptionId;
    const scored = scoreQuestionAnswer(question, value);
    earned += scored.score;
    possible += scored.maxScore;
    if (answer) {
      answerUpdates.push(prisma.attemptAnswer.update({
        where: { id: answer.id },
        data: { score: scored.score, isCorrect: scored.isCorrect, answeredAt: new Date() },
      }));
    }
  }

  if (answerUpdates.length) await Promise.all(answerUpdates);
  const score = possible ? (earned / possible) * 100 : 0;

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
