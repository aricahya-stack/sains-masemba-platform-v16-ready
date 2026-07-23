import { prisma, QuestionType, TryoutStatus } from '@sh/db';
import { scoreQuestionAnswer, type AnswerValue } from './question-scoring';

export type TryoutWindow = {
  status: TryoutStatus;
  startAt: Date | null;
  endAt: Date | null;
  durationMinutes: number;
};

export function isTryoutOpen(tryout: Pick<TryoutWindow, 'status' | 'startAt' | 'endAt'>, now = new Date()) {
  if (tryout.status !== TryoutStatus.OPEN) return false;
  if (tryout.startAt && now < tryout.startAt) return false;
  if (tryout.endAt && now >= tryout.endAt) return false;
  return true;
}

export function attemptDeadline(
  attempt: { startedAt: Date },
  tryout: Pick<TryoutWindow, 'durationMinutes' | 'endAt'>,
) {
  const durationDeadline = new Date(attempt.startedAt.getTime() + Math.max(1, tryout.durationMinutes) * 60_000);
  if (tryout.endAt && tryout.endAt < durationDeadline) return tryout.endAt;
  return durationDeadline;
}

export function remainingAttemptSeconds(
  attempt: { startedAt: Date },
  tryout: Pick<TryoutWindow, 'durationMinutes' | 'endAt'>,
  now = new Date(),
) {
  return Math.max(0, Math.ceil((attemptDeadline(attempt, tryout).getTime() - now.getTime()) / 1000));
}

export type AttemptAccessState = 'ACTIVE' | 'PAUSED' | 'NOT_OPEN' | 'EXPIRED' | 'SUBMITTED';

export function attemptAccessState(
  attempt: { startedAt: Date; submittedAt: Date | null },
  tryout: TryoutWindow,
  now = new Date(),
): AttemptAccessState {
  if (attempt.submittedAt) return 'SUBMITTED';
  if (remainingAttemptSeconds(attempt, tryout, now) <= 0 || (tryout.endAt && now >= tryout.endAt)) return 'EXPIRED';
  if (tryout.status === TryoutStatus.PAUSED) return 'PAUSED';
  if (!isTryoutOpen(tryout, now)) return 'NOT_OPEN';
  return 'ACTIVE';
}

export function canWriteAttempt(
  attempt: { startedAt: Date; submittedAt: Date | null },
  tryout: TryoutWindow,
  now = new Date(),
) {
  return attemptAccessState(attempt, tryout, now) === 'ACTIVE';
}

export async function finalizeAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      answers: true,
      tryout: {
        include: {
          questions: {
            include: {
              question: { include: { options: { orderBy: { label: 'asc' } } } },
            },
            orderBy: { orderNo: 'asc' },
          },
        },
      },
    },
  });

  if (!attempt) return null;
  if (attempt.submittedAt) return { score: attempt.score, submittedAt: attempt.submittedAt };

  type AttemptAnswerRow = (typeof attempt.answers)[number];
  const answerMap = new Map<string, AttemptAnswerRow>(
    attempt.answers.map((answer): [string, AttemptAnswerRow] => [answer.questionId, answer]),
  );
  let earned = 0;
  let possible = 0;
  const answerUpdates: Array<{ id: string; score: number; isCorrect: boolean }> = [];

  for (const row of attempt.tryout.questions) {
    const question = row.question;
    const answer = answerMap.get(question.id);
    const value: AnswerValue = (!answer
      ? null
      : question.questionType === QuestionType.TRUE_FALSE
        ? answer.trueFalseAnswers
        : question.questionType === QuestionType.MULTIPLE_CHOICE
          ? answer.selectedOptionIds
          : answer.selectedOptionId) as AnswerValue;
    const scored = scoreQuestionAnswer(question, value);
    earned += scored.score;
    possible += scored.maxScore;
    if (answer) {
      answerUpdates.push({ id: answer.id, score: scored.score, isCorrect: scored.isCorrect });
    }
  }

  const score = possible ? (earned / possible) * 100 : 0;
  const submittedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const lock = await tx.attempt.updateMany({
      where: { id: attempt.id, userId, submittedAt: null },
      data: { score, submittedAt },
    });

    if (lock.count === 0) {
      const current = await tx.attempt.findUnique({
        where: { id: attempt.id },
        select: { score: true, submittedAt: true },
      });
      return current?.submittedAt ? current : null;
    }

    for (const update of answerUpdates) {
      await tx.attemptAnswer.update({
        where: { id: update.id },
        data: { score: update.score, isCorrect: update.isCorrect, answeredAt: submittedAt },
      });
    }

    await tx.tryoutIncident.create({
      data: {
        tryoutId: attempt.tryoutId,
        attemptId: attempt.id,
        userId,
        type: 'ATTEMPT_SUBMITTED',
        message: `Skor akhir ${score.toFixed(0)}`,
      },
    });

    return { score, submittedAt };
  });
}
