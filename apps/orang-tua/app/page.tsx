import type { CSSProperties } from 'react';
import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  BarChart3,
  BellRing,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  LineChart,
  UserRoundCheck,
} from 'lucide-react';
import {
  DashboardChart,
  DashboardHero,
  NeumorphicCard,
  QuickActions,
  RecentActivity,
} from '@sh/ui';

export default async function Page() {
  const user = await requireRole(UserRole.ORANG_TUA);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: user.id, isActive: true },
    include: {
      student: {
        include: {
          attempts: {
            orderBy: { startedAt: 'desc' },
            take: 6,
            include: { tryout: { select: { title: true } } },
          },
        },
      },
    },
  });

  const allAttempts = links.flatMap((link) =>
    link.student.attempts.map((attempt) => ({ ...attempt, studentName: link.student.fullName })),
  ).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const latestScore = allAttempts[0]?.score ?? null;
  const averageScore = allAttempts.length
    ? Math.round(allAttempts.reduce((sum, item) => sum + item.score, 0) / allAttempts.length)
    : 0;
  const completedAttempts = allAttempts.filter((item) => item.submittedAt).length;

  const chartData = allAttempts.length
    ? allAttempts.slice(0, 6).reverse().map((item, index) => ({ label: `T${index + 1}`, value: Math.round(item.score), target: 75 }))
    : [
        { label: 'T1', value: 0, target: 75 },
        { label: 'T2', value: 0, target: 75 },
        { label: 'T3', value: 0, target: 75 },
        { label: 'T4', value: 0, target: 75 },
        { label: 'T5', value: 0, target: 75 },
        { label: 'T6', value: 0, target: 75 },
      ];

  const activityItems = allAttempts.length
    ? allAttempts.slice(0, 5).map((item, index) => ({
        title: item.submittedAt ? 'Tryout selesai' : 'Tryout berlangsung',
        detail: `${item.tryout.title} • skor ${Math.round(item.score)}`,
        actor: item.studentName,
        time: item.startedAt.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        icon: item.submittedAt ? <CheckCircle2 size={18} /> : <GraduationCap size={18} />,
        tone: item.submittedAt ? ('mint' as const) : index % 2 ? ('lavender' as const) : ('blue' as const),
      }))
    : [{ title: 'Belum ada aktivitas', detail: 'Aktivitas tryout anak akan muncul di sini.', actor: 'Sains Masemba', time: 'Sekarang', icon: <HeartHandshake size={18} />, tone: 'blue' as const }];

  const actions = [
    { title: 'Pantau anak', description: 'Lihat akun siswa yang terhubung dengan Anda.', icon: <UserRoundCheck size={23} />, href: '/pantau-anak' },
    { title: 'Progres belajar', description: 'Tinjau perkembangan belajar dan latihan anak.', icon: <LineChart size={23} />, href: '/progres' },
    { title: 'Hasil tryout', description: 'Periksa nilai dan riwayat tryout terbaru.', icon: <BarChart3 size={23} />, href: '/hasil-tryout' },
    { title: 'Notifikasi', description: 'Baca pembaruan penting terkait aktivitas anak.', icon: <BellRing size={23} />, href: '/notifikasi' },
  ];

  return (
    <div className="dashboard-v17">
      <DashboardHero
        eyebrow="Portal Orang Tua"
        title={`Pantau belajar anak, ${user.fullName}`}
        description="Lihat progres, hasil tryout, dan aktivitas anak melalui ringkasan yang lebih mudah dipahami."
        badge={`${links.length} anak terhubung`}
        action={
          <div className="grid min-w-48 grid-cols-[auto_1fr] items-center gap-3 rounded-2xl bg-[#EEF0F5] p-4 shadow-[inset_3px_3px_7px_#c5c8ce,inset_-3px_-3px_7px_#ffffff]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#7EDCB5] text-white"><HeartHandshake size={22} /></span>
            <span><strong className="block text-xl text-slate-900">{averageScore}</strong><small className="text-slate-500">rata-rata nilai</small></span>
          </div>
        }
      />

      <section className="dashboard-kpis" aria-label="Indikator monitoring orang tua">
        <NeumorphicCard title="Anak terhubung" value={String(links.length)} icon={<UserRoundCheck size={23} />} trend={{ direction: 'up', value: 'Aktif', label: 'dapat dipantau' }} />
        <NeumorphicCard title="Aktivitas tryout" value={String(allAttempts.length)} icon={<GraduationCap size={23} />} trend={{ direction: 'up', value: `${completedAttempts} selesai`, label: 'tercatat' }} />
        <NeumorphicCard title="Skor terbaru" value={latestScore !== null ? String(Math.round(latestScore)) : '-'} icon={<BarChart3 size={23} />} trend={{ direction: latestScore !== null && latestScore >= 75 ? 'up' : 'down', value: latestScore !== null ? `${Math.round(latestScore)}` : 'Belum ada', label: 'nilai terakhir' }} />
        <NeumorphicCard title="Rata-rata nilai" value={String(averageScore)} icon={<LineChart size={23} />} trend={{ direction: averageScore >= 75 ? 'up' : 'down', value: averageScore >= 75 ? 'Target tercapai' : 'Perlu dukungan', label: 'target 75' }} />
      </section>

      <div className="dashboard-main-grid">
        <DashboardChart data={chartData} title="Perkembangan hasil anak" subtitle="Enam aktivitas tryout terakhir dibanding target 75" />
        <section className="dashboard-side-card" aria-label="Ringkasan perkembangan anak">
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-[#6C8EF5]">Ringkasan perkembangan</p>
          <h2 className="mt-2 mb-0 text-xl font-black tracking-tight text-slate-900">Capaian rata-rata</h2>
          <div className="dashboard-side-metric" style={{ '--progress': `${Math.min(100, averageScore)}%` } as CSSProperties}>
            <span><strong>{averageScore}</strong><small>dari 100</small></span>
          </div>
          <div className="dashboard-soft-list">
            <div><span>Target nilai</span><strong>75</strong></div>
            <div><span>Tryout selesai</span><strong>{completedAttempts}</strong></div>
            <div><span>Status</span><strong>{averageScore >= 75 ? 'Baik' : 'Berproses'}</strong></div>
          </div>
        </section>
      </div>

      <QuickActions items={actions} title="Menu pemantauan" />
      <RecentActivity items={activityItems} title="Aktivitas anak terbaru" />
    </div>
  );
}
