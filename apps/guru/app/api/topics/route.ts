import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, slugify, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

function serialize(topic: {
  id: string;
  title: string;
  slug: string;
  subject: string;
  description: string | null;
  orderNo: number;
}) {
  return {
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    subject: topic.subject,
    description: topic.description || '',
    orderNo: String(topic.orderNo),
  };
}

function topicData(body: Record<string, unknown>) {
  const title = String(body.title || '').trim();
  return {
    title,
    slug: slugify(title),
    subject: String(body.subject || 'IPA SMP').trim() || 'IPA SMP',
    description: body.description ? String(body.description) : null,
    orderNo: toInt(body.orderNo, 0),
  };
}

export async function POST(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const data = topicData(body);
  if (!data.title || !data.slug) return NextResponse.json({ error: 'Judul topik wajib diisi.' }, { status: 400 });

  try {
    const topic = await prisma.topic.create({ data });
    return NextResponse.json({ data: serialize(topic) });
  } catch (error) {
    console.error('POST /api/topics failed:', error);
    return NextResponse.json({ error: 'Judul atau slug topik sudah digunakan.' }, { status: 409 });
  }
}

export async function PUT(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.id) return NextResponse.json({ error: 'ID topik wajib ada.' }, { status: 400 });
  const data = topicData(body);
  if (!data.title || !data.slug) return NextResponse.json({ error: 'Judul topik wajib diisi.' }, { status: 400 });

  try {
    const topic = await prisma.topic.update({ where: { id: String(body.id) }, data });
    return NextResponse.json({ data: serialize(topic) });
  } catch (error) {
    console.error('PUT /api/topics failed:', error);
    return NextResponse.json({ error: 'Topik tidak ditemukan atau judulnya sudah digunakan.' }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'ID topik wajib ada.' }, { status: 400 });

  const usage = await prisma.topic.findUnique({
    where: { id },
    select: {
      _count: { select: { materials: true, blueprints: true, questions: true } },
    },
  });
  if (!usage) return NextResponse.json({ error: 'Topik tidak ditemukan.' }, { status: 404 });
  const usedBy = usage._count.materials + usage._count.blueprints + usage._count.questions;
  if (usedBy > 0) {
    return NextResponse.json(
      { error: 'Topik masih digunakan oleh materi, kisi-kisi, atau soal. Pindahkan data terkait sebelum menghapus.' },
      { status: 409 },
    );
  }

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
