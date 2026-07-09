import { NextResponse } from 'next/server';
import { UserRole } from '@sh/db';
import { getCurrentUser, importRowsToDatabase, type ImportKind, type ImportRow } from '@sh/core';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.GURU) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json() as { kind?: ImportKind; rows?: ImportRow[] };
    if (!body.kind || !Array.isArray(body.rows)) {
      return NextResponse.json({ error: 'Jenis import dan rows wajib dikirim.' }, { status: 400 });
    }
    const data = await importRowsToDatabase({
      kind: body.kind,
      rows: body.rows,
      actor: { id: user.id, role: user.role },
      allowAdminImports: false,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import gagal diproses.' },
      { status: 400 },
    );
  }
}
