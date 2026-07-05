import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function ProgresPage() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    include: {
      student: {
        include: {
          attempts: {
            include: {
              answers: {
                include: { question: { include: { topic: true } } },
              },
            },
          },
        },
      },
    },
  });

  const rows = links.flatMap((link) => {
    const topicMap = new Map<string, { total: number; earned: number; possible: number }>();
    for (const attempt of link.student.attempts) {
      for (const answer of attempt.answers) {
        const key = answer.question.topic.title;
        const current = topicMap.get(key) || { total: 0, earned: 0, possible: 0 };
        current.total += 1;
        current.earned += answer.score || 0;
        current.possible += answer.question.maxScore || 1;
        topicMap.set(key, current);
      }
    }
    return Array.from(topicMap.entries()).map(([topic, data]) => ({
      studentName: link.student.fullName,
      topic,
      accuracy: data.possible ? Math.round((data.earned / data.possible) * 100) : 0,
      total: data.total,
    }));
  });

  return (
    <div className="stack">
      <PageHero eyebrow="Progres" title="Analisis topik" description="Akurasi anak per topik berdasarkan jawaban tryout." />
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr><th>Anak</th><th>Topik</th><th>Akurasi</th><th>Total jawaban</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.studentName}-${row.topic}-${index}`}>
                <td>{row.studentName}</td>
                <td>{row.topic}</td>
                <td>{row.accuracy}%</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
