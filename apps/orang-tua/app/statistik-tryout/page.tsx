import { prisma, UserRole } from '@sh/db';
import { calculateTryoutStatistics, requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { TryoutStatisticsPanel } from '../../components/tryout-statistics-panel';

export default async function StatistikTryoutOrangTuaPage({ searchParams }: { searchParams: Promise<{ child?: string; tryout?: string }> }) {
  const user = await requireRole(UserRole.ORANG_TUA);
  const params = await searchParams;
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    include: { student: true },
    orderBy: { student: { fullName: 'asc' } },
  });
  const selectedLink = links.find((link) => link.studentId === params.child) || links[0];
  const child = selectedLink?.student;

  const tryouts = child ? await prisma.tryout.findMany({
    where: { attempts: { some: { userId: child.id, submittedAt: { not: null } } } },
    include: {
      attempts: {
        where: { submittedAt: { not: null } },
        select: { userId: true, score: true, submittedAt: true },
        orderBy: { submittedAt: 'desc' },
      },
      _count: { select: { questions: true } },
    },
    orderBy: [{ startAt: 'desc' }, { title: 'asc' }],
  }) : [];

  const selected = tryouts.find((item) => item.id === params.tryout) || tryouts[0];
  const selectedAttempts = selected?.attempts || [];
  const childAttempts = selectedAttempts.filter((attempt) => attempt.userId === child?.id);
  const childBestScore = childAttempts.length ? Math.max(...childAttempts.map((attempt) => attempt.score)) : 0;
  const statistics = calculateTryoutStatistics(selectedAttempts.map((attempt) => attempt.score));
  const participantCount = new Set(selectedAttempts.map((attempt) => attempt.userId)).size;

  return (
    <div className="stack">
      <PageHero
        eyebrow="Monitoring • Statistik Tryout"
        title="Pilih anak yang dipantau"
        description="Setelah memilih anak, statistik tetap disajikan per tryout. Anak dapat mengulang tryout dan garis vertikal merah menunjukkan nilai maksimalnya pada tryout terpilih."
      />
      <section className="card stack">
        {links.length ? (
          <form className="parent-stat-filter" method="get">
            <label className="field">
              <span>Anak</span>
              <select className="select" name="child" defaultValue={child?.id || ''}>
                {links.map((link) => <option key={link.id} value={link.studentId}>{link.student.fullName} • {link.student.className || 'Tanpa kelas'}</option>)}
              </select>
            </label>
            <button className="button" type="submit">Pilih anak</button>
          </form>
        ) : <div className="empty-state">Belum ada akun anak yang terhubung.</div>}
      </section>

      {child ? (
        <TryoutStatisticsPanel
          eyebrow="Statistik per tryout"
          title={`Distribusi nilai ${child.fullName}`}
          description="Distribusi menggunakan seluruh percobaan selesai pada tryout terpilih. Penanda individual menunjukkan nilai maksimal anak dari seluruh percobaannya."
          tryouts={tryouts.map((item) => ({ id: item.id, title: item.title, subtitle: `${item._count.questions} soal • ${item.attempts.length} percobaan selesai` }))}
          selectedTryoutId={selected?.id || ''}
          statistics={statistics}
          participantCount={participantCount}
          marker={childAttempts.length ? { label: `Nilai maksimal ${child.fullName}`, score: childBestScore } : null}
          individualSummary={childAttempts.length ? { label: child.fullName, attemptCount: childAttempts.length, bestScore: childBestScore } : null}
          preservedParams={{ child: child.id }}
          emptyTryoutMessage={`${child.fullName} belum menyelesaikan tryout.`}
        />
      ) : null}
    </div>
  );
}
