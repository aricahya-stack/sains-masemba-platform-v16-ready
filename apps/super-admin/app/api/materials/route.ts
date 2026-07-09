import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'ID materi wajib ada.' }, { status: 400 });

    const material = await prisma.material.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!material) return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });

    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: `Materi "${material.title}" berhasil dihapus.` });
  } catch (error) {
    console.error('DELETE /api/materials failed:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus materi. Silakan muat ulang halaman dan coba lagi.' },
      { status: 500 },
    );
  }
}
