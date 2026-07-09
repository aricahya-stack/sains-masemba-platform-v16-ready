import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Profil', href: '/profil', section: 'Utama', icon: 'User' },
  { label: 'User', href: '/users', section: 'Manajemen', icon: 'Users' },
  { label: 'Guru', href: '/guru', section: 'Manajemen', icon: 'GraduationCap' },
  { label: 'Siswa', href: '/siswa', section: 'Manajemen', icon: 'BookUser' },
  { label: 'Orang Tua', href: '/orang-tua', section: 'Manajemen', icon: 'HeartHandshake' },
  { label: 'Topik', href: '/topik', section: 'Akademik', icon: 'BookOpen' },
  { label: 'Materi', href: '/materi', section: 'Akademik', icon: 'Library' },
  { label: 'Approval', href: '/approval', section: 'Akademik', icon: 'BadgeCheck' },
  { label: 'Import Excel', href: '/imports', section: 'Operasional', icon: 'FileSpreadsheet' },
  { label: 'Monitoring', href: '/monitoring', section: 'Operasional', icon: 'Radar' },
  { label: 'Settings', href: '/settings', section: 'Operasional', icon: 'Settings2' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
