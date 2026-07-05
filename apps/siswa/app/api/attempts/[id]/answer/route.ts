import { NextResponse } from 'next/server';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';
import { scoreQuestionAnswer } from '../../../../../lib/question-scoring';

async function ensureStudent() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SISWA ? user : null;
}

function selectedIdsFromBody(body: Record<string, unknown>) {
  if (Array.isArray(body.selectedOptionIds)) return body.selectedOptionIds.filter(Boolean).map(String);
  if (body.selectedOptionId) return [String(body.selectedOptionId)];
  return [] as string[];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await ensureStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      tryout: { include: { questions: true } },
    },
  });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }

  if (!body.questionId) return NextResponse.json({ error: 'Question ID wajib ada.' }, { status: 400 });
  const questionId = String(body.questionId);
  const belongsToTryout = attempt.tryout.questions.some((row) => row.questionId === questionId);
  if (!belongsToTryout) return NextResponse.json({ error: 'Soal tidak termasuk dalam tryout ini.' }, { status: 400 });

  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { options: { orderBy: { label: 'asc' } } } });
  if (!question) return NextResponse.json({ error: 'Soal tidak ditemukan.' }, { status: 404 });

  const selectedOptionIds = question.questionType === QuestionType.MULTIPLE_CHOICE ? selectedIdsFromBody(body) : [];
  const selectedOptionId = question.questionType === QuestionType.SINGLE_CHOICE && body.selectedOptionId ? String(body.selectedOptionId) : null;
  const trueFalseAnswers = question.questionType === QuestionType.TRUE_FALSE && body.trueFalseAnswers && typeof body.trueFalseAnswers === 'object'
    ? body.trueFalseAnswers
    : null;
  const scoringValue = question.questionType === QuestionType.TRUE_FALSE
    ? trueFalseAnswers
    : question.questionType === QuestionType.MULTIPLE_CHOICE
      ? selectedOptionIds
      : selectedOptionId;
  const scored = scoreQuestionAnswer(question, scoringValue);

  await prisma.attemptAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: id,
        questionId,
      },
    },
    update: {
      selectedOptionId,
      selectedOptionIds,
      trueFalseAnswers,
      score: scored.score,
      isCorrect: scored.isCorrect,
      answeredAt: new Date(),
    },
    create: {
      attemptId: id,
      questionId,
      selectedOptionId,
      selectedOptionIds,
      trueFalseAnswers,
      score: scored.score,
      isCorrect: scored.isCorrect,
    },
  });

  return NextResponse.json({ ok: true, score: scored.score, isCorrect: scored.isCorrect });
}
