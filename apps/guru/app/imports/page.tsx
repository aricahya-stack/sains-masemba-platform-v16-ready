import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  { title: 'Materi berbasis topik', description: 'Template topik, kartu belajar, materi, bagian, dan kode latihan.', href: '/templates/material-import-template.xlsx', code: 'MAT' },
  { title: 'Kisi-kisi per tryout', description: 'Template kisi-kisi yang dipetakan ke Tryout 1, 2, 3, dan seterusnya.', href: '/templates/blueprint-import-template.xlsx', code: 'KISI' },
  { title: 'Bank soal per tryout', description: 'Template soal PG biasa, PG kompleks, benar-salah, sistem penilaian, kunci, pembahasan, dan nama tryout.', href: '/templates/question-import-template.xlsx', code: 'SOAL' },
  { title: 'Mapping tryout', description: 'Template paket tryout dan daftar kode soal, ideal 40 soal per paket.', href: '/templates/tryout-question-template.xlsx', code: 'TRY' },
];

export default async function ImportsPage() {
  await requireRole(UserRole.GURU);
  return (
    <ImportCenter
      eyebrow="Import excel"
      title="Import konten guru"
      description="Unduh template resmi. Format bank soal sudah mendukung PG biasa, PG kompleks, dan benar-salah."
      templates={templates}
    />
  );
}
