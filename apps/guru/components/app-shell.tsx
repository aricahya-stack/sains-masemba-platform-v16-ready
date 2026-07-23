
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  MoonStar,
  SunMedium,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookUser,
  HeartHandshake,
  BookOpen,
  BadgeCheck,
  FileSpreadsheet,
  Radar,
  Settings2,
  Code2,
  NotebookPen,
  Library,
  ListChecks,
  ClipboardList,
  MonitorCog,
  BookOpenText,
  PencilRuler,
  ClipboardPenLine,
  ChartColumnBig,
  MessageCircleMore,
  UsersRound,
  BellRing,
  Quote,
  ShieldCheck,
  BookMarked,
  BarChart3,
  Lightbulb,
} from 'lucide-react';

export type NavItem = { label: string; href: string; section?: string; icon?: string };
export type LoginHighlight = { title: string; text: string };

const iconMap = {
  User,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookUser,
  HeartHandshake,
  BookOpen,
  BadgeCheck,
  FileSpreadsheet,
  Radar,
  Settings2,
  Code2,
  NotebookPen,
  Library,
  ListChecks,
  ClipboardList,
  MonitorCog,
  BookOpenText,
  PencilRuler,
  ClipboardPenLine,
  ChartColumnBig,
  MessageCircleMore,
  UsersRound,
  BellRing,
  Lightbulb,
};

const loginHighlightIcons = [ShieldCheck, BookMarked, BarChart3] as const;

type Mode = 'light' | 'dark';

export function BrandMark() {
  return <div className="app-logo-mark app-logo-masemba" aria-hidden="true" />;
}

export function AppShell({
  appName,
  appTagline,
  loginBadge,
  loginTitle,
  loginDescription,
  loginHighlights,
  motto,
  navItems,
  currentUser,
  initialTheme,
  initialFont,
  children,
}: {
  appName: string;
  appTagline: string;
  loginBadge: string;
  loginTitle: string;
  loginDescription: string;
  loginHighlights: LoginHighlight[];
  motto: string;
  navItems: NavItem[];
  currentUser?: { fullName: string; email: string; role: string } | null;
  initialTheme?: string;
  initialFont?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isExamWorkspace = pathname.startsWith('/tryout/');
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mode, setMode] = useState<Mode>('light');
  const userInitials = currentUser?.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SM';

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const savedMode = document.cookie.match(/(?:^|; )sh_mode=([^;]+)/)?.[1] as Mode | undefined;
    const savedSidebar = document.cookie.match(/(?:^|; )sh_sidebar=([^;]+)/)?.[1];
    const safeMode = savedMode === 'dark' ? 'dark' : 'light';
    setMode(safeMode);
    setCollapsed(savedSidebar === 'collapsed');
    root.dataset.mode = safeMode;
    body.dataset.mode = safeMode;
    if (initialTheme) {
      root.dataset.theme = initialTheme;
      body.dataset.theme = initialTheme;
    }
    if (initialFont) {
      root.dataset.font = initialFont;
      body.dataset.font = initialFont;
    }
  }, [initialTheme, initialFont]);

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.documentElement.dataset.mode = next;
    document.body.dataset.mode = next;
    document.cookie = `sh_mode=${next}; path=/; max-age=31536000`;
  };

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sh_sidebar=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000`;
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchText.trim();
    if (!query) return;
    const normalized = query.toLowerCase();
    const matchedMenu = navItems.find((item) => item.label.toLowerCase().includes(normalized));
    if (matchedMenu) {
      router.push(matchedMenu.href);
      return;
    }
    const belajarMenu = navItems.find((item) => item.href === '/belajar');
    router.push(`${belajarMenu ? '/belajar' : '/'}?q=${encodeURIComponent(query)}`);
  };

  if (pathname === '/login') {
    return (
      <div className="auth-screen">
        <section className="auth-hero-panel">
          <div className="auth-hero-top">
            <span className="pill pill-primary">Sains Masemba</span>
            <span className="pill pill-secondary">{loginBadge}</span>
          </div>

          <div className="auth-hero-main">
            <h1>{loginTitle}</h1>
            <p>{loginDescription}</p>
          </div>

          <div className="auth-highlight-list">
            {loginHighlights.map((item, index) => {
              const Icon = loginHighlightIcons[index % loginHighlightIcons.length];
              return (
                <article className="auth-highlight-card" key={item.title}>
                  <div className="auth-highlight-icon"><Icon size={20} /></div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="auth-motto-card">
            <div className="eyebrow auth-motto-eyebrow"><Quote size={14} /> Moto platform</div>
            <blockquote>{motto}</blockquote>
          </div>
        </section>

        <section className="auth-form-panel">
          {children}
        </section>
        <div className="copyright-badge">© SH</div>
      </div>
    );
  }

  if (isExamWorkspace) {
    return <main className="exam-focus-main">{children}</main>;
  }

  let currentSection = '';
  return (
    <div className={`shell${collapsed ? ' shell-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="app-logo">
            <BrandMark />
            <div className="app-logo-text">
              <strong>{appName}</strong>
              <small>{appTagline}</small>
            </div>
          </div>
          {navItems.map((item) => {
            const showSection = item.section && item.section !== currentSection;
            if (showSection) currentSection = item.section!;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = (item.icon && iconMap[item.icon as keyof typeof iconMap]) || LayoutDashboard;
            return (
              <div key={item.href}>
                {showSection ? <div className="nav-section-title">{item.section}</div> : null}
                <Link href={item.href} prefetch={false} className={`nav-link${active ? ' active' : ''}`} title={item.label}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user-card">
            <div className="sidebar-user-main">
              <div className="sidebar-user-avatar" aria-hidden="true"><User size={21} strokeWidth={2.4} /></div>
              <div className="sidebar-user-body">
                {currentUser ? (
                  <Link className="sidebar-profile-link" href="/profil" prefetch={false} title="Buka profil">
                    <strong>{currentUser.fullName}</strong>
                    <small>{currentUser.role}</small>
                  </Link>
                ) : (
                  <>
                    <strong>Mode tamu</strong>
                    <small>Belum login</small>
                  </>
                )}
                {currentUser ? (
                  <Link className="sidebar-logout" href="/logout" prefetch={false}>
                    <LogOut size={15} />
                    <span>Keluar</span>
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="sidebar-user-footer"><strong>© SH</strong></div>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="icon-button topbar-ghost" type="button" onClick={toggleSidebar} title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <form className="search-shell" onSubmit={submitSearch}>
              <Search size={18} />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Cari menu, fitur, topik, atau tryout..."
              />
            </form>
          </div>
          <div className="topbar-actions">
            <button className="icon-button topbar-ghost" type="button" onClick={toggleMode} title={mode === 'light' ? 'Mode gelap' : 'Mode terang'}>
              {mode === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </button>
            <button className="button-secondary topbar-soft" type="button">
              <Bell size={16} />
              Notifikasi
            </button>
            {currentUser ? (
              <Link href="/profil" prefetch={false} className="topbar-user-chip" aria-label={`Buka profil ${currentUser.fullName}`}>
                <span className="topbar-user-avatar" aria-hidden="true">{userInitials}</span>
                <span className="topbar-user-copy">
                  <strong>{currentUser.fullName}</strong>
                  <small>{currentUser.role}</small>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
        {children}
      </main>
      <nav className="mobile-bottom-nav" aria-label="Navigasi utama">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = (item.icon && iconMap[item.icon as keyof typeof iconMap]) || LayoutDashboard;
          return (
            <Link href={item.href} prefetch={false} className={`mobile-bottom-link${active ? ' active' : ''}`} title={item.label} key={item.href}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
