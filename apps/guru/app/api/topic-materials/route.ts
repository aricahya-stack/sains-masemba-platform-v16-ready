import { NextResponse } from 'next/server';
import { prisma, PublishStatus, UserRole } from '@sh/db';
import { getCurrentUser, slugify, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

function stripHtml(value: unknown) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToLines(value: unknown) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeStatus(value: unknown): PublishStatus {
  return value === PublishStatus.REVIEW || value === PublishStatus.PUBLISHED || value === PublishStatus.ARCHIVED
    ? value
    : PublishStatus.DRAFT;
}

async function saveNested(db: any, materialId: string, objectivesHtml: string, sectionsHtml: string) {
  await db.learningObjective.deleteMany({ where: { materialId } });
  await db.materialSection.deleteMany({ where: { materialId } });

  const objectives = htmlToLines(objectivesHtml);
  if (objectives.length) {
    await db.learningObjective.createMany({
      data: objectives.map((objective, index) => ({ materialId, orderNo: index + 1, objective })),
    });
  }

  const sections = String(sectionsHtml || '')
    .split(/<hr\s*\/?>/i)
    .map((item) => item.trim())
    .filter(Boolean);

  const contentRows = sections.length ? sections : (sectionsHtml ? [sectionsHtml] : []);
  if (contentRows.length) {
    await db.materialSection.createMany({
      data: contentRows.map((content, index) => ({
        materialId,
        orderNo: index + 1,
        title: `Bagian ${index + 1}`,
        contentText: stripHtml(content),
        contentHtml: content,
      })),
    });
  }
}

async function serialize(materialId: string) {
  const material = await prisma.material.findUniqueOrThrow({
    where: { id: materialId },
    include: {
      topic: true,
      objectives: { orderBy: { orderNo: 'asc' } },
      sections: { orderBy: { orderNo: 'asc' } },
    },
  });

  return {
    id: material.id,
    _persisted: 'true',
    topicId: material.topicId,
    materialId: material.id,
    topicTitle: material.topic.title,
    subject: material.topic.subject,
    orderNo: String(material.topic.orderNo),
    topicDescription: material.topic.description || '',
    materialTitle: material.title,
    level: material.level || '',
    status: material.status,
    summaryHtml: material.summaryHtml || material.summaryText || '',
    objectivesText: material.objectives.map((item) => `<p>${item.objective}</p>`).join(''),
    sectionsHtml: material.sections.map((item) => item.contentHtml || item.contentText || '').join('\n<hr />\n'),
    coverImageUrl: material.coverImageUrl || '',
  };
}


async function serializeTopicOnly(topicId: string) {
  const topic = await prisma.topic.findUniqueOrThrow({ where: { id: topicId } });
  return {
    id: `topic:${topic.id}`,
    _persisted: 'true',
    topicId: topic.id,
    materialId: '',
    topicTitle: topic.title,
    subject: topic.subject,
    orderNo: String(topic.orderNo),
    topicDescription: topic.description || '',
    materialTitle: '',
    level: '',
    status: 'DRAFT',
    summaryHtml: '',
    objectivesText: '',
    sectionsHtml: '',
    coverImageUrl: '',
  };
}

async function upsertTopic(db: any, body: Record<string, unknown>, existingTopicId?: string) {
  const title = String(body.topicTitle || '').trim();
  if (!title) throw new Error('Nama topik wajib diisi.');
  const slug = slugify(title);
  const data = {
    title,
    slug,
    subject: String(body.subject || 'IPA SMP').trim() || 'IPA SMP',
    description: body.topicDescription ? String(body.topicDescription) : null,
    orderNo: toInt(body.orderNo, 0),
  };

  if (existingTopicId) {
    return db.topic.update({ where: { id: existingTopicId }, data });
  }

  const existing = await db.topic.findUnique({ where: { slug } });
  if (existing) return db.topic.update({ where: { id: existing.id }, data });
  return db.topic.create({ data });
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const materialTitle = String(body.materialTitle || '').trim();

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const topic = await upsertTopic(tx, body, body.topicId ? String(body.topicId) : undefined);
      if (!materialTitle) return { topicId: topic.id, materialId: '' };
      const material = await tx.material.create({
        data: {
          topicId: topic.id,
          authorId: user.id,
          title: materialTitle,
          level: body.level ? String(body.level) : null,
          status: normalizeStatus(body.status),
          summaryHtml: body.summaryHtml ? String(body.summaryHtml) : null,
          summaryText: stripHtml(body.summaryHtml) || null,
          coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
        },
      });
      await saveNested(tx, material.id, String(body.objectivesText || ''), String(body.sectionsHtml || ''));
      return { topicId: topic.id, materialId: material.id };
    });
    return NextResponse.json({ data: saved.materialId ? await serialize(saved.materialId) : await serializeTopicOnly(saved.topicId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan topik dan materi.' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const rawId = String(body.id || '');
  const materialId = String(body.materialId || (rawId.startsWith('topic:') ? '' : rawId));
  const topicOnlyId = String(body.topicId || (rawId.startsWith('topic:') ? rawId.slice(6) : ''));
  const materialTitle = String(body.materialTitle || '').trim();

  if (!materialId) {
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const topic = await upsertTopic(tx, body, topicOnlyId || undefined);
        if (!materialTitle) return { topicId: topic.id, materialId: '' };
        const material = await tx.material.create({
          data: {
            topicId: topic.id,
            authorId: user.id,
            title: materialTitle,
            level: body.level ? String(body.level) : null,
            status: normalizeStatus(body.status),
            summaryHtml: body.summaryHtml ? String(body.summaryHtml) : null,
            summaryText: stripHtml(body.summaryHtml) || null,
            coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
          },
        });
        await saveNested(tx, material.id, String(body.objectivesText || ''), String(body.sectionsHtml || ''));
        return { topicId: topic.id, materialId: material.id };
      });
      return NextResponse.json({ data: saved.materialId ? await serialize(saved.materialId) : await serializeTopicOnly(saved.topicId) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui topik.' }, { status: 400 });
    }
  }

  const owned = await prisma.material.findUnique({ where: { id: materialId } });
  if (!owned) return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });
  if (!materialTitle) return NextResponse.json({ error: 'Judul materi wajib diisi.' }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const topic = await upsertTopic(tx, body, owned.topicId);
      await tx.material.update({
        where: { id: materialId },
        data: {
          topicId: topic.id,
          title: materialTitle,
          level: body.level ? String(body.level) : null,
          status: normalizeStatus(body.status),
          summaryHtml: body.summaryHtml ? String(body.summaryHtml) : null,
          summaryText: stripHtml(body.summaryHtml) || null,
          coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
        },
      });
      await saveNested(tx, materialId, String(body.objectivesText || ''), String(body.sectionsHtml || ''));
    });
    return NextResponse.json({ data: await serialize(materialId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui topik dan materi.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const rawId = String(body.id || '');
  if (!rawId) return NextResponse.json({ error: 'ID data wajib ada.' }, { status: 400 });

  if (rawId.startsWith('topic:')) {
    const topicId = rawId.slice(6);
    try {
      await prisma.$transaction(async (tx) => {
        const usage = await tx.topic.findUnique({
          where: { id: topicId },
          select: { _count: { select: { materials: true, questions: true, blueprints: true } } },
        });
        if (!usage) throw new Error('Topik tidak ditemukan.');
        if (usage._count.materials + usage._count.questions + usage._count.blueprints > 0) {
          throw new Error('Topik masih digunakan dan tidak dapat dihapus.');
        }
        await tx.topic.delete({ where: { id: topicId } });
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Topik tidak dapat dihapus.' }, { status: 409 });
    }
  }

  const materialId = rawId;
  const owned = await prisma.material.findUnique({ where: { id: materialId } });
  if (!owned) return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const topicId = owned.topicId;
      await tx.material.delete({ where: { id: materialId } });
      const topicUsage = await tx.topic.findUnique({
        where: { id: topicId },
        select: { _count: { select: { materials: true, questions: true, blueprints: true } } },
      });
      if (topicUsage && topicUsage._count.materials + topicUsage._count.questions + topicUsage._count.blueprints === 0) {
        await tx.topic.delete({ where: { id: topicId } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Materi tidak dapat dihapus karena masih digunakan.' }, { status: 400 });
  }
}
