import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

type StudentRow = { id: string; fullName: string; className: string | null };

function formatScore(score: number) {
  const rounded = Math.round(Number(score) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.?0+$/, '');
}

export default async function NilaiTryoutOrangTuaPage({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const user = await requireRole(UserRole.ORANG_TUA);
  const params = await searchParams;

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    select: {
      student: {
        select: { id: true, fullName: true, className: true },
      },
    },
    orderBy: { student: { fullName: 'asc' } },
  });

  const students: StudentRow[] = links.map((link) => link.student);
  const classes: string[] = [...new Set<string>(students.map((student) => student.className?.trim()).filter((value): value is string => Boolean(value)))];
  const selectedClass = params.kelas && classes.includes(params.kelas) ? params.kelas : '';
  const selectedStudents = selectedClass ? students.filter((student) => student.className?.trim() === selectedClass) : [];
  const studentIds = selectedStudents.map((student) => student.id);

  const tryouts = studentIds.length ? await prisma.tryout.findMany({
    where: {
      attempts: {
        some: {
          userId: { in: studentIds },
          submittedAt: { not: null },
        },
      },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      attempts: {
        where: {
          userId: { in: studentIds },
          submittedAt: { not: null },
        },
        select: { userId: true, score: true, startedAt: true },
        orderBy: { startedAt: 'asc' },
      },
    },
    orderBy: [{ startAt: 'asc' }, { title: 'asc' }],
  }) : [];

  const scoresByStudentTryout = new Map<string, string>();
  for (const tryout of tryouts) {
    const grouped = new Map<string, number[]>();
    for (const attempt of tryout.attempts) {
      const scores = grouped.get(attempt.userId) || [];
      scores.push(attempt.score);
      grouped.set(attempt.userId, scores);
    }
    for (const [studentId, scores] of grouped) {
      scoresByStudentTryout.set(`${studentId}:${tryout.id}`, scores.map(formatScore).join('; '));
    }
  }

  return (
    <div className="stack">
      <PageHero
        eyebrow="Monitoring • Nilai Tryout"
        title="Rekap nilai tryout anak"
        description="Pilih kelas anak untuk melihat nilai setiap tryout yang sudah dikerjakan. Jika tryout dikerjakan berulang kali, seluruh nilainya tampil berurutan dalam satu kolom, misalnya 30; 45; 65."
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
        {!links.length ? <div className="empty-state">Belum ada akun anak yang terhubung.</div> : null}
        {links.length && !classes.length ? <div className="empty-state">Anak yang terhubung belum memiliki data kelas.</div> : null}
      </section>

      {selectedClass ? (
        <section className="card stack">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Kelas {selectedClass}</div>
              <strong>{selectedStudents.length} anak terhubung • {tryouts.length} tryout dikerjakan</strong>
            </div>
            <span className="badge">Nilai berurutan per percobaan</span>
          </div>
          <div className="table-responsive class-report-table-wrap">
            <table className="data-table class-report-table tryout-score-table">
              <thead>
                <tr>
                  <th className="report-sticky report-sticky-no">No</th>
                  <th className="report-sticky report-sticky-name">Nama</th>
                  {tryouts.map((tryout) => <th key={tryout.id} title={tryout.title}>{tryout.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {selectedStudents.length ? selectedStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td className="report-sticky report-sticky-no">{index + 1}</td>
                    <td className="report-sticky report-sticky-name">{student.fullName}</td>
                    {tryouts.map((tryout) => (
                      <td className="tryout-score-cell" key={tryout.id}>{scoresByStudentTryout.get(`${student.id}:${tryout.id}`) || '-'}</td>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={Math.max(tryouts.length + 2, 2)}><div className="empty-state">Tidak ada anak terhubung pada kelas ini.</div></td></tr>
                )}
                {selectedStudents.length && !tryouts.length ? (
                  <tr><td colSpan={2}><div className="empty-state">Belum ada tryout selesai pada kelas ini.</div></td></tr>
                ) : null}
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
