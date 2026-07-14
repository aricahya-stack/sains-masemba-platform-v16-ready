import { prisma, PublishStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

type StudentRow = { id: string; fullName: string; className: string | null };

const TOPIC_COLUMN_COUNT = 30;

export default async function CeklisLatihanGuruPage({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  await requireRole(UserRole.GURU);
  const params = await searchParams;

  const students: StudentRow[] = await prisma.user.findMany({
    where: { role: UserRole.SISWA },
    select: { id: true, fullName: true, className: true },
    orderBy: [{ className: 'asc' }, { fullName: 'asc' }],
  });

  const classes: string[] = [...new Set<string>(students.map((student) => student.className?.trim()).filter((value): value is string => Boolean(value)))];
  const selectedClass = params.kelas && classes.includes(params.kelas) ? params.kelas : '';
  const selectedStudents = selectedClass ? students.filter((student) => student.className?.trim() === selectedClass) : [];

  const topics = selectedClass ? await prisma.topic.findMany({
    where: {
      OR: [
        { materials: { some: { status: PublishStatus.PUBLISHED } } },
        {
          questions: {
            some: {
              status: PublishStatus.PUBLISHED,
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
          },
        },
      ],
    },
    select: { id: true, title: true },
    orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
    take: TOPIC_COLUMN_COUNT,
  }) : [];

  const completedAttempts = selectedStudents.length && topics.length ? await prisma.practiceAttempt.findMany({
    where: {
      userId: { in: selectedStudents.map((student) => student.id) },
      topicId: { in: topics.map((topic) => topic.id) },
      completedAt: { not: null },
    },
    select: { userId: true, topicId: true },
  }) : [];

  const completedKeys = new Set(completedAttempts.map((attempt) => `${attempt.userId}:${attempt.topicId}`));
  const topicColumns = Array.from({ length: TOPIC_COLUMN_COUNT }, (_, index) => ({ index, topic: topics[index] || null }));

  return (
    <div className="stack">
      <PageHero
        eyebrow="Konten • Ceklis Latihan"
        title="Ceklis penyelesaian latihan per kelas"
        description="Pilih kelas untuk melihat siswa yang telah menyelesaikan latihan pada Topik 1 sampai Topik 30. Centang hijau menandakan seluruh soal latihan pada topik tersebut sudah dijawab."
      />

      <section className="card stack">
        <form className="class-report-filter" method="get">
          <label className="field">
            <span>Kelas</span>
            <select className="select" name="kelas" defaultValue={selectedClass} required>
              <option value="" disabled>Pilih kelas</option>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
          <button className="button" type="submit">Tampilkan</button>
        </form>
        {!classes.length ? <div className="empty-state">Belum ada siswa yang memiliki data kelas.</div> : null}
      </section>

      {selectedClass ? (
        <section className="card stack">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Kelas {selectedClass}</div>
              <strong>{selectedStudents.length} siswa</strong>
            </div>
            <span className="badge success">✓ Latihan selesai</span>
          </div>
          <div className="table-responsive class-report-table-wrap">
            <table className="data-table class-report-table practice-checklist-table">
              <thead>
                <tr>
                  <th className="report-sticky report-sticky-no">No</th>
                  <th className="report-sticky report-sticky-name">Nama</th>
                  {topicColumns.map(({ index, topic }) => (
                    <th key={index} title={topic?.title || 'Topik belum tersedia'}>
                      <span className="report-column-label">Topik {index + 1}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedStudents.length ? selectedStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td className="report-sticky report-sticky-no">{index + 1}</td>
                    <td className="report-sticky report-sticky-name">{student.fullName}</td>
                    {topicColumns.map(({ index: topicIndex, topic }) => {
                      const completed = Boolean(topic && completedKeys.has(`${student.id}:${topic.id}`));
                      return (
                        <td key={topicIndex} title={topic?.title || 'Topik belum tersedia'}>
                          {completed ? <span className="practice-check" aria-label="Selesai" title="Selesai">✓</span> : <span className="report-empty-value">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr><td colSpan={TOPIC_COLUMN_COUNT + 2}><div className="empty-state">Tidak ada siswa pada kelas ini.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : classes.length ? (
        <div className="empty-state">Pilih kelas terlebih dahulu. Tabel akan muncul setelah kelas dipilih.</div>
      ) : null}
    </div>
  );
}
