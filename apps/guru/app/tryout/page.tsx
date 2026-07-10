import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function TryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const [questions, tryouts] = await Promise.all([
    prisma.question.findMany({ where: { authorId: user.id }, orderBy: { code: 'asc' } }),
    prisma.tryout.findMany({
      where: { authorId: user.id },
      include: { questions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
      orderBy: { title: 'asc' },
    }),
  ]);

  const fields: FieldDef[] = [
    { name: 'title', label: 'Judul tryout' },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
    { name: 'durationMinutes', label: 'Durasi (menit)' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    { name: 'startAt', label: 'Mulai (ISO datetime)' },
    { name: 'endAt', label: 'Selesai (ISO datetime)' },
    { name: 'questionCodes', label: 'Kode soal (pisahkan dengan koma atau baris baru)', type: 'textarea' },
    { name: 'rulesHtml', label: 'Aturan ujian', type: 'richtext' },
  ];

  const initialRows = tryouts.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    durationMinutes: String(item.durationMinutes),
    status: item.status,
    startAt: item.startAt ? item.startAt.toISOString().slice(0, 16) : '',
    endAt: item.endAt ? item.endAt.toISOString().slice(0, 16) : '',
    questionCodes: item.questions.map((row) => row.question.code).join('\n'),
    questionCount: String(item.questions.length),
    rulesHtml: item.rulesHtml || '',
  }));

  return (
    <div className="stack">
      <EditableManager
        eyebrow="Tryout"
        title="Rakit dan jadwalkan tryout"
        description="Pilih bank soal berdasarkan kode, lalu atur jadwal dan status sesi tryout."
        entityName="tryout"
        endpoint="/api/tryouts"
        fields={fields}
        initialRows={initialRows}
        tableColumns={[
          { key: 'title', label: 'Judul tryout' },
          { key: 'durationMinutes', label: 'Durasi' },
          { key: 'questionCount', label: 'Jumlah soal' },
          { key: 'status', label: 'Status' },
          { key: 'startAt', label: 'Mulai' },
        ]}
      />
      <section className="card stack">
        <strong>Bank soal tersedia</strong>
        <div className="muted">Masukkan kode soal berikut ke kolom daftar soal pada tryout.</div>
        <div className="inline-group">
          {questions.map((question) => (
            <span className="badge" key={question.id}>{question.code}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
