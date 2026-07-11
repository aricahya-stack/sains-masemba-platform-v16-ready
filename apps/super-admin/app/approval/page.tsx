import { prisma, PublishStatus, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function ApprovalPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [materials, practiceQuestions, tryoutQuestions, tryouts] = await Promise.all([
    prisma.material.findMany({
      where: { status: { in: [PublishStatus.DRAFT, PublishStatus.REVIEW] } },
      include: { author: true, topic: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
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
        status: { in: [PublishStatus.DRAFT, PublishStatus.REVIEW] },
      },
      include: { author: true, topic: true },
      orderBy: { code: 'asc' },
      take: 10,
    }),
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
        status: { in: [PublishStatus.DRAFT, PublishStatus.REVIEW] },
      },
      include: { author: true, topic: true, blueprint: true },
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
        title="Review materi, latihan, konten Tryout, dan jadwal"
        description="Daftar review telah dipisahkan sesuai struktur baru. Gunakan menu terkait untuk membuka editor tabel dan memperbarui status atau isi konten."
      />
      <div className="dashboard-card-grid">
        <section className="card stack">
          <strong>Materi pending</strong>
          {materials.length === 0 ? <div className="empty-state">Tidak ada materi pending.</div> : null}
          {materials.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item.topic.title} • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
          <a className="button-secondary" href="/belajar">Buka Topik & Materi</a>
        </section>

        <section className="card stack">
          <strong>Latihan pending</strong>
          {practiceQuestions.length === 0 ? <div className="empty-state">Tidak ada latihan pending.</div> : null}
          {practiceQuestions.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.code}</strong>
              <div className="muted">{item.topic.title} • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
          <a className="button-secondary" href="/latihan">Buka Latihan</a>
        </section>

        <section className="card stack">
          <strong>Konten Tryout pending</strong>
          {tryoutQuestions.length === 0 ? <div className="empty-state">Tidak ada konten Tryout pending.</div> : null}
          {tryoutQuestions.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.code}</strong>
              <div className="muted">{item.blueprint?.testGroup || 'Tanpa kelompok'} • {item.author.fullName}</div>
              <span className="badge">{item.status}</span>
            </div>
          ))}
          <a className="button-secondary" href="/tryout">Buka Konten Tryout</a>
        </section>

        <section className="card stack">
          <strong>Jadwal Tryout</strong>
          {tryouts.length === 0 ? <div className="empty-state">Tidak ada jadwal pending.</div> : null}
          {tryouts.map((item) => (
            <div key={item.id} className="item-card">
              <strong>{item.title}</strong>
              <div className="muted">{item._count.questions}/30 soal • {item.author.fullName}</div>
              <span className={item._count.questions === 30 ? 'badge success' : 'badge warning'}>{item.status}</span>
            </div>
          ))}
          <a className="button-secondary" href="/mapping-tryout">Buka Mapping Tryout</a>
        </section>
      </div>
    </div>
  );
}
