import { prisma, QuestionType } from '@sh/db';
import type { AnswerValue } from './question-scoring';

export type PracticeProgressPayload = {
  answers: Record<string, AnswerValue>;
  completed: Record<string, boolean>;
};

export async function loadPracticeProgress(
  userId: string,
  questionIdsByTopic: Record<string, string[]>,
): Promise<PracticeProgressPayload> {
  const topicIds = Object.keys(questionIdsByTopic);
  if (!topicIds.length) {
    return { answers: {}, completed: {} };
  }

  const attempts = await prisma.practiceAttempt.findMany({
    where: {
      userId,
      topicId: { in: topicIds },
    },
    include: {
      answers: {
        include: {
          question: {
            select: { questionType: true },
          },
        },
      },
    },
  });

  const answers: Record<string, AnswerValue> = {};
  const completed: Record<string, boolean> = {};

  for (const topicId of topicIds) {
    completed[topicId] = false;
  }

  for (const attempt of attempts) {
    const expectedQuestionIds = questionIdsByTopic[attempt.topicId] || [];
    const answeredQuestionIds = new Set(
      attempt.answers.filter((answer) => answer.isAnswered).map((answer) => answer.questionId),
    );

    completed[attempt.topicId] = expectedQuestionIds.length > 0
      && expectedQuestionIds.every((questionId) => answeredQuestionIds.has(questionId));

    for (const answer of attempt.answers) {
      if (answer.question.questionType === QuestionType.TRUE_FALSE) {
        answers[answer.questionId] = answer.trueFalseAnswers as AnswerValue;
      } else if (answer.question.questionType === QuestionType.MULTIPLE_CHOICE) {
        answers[answer.questionId] = answer.selectedOptionIds;
      } else {
        answers[answer.questionId] = answer.selectedOptionId;
      }
    }
  }

  return { answers, completed };
}
