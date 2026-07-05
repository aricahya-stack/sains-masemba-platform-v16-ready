import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Pantau Anak', href: '/pantau-anak', section: 'Monitoring', icon: 'UsersRound' },
  { label: 'Hasil Tryout', href: '/hasil-tryout', section: 'Monitoring', icon: 'ClipboardList' },
  { label: 'Progres', href: '/progres', section: 'Monitoring', icon: 'ChartColumnBig' },
  { label: 'Notifikasi', href: '/notifikasi', section: 'Monitoring', icon: 'BellRing' },
  { label: 'Profil', href: '/profil', section: 'Akun', icon: 'User' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
