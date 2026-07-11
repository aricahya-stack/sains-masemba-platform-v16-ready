import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Belajar', href: '/belajar', section: 'Belajar', icon: 'BookOpenText' },
  { label: 'Tips TKAD', href: '/tips-tkad', section: 'Belajar', icon: 'Lightbulb' },
  { label: 'Pembahasan', href: '/pembahasan', section: 'Belajar', icon: 'MessageCircleMore' },
  { label: 'Tryout', href: '/tryout', section: 'Ujian', icon: 'ClipboardPenLine' },
  { label: 'Hasil', href: '/hasil', section: 'Ujian', icon: 'ChartColumnBig' },
  { label: 'Statistik Tryout', href: '/statistik-tryout', section: 'Ujian', icon: 'ChartColumnBig' },
  { label: 'Profil', href: '/profil', section: 'Akun', icon: 'User' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
