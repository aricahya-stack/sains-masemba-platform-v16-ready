import { getDatabaseBackupCounts, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { DatabaseBackupPanel } from '../../components/database-backup-panel';

export const dynamic = 'force-dynamic';

export default async function BackupDataPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const counts = await getDatabaseBackupCounts();
  return <DatabaseBackupPanel counts={counts} />;
}
