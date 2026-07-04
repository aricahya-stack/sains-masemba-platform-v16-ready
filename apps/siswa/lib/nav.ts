import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Belajar', href: '/belajar', section: 'Belajar', icon: 'BookOpenText' },
  { label: 'Latihan', href: '/latihan', section: 'Belajar', icon: 'PencilRuler' },
  { label: 'Tryout', href: '/tryout', section: 'Ujian', icon: 'ClipboardPenLine' },
  { label: 'Hasil', href: '/hasil', section: 'Ujian', icon: 'ChartColumnBig' },
  { label: 'Pembahasan', href: '/pembahasan', section: 'Ujian', icon: 'MessageCircleMore' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
