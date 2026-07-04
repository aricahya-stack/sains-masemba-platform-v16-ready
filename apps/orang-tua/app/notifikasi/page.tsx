import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';

export default async function NotifikasiPage() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const incidents = await prisma.tryoutIncident.findMany({
    where: {
      userId: {
        in: (
          await prisma.parentStudentLink.findMany({
            where: { parentId: user.id, isActive: true },
            select: { studentId: true },
          })
        ).map((item) => item.studentId),
      },
    },
    include: { tryout: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="stack">
      <PageHero eyebrow="Notifikasi" title="Catatan penting" description="Peringatan dan incident tryout anak yang tercatat di sistem." />
      <section className="card stack">
        {incidents.length === 0 ? <div className="empty-state">Belum ada notifikasi.</div> : null}
        {incidents.map((item) => (
          <div key={item.id} className="item-card">
            <strong>{item.type}</strong>
            <div className="muted">{item.tryout.title}</div>
            <div className="muted">{item.message || '-'}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
