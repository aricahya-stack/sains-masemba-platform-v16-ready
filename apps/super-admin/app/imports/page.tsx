import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  { title: 'User import', description: 'Template akun Super Admin, guru, siswa, dan orang tua.', href: '/templates/user-import-template.xlsx', code: 'USER' },
  { title: 'Parent mapping', description: 'Template relasi orang tua dengan siswa.', href: '/templates/parent-link-template.xlsx', code: 'LINK' },
  { title: 'Topik & materi', description: 'Template topik, ringkasan, tujuan pembelajaran, dan isi materi.', href: '/templates/material-import-template.xlsx', code: 'MAT' },
  { title: 'Soal latihan', description: 'Template soal yang tampil di dalam materi belajar. Tidak terhubung ke kisi-kisi Tryout.', href: '/templates/practice-question-template.xlsx', code: 'LAT' },
  { title: 'Konten Tryout 30 soal', description: 'Satu file berisi kisi-kisi sekaligus tepat 30 soal per nama paket Tryout.', href: '/templates/tryout-content-template.xlsx', code: 'TRY' },
];

export default async function ImportsPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  return (
    <ImportCenter
      eyebrow="Import Excel"
      title="Pusat import Super Admin"
      description="Import pengguna dan relasi tetap tersedia. Konten akademik disederhanakan menjadi materi, latihan, serta satu file kisi-kisi dan 30 soal Tryout. Penjadwalan dilakukan dari menu Mapping Tryout."
      templates={templates}
    />
  );
}
