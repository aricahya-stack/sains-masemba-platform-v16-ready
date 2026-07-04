import type { UserRole } from '@sh/db';

export const appMeta = {
  appName: 'Sains Masemba',
  appTagline: 'Portal super admin untuk kontrol platform.',
  role: 'SUPER_ADMIN' as UserRole,
  roleLabel: 'Super admin',
  loginBadge: 'Portal Pengendali',
  loginTitle: 'Kontrol Data, Pengguna & Monitoring Platform',
  loginDescription: 'Kelola seluruh portal, atur palet warna global, pantau aktivitas, dan jaga kualitas operasional dari satu dashboard terpadu.',
  loginHighlights: [
    { title: 'Kontrol lintas portal', text: 'Atur pengguna, tema global, topik, dan approval dari satu tempat.' },
    { title: 'Monitoring lebih tertata', text: 'Pantau tryout, aktivitas, dan kualitas konten secara real-time.' },
    { title: 'Konfigurasi lebih fleksibel', text: 'Pengaturan branding dan tema langsung berdampak ke semua portal.' },
  ],
};
