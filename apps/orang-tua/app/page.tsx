import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';

export default async function Page() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    include: {
      student: {
        include: { attempts: { orderBy: { startedAt: 'desc' }, take: 1 } },
      },
    },
  });

  const totalAttempts = links.reduce((sum, link) => sum + link.student.attempts.length, 0);
  const latestScore = links[0]?.student.attempts[0]?.score ?? null;

  const stats = [
    { label: 'Anak terhubung', value: String(links.length), note: 'Data siswa yang dapat dipantau.', badge: 'Link' },
    { label: 'Tryout terbaru', value: String(totalAttempts), note: 'Riwayat singkat siswa.', badge: 'Hasil' },
    { label: 'Skor terbaru', value: latestScore !== null ? latestScore.toFixed(0) : '-', note: 'Skor tryout terakhir anak.', badge: 'Skor' },
    { label: 'Portal', value: 'Aktif', note: 'Akses monitoring orang tua siap dipakai.', badge: 'Status' },
  ];

  return (
    <div className="stack">
      <PageHero eyebrow="Orang tua" title={`Pantau belajar anak, ${user.fullName}`} description="Lihat progres, hasil tryout, dan catatan aktivitas belajar anak." />
      <StatGrid items={stats} />
    </div>
  );
}
