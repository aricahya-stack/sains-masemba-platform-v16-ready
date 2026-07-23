import { NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword, validatePassword } from '@sh/core';
import { prisma } from '@sh/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { currentPassword?: string; newPassword?: string; confirmPassword?: string } | null;
  const currentPassword = String(body?.currentPassword || '');
  const newPassword = String(body?.newPassword || '');
  const confirmPassword = String(body?.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'Semua kolom password wajib diisi.' }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Konfirmasi password baru tidak sama.' }, { status: 400 });
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: 'Akun ini belum memiliki password lama. Hubungi admin untuk reset awal.' }, { status: 400 });
  }

  const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: 'Password saat ini tidak sesuai.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), authVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
