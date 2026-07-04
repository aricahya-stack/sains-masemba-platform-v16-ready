import type { NavItem } from '../components/app-shell';

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', section: 'Utama', icon: 'LayoutDashboard' },
  { label: 'Materi', href: '/materi', section: 'Konten', icon: 'NotebookPen' },
  { label: 'Kisi-kisi', href: '/kisi-kisi', section: 'Konten', icon: 'ListChecks' },
  { label: 'Bank Soal', href: '/bank-soal', section: 'Konten', icon: 'Library' },
  { label: 'Tryout', href: '/tryout', section: 'Ujian', icon: 'ClipboardList' },
  { label: 'Monitoring Tryout', href: '/monitoring-tryout', section: 'Ujian', icon: 'MonitorCog' },
  { label: 'Import Excel', href: '/imports', section: 'Operasional', icon: 'FileSpreadsheet' },
  { label: 'Pengembang', href: '/pengembang', section: 'Info', icon: 'Code2' },
];
