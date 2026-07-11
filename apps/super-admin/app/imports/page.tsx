import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { ImportCenter } from '../../components/import-center';

const templates = [
  { title: 'User import', description: 'Template akun Super Admin, guru, siswa, dan orang tua.', href: '/templates/user-import-template.xlsx', code: 'USER' },
  { title: 'Parent mapping', description: 'Template relasi orang tua dengan siswa.', href: '/templates/parent-link-template.xlsx', code: 'LINK' },
  { title: 'Topik & materi', description: 'Template topik dan materi dengan kode_topik sebagai identitas stabil.', href: '/templates/material-import-template.xlsx', code: 'MAT' },
  { title: 'Soal latihan', description: 'Template soal yang tampil di dalam materi belajar. Tidak terhubung ke kisi-kisi Tryout.', href: '/templates/practice-question-template.xlsx', code: 'LAT' },
  { title: 'Konten Tryout 30 soal', description: 'Satu file berisi kisi-kisi sekaligus tepat 30 soal per kode_tryout tanpa menambah topik materi siswa.', href: '/templates/tryout-content-template.xlsx', code: 'TRY' },
];

export default async function ImportsPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  return (
    <ImportCenter
      eyebrow="Import Excel"
      title="Pusat import Super Admin"
      description="Konten materi memakai kode_topik, sedangkan paket tryout memakai kode_tryout. Kedua domain dipisahkan sehingga import atau mapping tryout tidak menambah daftar topik materi siswa."
      templates={templates}
    />
  );
}
