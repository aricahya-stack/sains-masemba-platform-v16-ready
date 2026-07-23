import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, hashPassword, validatePassword } from '@sh/core';

const allowedRoles = new Set<UserRole>(Object.values(UserRole));
const allowedStatuses = new Set(['ACTIVE', 'INACTIVE']);

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

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(value: unknown): UserRole | null {
  const role = String(value || '').trim().toUpperCase() as UserRole;
  return allowedRoles.has(role) ? role : null;
}

function normalizeStatus(value: unknown) {
  const status = String(value || 'ACTIVE').trim().toUpperCase();
  return allowedStatuses.has(status) ? status : null;
}

function validationError(body: Record<string, unknown>) {
  const fullName = String(body.fullName || '').trim();
  const email = normalizeEmail(body.email);
  const role = normalizeRole(body.role);
  const status = normalizeStatus(body.status);

  if (!fullName) return 'Nama lengkap wajib diisi.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid.';
  if (!role) return 'Role tidak valid.';
  if (!status) return 'Status harus ACTIVE atau INACTIVE.';
  if (body.password) {
    const passwordError = validatePassword(String(body.password));
    if (passwordError) return passwordError;
  }
  return null;
}

function databaseError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return 'Email sudah digunakan oleh akun lain. Setiap akun wajib memakai email yang berbeda.';
  }
  return error instanceof Error ? error.message : 'Operasi user gagal diproses.';
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const invalid = validationError(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const role = normalizeRole(body.role)!;
  const status = normalizeStatus(body.status)!;

  try {
    const data = await prisma.user.create({
      data: {
        fullName: String(body.fullName).trim(),
        email: normalizeEmail(body.email),
        role,
        phone: body.phone ? String(body.phone).trim() : null,
        className: role === UserRole.SISWA && body.className ? String(body.className).trim() : null,
        status,
        passwordHash: body.password ? await hashPassword(String(body.password)) : null,
      },
    });
    return NextResponse.json({ data: serialize(data) });
  } catch (error) {
    return NextResponse.json({ error: databaseError(error) }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  if (!body.id) return NextResponse.json({ error: 'ID user wajib ada.' }, { status: 400 });
  const invalid = validationError(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const id = String(body.id);
  const role = normalizeRole(body.role)!;
  const status = normalizeStatus(body.status)!;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });

  // Banyak Super Admin diperbolehkan, tetapi sistem tidak boleh kehilangan seluruh
  // akun Super Admin aktif karena perubahan role atau penonaktifan akun terakhir.
  if (
    existing.role === UserRole.SUPER_ADMIN
    && existing.status === 'ACTIVE'
    && (role !== UserRole.SUPER_ADMIN || status !== 'ACTIVE')
  ) {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: id }, role: UserRole.SUPER_ADMIN, status: 'ACTIVE' },
    });
    if (otherActiveAdmins === 0) {
      return NextResponse.json({ error: 'Tidak dapat mengubah Super Admin aktif terakhir. Tambahkan Super Admin aktif lain terlebih dahulu.' }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {
    fullName: String(body.fullName).trim(),
    email: normalizeEmail(body.email),
    role,
    phone: body.phone ? String(body.phone).trim() : null,
    className: role === UserRole.SISWA && body.className ? String(body.className).trim() : null,
    status,
  };
  if (body.password) {
    updateData.passwordHash = await hashPassword(String(body.password));
    updateData.authVersion = { increment: 1 };
  }

  try {
    const data = await prisma.user.update({ where: { id }, data: updateData });
    return NextResponse.json({ data: serialize(data) });
  } catch (error) {
    return NextResponse.json({ error: databaseError(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const admin = await ensureAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  if (!body.id) return NextResponse.json({ error: 'ID user wajib ada.' }, { status: 400 });

  const id = String(body.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
  if (id === admin.id) return NextResponse.json({ error: 'Akun yang sedang digunakan tidak dapat dihapus.' }, { status: 400 });

  if (existing.role === UserRole.SUPER_ADMIN && existing.status === 'ACTIVE') {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: id }, role: UserRole.SUPER_ADMIN, status: 'ACTIVE' },
    });
    if (otherActiveAdmins === 0) {
      return NextResponse.json({ error: 'Tidak dapat menghapus Super Admin aktif terakhir.' }, { status: 400 });
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: databaseError(error) }, { status: 400 });
  }
}
