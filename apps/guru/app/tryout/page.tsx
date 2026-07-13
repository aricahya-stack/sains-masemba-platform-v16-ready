import { prisma, PublishStatus, UserRole } from '@sh/db';
import {
  isInternalTryoutTopicSlug,
  requireRole,
  sourceTopicSlugFromInternalTryoutTopicSlug,
  tryoutCodeFromPeriodCode,
} from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

function formatTopicLabel(topic: { orderNo: number; title: string }) {
  return `${topic.orderNo}. ${topic.title}`;
}

export default async function TryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const [topics, questions] = await Promise.all([
    prisma.topic.findMany({
      where: {
        materials: { some: { status: PublishStatus.PUBLISHED } },
        NOT: { slug: { startsWith: '__tryout__-' } },
      },
      orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
    }),
    prisma.question.findMany({
      where: {
        AND: [
          {
            author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } },
          },
          {
            OR: [
              { tryoutQuestions: { some: {} } },
              {
                blueprint: {
                  is: {
                    OR: [
                      { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
                      { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        topic: true,
        blueprint: true,
        options: { orderBy: { label: 'asc' } },
        tryoutQuestions: { include: { tryout: true }, orderBy: { orderNo: 'asc' } },
      },
      orderBy: [{ stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
  ]);

  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const topicsBySlug = new Map(topics.map((topic) => [topic.slug.toLowerCase(), topic]));

  const sortedQuestions = [...questions].sort((left, right) => {
    const groupCompare = (left.blueprint?.testGroup || '').localeCompare(right.blueprint?.testGroup || '', 'id');
    if (groupCompare !== 0) return groupCompare;
    if (left.stimulusOrder !== right.stimulusOrder) return left.stimulusOrder - right.stimulusOrder;
    return left.code.localeCompare(right.code, 'id');
  });

  const fields: InlineFieldDef[] = [
    { name: 'sourceOwner', label: 'Pembuat soal', readOnly: true },
    { name: 'tryoutCode', label: 'Kode tryout' },
    { name: 'testGroup', label: 'Nama kelompok tryout' },
    { name: 'blueprintCode', label: 'Kode kisi-kisi' },
    {
      name: 'topicId',
      label: 'Topik tryout (mengacu topik belajar)',
      type: 'select',
      options: topics.map((topic) => ({ value: topic.id, label: formatTopicLabel(topic) })),
    },
    { name: 'competency', label: 'Kompetensi', type: 'richtext', full: true },
    { name: 'indicator', label: 'Indikator', type: 'richtext', full: true },
    { name: 'materialName', label: 'Nama materi pada kisi-kisi' },
    { name: 'cognitiveLevel', label: 'Level kognitif' },
    { name: 'targetDifficulty', label: 'Target kesulitan' },
    { name: 'targetQuestionCount', label: 'Target soal kisi-kisi', type: 'number' },
    { name: 'blueprintText', label: 'Catatan kisi-kisi', type: 'richtext', full: true },
    { name: 'code', label: 'Kode soal tryout' },
    { name: 'difficulty', label: 'Kesulitan soal', type: 'select', options: ['Mudah', 'Sedang', 'Sulit'] },
    { name: 'status', label: 'Status soal', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'questionType', label: 'Jenis soal', type: 'select', options: [
      { value: 'SINGLE_CHOICE', label: 'Pilihan ganda biasa' },
      { value: 'MULTIPLE_CHOICE', label: 'Pilihan ganda kompleks' },
      { value: 'TRUE_FALSE', label: 'Benar atau salah' },
    ] },
    { name: 'scoringMode', label: 'Sistem penilaian', type: 'select', options: [
      { value: 'EXACT_MATCH', label: 'Exact match' },
      { value: 'PARTIAL_NO_PENALTY', label: 'Parsial tanpa penalti' },
    ] },
    { name: 'maxScore', label: 'Bobot soal', type: 'number' },
    { name: 'stimulusOrder', label: 'Nomor / urutan soal', type: 'number' },
    { name: 'questionHtml', label: 'Soal / stimulus', type: 'richtext', full: true },
    { name: 'explanation', label: 'Pembahasan', type: 'richtext', full: true },
    { name: 'optionA', label: 'Opsi A / Pernyataan 1', type: 'richtext', full: true },
    { name: 'optionB', label: 'Opsi B / Pernyataan 2', type: 'richtext', full: true },
    { name: 'optionC', label: 'Opsi C / Pernyataan 3', type: 'richtext', full: true },
    { name: 'optionD', label: 'Opsi D / Pernyataan 4', type: 'richtext', full: true },
    { name: 'optionE', label: 'Opsi E / Pernyataan 5 (opsional)', type: 'richtext', full: true },
    { name: 'correctAnswers', label: 'Kunci jawaban. PG: A; kompleks: A,C,D; benar-salah: B,S,B' },
  ];

  const initialRows = sortedQuestions.map((question) => {
    const blueprint = question.blueprint;
    const mappedTryout = question.tryoutQuestions[0]?.tryout;
    const tryoutCode = tryoutCodeFromPeriodCode(
      blueprint?.periodCode,
      blueprint?.testGroup || mappedTryout?.title || 'Tryout',
    );
    const sourceSlug = sourceTopicSlugFromInternalTryoutTopicSlug(question.topic.slug, tryoutCode);
    const sourceTopic = !isInternalTryoutTopicSlug(question.topic.slug)
      ? topicsById.get(question.topicId) || topicsBySlug.get(question.topic.slug.toLowerCase())
      : topicsBySlug.get(sourceSlug)
        || topics.find((topic) => topic.title.toLowerCase() === question.topic.title.toLowerCase());
    const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
    return {
      id: question.id,
      _persisted: 'true',
      _readOnly: 'false',
      _deleteDisabled: question.authorId === user.id ? 'false' : 'true',
      sourceOwner: `Dibuat oleh ${question.author.fullName}${question.author.role === UserRole.SUPER_ADMIN ? ' (Super Admin)' : ' (Guru)'} • dapat diedit semua guru`,
      testGroup: blueprint?.testGroup || mappedTryout?.title || 'Tryout lama',
      tryoutCode,
      blueprintId: blueprint?.id || '',
      blueprintCode: blueprint?.code || `LEGACY-${question.code}`,
      competency: blueprint?.competency || 'Kompetensi belum dicatat pada data lama',
      indicator: blueprint?.indicator || 'Indikator belum dicatat pada data lama',
      materialName: blueprint?.materialName || sourceTopic?.title || question.topic.title,
      cognitiveLevel: blueprint?.cognitiveLevel || '',
      targetDifficulty: blueprint?.targetDifficulty || question.difficulty || '',
      targetQuestionCount: String(blueprint?.targetQuestionCount || 1),
      blueprintText: blueprint?.blueprintText || (mappedTryout ? `Terhubung ke ${mappedTryout.title}` : ''),
      code: question.code,
      topicId: sourceTopic?.id || '',
      topicLabel: sourceTopic ? formatTopicLabel(sourceTopic) : question.topic.title,
      difficulty: question.difficulty || '',
      status: question.status,
      stimulusOrder: String(question.stimulusOrder),
      questionType: question.questionType,
      scoringMode: question.scoringMode,
      maxScore: String(question.maxScore || 1),
      questionHtml: question.questionHtml || question.questionText,
      explanation: question.explanation || '',
      optionA: byLabel.A || '',
      optionB: byLabel.B || '',
      optionC: byLabel.C || '',
      optionD: byLabel.D || '',
      optionE: byLabel.E || '',
      correctAnswers: question.questionType === 'TRUE_FALSE'
        ? question.options.map((item) => (item.isCorrect ? 'B' : 'S')).join(',')
        : question.options.filter((item) => item.isCorrect).map((item) => item.label).join(','),
    };
  });

  return (
    <InlineEditableManager
      eyebrow="Ujian • Tryout"
      title="Data tryout: kisi-kisi dan soal"
      description="Bank soal tryout digunakan bersama. Seluruh guru dapat melihat dan mengedit soal yang dibuat guru lain maupun Super Admin. Hak hapus tetap hanya dimiliki pembuat soal agar data tidak terhapus sembarangan. Pilihan topik memakai 30 topik belajar tanpa mencampurkan soal latihan dengan soal tryout."
      entityName="data tryout"
      endpoint="/api/tryout-content"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ tryoutCode: 'TRYOUT-01', status: 'DRAFT', questionType: 'SINGLE_CHOICE', scoringMode: 'EXACT_MATCH', maxScore: '1', stimulusOrder: '1', targetQuestionCount: '1' }}
      addLabel="Tambah kisi-kisi & soal"
      tableTitle="Tabel tryout"
      tableColumns={[
        { key: 'sourceOwner', label: 'Pembuat soal' },
        { key: 'tryoutCode', label: 'Kode tryout' },
        { key: 'testGroup', label: 'Tryout' },
        { key: 'stimulusOrder', label: 'No.' },
        { key: 'blueprintCode', label: 'Kisi-kisi' },
        { key: 'code', label: 'Kode soal' },
        { key: 'topicLabel', label: 'Topik' },
        { key: 'questionType', label: 'Jenis' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
