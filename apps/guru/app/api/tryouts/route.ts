import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, splitLines, toDateOrNull, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

async function serialize(tryoutId: string) {
  const item = await prisma.tryout.findUniqueOrThrow({
    where: { id: tryoutId },
    include: { questions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
  });
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    durationMinutes: String(item.durationMinutes),
    status: item.status,
    startAt: item.startAt ? item.startAt.toISOString().slice(0, 16) : '',
    endAt: item.endAt ? item.endAt.toISOString().slice(0, 16) : '',
    questionCodes: item.questions.map((row) => row.question.code).join('\n'),
    rulesHtml: item.rulesHtml || '',
  };
}

async function saveQuestions(tryoutId: string, authorId: string, questionCodesText: string) {
  await prisma.tryoutQuestion.deleteMany({ where: { tryoutId } });
  const codes = splitLines(questionCodesText.replace(/,/g, '\n'));
  if (!codes.length) return;
  const questions = await prisma.question.findMany({
    where: {
      code: { in: codes },
      authorId,
    },
    orderBy: { code: 'asc' },
  });
  await prisma.tryoutQuestion.createMany({
    data: questions.map((question, index) => ({ tryoutId, questionId: question.id, orderNo: index + 1 })),
  });
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: 'Judul tryout wajib diisi.' }, { status: 400 });

  const item = await prisma.tryout.create({
    data: {
      authorId: user.id,
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      durationMinutes: toInt(body.durationMinutes, 60),
      status: body.status || 'DRAFT',
      startAt: toDateOrNull(body.startAt),
      endAt: toDateOrNull(body.endAt),
      rulesHtml: body.rulesHtml ? String(body.rulesHtml) : null,
    },
  });
  await saveQuestions(item.id, user.id, String(body.questionCodes || ''));
  return NextResponse.json({ data: await serialize(item.id) });
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const owned = await prisma.tryout.findUnique({ where: { id: String(body.id) } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });

  await prisma.tryout.update({
    where: { id: String(body.id) },
    data: {
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      durationMinutes: toInt(body.durationMinutes, 60),
      status: body.status || 'DRAFT',
      startAt: toDateOrNull(body.startAt),
      endAt: toDateOrNull(body.endAt),
      rulesHtml: body.rulesHtml ? String(body.rulesHtml) : null,
    },
  });
  await saveQuestions(String(body.id), user.id, String(body.questionCodes || ''));
  return NextResponse.json({ data: await serialize(String(body.id)) });
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const owned = await prisma.tryout.findUnique({ where: { id: String(body.id) } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });

  await prisma.tryout.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
