import './globals.css';
import 'katex/dist/katex.min.css';
import type { Metadata } from 'next';
import { AppShell } from '../components/app-shell';
import { ToastProvider } from '../components/toast-provider';
import { navItems } from '../lib/nav';
import { appMeta } from '../lib/app';
import { getCurrentUser, getGlobalBranding, roleLabel } from '@sh/core';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Sains Masemba | Guru',
  description: 'Sains Masemba Guru - platform pembelajaran dan tryout IPA SMP.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const branding = await getGlobalBranding();
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning data-theme={branding.theme} data-font={branding.font}>
        <ToastProvider>
          <AppShell
            appName={appMeta.appName}
            appTagline={appMeta.appTagline}
            loginBadge={appMeta.loginBadge}
            loginTitle={appMeta.loginTitle}
            loginDescription={appMeta.loginDescription}
            loginHighlights={appMeta.loginHighlights}
            motto={branding.motto}
            navItems={navItems}
            currentUser={currentUser ? { fullName: currentUser.fullName, email: currentUser.email, role: roleLabel(currentUser.role) } : null}
            initialTheme={branding.theme}
            initialFont={branding.font}
          >
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
