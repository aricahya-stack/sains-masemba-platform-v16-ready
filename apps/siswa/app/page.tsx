import type { CSSProperties } from 'react';
import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Lightbulb,
  PlayCircle,
} from 'lucide-react';
import {
  DashboardChart,
  DashboardHero,
  NeumorphicCard,
  QuickActions,
  RecentActivity,
} from '@sh/ui';

export default async function Page() {
  const user = await requireRole(UserRole.SISWA);
  const [materials, openTryouts, attempts, recentAttempts, practiceAttempts] = await Promise.all([
    prisma.material.count({ where: { status: 'PUBLISHED' } }),
    prisma.tryout.count({ where: { status: { in: [TryoutStatus.OPEN, TryoutStatus.SCHEDULED, TryoutStatus.PAUSED] } } }),
    prisma.attempt.count({ where: { userId: user.id } }),
    prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: { score: true, startedAt: true, submittedAt: true, tryout: { select: { title: true } } },
    }),
    prisma.practiceAttempt.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { score: true, updatedAt: true, topic: { select: { title: true } } },
    }),
  ]);

  const latestScore = recentAttempts[0]?.score ?? null;
  const averageScore = recentAttempts.length
    ? Math.round(recentAttempts.reduce((sum, item) => sum + item.score, 0) / recentAttempts.length)
    : 0;
  const chartData = practiceAttempts.length
    ? practiceAttempts.slice().reverse().map((item, index) => ({
        label: `L${index + 1}`,
        value: Math.round(item.score),
        target: 75,
      }))
    : [
        { label: 'L1', value: 0, target: 75 },
        { label: 'L2', value: 0, target: 75 },
        { label: 'L3', value: 0, target: 75 },
        { label: 'L4', value: 0, target: 75 },
        { label: 'L5', value: 0, target: 75 },
        { label: 'L6', value: 0, target: 75 },
      ];

  const activityItems = recentAttempts.length
    ? recentAttempts.map((item, index) => ({
        title: item.submittedAt ? 'Tryout selesai' : 'Tryout dimulai',
        detail: `${item.tryout.title} • skor ${Math.round(item.score)}`,
        actor: user.fullName,
        time: item.startedAt.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        icon: item.submittedAt ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />,
        tone: item.submittedAt ? ('mint' as const) : index % 2 ? ('lavender' as const) : ('blue' as const),
      }))
    : [{ title: 'Belum ada tryout', detail: 'Pilih tryout aktif untuk mulai mengerjakan.', actor: user.fullName, time: 'Sekarang', icon: <GraduationCap size={18} />, tone: 'blue' as const }];

  const actions = [
    { title: 'Belajar materi', description: 'Baca ringkasan, contoh, dan pembahasan topik IPA.', icon: <BookOpen size={23} />, href: '/belajar' },
    { title: 'Latihan soal', description: 'Kerjakan latihan terarah pada setiap topik.', icon: <ClipboardCheck size={23} />, href: '/latihan' },
    { title: 'Mulai tryout', description: 'Masuk ke mode ujian CBT yang tersedia.', icon: <PlayCircle size={23} />, href: '/tryout' },
    { title: 'Lihat hasil', description: 'Tinjau nilai dan riwayat pengerjaan kamu.', icon: <BarChart3 size={23} />, href: '/hasil' },
    { title: 'Pembahasan', description: 'Pelajari kembali soal dan pembahasannya.', icon: <Lightbulb size={23} />, href: '/pembahasan' },
  ];

  return (
    <div className="dashboard-v17">
      <DashboardHero
        eyebrow="Portal Siswa"
        title={`Halo, ${user.fullName}`}
        description="Lanjutkan belajar, kerjakan latihan, dan pantau peningkatan hasilmu dalam satu dashboard."
        badge={openTryouts > 0 ? `${openTryouts} tryout tersedia` : 'Belajar konsisten'}
        action={
          <a href="/tryout" className="inline-flex min-h-13 items-center gap-3 rounded-2xl bg-[#6C8EF5] px-5 py-3 font-extrabold text-white shadow-[6px_6px_13px_#c5c8ce,-6px_-6px_13px_#ffffff] transition-transform hover:-translate-y-0.5">
            <PlayCircle size={21} /> Mulai tryout
          </a>
        }
      />

      <section className="dashboard-kpis" aria-label="Indikator belajar siswa">
        <NeumorphicCard title="Materi tersedia" value={String(materials)} icon={<BookOpen size={23} />} trend={{ direction: 'up', value: 'Siap', label: 'dipelajari' }} />
        <NeumorphicCard title="Tryout aktif" value={String(openTryouts)} icon={<Clock3 size={23} />} trend={{ direction: openTryouts > 0 ? 'up' : 'down', value: openTryouts > 0 ? 'Tersedia' : 'Belum ada', label: 'saat ini' }} />
        <NeumorphicCard title="Tryout dikerjakan" value={String(attempts)} icon={<ClipboardCheck size={23} />} trend={{ direction: 'up', value: `${recentAttempts.length} terbaru`, label: 'ditampilkan' }} />
        <NeumorphicCard title="Skor terakhir" value={latestScore !== null ? String(Math.round(latestScore)) : '-'} icon={<GraduationCap size={23} />} trend={{ direction: averageScore >= 75 ? 'up' : 'down', value: `${averageScore}`, label: 'rata-rata terbaru' }} />
      </section>

      <div className="dashboard-main-grid">
        <DashboardChart data={chartData} title="Perkembangan latihan" subtitle="Nilai latihan terbaru dibanding target 75" />
        <section className="dashboard-side-card" aria-label="Rata-rata nilai terbaru">
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-[#6C8EF5]">Performa belajar</p>
          <h2 className="mt-2 mb-0 text-xl font-black tracking-tight text-slate-900">Rata-rata nilai terbaru</h2>
          <div className="dashboard-side-metric" style={{ '--progress': `${Math.min(100, averageScore)}%` } as CSSProperties}>
            <span><strong>{averageScore}</strong><small>dari 100</small></span>
          </div>
          <div className="dashboard-soft-list">
            <div><span>Target nilai</span><strong>75</strong></div>
            <div><span>Latihan tercatat</span><strong>{practiceAttempts.length}</strong></div>
            <div><span>Status</span><strong>{averageScore >= 75 ? 'Tercapai' : 'Berproses'}</strong></div>
          </div>
        </section>
      </div>

      <QuickActions items={actions} title="Akses belajar" />
      <RecentActivity items={activityItems} title="Riwayat tryout" />
    </div>
  );
}
