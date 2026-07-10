import { NextResponse } from 'next/server';
import { prisma, PublishStatus, UserRole } from '@sh/db';
import { getCurrentUser, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

function serialize(item: {
  id: string;
  category: string;
  title: string;
  contentHtml: string;
  orderNo: number;
  status: string;
}) {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    contentHtml: item.contentHtml,
    orderNo: String(item.orderNo),
    status: item.status,
  };
}

function normalizeStatus(value: unknown): PublishStatus {
  if (value === PublishStatus.REVIEW) return PublishStatus.REVIEW;
  if (value === PublishStatus.PUBLISHED) return PublishStatus.PUBLISHED;
  if (value === PublishStatus.ARCHIVED) return PublishStatus.ARCHIVED;
  return PublishStatus.DRAFT;
}

function buildData(body: Record<string, unknown>) {
  return {
    category: String(body.category || '').trim(),
    title: String(body.title || '').trim(),
    contentHtml: String(body.contentHtml || '').trim(),
    orderNo: toInt(body.orderNo, 0),
    status: normalizeStatus(body.status),
  };
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const data = buildData(body);
  if (!data.category || !data.title || !data.contentHtml) {
    return NextResponse.json({ error: 'Kategori, judul, dan isi tips wajib diisi.' }, { status: 400 });
  }

  const item = await prisma.tkadTip.create({ data: { ...data, authorId: user.id } });
  return NextResponse.json({ data: serialize(item) });
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'ID tips wajib ada.' }, { status: 400 });
  const owned = await prisma.tkadTip.findUnique({ where: { id } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tips TKAD tidak ditemukan.' }, { status: 404 });

  const data = buildData(body);
  if (!data.category || !data.title || !data.contentHtml) {
    return NextResponse.json({ error: 'Kategori, judul, dan isi tips wajib diisi.' }, { status: 400 });
  }
  const item = await prisma.tkadTip.update({ where: { id }, data });
  return NextResponse.json({ data: serialize(item) });
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || '');
  const owned = await prisma.tkadTip.findUnique({ where: { id } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tips TKAD tidak ditemukan.' }, { status: 404 });

  await prisma.tkadTip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
