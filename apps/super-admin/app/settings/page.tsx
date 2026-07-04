import { UserRole } from '@sh/db';
import { getActiveFont, getActiveTheme, getGlobalMotto, requireRole } from '@sh/core';
import { SettingsPanel } from '../../components/settings-panel';

export default async function SettingsPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [theme, motto, font] = await Promise.all([getActiveTheme(), getGlobalMotto(), getActiveFont()]);
  return <SettingsPanel initialTheme={theme} initialMotto={motto} initialFont={font} />;
}
