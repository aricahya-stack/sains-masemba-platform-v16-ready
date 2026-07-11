import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function TryoutPage() {
  await requireRole(UserRole.GURU);
  const [topics, questions] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.question.findMany({
      where: {
        OR: [
          { tryoutQuestions: { some: {} } },
          {
            blueprint: {
              is: {
                OR: [
                  { periodCode: 'TRYOUT_CONTENT' },
                  { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
      include: {
        topic: true,
        blueprint: true,
        options: { orderBy: { label: 'asc' } },
        tryoutQuestions: { include: { tryout: true }, orderBy: { orderNo: 'asc' } },
      },
      orderBy: [{ stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
  ]);

  const sortedQuestions = [...questions].sort((left, right) => {
    const groupCompare = (left.blueprint?.testGroup || '').localeCompare(right.blueprint?.testGroup || '', 'id');
    if (groupCompare !== 0) return groupCompare;
    if (left.stimulusOrder !== right.stimulusOrder) return left.stimulusOrder - right.stimulusOrder;
    return left.code.localeCompare(right.code, 'id');
  });

  const fields: InlineFieldDef[] = [
    { name: 'testGroup', label: 'Nama kelompok tryout' },
    { name: 'blueprintCode', label: 'Kode kisi-kisi' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
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
    const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
    return {
      id: question.id,
      _persisted: 'true',
      testGroup: blueprint?.testGroup || mappedTryout?.title || 'Tryout lama',
      blueprintId: blueprint?.id || '',
      blueprintCode: blueprint?.code || `LEGACY-${question.code}`,
      competency: blueprint?.competency || 'Kompetensi belum dicatat pada data lama',
      indicator: blueprint?.indicator || 'Indikator belum dicatat pada data lama',
      materialName: blueprint?.materialName || question.topic.title,
      cognitiveLevel: blueprint?.cognitiveLevel || '',
      targetDifficulty: blueprint?.targetDifficulty || question.difficulty || '',
      targetQuestionCount: String(blueprint?.targetQuestionCount || 1),
      blueprintText: blueprint?.blueprintText || (mappedTryout ? `Terhubung ke ${mappedTryout.title}` : ''),
      code: question.code,
      topicId: question.topicId,
      topicLabel: question.topic.title,
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
      description="Setiap baris memuat kisi-kisi sekaligus soal tryout. Data lama dimuat berdasarkan relasi paket Tryout, sedangkan data impor baru tetap dikelompokkan melalui kisi-kisi. Paket baru dirancang berisi tepat 30 soal. Seluruh konten dapat diedit langsung di tabel dengan WYSIWYG."
      entityName="data tryout"
      endpoint="/api/tryout-content"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ status: 'DRAFT', questionType: 'SINGLE_CHOICE', scoringMode: 'EXACT_MATCH', maxScore: '1', stimulusOrder: '1', targetQuestionCount: '1' }}
      addLabel="Tambah kisi-kisi & soal"
      tableTitle="Tabel tryout"
      tableColumns={[
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
