import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  {
    title: 'Topik dan materi',
    description: 'Satu file untuk membuat topik, materi, tujuan pembelajaran, dan bagian materi.',
    href: '/templates/material-import-template.xlsx',
    code: 'MATERI',
  },
  {
    title: 'Soal latihan',
    description: 'Soal yang tampil di dalam topik belajar siswa. File ini tidak digunakan untuk tryout.',
    href: '/templates/practice-question-template.xlsx',
    code: 'LATIHAN',
  },
  {
    title: 'Kisi-kisi dan soal tryout',
    description: 'Kisi-kisi dan soal berada dalam satu file. Setiap nama tryout wajib berisi tepat 30 soal.',
    href: '/templates/tryout-content-template.xlsx',
    code: 'TRYOUT 30',
  },
];

export default async function ImportsPage() {
  await requireRole(UserRole.GURU);
  return (
    <ImportCenter
      eyebrow="Import Excel"
      title="Import konten guru"
      description="Alur impor disederhanakan menjadi tiga file: topik-materi, soal latihan, serta kisi-kisi sekaligus soal tryout. Mapping dan jadwal tryout diatur melalui menu Mapping Tryout."
      templates={templates}
    />
  );
}
