import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PracticeBoard } from '../../components/practice-board';

const demoQuestions = [
  {
    id: 'demo-tka-pg-1',
    code: 'CONTOH-TKA-PG',
    topic: 'Contoh TKA IPA • Pilihan ganda biasa',
    html: '<p>Sebuah sepeda bermassa 20 kg mengalami percepatan 2 m/s². Besar gaya yang bekerja pada sepeda adalah ...</p>',
    explanation: '<p>Gunakan Hukum II Newton, yaitu F = m × a. Jadi F = 20 × 2 = 40 N.</p>',
    questionType: 'SINGLE_CHOICE' as const,
    scoringMode: 'EXACT_MATCH' as const,
    maxScore: 1,
    options: [
      { id: 'demo-tka-pg-1-A', label: 'A', text: '10 N', isCorrect: false },
      { id: 'demo-tka-pg-1-B', label: 'B', text: '20 N', isCorrect: false },
      { id: 'demo-tka-pg-1-C', label: 'C', text: '40 N', isCorrect: true },
      { id: 'demo-tka-pg-1-D', label: 'D', text: '80 N', isCorrect: false },
    ],
  },
  {
    id: 'demo-tka-kompleks-1',
    code: 'CONTOH-TKA-KOMPLEKS',
    topic: 'Contoh TKA IPA • Pilihan ganda kompleks',
    html: '<p>Perhatikan pernyataan tentang energi pada benda yang jatuh dari ketinggian tertentu. Pernyataan yang benar adalah ...</p>',
    explanation: '<p>Saat ketinggian benda berkurang, energi potensial menurun. Energi kinetik meningkat karena kecepatan bertambah. Energi mekanik tetap jika hambatan udara diabaikan.</p>',
    questionType: 'MULTIPLE_CHOICE' as const,
    scoringMode: 'PARTIAL_NO_PENALTY' as const,
    maxScore: 1,
    options: [
      { id: 'demo-tka-kompleks-1-A', label: 'A', text: 'Energi potensial bergantung pada massa, gravitasi, dan ketinggian.', isCorrect: true },
      { id: 'demo-tka-kompleks-1-B', label: 'B', text: 'Energi kinetik selalu nol selama benda bergerak jatuh.', isCorrect: false },
      { id: 'demo-tka-kompleks-1-C', label: 'C', text: 'Energi kinetik bertambah saat kecepatan benda meningkat.', isCorrect: true },
      { id: 'demo-tka-kompleks-1-D', label: 'D', text: 'Energi mekanik tetap jika hambatan udara diabaikan.', isCorrect: true },
    ],
  },
  {
    id: 'demo-tka-bs-1',
    code: 'CONTOH-TKA-BS',
    topic: 'Contoh TKA IPA • Benar atau salah',
    html: '<p>Tentukan benar atau salah untuk setiap pernyataan tentang susunan atom oksigen.</p>',
    explanation: '<p>Atom oksigen netral memiliki 8 proton dan 8 elektron. Jika nomor massa 16, jumlah neutronnya 8. Susunan elektron oksigen adalah 2 elektron pada kulit K dan 6 elektron pada kulit L.</p>',
    questionType: 'TRUE_FALSE' as const,
    scoringMode: 'PARTIAL_NO_PENALTY' as const,
    maxScore: 1,
    options: [
      { id: 'demo-tka-bs-1-A', label: 'A', text: 'Atom oksigen netral memiliki 8 elektron.', isCorrect: true },
      { id: 'demo-tka-bs-1-B', label: 'B', text: 'Jika nomor massanya 16, atom oksigen memiliki 7 neutron.', isCorrect: false },
      { id: 'demo-tka-bs-1-C', label: 'C', text: 'Kulit L pada atom oksigen berisi 6 elektron.', isCorrect: true },
    ],
  },
];

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
    questionType: question.questionType,
    scoringMode: question.scoringMode,
    maxScore: question.maxScore || 1,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      text: option.optionText,
      isCorrect: option.isCorrect,
    })),
  }));

  const existingCodes = new Set(payload.map((question) => question.code));
  const mergedQuestions = [
    ...demoQuestions.filter((question) => !existingCodes.has(question.code)),
    ...payload,
  ];

  return <PracticeBoard questions={mergedQuestions} />;
}
