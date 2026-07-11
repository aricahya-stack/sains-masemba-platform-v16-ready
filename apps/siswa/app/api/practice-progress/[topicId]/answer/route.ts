import { NextResponse } from 'next/server';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';
import {
  isAnswered,
  normalizeSelectedIds,
  normalizeTrueFalseAnswers,
  scoreQuestionAnswer,
  type AnswerValue,
} from '../../../../../lib/question-scoring';

async function ensureStudent() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SISWA ? user : null;
}

function sanitizeAnswer(question: {
  questionType: QuestionType;
  options: { id: string }[];
}, rawAnswer: AnswerValue): AnswerValue {
  const allowedIds = new Set(question.options.map((option) => option.id));

  if (question.questionType === QuestionType.TRUE_FALSE) {
    const normalized = normalizeTrueFalseAnswers(rawAnswer);
    return Object.fromEntries(
      Object.entries(normalized).filter(([optionId]) => allowedIds.has(optionId)),
    );
  }

  if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
    return normalizeSelectedIds(rawAnswer).filter((optionId) => allowedIds.has(optionId));
  }

  const selected = normalizeSelectedIds(rawAnswer).find((optionId) => allowedIds.has(optionId));
  return selected || null;
}

function answerColumns(questionType: QuestionType, value: AnswerValue) {
  if (questionType === QuestionType.TRUE_FALSE) {
    return {
      selectedOptionId: null,
      selectedOptionIds: [] as string[],
      trueFalseAnswers: normalizeTrueFalseAnswers(value),
    };
  }

  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    return {
      selectedOptionId: null,
      selectedOptionIds: normalizeSelectedIds(value),
      trueFalseAnswers: null,
    };
  }

  return {
    selectedOptionId: normalizeSelectedIds(value)[0] || null,
    selectedOptionIds: [] as string[],
    trueFalseAnswers: null,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const user = await ensureStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topicId } = await params;
  const body = await request.json().catch(() => null) as { questionId?: unknown; answer?: AnswerValue } | null;
  const questionId = body?.questionId ? String(body.questionId) : '';

  if (!questionId) {
    return NextResponse.json({ error: 'Question ID wajib ada.' }, { status: 400 });
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      topicId,
      status: 'PUBLISHED',
      tryoutQuestions: { none: {} },
      NOT: {
        blueprint: {
          is: {
            OR: [
              { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
              { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
            ],
          },
        },
      },
    },
    include: {
      options: { orderBy: { label: 'asc' } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: 'Soal latihan tidak ditemukan atau bukan bagian dari topik ini.' }, { status: 404 });
  }

  const value = sanitizeAnswer(question, body?.answer);
  const answered = isAnswered(question, value);
  const scored = scoreQuestionAnswer(question, value);
  const columns = answerColumns(question.questionType, value);

  const attempt = await prisma.practiceAttempt.upsert({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      topicId,
    },
  });

  await prisma.practiceAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: attempt.id,
        questionId,
      },
    },
    update: {
      ...columns,
      score: scored.score,
      isCorrect: scored.isCorrect,
      isAnswered: answered,
      answeredAt: new Date(),
    },
    create: {
      attemptId: attempt.id,
      questionId,
      ...columns,
      score: scored.score,
      isCorrect: scored.isCorrect,
      isAnswered: answered,
    },
  });

  const eligibleQuestions = await prisma.question.findMany({
    where: {
      topicId,
      status: 'PUBLISHED',
      tryoutQuestions: { none: {} },
      NOT: {
        blueprint: {
          is: {
            OR: [
              { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
              { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
            ],
          },
        },
      },
    },
    select: {
      id: true,
      maxScore: true,
    },
    orderBy: { code: 'asc' },
    take: 15,
  });

  const eligibleIds = eligibleQuestions.map((item) => item.id);
  const totalQuestions = eligibleIds.length;

  const [answeredCount, scoreAggregate] = eligibleIds.length
    ? await Promise.all([
        prisma.practiceAnswer.count({
          where: {
            attemptId: attempt.id,
            questionId: { in: eligibleIds },
            isAnswered: true,
          },
        }),
        prisma.practiceAnswer.aggregate({
          where: {
            attemptId: attempt.id,
            questionId: { in: eligibleIds },
          },
          _sum: { score: true },
        }),
      ])
    : [0, { _sum: { score: null } }];

  const possibleScore = eligibleQuestions.reduce((sum, item) => sum + Number(item.maxScore || 1), 0);
  const earnedScore = Number(scoreAggregate._sum.score || 0);
  const score = possibleScore > 0 ? (earnedScore / possibleScore) * 100 : 0;
  const completed = totalQuestions > 0 && answeredCount === totalQuestions;

  const updatedAttempt = await prisma.practiceAttempt.update({
    where: { id: attempt.id },
    data: {
      score,
      completedAt: completed ? (attempt.completedAt || new Date()) : null,
    },
  });

  return NextResponse.json({
    ok: true,
    answered,
    isCorrect: scored.isCorrect,
    questionScore: scored.score,
    score: updatedAttempt.score,
    answeredCount,
    totalQuestions,
    completed,
  });
}
