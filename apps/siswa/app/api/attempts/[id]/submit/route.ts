import { NextResponse } from 'next/server';
import { UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';
import { finalizeAttempt } from '../../../../../lib/attempt-security';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.SISWA) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await finalizeAttempt(id, user.id);
  if (!result) return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  return NextResponse.json({ score: result.score });
}
