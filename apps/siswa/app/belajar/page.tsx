import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { TopicStudy } from '../../components/topic-study';

type TopicQuestionPayload = {
  id: string;
  code: string;
  html: string;
  explanation: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  scoringMode: 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';
  maxScore: number;
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
};

function tkaTopicExamples(topicId: string): TopicQuestionPayload[] {
  return [
    {
      id: `${topicId}-contoh-tka-kompleks`,
      code: 'CONTOH-TKA-KOMPLEKS',
      html: '<p>Perhatikan pernyataan tentang energi pada benda yang jatuh dari ketinggian tertentu. Pernyataan yang benar adalah ...</p>',
      explanation: '<p>Saat ketinggian benda berkurang, energi potensial menurun. Energi kinetik meningkat karena kecepatan bertambah. Energi mekanik tetap jika hambatan udara diabaikan.</p>',
      questionType: 'MULTIPLE_CHOICE',
      scoringMode: 'PARTIAL_NO_PENALTY',
      maxScore: 1,
      options: [
        { id: `${topicId}-contoh-tka-kompleks-A`, label: 'A', text: 'Energi potensial bergantung pada massa, gravitasi, dan ketinggian.', isCorrect: true },
        { id: `${topicId}-contoh-tka-kompleks-B`, label: 'B', text: 'Energi kinetik selalu nol selama benda bergerak jatuh.', isCorrect: false },
        { id: `${topicId}-contoh-tka-kompleks-C`, label: 'C', text: 'Energi kinetik bertambah saat kecepatan benda meningkat.', isCorrect: true },
        { id: `${topicId}-contoh-tka-kompleks-D`, label: 'D', text: 'Energi mekanik tetap jika hambatan udara diabaikan.', isCorrect: true },
      ],
    },
    {
      id: `${topicId}-contoh-tka-benar-salah`,
      code: 'CONTOH-TKA-BS',
      html: '<p>Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.</p>',
      explanation: '<p>Atom oksigen netral memiliki 8 proton dan 8 elektron. Jika nomor massa 16, jumlah neutronnya 8. Susunan elektron oksigen adalah 2 elektron pada kulit K dan 6 elektron pada kulit L.</p>',
      questionType: 'TRUE_FALSE',
      scoringMode: 'PARTIAL_NO_PENALTY',
      maxScore: 1,
      options: [
        { id: `${topicId}-contoh-tka-benar-salah-A`, label: 'A', text: 'Atom oksigen netral memiliki 8 elektron.', isCorrect: true },
        { id: `${topicId}-contoh-tka-benar-salah-B`, label: 'B', text: 'Jika nomor massanya 16, atom oksigen memiliki 7 neutron.', isCorrect: false },
        { id: `${topicId}-contoh-tka-benar-salah-C`, label: 'C', text: 'Kulit L pada atom oksigen berisi 6 elektron.', isCorrect: true },
      ],
    },
  ];
}

function withTopicExamples(topicId: string, questions: TopicQuestionPayload[]) {
  const hasMultipleChoice = questions.some((question) => question.questionType === 'MULTIPLE_CHOICE');
  const hasTrueFalse = questions.some((question) => question.questionType === 'TRUE_FALSE');
  const examples = tkaTopicExamples(topicId).filter((question) => {
    if (question.questionType === 'MULTIPLE_CHOICE') return !hasMultipleChoice;
    if (question.questionType === 'TRUE_FALSE') return !hasTrueFalse;
    return false;
  });
  return [...questions, ...examples];
}

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
        where: {
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
        include: { options: { orderBy: { label: 'asc' } } },
        orderBy: { code: 'asc' },
        take: 15,
      },
    },
    orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
  });

  // Hanya topik yang benar-benar memiliki materi terbit atau soal latihan terbit yang tampil.
  // Ini sekaligus menyembunyikan topik legacy yang dulu tercipta akibat import tryout.
  const visibleTopics = topics.filter((topic) => topic.materials.length > 0 || topic.questions.length > 0);

  const payload = visibleTopics.map((topic) => {
    const questions = withTopicExamples(topic.id, topic.questions.map((question) => ({
      id: question.id,
      code: question.code,
      html: question.questionHtml || question.questionText,
      explanation: question.explanation || '',
      questionType: question.questionType,
      scoringMode: question.scoringMode,
      maxScore: question.maxScore || 1,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        text: option.optionText,
        isCorrect: option.isCorrect,
      })),
    })));

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description || '',
      subject: topic.subject,
      materialCount: topic.materials.length,
      questionCount: questions.length,
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
      questions,
    };
  });

  return (
    <div className="stack">
      <PageHero
        eyebrow="Belajar"
        title="Pilih topik IPA SMP"
        description="Materi ditampilkan dalam kotak topik. Klik satu topik untuk membuka materi dan mengerjakan latihan. Topik selesai otomatis setelah semua latihan dijawab."
      />
      <TopicStudy topics={payload} initialQuery={params.q || ''} selectedTopicId={params.topik} />
    </div>
  );
}
