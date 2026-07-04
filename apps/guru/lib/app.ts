import type { UserRole } from '@sh/db';

export const appMeta = {
  appName: 'Sains Masemba',
  appTagline: 'Portal guru untuk materi, kisi-kisi, dan tryout.',
  role: 'GURU' as UserRole,
  roleLabel: 'Guru',
  loginBadge: 'Portal Akademik',
  loginTitle: 'Kelola Materi, Kisi-kisi & Tryout dengan Lebih Rapi',
  loginDescription: 'Guru dapat menyusun materi, mengimpor soal, mengatur sesi tryout, dan memantau peserta dalam satu alur kerja yang nyaman.',
  loginHighlights: [
    { title: 'Materi lebih menarik', text: 'Input konten WYSIWYG, LaTeX, media, dan import Excel dalam satu dashboard.' },
    { title: 'Tryout lebih terkontrol', text: 'Jadwalkan, jeda, lanjutkan, dan beri peringatan saat sesi sedang berjalan.' },
    { title: 'Kualitas soal lebih kuat', text: 'Hubungkan soal dengan kisi-kisi agar evaluasi lebih terarah.' },
  ],
};
