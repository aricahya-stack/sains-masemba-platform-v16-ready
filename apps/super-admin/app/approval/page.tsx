import { prisma, PublishStatus, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function ApprovalPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [materials, questions, tryouts] = await Promise.all([
    prisma.material.findMany({
      where: { status: { in: [PublishStatus.DRAFT, PublishStatus.REVIEW] } },
      include: { author: true, topic: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.question.findMany({
      where: { status: { in: [PublishStatus.DRAFT, PublishStatus.REVIEW] } },
      include: { author: true, topic: true },
      orderBy: { code: 'asc' },
      take: 10,
    }),
    prisma.tryout.findMany({
      where: { status: { in: [TryoutStatus.DRAFT, TryoutStatus.SCHEDULED, TryoutStatus.PAUSED] } },
      include: { author: true, _count: { select: { questions: true } } },
      orderBy: { title: 'asc' },
      take: 10,
    }),
  ]);

  return (
    <div className="stack">
      <PageHero
        eyebrow="Approval"
        title="Review materi, soal, dan tryout"
        description="Versi ini menampilkan daftar item yang menunggu review. Alur approval detail bisa dikembangkan di iterasi berikutnya."
      />
      <div className="grid-3">
        <section className="card stack">
          <strong>Materi pending</strong>
          {materials.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item.topic.title} • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
        </section>
        <section className="card stack">
          <strong>Soal pending</strong>
          {questions.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.code}</strong>
              <div className="muted">{item.topic.title} • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
        </section>
        <section className="card stack">
          <strong>Tryout pending</strong>
          {tryouts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item._count.questions} soal • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
