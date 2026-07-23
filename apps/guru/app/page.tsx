import type { CSSProperties } from 'react';
import { prisma, PublishStatus, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  BookOpenCheck,
  ClipboardList,
  FileQuestion,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  MonitorCog,
  PencilRuler,
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
  const user = await requireRole(UserRole.GURU);
  const [
    materials,
    publishedMaterials,
    tips,
    practiceQuestions,
    tryoutQuestions,
    tryouts,
    attempts,
    recentMaterials,
  ] = await Promise.all([
    prisma.material.count(),
    prisma.material.count({ where: { status: PublishStatus.PUBLISHED } }),
    prisma.tkadTip.count(),
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
    prisma.tryout.count({ where: { author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } } } }),
    prisma.attempt.count({ where: { tryout: { author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } } } } }),
    prisma.material.findMany({ orderBy: { updatedAt: 'desc' }, take: 4, select: { title: true, status: true, updatedAt: true, topic: { select: { title: true } } } }),
  ]);

  const publicationRate = materials > 0 ? Math.round((publishedMaterials / materials) * 100) : 0;
  const chartData = [
    { label: 'Materi', value: materials, target: Math.max(materials, 10) },
    { label: 'Terbit', value: publishedMaterials, target: Math.max(materials, 10) },
    { label: 'Latihan', value: practiceQuestions, target: Math.max(practiceQuestions, 30) },
    { label: 'Tryout', value: tryoutQuestions, target: Math.max(tryoutQuestions, 30) },
    { label: 'Jadwal', value: tryouts, target: Math.max(tryouts, 5) },
    { label: 'Pengerjaan', value: attempts, target: Math.max(attempts, 25) },
  ];

  const activityItems = recentMaterials.length
    ? recentMaterials.map((item, index) => ({
        title: item.status === PublishStatus.PUBLISHED ? 'Materi diterbitkan' : 'Materi diperbarui',
        detail: `${item.title} • ${item.topic.title}`,
        actor: user.fullName,
        time: item.updatedAt.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        icon: index % 2 === 0 ? <BookOpenCheck size={18} /> : <PencilRuler size={18} />,
        tone: item.status === PublishStatus.PUBLISHED ? ('mint' as const) : ('blue' as const),
      }))
    : [{ title: 'Mulai membuat materi', detail: 'Belum ada aktivitas materi.', actor: user.fullName, time: 'Sekarang', icon: <BookOpenCheck size={18} />, tone: 'blue' as const }];

  const actions = [
    { title: 'Topik & Materi', description: 'Edit materi, tujuan pembelajaran, LaTeX, dan media.', icon: <BookOpenCheck size={23} />, href: '/belajar' },
    { title: 'Latihan', description: 'Kelola soal latihan yang tampil pada materi siswa.', icon: <PencilRuler size={23} />, href: '/latihan' },
    { title: 'Tips TKAD', description: 'Susun strategi dan tips belajar yang siap dipublikasikan.', icon: <Lightbulb size={23} />, href: '/tips-tkad' },
    { title: 'Konten Tryout', description: 'Edit kisi-kisi dan bank soal tryout dalam satu tabel.', icon: <FileQuestion size={23} />, href: '/tryout' },
    { title: 'Mapping Tryout', description: 'Atur paket 30 soal, durasi, status, dan jadwal.', icon: <ClipboardList size={23} />, href: '/mapping-tryout' },
    { title: 'Monitoring', description: 'Pantau aktivitas dan progres pengerjaan siswa.', icon: <MonitorCog size={23} />, href: '/monitoring-tryout' },
  ];

  return (
    <div className="dashboard-v17">
      <DashboardHero
        eyebrow="Portal Guru"
        title={`Selamat datang, ${user.fullName}`}
        description="Kelola pembelajaran, latihan, konten tryout, dan progres siswa dari satu ruang kerja yang lebih fokus."
        badge={`${publishedMaterials} materi terbit`}
        action={
          <div className="grid min-w-48 grid-cols-[auto_1fr] items-center gap-3 rounded-2xl bg-[#EEF0F5] p-4 shadow-[inset_3px_3px_7px_#c5c8ce,inset_-3px_-3px_7px_#ffffff]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#7EDCB5] text-white"><FlaskConical size={22} /></span>
            <span><strong className="block text-xl text-slate-900">{publicationRate}%</strong><small className="text-slate-500">materi dipublikasikan</small></span>
          </div>
        }
      />

      <section className="dashboard-kpis" aria-label="Indikator utama guru">
        <NeumorphicCard title="Materi tersimpan" value={String(materials)} icon={<BookOpenCheck size={23} />} trend={{ direction: 'up', value: `${publishedMaterials} terbit`, label: 'siap belajar' }} />
        <NeumorphicCard title="Soal latihan" value={String(practiceQuestions)} icon={<PencilRuler size={23} />} trend={{ direction: 'up', value: 'Terintegrasi', label: 'dengan materi' }} />
        <NeumorphicCard title="Soal tryout" value={String(tryoutQuestions)} icon={<FileQuestion size={23} />} trend={{ direction: 'up', value: `${tryouts} jadwal`, label: 'tersedia' }} />
        <NeumorphicCard title="Pengerjaan siswa" value={String(attempts)} icon={<Users size={23} />} trend={{ direction: 'up', value: `${tips} tips`, label: 'TKAD tersimpan' }} />
      </section>

      <div className="dashboard-main-grid">
        <DashboardChart data={chartData} title="Ringkasan konten dan aktivitas" subtitle="Volume konten, jadwal, dan pengerjaan siswa" />
        <section className="dashboard-side-card" aria-label="Progres publikasi materi">
          <p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-[#6C8EF5]">Progres materi</p>
          <h2 className="mt-2 mb-0 text-xl font-black tracking-tight text-slate-900">Kesiapan pembelajaran</h2>
          <div className="dashboard-side-metric" style={{ '--progress': `${publicationRate}%` } as CSSProperties}>
            <span><strong>{publicationRate}%</strong><small>dipublikasikan</small></span>
          </div>
          <div className="dashboard-soft-list">
            <div><span>Materi terbit</span><strong>{publishedMaterials}</strong></div>
            <div><span>Materi draft</span><strong>{Math.max(0, materials - publishedMaterials)}</strong></div>
            <div><span>Tips TKAD</span><strong>{tips}</strong></div>
          </div>
        </section>
      </div>

      <QuickActions items={actions} title="Kelola pembelajaran" />
      <RecentActivity items={activityItems} title="Materi terbaru" />
    </div>
  );
}
