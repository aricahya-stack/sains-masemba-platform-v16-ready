import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const tryout = await prisma.tryout.findFirst({
    where: {
      id: String(body.tryoutId),
      author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } },
    },
  });
  if (!tryout) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });

  const action = String(body.action || '');
  let status = tryout.status;
  if (action === 'OPEN') status = 'OPEN';
  if (action === 'PAUSED') status = 'PAUSED';
  if (action === 'ENDED') status = 'ENDED';

  await prisma.tryout.update({
    where: { id: tryout.id },
    data: { status },
  });

  await prisma.tryoutIncident.create({
    data: {
      tryoutId: tryout.id,
      userId: user.id,
      type: action === 'WARNING' ? 'BROADCAST_WARNING' : `TRYOUT_${action}`,
      message: body.message ? String(body.message) : null,
    },
  });

  return NextResponse.json({
    status,
    message: action === 'WARNING' ? 'Peringatan berhasil dicatat untuk sesi tryout.' : `Status tryout diperbarui menjadi ${status}.`,
  });
}
