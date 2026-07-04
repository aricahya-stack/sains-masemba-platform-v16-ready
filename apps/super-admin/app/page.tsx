import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { BadgeCheck, BookOpen, FileSpreadsheet, Radar, Settings2, ShieldCheck, Users } from 'lucide-react';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';
import { Timeline } from '../components/timeline';

export default async function Page() {
  await requireRole(UserRole.SUPER_ADMIN);

  const [users, teachers, students, parents, materials, questions, tryouts, incidents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'GURU' } }),
    prisma.user.count({ where: { role: 'SISWA' } }),
    prisma.user.count({ where: { role: 'ORANG_TUA' } }),
    prisma.material.count(),
    prisma.question.count(),
    prisma.tryout.count(),
    prisma.tryoutIncident.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { tryout: true } }),
  ]);

  const stats = [
    { label: 'Total user', value: String(users), note: `${teachers} guru • ${students} siswa • ${parents} orang tua`, badge: 'User' },
    { label: 'Total materi', value: String(materials), note: 'Materi belajar aktif dan draft.', badge: 'Konten' },
    { label: 'Bank soal', value: String(questions), note: 'Soal dapat dipakai ulang untuk tryout.', badge: 'Akademik' },
    { label: 'Tryout', value: String(tryouts), note: 'Sesi ujian dapat dipantau langsung.', badge: 'CBT' },
  ];

  const timelineItems = incidents.length
    ? incidents.map((item) => ({
        title: item.type,
        subtitle: `${item.tryout.title}${item.message ? ` • ${item.message}` : ''}`,
        time: item.createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }))
    : [{ title: 'Sistem siap', subtitle: 'Belum ada incident terbaru.', time: '-' }];

  const actions = [
    { title: 'Manajemen user', text: 'Kelola akun guru, siswa, orang tua, dan super admin.', icon: Users, href: '/users' },
    { title: 'Topik belajar', text: 'Atur topik yang menjadi dasar materi dan soal.', icon: BookOpen, href: '/topik' },
    { title: 'Approval konten', text: 'Pantau materi dan soal sebelum dipublikasikan.', icon: BadgeCheck, href: '/approval' },
    { title: 'Import Excel', text: 'Unduh template dan preview data Excel.', icon: FileSpreadsheet, href: '/imports' },
    { title: 'Monitoring', text: 'Lihat aktivitas tryout dan warning terbaru.', icon: Radar, href: '/monitoring' },
    { title: 'Settings', text: 'Atur palet warna, font, dan moto global.', icon: Settings2, href: '/settings' },
  ];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Super admin"
        title="Pusat kendali Sains Masemba"
        description="Dashboard dibuat lebih informatif dengan ringkasan user, konten, bank soal, tryout, aktivitas, dan pintasan kerja."
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
          <p className="muted">Super admin mengendalikan data pengguna, topik, approval, import, monitoring, tema global, font, dan moto aplikasi.</p>
          <div className="notice">Topbar dibuat netral. Warna utama platform diterapkan pada sidebar dan elemen aksi agar tampilan lebih fokus.</div>
        </section>
        <section className="card stack">
          <div>
            <div className="eyebrow">Aktivitas terbaru</div>
            <strong>Jejak audit singkat</strong>
          </div>
          <Timeline items={timelineItems} />
        </section>
      </div>
    </div>
  );
}
