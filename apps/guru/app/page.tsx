import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  BookOpenCheck,
  ClipboardList,
  FileQuestion,
  FileText,
  Lightbulb,
  MonitorCog,
  PencilRuler,
} from 'lucide-react';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';

export default async function Page() {
  const user = await requireRole(UserRole.GURU);
  const [materials, tips, practiceQuestions, tryoutQuestions, tryouts, attempts] = await Promise.all([
    prisma.material.count(),
    prisma.tkadTip.count(),
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
    prisma.tryout.count({ where: { authorId: user.id } }),
    prisma.attempt.count({ where: { tryout: { authorId: user.id } } }),
  ]);

  const stats = [
    { label: 'Materi saya', value: String(materials), note: 'Topik dan materi diedit dalam satu tabel.', badge: 'Konten' },
    { label: 'Soal latihan', value: String(practiceQuestions), note: 'Latihan tersedia di dalam materi siswa.', badge: 'Latihan' },
    { label: 'Soal tryout', value: String(tryoutQuestions), note: 'Kisi-kisi dan soal berada dalam satu tabel.', badge: 'Tryout' },
    { label: 'Jadwal tryout', value: String(tryouts), note: 'Paket 30 soal dapat dijadwalkan.', badge: 'Ujian' },
  ];

  const cards = [
    {
      title: 'Topik & Materi',
      text: 'Edit topik, materi, tujuan pembelajaran, LaTeX, dan media langsung di tabel.',
      icon: BookOpenCheck,
      href: '/belajar',
    },
    {
      title: 'Latihan',
      text: 'Kelola soal latihan yang tampil di dalam materi siswa.',
      icon: PencilRuler,
      href: '/latihan',
    },
    {
      title: 'Tips TKAD',
      text: 'Susun strategi, urutan tips, dan status publikasi untuk siswa.',
      icon: Lightbulb,
      href: '/tips-tkad',
    },
    {
      title: 'Konten Tryout',
      text: 'Edit kisi-kisi dan soal tryout langsung dalam satu tabel.',
      icon: FileQuestion,
      href: '/tryout',
    },
    {
      title: 'Mapping Tryout',
      text: 'Pilih paket 30 soal, atur durasi, status, serta jadwal pelaksanaannya.',
      icon: ClipboardList,
      href: '/mapping-tryout',
    },
  ];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Guru"
        title={`Selamat datang, ${user.fullName}`}
        description="Kelola topik dan materi, latihan, konten tryout, serta penjadwalan ujian dari satu portal."
      />
      <StatGrid items={stats} />
      <div className="dashboard-card-grid">
        {cards.map((card) => {
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
              <div className="eyebrow">Ringkasan operasional</div>
              <strong>Status kelas dan konten</strong>
            </div>
            <FileText size={24} />
          </div>
          <div className="kv-list">
            <div><strong>{materials}</strong><span> materi tersimpan</span></div>
            <div><strong>{practiceQuestions}</strong><span> soal latihan</span></div>
            <div><strong>{tryoutQuestions}</strong><span> soal tryout</span></div>
            <div><strong>{tryouts}</strong><span> jadwal tryout</span></div>
            <div><strong>{attempts}</strong><span> pengerjaan siswa</span></div>
          </div>
        </section>
        <section className="card stack">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Monitoring</div>
              <strong>Alur kerja disarankan</strong>
            </div>
            <MonitorCog size={24} />
          </div>
          <div className="notice">
            Susun topik dan materi, impor atau edit soal latihan, impor konten tryout berisi 30 soal beserta kisi-kisinya, lalu jadwalkan paket melalui Mapping Tryout.
          </div>
        </section>
      </div>
    </div>
  );
}
