import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, hashPassword } from '@sh/core';

function serialize(user: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
  className: string | null;
  status: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    className: user.className || '',
    status: user.status,
    password: '',
  };
}

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.fullName || !body.email || !body.role) return NextResponse.json({ error: 'Nama, email, dan role wajib diisi.' }, { status: 400 });

  const data = await prisma.user.create({
    data: {
      fullName: String(body.fullName),
      email: String(body.email).toLowerCase(),
      role: body.role,
      phone: body.phone ? String(body.phone) : null,
      className: body.role === UserRole.SISWA && body.className ? String(body.className) : null,
      status: body.status || 'ACTIVE',
      passwordHash: body.password ? await hashPassword(String(body.password)) : null,
    },
  });
  return NextResponse.json({ data: serialize(data) });
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID user wajib ada.' }, { status: 400 });

  const updateData: Record<string, unknown> = {
    fullName: String(body.fullName || ''),
    email: String(body.email || '').toLowerCase(),
    role: body.role,
    phone: body.phone ? String(body.phone) : null,
    className: body.role === UserRole.SISWA && body.className ? String(body.className) : null,
    status: body.status || 'ACTIVE',
  };
  if (body.password) {
    updateData.passwordHash = await hashPassword(String(body.password));
  }

  const data = await prisma.user.update({
    where: { id: String(body.id) },
    data: updateData,
  });
  return NextResponse.json({ data: serialize(data) });
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID user wajib ada.' }, { status: 400 });

  await prisma.user.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
