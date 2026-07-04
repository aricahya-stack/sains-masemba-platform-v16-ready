import type { UserRole } from '@sh/db';

export const appMeta = {
  appName: 'Sains Masemba',
  appTagline: 'Portal siswa untuk belajar, latihan, dan tryout.',
  role: 'SISWA' as UserRole,
  roleLabel: 'Siswa',
  loginBadge: 'Portal Belajar',
  loginTitle: 'Belajar dan Tryout IPA SMP dengan Tampilan Lebih Fokus',
  loginDescription: 'Masuk ke ruang belajar yang ringan, mobile-friendly, dan berubah menjadi mode ujian CBT saat tryout dimulai.',
  loginHighlights: [
    { title: 'Belajar lebih nyaman', text: 'Ringkasan materi, latihan, pembahasan, dan retry soal tersusun jelas.' },
    { title: 'Tryout seperti CBT', text: 'Timer, navigasi soal, autosave, dan tampilan ujian yang lebih fokus.' },
    { title: 'Progres lebih jelas', text: 'Pantau topik kuat, topik lemah, dan perkembangan hasil dari waktu ke waktu.' },
  ],
};
