import type { CSSProperties } from 'react';
import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  BadgeCheck,
  BookOpenText,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  MonitorCog,
  PencilRuler,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  DashboardChart,
  DashboardHero,
  NeumorphicCard,
  QuickActions,
  RecentActivity,
} from '@sh/ui';

export default async function Page() {
  await requireRole(UserRole.SUPER_ADMIN);

  const [
    users,
    teachers,
    students,
    parents,
    materials,
    practiceQuestions,
    tryoutQuestions,
    tryouts,
    tryoutGroupRows,
    incidents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.GURU } }),
    prisma.user.count({ where: { role: UserRole.SISWA } }),
    prisma.user.count({ where: { role: UserRole.ORANG_TUA } }),
    prisma.material.count(),
    prisma.question.count({
      where: {
        tryoutQuestions: { none: {} },
        NOT: {
          blueprint: {
            is: {
              OR: [
                { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
                { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    }),
    prisma.question.count({
      where: {
        OR: [
          { tryoutQuestions: { some: {} } },
          {
            blueprint: {
              is: {
                OR: [
                  { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
                  { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
    }),
    prisma.tryout.count(),
    prisma.question.findMany({
      where: { blueprint: { is: { testGroup: { not: null } } } },
      select: { authorId: true, blueprint: { select: { testGroup: true } } },
    }),
    prisma.tryoutIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { tryout: true },
    }),
  ]);

  const groupTotals = new Map<string, number>();
  for (const row of tryoutGroupRows) {
    const groupName = row.blueprint?.testGroup;
    if (!groupName) continue;
    const key = `${row.authorId}::${groupName}`;
    groupTotals.set(key, (groupTotals.get(key) || 0) + 1);
  }
  const completeGroups = Array.from(groupTotals.values()).filter((count) => count === 30).length;
  const totalQuestions = practiceQuestions + tryoutQuestions;
  const readiness = Math.min(100, completeGroups * 10 + (tryouts > 0 ? 20 : 0));

  const chartData = [
    { label: 'Guru', value: teachers, target: Math.max(teachers, 10) },
    { label: 'Siswa', value: students, target: Math.max(students, 25) },
    { label: 'Orang tua', value: parents, target: Math.max(parents, 20) },
    { label: 'Materi', value: materials, target: Math.max(materials, 30) },
    { label: 'Latihan', value: practiceQuestions, target: Math.max(practiceQuestions, 50) },
    { label: 'Tryout', value: tryoutQuestions, target: Math.max(tryoutQuestions, 30) },
  ];

  const activityItems = incidents.length
    ? incidents.map((item, index) => ({
        title: item.type,
        detail: `${item.tryout.title}${item.message ? ` • ${item.message}` : ''}`,
        actor: 'Monitoring CBT',
        time: item.createdAt.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        icon: index % 2 === 0 ? <MonitorCog size={18} /> : <ShieldCheck size={18} />,
        tone: index % 2 === 0 ? ('blue' as const) : ('lavender' as const),
      }))
    : [
        {
          title: 'Sistem siap',
          detail: 'Belum ada insiden tryout terbaru.',
          actor: 'Sains Masemba',
          time: 'Sekarang',
          icon: <ShieldCheck size={18} />,
          tone: 'mint' as const,
        },
      ];

  const actions = [
    { title: 'Manajemen user', description: 'Kelola akun guru, siswa, orang tua, dan Super Admin.', icon: <Users size={23} />, href: '/users' },
    { title: 'Topik & materi', description: 'Edit materi dan konten pembelajaran dalam tabel WYSIWYG.', icon: <BookOpenText size={23} />, href: '/belajar' },
    { title: 'Konten Tryout', description: 'Kelola kisi-kisi dan soal Tryout dalam satu alur.', icon: <ClipboardList size={23} />, href: '/tryout' },
    { title: 'Mapping Tryout', description: 'Jadwalkan paket yang telah memiliki tepat 30 soal.', icon: <PencilRuler size={23} />, href: '/mapping-tryout' },
    { title: 'Approval konten', description: 'Pantau materi dan jadwal yang belum final.', icon: <BadgeCheck size={23} />, href: '/approval' },
    { title: 'Import Excel', description: 'Impor materi, latihan, kisi-kisi, dan soal Tryout.', icon: <FileSpreadsheet size={23} />, href: '/imports' },
    { title: 'Monitoring', description: 'Pantau pengerjaan siswa dan peringatan ujian.', icon: <MonitorCog size={23} />, href: '/monitoring' },
    { title: 'Pengaturan', description: 'Atur tema, font, motto, dan identitas platform.', icon: <Settings2 size={23} />, href: '/settings' },
  ];

  return (
    <div className="dashboard-v17">
      <DashboardHero
        eyebrow="Super Admin"
        title="Pusat kendali Sains Masemba"
        description="Kelola pengguna, pembelajaran, tryout, dan monitoring platform melalui dashboard yang lebih ringan, konsisten, dan mudah dipindai."
        badge="Sistem aktif"
        action={
          <div className="grid min-w-48 grid-cols-[auto_1fr] items-center gap-3 rounded-2xl bg-[#EEF0F5] p-4 shadow-[inset_3px_3px_7px_#c5c8ce,inset_-3px_-3px_7px_#ffffff]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#6C8EF5] text-white"><ShieldCheck size={22} /></span>
            <span><strong className="block text-xl text-slate-900">{users}</strong><small className="text-slate-500">pengguna terdaftar</small></span>
          </div>
        }
      />

      <section className="dashboard-kpis" aria-label="Indikator utama">
        <NeumorphicCard title="Total pengguna" value={String(users)} icon={<Users size={23} />} trend={{ direction: 'up', value: `${teachers} guru`, label: `${students} siswa` }} />
        <NeumorphicCard title="Materi tersedia" value={String(materials)} icon={<BookOpenText size={23} />} trend={{ direction: 'up', value: 'Terpusat', label: 'lintas guru' }} />
        <NeumorphicCard title="Bank soal" value={String(totalQuestions)} icon={<ClipboardList size={23} />} trend={{ direction: 'up', value: `${practiceQuestions} latihan`, label: `${tryoutQuestions} tryout` }} />
        <NeumorphicCard title="Jadwal tryout" value={String(tryouts)} icon={<GraduationCap size={23} />} trend={{ direction: 'up', value: `${completeGroups} paket`, label: 'siap 30 soal' }} />
      </section>

      <div className="dashboard-main-grid">
        <DashboardChart data={chartData} title="Komposisi platform" subtitle="Perbandingan pengguna dan volume konten aktif" />
        <section className="dashboard-side-card" aria-label="Kesiapan operasional">
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-[#6C8EF5]">Kesiapan operasional</p>
          <h2 className="mt-2 mb-0 text-xl font-black tracking-tight text-slate-900">Status platform hari ini</h2>
          <div className="dashboard-side-metric" style={{ '--progress': `${readiness}%` } as CSSProperties}>
            <span><strong>{readiness}%</strong><small>kesiapan</small></span>
          </div>
          <div className="dashboard-soft-list">
            <div><span>Paket lengkap</span><strong>{completeGroups}</strong></div>
            <div><span>Orang tua</span><strong>{parents}</strong></div>
            <div><span>Insiden terbaru</span><strong>{incidents.length}</strong></div>
          </div>
        </section>
      </div>

      <QuickActions items={actions} />
      <RecentActivity items={activityItems} title="Aktivitas monitoring terbaru" />
    </div>
  );
}
