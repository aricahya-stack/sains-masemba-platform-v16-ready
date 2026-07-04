import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { BookOpenCheck, ClipboardList, FileText, Library, ListChecks, MonitorCog } from 'lucide-react';
import { PageHero } from '../components/page-hero';
import { StatGrid } from '../components/stat-grid';

export default async function Page() {
  const user = await requireRole(UserRole.GURU);
  const [materials, questions, blueprints, tryouts, attempts] = await Promise.all([
    prisma.material.count({ where: { authorId: user.id } }),
    prisma.question.count({ where: { authorId: user.id } }),
    prisma.blueprint.count(),
    prisma.tryout.count({ where: { authorId: user.id } }),
    prisma.attempt.count({ where: { tryout: { authorId: user.id } } }),
  ]);

  const stats = [
    { label: 'Materi saya', value: String(materials), note: 'Materi dapat diedit kapan saja.', badge: 'Konten' },
    { label: 'Kisi-kisi', value: String(blueprints), note: 'Blueprint per tryout.', badge: 'Kisi' },
    { label: 'Bank soal', value: String(questions), note: 'Soal terhubung kisi-kisi.', badge: 'Soal' },
    { label: 'Tryout saya', value: String(tryouts), note: 'Sesi bisa dijeda dan dipantau.', badge: 'CBT' },
  ];

  const cards = [
    { title: 'Susun materi', text: 'Buat materi ringkas, tambahkan LaTeX, gambar, dan tujuan pembelajaran.', icon: BookOpenCheck, href: '/materi' },
    { title: 'Buat kisi-kisi', text: 'Petakan indikator berdasarkan Tryout 1, Tryout 2, atau paket lain.', icon: ListChecks, href: '/kisi-kisi' },
    { title: 'Kelola bank soal', text: 'Masukkan soal per paket tryout, lengkap dengan opsi dan pembahasan.', icon: Library, href: '/bank-soal' },
    { title: 'Rakit tryout', text: 'Tentukan durasi, status, aturan, dan daftar kode soal.', icon: ClipboardList, href: '/tryout' },
  ];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Guru"
        title={`Selamat datang, ${user.fullName}`}
        description="Dashboard guru dibuat lebih informatif untuk mengelola materi, kisi-kisi, bank soal, tryout, dan monitoring dalam satu alur."
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
            <div><strong>{questions}</strong><span> soal siap dikelola</span></div>
            <div><strong>{tryouts}</strong><span> paket tryout</span></div>
            <div><strong>{attempts}</strong><span> attempt siswa</span></div>
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
          <div className="notice">Urutan paling aman: buat kisi-kisi, susun bank soal, rakit tryout, lalu pantau hasil siswa.</div>
        </section>
      </div>
    </div>
  );
}
