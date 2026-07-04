import type { UserRole } from '@sh/db';

export const appMeta = {
  appName: 'Sains Masemba',
  appTagline: 'Portal orang tua untuk memantau progres anak.',
  role: 'ORANG_TUA' as UserRole,
  roleLabel: 'Orang tua',
  loginBadge: 'Portal Monitoring',
  loginTitle: 'Pantau Belajar Anak dengan Data yang Lebih Jelas',
  loginDescription: 'Lihat hasil tryout, aktivitas harian, progres mingguan, dan indikator topik lemah agar pendampingan lebih tepat.',
  loginHighlights: [
    { title: 'Laporan lebih mudah dibaca', text: 'Pantau progres, hasil, dan aktivitas anak dalam tampilan yang sederhana.' },
    { title: 'Topik lemah lebih cepat terlihat', text: 'Sistem membantu menunjukkan area materi yang perlu didorong ulang.' },
    { title: 'Komunikasi lebih terarah', text: 'Orang tua bisa lebih mudah mengetahui perkembangan belajar anak setiap saat.' },
  ],
};
