import type { UserRole } from '@sh/db';

export const appMeta = {
  appName: 'Sains Masemba',
  appTagline: 'Portal guru untuk konten belajar dan evaluasi.',
  role: 'GURU' as UserRole,
  roleLabel: 'Guru',
  loginBadge: 'Portal Akademik',
  loginTitle: 'Kelola Konten Belajar & Evaluasi dengan Lebih Rapi',
  loginDescription: 'Guru dapat menyusun topik, materi, Tips TKAD, bank soal, mengatur tryout, dan memantau peserta dalam satu alur kerja.',
  loginHighlights: [
    { title: 'Materi lebih menarik', text: 'Input konten WYSIWYG, LaTeX, media, dan import Excel dalam satu dashboard.' },
    { title: 'Tryout lebih terkontrol', text: 'Jadwalkan, jeda, lanjutkan, dan beri peringatan saat sesi sedang berjalan.' },
    { title: 'Kualitas soal lebih kuat', text: 'Hubungkan soal dengan kisi-kisi agar evaluasi lebih terarah.' },
  ],
};
