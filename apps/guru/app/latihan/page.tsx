import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function LatihanPage() {
  await requireRole(UserRole.GURU);
  const [topics, questions] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.question.findMany({
      where: {
        tryoutQuestions: { none: {} },
        NOT: {
          blueprint: {
            is: {
              OR: [
                { periodCode: 'TRYOUT_CONTENT' },
                { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
              ],
            },
          },
        },
      },
      include: { topic: true, options: { orderBy: { label: 'asc' } } },
      orderBy: { code: 'asc' },
    }),
  ]);

  const fields: InlineFieldDef[] = [
    { name: 'code', label: 'Kode soal latihan' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
    { name: 'difficulty', label: 'Kesulitan', type: 'select', options: ['Mudah', 'Sedang', 'Sulit'] },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
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
    { name: 'stimulusOrder', label: 'Urutan soal', type: 'number' },
    { name: 'questionHtml', label: 'Soal / stimulus', type: 'richtext', full: true },
    { name: 'explanation', label: 'Pembahasan', type: 'richtext', full: true },
    { name: 'optionA', label: 'Opsi A / Pernyataan 1', type: 'richtext', full: true },
    { name: 'optionB', label: 'Opsi B / Pernyataan 2', type: 'richtext', full: true },
    { name: 'optionC', label: 'Opsi C / Pernyataan 3', type: 'richtext', full: true },
    { name: 'optionD', label: 'Opsi D / Pernyataan 4', type: 'richtext', full: true },
    { name: 'optionE', label: 'Opsi E / Pernyataan 5 (opsional)', type: 'richtext', full: true },
    { name: 'correctAnswers', label: 'Kunci jawaban. PG: A; kompleks: A,C,D; benar-salah: B,S,B' },
  ];

  const initialRows = questions.map((question) => {
    const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
    return {
      id: question.id,
      _persisted: 'true',
      code: question.code,
      topicId: question.topicId,
      topicLabel: question.topic.title,
      blueprintId: '',
      blueprintLabel: 'Latihan',
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
      eyebrow="Konten • Latihan"
      title="Soal latihan dalam materi"
      description="Latihan adalah soal yang tampil pada topik belajar siswa. Semua soal yang tidak terhubung ke paket Tryout dimuat sebagai Latihan, termasuk data lama yang sebelumnya memiliki kisi-kisi."
      entityName="soal latihan"
      endpoint="/api/questions"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ status: 'DRAFT', questionType: 'SINGLE_CHOICE', scoringMode: 'EXACT_MATCH', maxScore: '1', stimulusOrder: '1', blueprintId: '' }}
      addLabel="Tambah soal latihan"
      tableTitle="Tabel soal latihan"
      tableColumns={[
        { key: 'code', label: 'Kode' },
        { key: 'topicLabel', label: 'Topik' },
        { key: 'questionType', label: 'Jenis' },
        { key: 'difficulty', label: 'Kesulitan' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
