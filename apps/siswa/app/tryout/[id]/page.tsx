import { prisma, QuestionType, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ExamMode } from '../../../components/exam-mode';
import { redirect } from 'next/navigation';
import { finalizeAttempt, isTryoutOpen, remainingAttemptSeconds } from '../../../lib/attempt-security';

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(UserRole.SISWA);
  const { id } = await params;
  const tryout = await prisma.tryout.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      status: true,
      startAt: true,
      endAt: true,
      questions: {
        select: {
          orderNo: true,
          question: {
            select: {
              id: true,
              code: true,
              questionText: true,
              questionHtml: true,
              questionType: true,
              scoringMode: true,
              maxScore: true,
              options: {
                select: { id: true, label: true, optionText: true },
                orderBy: { label: 'asc' },
              },
            },
          },
        },
        orderBy: { orderNo: 'asc' },
      },
    },
  });

  if (!tryout) {
    redirect('/tryout');
  }

  if (!isTryoutOpen(tryout)) {
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


  const remainingSeconds = remainingAttemptSeconds(attempt, tryout);
  if (remainingSeconds <= 0) {
    await finalizeAttempt(attempt.id, user.id);
    redirect('/hasil');
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
    questionType: row.question.questionType,
    scoringMode: row.question.scoringMode,
    maxScore: row.question.maxScore || 1,
    options: row.question.options.map((option) => ({
      id: option.id,
      label: option.label,
      text: option.optionText,
    })),
  }));

  return (
    <ExamMode
      tryoutId={tryout.id}
      attemptId={attempt.id}
      tryoutTitle={tryout.title}
      remainingSeconds={remainingSeconds}
      initialWarnings={attempt.warnings}
      initialAnswers={initialAnswers}
      questions={questions}
    />
  );
}
