import { UserRole } from '@sh/db';
import { getGlobalBranding, requireRole } from '@sh/core';
import { SettingsPanel } from '../../components/settings-panel';

export default async function SettingsPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const { theme, motto, font } = await getGlobalBranding();
  return <SettingsPanel initialTheme={theme} initialMotto={motto} initialFont={font} />;
}
