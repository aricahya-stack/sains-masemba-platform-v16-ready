import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';

export default async function Page() {
  const user = await requireRole(UserRole.SISWA);
  const [materials, openTryouts, attempts] = await Promise.all([
    prisma.material.count({ where: { status: 'PUBLISHED' } }),
    prisma.tryout.count({ where: { status: { in: [TryoutStatus.OPEN, TryoutStatus.SCHEDULED, TryoutStatus.PAUSED] } } }),
    prisma.attempt.findMany({ where: { userId: user.id }, orderBy: { startedAt: 'desc' }, take: 1 }),
  ]);

  const stats = [
    { label: 'Materi tersedia', value: String(materials), note: 'Ringkasan materi dan contoh soal.', badge: 'Belajar' },
    { label: 'Tryout aktif', value: String(openTryouts), note: 'Siap dikerjakan dalam mode CBT.', badge: 'Ujian' },
    { label: 'Tryout dikerjakan', value: String(await prisma.attempt.count({ where: { userId: user.id } })), note: 'Riwayat pengerjaan kamu.', badge: 'Riwayat' },
    { label: 'Skor terakhir', value: attempts[0] ? attempts[0].score.toFixed(0) : '-', note: 'Skor akan muncul setelah submit.', badge: 'Hasil' },
  ];

  return (
    <div className="stack">
      <PageHero eyebrow="Siswa" title={`Halo, ${user.fullName}`} description="Belajar materi, latihan soal, lalu masuk ke mode ujian CBT saat tryout." />
      <StatGrid items={stats} />
      <section className="card stack">
        <strong>Catatan mode tryout</strong>
        <div className="notice">Saat masuk tryout, sistem memantau perpindahan tab, memblok copy/paste, dan mencatat pelanggaran.</div>
      </section>
    </div>
  );
}
