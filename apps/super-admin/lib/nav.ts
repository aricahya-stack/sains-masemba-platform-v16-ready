import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Profil', href: '/profil', section: 'Utama', icon: 'User' },
  { label: 'User', href: '/users', section: 'Manajemen', icon: 'Users' },
  { label: 'Guru', href: '/guru', section: 'Manajemen', icon: 'GraduationCap' },
  { label: 'Siswa', href: '/siswa', section: 'Manajemen', icon: 'BookUser' },
  { label: 'Orang Tua', href: '/orang-tua', section: 'Manajemen', icon: 'HeartHandshake' },
  { label: 'Topik & Materi', href: '/belajar', section: 'Akademik', icon: 'BookOpenText' },
  { label: 'Latihan', href: '/latihan', section: 'Akademik', icon: 'ClipboardPenLine' },
  { label: 'Approval', href: '/approval', section: 'Akademik', icon: 'BadgeCheck' },
  { label: 'Tryout', href: '/tryout', section: 'Ujian', icon: 'ClipboardList' },
  { label: 'Mapping Tryout', href: '/mapping-tryout', section: 'Ujian', icon: 'PencilRuler' },
  { label: 'Monitoring Tryout', href: '/monitoring', section: 'Ujian', icon: 'MonitorCog' },
  { label: 'Statistik Tryout', href: '/statistik-tryout', section: 'Ujian', icon: 'ChartColumnBig' },
  { label: 'Import Excel', href: '/imports', section: 'Operasional', icon: 'FileSpreadsheet' },
  { label: 'Backup Data', href: '/backup-data', section: 'Operasional', icon: 'DatabaseBackup' },
  { label: 'Notifikasi', href: '/notifikasi', section: 'Operasional', icon: 'BellRing' },
  { label: 'Settings', href: '/settings', section: 'Operasional', icon: 'Settings2' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
