import fs from 'node:fs/promises';
import path from 'node:path';
import { createDatabaseBackupBuffer } from '../src/excel-backup';

function timestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const outputDir = path.resolve(process.env.BACKUP_DIR || 'backups');
  const includePasswordHashes = process.env.BACKUP_INCLUDE_PASSWORD_HASHES !== 'NO';
  await fs.mkdir(outputDir, { recursive: true });

  const result = await createDatabaseBackupBuffer({
    generatedBy: process.env.BACKUP_GENERATED_BY || 'CLI Database Backup',
    includePasswordHashes,
  });

  const fileName = `sains-masemba-backup-${timestamp(result.generatedAt)}.xlsx`;
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, result.buffer);

  console.log(`Backup Excel berhasil dibuat: ${filePath}`);
  console.log(`Jumlah sheet data: ${result.sheets.length}`);
  console.log(`Total baris data: ${result.totalRows}`);
  console.log(`Hash password: ${includePasswordHashes ? 'disertakan' : 'tidak disertakan'}`);
}

main().catch((error) => {
  console.error('Backup Excel gagal:', error);
  process.exit(1);
});
