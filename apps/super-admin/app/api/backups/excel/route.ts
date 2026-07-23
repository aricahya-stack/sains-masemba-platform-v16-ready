import { NextResponse } from 'next/server';
import { createDatabaseBackupBuffer, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function safeFileTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const includePasswordHashes = url.searchParams.get('includeSecrets') === 'true';
  if (includePasswordHashes && request.headers.get('x-confirm-sensitive-backup') !== 'INCLUDE_PASSWORD_HASHES') {
    return NextResponse.json({ error: 'Konfirmasi backup sensitif tidak valid.' }, { status: 400 });
  }

  try {
    const result = await createDatabaseBackupBuffer({
      generatedBy: `${user.fullName} <${user.email}>`,
      includePasswordHashes,
    });
    const fileName = `sains-masemba-backup-${safeFileTimestamp(result.generatedAt)}.xlsx`;

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Backup-Data-Rows': String(result.totalRows),
      },
    });
  } catch (error) {
    console.error('Database Excel backup failed:', error);
    return NextResponse.json(
      { error: 'Backup Excel gagal dibuat. Periksa koneksi database dan log server.' },
      { status: 500 },
    );
  }
}
