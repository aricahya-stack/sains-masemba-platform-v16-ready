import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PracticeBoard } from '../../components/practice-board';

export default async function LatihanPage() {
  await requireRole(UserRole.SISWA);
  const questions = await prisma.question.findMany({
    where: { status: 'PUBLISHED' },
    include: { topic: true, options: { orderBy: { label: 'asc' } } },
    orderBy: { code: 'asc' },
    take: 10,
  });

  const payload = questions.map((question) => ({
    id: question.id,
    code: question.code,
    topic: question.topic.title,
    html: question.questionHtml || question.questionText,
    explanation: question.explanation || '',
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      text: option.optionText,
      isCorrect: option.isCorrect,
    })),
  }));

  return <PracticeBoard questions={payload} />;
}
