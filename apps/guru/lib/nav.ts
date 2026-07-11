import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Topik & Materi', href: '/belajar', section: 'Konten', icon: 'BookOpenText' },
  { label: 'Latihan', href: '/latihan', section: 'Konten', icon: 'ClipboardPenLine' },
  { label: 'Tips TKAD', href: '/tips-tkad', section: 'Konten', icon: 'Lightbulb' },
  { label: 'Tryout', href: '/tryout', section: 'Ujian', icon: 'ClipboardList' },
  { label: 'Mapping Tryout', href: '/mapping-tryout', section: 'Ujian', icon: 'PencilRuler' },
  { label: 'Monitoring Tryout', href: '/monitoring-tryout', section: 'Ujian', icon: 'MonitorCog' },
  { label: 'Import Excel', href: '/imports', section: 'Operasional', icon: 'FileSpreadsheet' },
  { label: 'Profil', href: '/profil', section: 'Akun', icon: 'User' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
