import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { TopicStudy } from '../../components/topic-study';

export default async function BelajarPage({ searchParams }: { searchParams: Promise<{ q?: string; topik?: string }> }) {
  await requireRole(UserRole.SISWA);
  const params = await searchParams;
  const topics = await prisma.topic.findMany({
    include: {
      materials: {
        where: { status: 'PUBLISHED' },
        include: {
          objectives: { orderBy: { orderNo: 'asc' } },
          sections: { orderBy: { orderNo: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      questions: {
        where: { status: 'PUBLISHED' },
        include: { options: { orderBy: { label: 'asc' } } },
        orderBy: { code: 'asc' },
        take: 15,
      },
    },
    orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
  });

  const payload = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description || '',
    subject: topic.subject,
    materialCount: topic.materials.length,
    questionCount: topic.questions.length,
    materials: topic.materials.map((material) => ({
      id: material.id,
      title: material.title,
      summary: material.summaryHtml || material.summaryText || '',
      objectives: material.objectives.map((objective) => objective.objective),
      sections: material.sections.map((section) => ({
        id: section.id,
        title: section.title,
        html: section.contentHtml || section.contentText || '',
      })),
    })),
    questions: topic.questions.map((question) => ({
      id: question.id,
      code: question.code,
      html: question.questionHtml || question.questionText,
      explanation: question.explanation || '',
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        text: option.optionText,
        isCorrect: option.isCorrect,
      })),
    })),
  }));

  return (
    <div className="stack">
      <PageHero
        eyebrow="Belajar"
        title="Pilih topik IPA SMP"
        description="Materi ditampilkan dalam kotak topik. Klik satu topik untuk membuka materi, latihan, dan pembahasan di halaman yang sama."
      />
      <TopicStudy topics={payload} initialQuery={params.q || ''} selectedTopicId={params.topik} />
    </div>
  );
}
