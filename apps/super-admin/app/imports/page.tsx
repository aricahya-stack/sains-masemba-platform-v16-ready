import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  { title: 'User import', description: 'Template user, guru, siswa, orang tua.', href: '/templates/user-import-template.xlsx', code: 'USER' },
  { title: 'Parent mapping', description: 'Template relasi orang tua-siswa.', href: '/templates/parent-link-template.xlsx', code: 'LINK' },
  { title: 'Materi berbasis topik', description: 'Template topik, kartu belajar, materi, bagian, dan kode latihan.', href: '/templates/material-import-template.xlsx', code: 'MAT' },
  { title: 'Kisi-kisi per tryout', description: 'Template kisi-kisi yang dipetakan ke Tryout 1, 2, 3, dan seterusnya.', href: '/templates/blueprint-import-template.xlsx', code: 'KISI' },
  { title: 'Bank soal per tryout', description: 'Template soal, opsi, kunci, pembahasan, dan nama tryout.', href: '/templates/question-import-template.xlsx', code: 'SOAL' },
  { title: 'Mapping tryout', description: 'Template paket tryout dan daftar kode soal, ideal 40 soal per paket.', href: '/templates/tryout-question-template.xlsx', code: 'TRY' },
];

export default async function ImportsPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  return (
    <ImportCenter
      eyebrow="Import excel"
      title="Pusat import dan template"
      description="Unduh template resmi, lalu preview file Excel sebelum diproses ke sistem."
      templates={templates}
    />
  );
}
