import Link from 'next/link';
import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function TryoutPage() {
  const user = await requireRole(UserRole.SISWA);
  const [tryouts, attempts] = await Promise.all([
    prisma.tryout.findMany({
      where: { status: { in: [TryoutStatus.OPEN, TryoutStatus.SCHEDULED, TryoutStatus.PAUSED] } },
      include: { _count: { select: { questions: true } } },
      orderBy: { title: 'asc' },
    }),
    prisma.attempt.findMany({
      where: { userId: user.id },
      include: { tryout: true },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <div className="stack">
      <PageHero eyebrow="Tryout" title="Daftar tryout" description="Masuk ke tryout dalam mode CBT mobile-first." />
      <div className="grid-2">
        {tryouts.map((item) => (
          <article key={item.id} className="card stack">
            <div className="item-head">
              <div>
                <strong>{item.title}</strong>
                <div className="muted">{item._count.questions} soal • {item.durationMinutes} menit</div>
              </div>
              <span className={`badge${item.status === 'PAUSED' ? ' warning' : item.status === 'OPEN' ? ' success' : ''}`}>{item.status}</span>
            </div>
            <p className="muted">{item.description || 'Tanpa deskripsi.'}</p>
            <div className="inline-group">
              <Link className="button" href={`/tryout/${item.id}`}>Masuk Tryout</Link>
            </div>
          </article>
        ))}
      </div>
      <section className="card stack">
        <strong>Riwayat singkat</strong>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Tryout</th><th>Mulai</th><th>Skor</th><th>Status</th></tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.tryout.title}</td>
                  <td>{attempt.startedAt.toLocaleString('id-ID')}</td>
                  <td>{attempt.score.toFixed(0)}</td>
                  <td>{attempt.submittedAt ? 'Selesai' : 'Berjalan'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
