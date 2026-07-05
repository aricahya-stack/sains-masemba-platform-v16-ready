import { prisma, QuestionType, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ExamMode } from '../../../components/exam-mode';
import { redirect } from 'next/navigation';

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(UserRole.SISWA);
  const { id } = await params;
  const tryout = await prisma.tryout.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: { include: { options: { orderBy: { label: 'asc' } } } } },
        orderBy: { orderNo: 'asc' },
      },
    },
  });

  if (!tryout) {
    redirect('/tryout');
  }

  const allowedStatuses: TryoutStatus[] = [TryoutStatus.OPEN, TryoutStatus.PAUSED, TryoutStatus.SCHEDULED];

  if (!allowedStatuses.includes(tryout.status)) {
    redirect('/tryout');
  }

  let attempt = await prisma.attempt.findFirst({
    where: { userId: user.id, tryoutId: tryout.id, submittedAt: null },
    include: { answers: true },
    orderBy: { startedAt: 'desc' },
  });

  if (!attempt) {
    attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        tryoutId: tryout.id,
      },
      include: { answers: true },
    });
  }

  const questionTypeMap = new Map(tryout.questions.map((row) => [row.question.id, row.question.questionType]));
  const initialAnswers = Object.fromEntries(attempt.answers.map((answer) => {
    const questionType = questionTypeMap.get(answer.questionId);
    if (questionType === QuestionType.TRUE_FALSE) return [answer.questionId, answer.trueFalseAnswers || {}];
    if (questionType === QuestionType.MULTIPLE_CHOICE) return [answer.questionId, answer.selectedOptionIds || []];
    return [answer.questionId, answer.selectedOptionId || answer.selectedOptionIds[0] || ''];
  }));
  const questions = tryout.questions.map((row) => ({
    id: row.question.id,
    code: row.question.code,
    html: row.question.questionHtml || row.question.questionText,
    explanation: row.question.explanation || '',
    questionType: row.question.questionType,
    scoringMode: row.question.scoringMode,
    maxScore: row.question.maxScore || 1,
    options: row.question.options.map((option) => ({
      id: option.id,
      label: option.label,
      text: option.optionText,
      isCorrect: option.isCorrect,
    })),
  }));

  return (
    <ExamMode
      tryoutId={tryout.id}
      attemptId={attempt.id}
      tryoutTitle={tryout.title}
      durationMinutes={tryout.durationMinutes}
      initialWarnings={attempt.warnings}
      initialAnswers={initialAnswers}
      questions={questions}
    />
  );
}
