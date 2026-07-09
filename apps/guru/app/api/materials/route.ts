import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, splitLines } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

async function serialize(materialId: string) {
  const material = await prisma.material.findUniqueOrThrow({
    where: { id: materialId },
    include: { objectives: { orderBy: { orderNo: 'asc' } }, sections: { orderBy: { orderNo: 'asc' } } },
  });
  return {
    id: material.id,
    title: material.title,
    topicId: material.topicId,
    level: material.level || '',
    status: material.status,
    summaryHtml: material.summaryHtml || material.summaryText || '',
    objectivesText: material.objectives.map((item) => item.objective).join('\n'),
    sectionsHtml: material.sections.map((item) => item.contentHtml || item.contentText || '').join('\n<hr />\n'),
    coverImageUrl: material.coverImageUrl || '',
  };
}

async function saveNested(materialId: string, objectivesText: string, sectionsHtml: string) {
  await prisma.learningObjective.deleteMany({ where: { materialId } });
  await prisma.materialSection.deleteMany({ where: { materialId } });

  const objectives = splitLines(objectivesText);
  if (objectives.length) {
    await prisma.learningObjective.createMany({
      data: objectives.map((objective, index) => ({ materialId, orderNo: index + 1, objective })),
    });
  }

  const sections = String(sectionsHtml || '')
    .split(/<hr\s*\/?>/i)
    .map((item) => item.trim())
    .filter(Boolean);

  await prisma.materialSection.createMany({
    data: (sections.length ? sections : [String(sectionsHtml || '')]).map((content, index) => ({
      materialId,
      orderNo: index + 1,
      title: `Bagian ${index + 1}`,
      contentText: content.replace(/<[^>]+>/g, ' ').trim(),
      contentHtml: content,
    })),
  });
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.title || !body.topicId) return NextResponse.json({ error: 'Judul dan topik wajib diisi.' }, { status: 400 });

  const material = await prisma.material.create({
    data: {
      title: String(body.title),
      topicId: String(body.topicId),
      authorId: user.id,
      level: body.level ? String(body.level) : null,
      status: body.status || 'DRAFT',
      summaryHtml: body.summaryHtml ? String(body.summaryHtml) : null,
      summaryText: body.summaryHtml ? String(body.summaryHtml).replace(/<[^>]+>/g, ' ').trim() : null,
      coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
    },
  });

  await saveNested(material.id, String(body.objectivesText || ''), String(body.sectionsHtml || ''));
  return NextResponse.json({ data: await serialize(material.id) });
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID materi wajib ada.' }, { status: 400 });

  const owned = await prisma.material.findUnique({ where: { id: String(body.id) } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });

  await prisma.material.update({
    where: { id: String(body.id) },
    data: {
      title: String(body.title),
      topicId: String(body.topicId),
      level: body.level ? String(body.level) : null,
      status: body.status || 'DRAFT',
      summaryHtml: body.summaryHtml ? String(body.summaryHtml) : null,
      summaryText: body.summaryHtml ? String(body.summaryHtml).replace(/<[^>]+>/g, ' ').trim() : null,
      coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
    },
  });

  await saveNested(String(body.id), String(body.objectivesText || ''), String(body.sectionsHtml || ''));
  return NextResponse.json({ data: await serialize(String(body.id)) });
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'ID materi wajib ada.' }, { status: 400 });

    const owned = await prisma.material.findUnique({ where: { id } });
    if (!owned || owned.authorId !== user.id) {
      return NextResponse.json({ error: 'Materi tidak ditemukan atau bukan milik akun ini.' }, { status: 404 });
    }

    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: 'Materi berhasil dihapus.' });
  } catch (error) {
    console.error('DELETE /api/materials failed:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus materi. Silakan muat ulang halaman dan coba lagi.' },
      { status: 500 },
    );
  }
}
