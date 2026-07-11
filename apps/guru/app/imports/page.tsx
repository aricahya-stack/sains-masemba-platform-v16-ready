import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  {
    title: 'Topik dan materi',
    description: 'Satu file untuk membuat topik dan materi. Gunakan kode_topik sebagai identitas stabil topik belajar.',
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
    description: 'Kisi-kisi dan soal berada dalam satu file. Setiap kode_tryout wajib berisi tepat 30 soal dan tidak menambah topik materi siswa.',
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
      description="Alur impor dipisahkan tegas: topik-materi memakai kode_topik, sedangkan paket tryout memakai kode_tryout. Import atau mapping tryout tidak lagi menambah daftar topik materi siswa."
      templates={templates}
    />
  );
}
