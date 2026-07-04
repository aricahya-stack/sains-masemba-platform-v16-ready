import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

async function serialize(linkId: string) {
  const link = await prisma.parentStudentLink.findUniqueOrThrow({
    where: { id: linkId },
    include: { parent: true, student: true },
  });
  return {
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    relationType: link.relationType,
    isActive: String(link.isActive),
    parentName: link.parent.fullName,
    studentName: link.student.fullName,
  };
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.parentId || !body.studentId) return NextResponse.json({ error: 'Orang tua dan siswa wajib dipilih.' }, { status: 400 });

  const link = await prisma.parentStudentLink.create({
    data: {
      parentId: String(body.parentId),
      studentId: String(body.studentId),
      relationType: String(body.relationType || 'Wali'),
      isActive: String(body.isActive || 'true') === 'true',
    },
  });
  return NextResponse.json({ data: await serialize(link.id) });
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID relasi wajib ada.' }, { status: 400 });

  const link = await prisma.parentStudentLink.update({
    where: { id: String(body.id) },
    data: {
      parentId: String(body.parentId),
      studentId: String(body.studentId),
      relationType: String(body.relationType || 'Wali'),
      isActive: String(body.isActive || 'true') === 'true',
    },
  });
  return NextResponse.json({ data: await serialize(link.id) });
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID relasi wajib ada.' }, { status: 400 });

  await prisma.parentStudentLink.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
