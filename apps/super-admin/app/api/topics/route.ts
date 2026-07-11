import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, isInternalTryoutTopicSlug, normalizeTopicCode, toInt } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

function serialize(topic: { id: string; title: string; slug: string; subject: string; orderNo: number; description: string | null }) {
  return {
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    code: topic.slug,
    subject: topic.subject,
    orderNo: String(topic.orderNo),
    description: topic.description || '',
  };
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: 'Judul topik wajib diisi.' }, { status: 400 });
  const topicCode = normalizeTopicCode(body.code || body.slug, body.title);
  if (isInternalTryoutTopicSlug(topicCode)) return NextResponse.json({ error: 'Prefix __tryout__- dicadangkan untuk topik internal tryout.' }, { status: 400 });

  const topic = await prisma.topic.create({
    data: {
      title: String(body.title),
      slug: topicCode,
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
  const topicCode = normalizeTopicCode(body.code || body.slug, body.title);
  if (isInternalTryoutTopicSlug(topicCode)) return NextResponse.json({ error: 'Prefix __tryout__- dicadangkan untuk topik internal tryout.' }, { status: 400 });

  const topic = await prisma.topic.update({
    where: { id: String(body.id) },
    data: {
      title: String(body.title),
      slug: topicCode,
      subject: String(body.subject || 'IPA SMP'),
      orderNo: toInt(body.orderNo, 0),
      description: body.description ? String(body.description) : null,
    },
  });
  return NextResponse.json({ data: serialize(topic) });
}

export async function DELETE(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'ID topik wajib ada.' }, { status: 400 });

    const existing = await prisma.topic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        _count: { select: { materials: true, questions: true, blueprints: true } },
      },
    });

    if (!existing) return NextResponse.json({ error: 'Topik tidak ditemukan.' }, { status: 404 });

    const deleted = await prisma.$transaction(async (tx) => {
      const blueprintIds = (
        await tx.blueprint.findMany({ where: { topicId: id }, select: { id: true } })
      ).map((item) => item.id);

      // Blueprint milik topik dapat direferensikan soal. Lepaskan referensinya dulu agar penghapusan bersih.
      if (blueprintIds.length) {
        await tx.question.updateMany({
          where: { blueprintId: { in: blueprintIds } },
          data: { blueprintId: null },
        });
      }

      // Child records QuestionOption, TryoutQuestion, AttemptAnswer,
      // MaterialSection, dan LearningObjective terhapus melalui onDelete: Cascade.
      const questions = await tx.question.deleteMany({ where: { topicId: id } });
      const materials = await tx.material.deleteMany({ where: { topicId: id } });
      const blueprints = await tx.blueprint.deleteMany({ where: { topicId: id } });
      await tx.topic.delete({ where: { id } });

      return {
        topic: 1,
        materials: materials.count,
        questions: questions.count,
        blueprints: blueprints.count,
      };
    });

    return NextResponse.json({
      ok: true,
      message: `Topik "${existing.title}" beserta konten terkait berhasil dihapus.`,
      deleted,
    });
  } catch (error) {
    console.error('DELETE /api/topics failed:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus topik. Server telah mengembalikan respons JSON yang aman. Periksa log server untuk detail teknis.' },
      { status: 500 },
    );
  }
}
