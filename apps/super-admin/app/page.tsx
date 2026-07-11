import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { BadgeCheck, BookOpenText, ClipboardList, FileSpreadsheet, MonitorCog, PencilRuler, Settings2, ShieldCheck, Users } from 'lucide-react';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';
import { Timeline } from '../components/timeline';

export default async function Page() {
  await requireRole(UserRole.SUPER_ADMIN);

  const [users, teachers, students, parents, materials, practiceQuestions, tryoutQuestions, tryouts, tryoutGroupRows, incidents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.GURU } }),
    prisma.user.count({ where: { role: UserRole.SISWA } }),
    prisma.user.count({ where: { role: UserRole.ORANG_TUA } }),
    prisma.material.count(),
    prisma.question.count({ where: {
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
      } }),
    prisma.question.count({ where: {
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
      } }),
    prisma.tryout.count(),
    prisma.question.findMany({ where: { blueprint: { is: { testGroup: { not: null } } } }, select: { authorId: true, blueprint: { select: { testGroup: true } } } }),
    prisma.tryoutIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { tryout: true } }),
  ]);

  const groupTotals = new Map<string, number>();
  for (const row of tryoutGroupRows) {
    const groupName = row.blueprint?.testGroup;
    if (!groupName) continue;
    const key = `${row.authorId}::${groupName}`;
    groupTotals.set(key, (groupTotals.get(key) || 0) + 1);
  }
  const completeGroups = Array.from(groupTotals.values()).filter((count) => count === 30).length;
  const stats = [
    { label: 'Total user', value: String(users), note: `${teachers} guru • ${students} siswa • ${parents} orang tua`, badge: 'User' },
    { label: 'Topik & materi', value: String(materials), note: 'Materi seluruh guru, termasuk draft dan publikasi.', badge: 'Konten' },
    { label: 'Soal latihan', value: String(practiceQuestions), note: 'Soal yang tampil di dalam materi belajar.', badge: 'Latihan' },
    { label: 'Soal Tryout', value: String(tryoutQuestions), note: `${completeGroups} kelompok memiliki tepat 30 soal.`, badge: 'Ujian' },
    { label: 'Jadwal Tryout', value: String(tryouts), note: 'Jadwal hasil Mapping Tryout lintas guru.', badge: 'CBT' },
  ];

  const timelineItems = incidents.length
    ? incidents.map((item) => ({
        title: item.type,
        subtitle: `${item.tryout.title}${item.message ? ` • ${item.message}` : ''}`,
        time: item.createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }))
    : [{ title: 'Sistem siap', subtitle: 'Belum ada insiden terbaru.', time: '-' }];

  const actions = [
    { title: 'Manajemen user', text: 'Kelola akun guru, siswa, orang tua, dan Super Admin.', icon: Users, href: '/users' },
    { title: 'Topik & materi', text: 'Edit seluruh topik dan materi langsung dalam tabel WYSIWYG.', icon: BookOpenText, href: '/belajar' },
    { title: 'Konten Tryout', text: 'Kelola kisi-kisi dan soal Tryout dalam satu tabel.', icon: ClipboardList, href: '/tryout' },
    { title: 'Mapping Tryout', text: 'Jadwalkan paket yang sudah memiliki tepat 30 soal.', icon: PencilRuler, href: '/mapping-tryout' },
    { title: 'Approval konten', text: 'Pantau materi, latihan, konten Tryout, dan jadwal yang belum final.', icon: BadgeCheck, href: '/approval' },
    { title: 'Import Excel', text: 'Import materi, latihan, serta kisi-kisi dan soal Tryout.', icon: FileSpreadsheet, href: '/imports' },
    { title: 'Monitoring Tryout', text: 'Lihat pengerjaan siswa dan warning ujian terbaru.', icon: MonitorCog, href: '/monitoring' },
    { title: 'Settings', text: 'Atur palet warna, font, dan moto global.', icon: Settings2, href: '/settings' },
  ];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Super Admin"
        title="Pusat kendali Sains Masemba"
        description="Dashboard telah diselaraskan dengan struktur Topik & Materi, Latihan, konten Tryout 30 soal, Mapping Tryout, dan monitoring ujian."
      />
      <StatGrid items={stats} />
      <div className="dashboard-card-grid admin-grid">
        {actions.map((card) => {
          const Icon = card.icon;
          return (
            <a key={card.title} href={card.href} className="dashboard-action-card">
              <span className="dashboard-icon"><Icon size={24} /></span>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </a>
          );
        })}
      </div>
      <div className="grid-2">
        <section className="card stack">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Status sistem</div>
              <strong>Kontrol lintas portal</strong>
            </div>
            <ShieldCheck size={26} />
          </div>
          <p className="muted">Super Admin dapat mengelola konten milik seluruh guru, menentukan pemilik konten, memvalidasi paket 30 soal, dan menjadwalkan Tryout tanpa Excel.</p>
          <div className="notice">Soal Latihan dan soal Tryout dipisahkan berdasarkan relasi kisi-kisi sehingga keduanya tidak tercampur pada halaman siswa.</div>
        </section>
        <section className="card stack">
          <div>
            <div className="eyebrow">Aktivitas terbaru</div>
            <strong>Jejak insiden Tryout</strong>
          </div>
          <Timeline items={timelineItems} />
        </section>
      </div>
    </div>
  );
}
