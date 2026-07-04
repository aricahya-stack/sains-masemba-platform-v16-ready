import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, slugify, toInt } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

function serialize(topic: { id: string; title: string; slug: string; subject: string; orderNo: number; description: string | null }) {
  return {
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    subject: topic.subject,
    orderNo: String(topic.orderNo),
    description: topic.description || '',
  };
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: 'Judul topik wajib diisi.' }, { status: 400 });

  const topic = await prisma.topic.create({
    data: {
      title: String(body.title),
      slug: String(body.slug || slugify(body.title)),
      subject: String(body.subject || 'IPA SMP'),
      orderNo: toInt(body.orderNo, 0),
      description: body.description ? String(body.description) : null,
    },
  });
  return NextResponse.json({ data: serialize(topic) });
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID topik wajib ada.' }, { status: 400 });

  const topic = await prisma.topic.update({
    where: { id: String(body.id) },
    data: {
      title: String(body.title),
      slug: String(body.slug || slugify(body.title)),
      subject: String(body.subject || 'IPA SMP'),
      orderNo: toInt(body.orderNo, 0),
      description: body.description ? String(body.description) : null,
    },
  });
  return NextResponse.json({ data: serialize(topic) });
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID topik wajib ada.' }, { status: 400 });

  await prisma.topic.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
