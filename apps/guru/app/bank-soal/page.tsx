import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function BankSoalPage({ searchParams }: { searchParams: Promise<{ tryout?: string }> }) {
  const user = await requireRole(UserRole.GURU);
  const params = await searchParams;
  const [topics, blueprints, questions, tryouts] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.blueprint.findMany({ orderBy: { code: 'asc' } }),
    prisma.question.findMany({
      where: { authorId: user.id },
      include: { topic: true, blueprint: true, options: { orderBy: { label: 'asc' } } },
      orderBy: { code: 'asc' },
    }),
    prisma.tryout.findMany({
      where: { authorId: user.id },
      include: { questions: { include: { question: true }, orderBy: { orderNo: 'asc' } }, _count: { select: { questions: true, attempts: true } } },
      orderBy: { title: 'asc' },
    }),
  ]);

  const selectedTryout = params.tryout ? tryouts.find((item) => item.id === params.tryout) : tryouts[0];
  const selectedCodes = new Set(selectedTryout?.questions.map((row) => row.question.code) || []);
  const selectedQuestions = selectedTryout ? questions.filter((question) => selectedCodes.has(question.code)) : questions;

  const fields: FieldDef[] = [
    { name: 'code', label: 'Kode soal' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
    { name: 'blueprintId', label: 'Kode kisi-kisi', type: 'select', options: [{ value: '', label: 'Tanpa kisi-kisi' }, ...blueprints.map((bp) => ({ value: bp.id, label: `${bp.code}${bp.testGroup ? ` • ${bp.testGroup}` : ''}` }))] },
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
    { name: 'maxScore', label: 'Bobot soal' },
    { name: 'stimulusOrder', label: 'Urutan stimulus' },
    { name: 'questionHtml', label: 'Soal / stimulus (HTML / LaTeX)', type: 'richtext' },
    { name: 'explanation', label: 'Pembahasan', type: 'richtext' },
    { name: 'optionA', label: 'Opsi A / Pernyataan 1', type: 'textarea' },
    { name: 'optionB', label: 'Opsi B / Pernyataan 2', type: 'textarea' },
    { name: 'optionC', label: 'Opsi C / Pernyataan 3', type: 'textarea' },
    { name: 'optionD', label: 'Opsi D / Pernyataan 4', type: 'textarea' },
    { name: 'optionE', label: 'Opsi E / Pernyataan 5 (opsional)', type: 'textarea' },
    { name: 'correctAnswers', label: 'Kunci jawaban. PG: A. Kompleks: A,C,D. Benar Salah: B,S,B' },
  ];

  const initialRows = selectedQuestions.map((question) => {
    const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
    return {
      id: question.id,
      code: question.code,
      topicId: question.topicId,
      blueprintId: question.blueprintId || '',
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
    <div className="stack">
      <section className="card stack">
        <div>
          <div className="eyebrow">Bank soal berdasarkan tryout</div>
          <strong>Pilih nama tryout terlebih dahulu</strong>
          <p className="muted">Bank soal ditampilkan per paket tryout, misalnya Tryout 1, Tryout 2, dan Tryout 3. Idealnya setiap tryout berisi 40 soal.</p>
        </div>
        <div className="tryout-card-grid">
          {tryouts.map((tryout) => (
            <a key={tryout.id} className={`mini-tryout-card${selectedTryout?.id === tryout.id ? ' active' : ''}`} href={`/bank-soal?tryout=${tryout.id}`}>
              <span className="badge">{tryout.status}</span>
              <strong>{tryout.title}</strong>
              <small>{tryout._count.questions} soal • {tryout.durationMinutes} menit • {tryout._count.attempts} attempt</small>
            </a>
          ))}
        </div>
        {!tryouts.length ? <div className="empty-state">Belum ada tryout. Buat paket tryout terlebih dahulu pada menu Tryout.</div> : null}
      </section>

      <EditableManager
        eyebrow="Bank soal"
        title={selectedTryout ? `Kelola soal ${selectedTryout.title}` : 'Kelola soal'}
        description="Soal dapat dibuat dalam format pilihan ganda biasa, pilihan ganda kompleks, serta benar atau salah. Penilaian dapat memakai exact match atau parsial tanpa penalti."
        entityName="soal"
        endpoint="/api/questions"
        fields={fields}
        initialRows={initialRows}
        tableColumns={[
          { key: 'code', label: 'Kode soal' },
          { key: 'topicId', label: 'Topik' },
          { key: 'blueprintId', label: 'Kisi-kisi' },
          { key: 'questionType', label: 'Jenis' },
          { key: 'scoringMode', label: 'Penilaian' },
          { key: 'difficulty', label: 'Kesulitan' },
          { key: 'status', label: 'Status' },
        ]}
      />
    </div>
  );
}
