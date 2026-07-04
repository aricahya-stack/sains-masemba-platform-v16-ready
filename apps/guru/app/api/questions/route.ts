import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

async function serialize(questionId: string) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: { orderBy: { label: 'asc' } } },
  });
  const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
  return {
    id: question.id,
    code: question.code,
    topicId: question.topicId,
    blueprintId: question.blueprintId || '',
    difficulty: question.difficulty || '',
    status: question.status,
    stimulusOrder: String(question.stimulusOrder),
    questionHtml: question.questionHtml || question.questionText,
    explanation: question.explanation || '',
    optionA: byLabel.A || '',
    optionB: byLabel.B || '',
    optionC: byLabel.C || '',
    optionD: byLabel.D || '',
    optionE: byLabel.E || '',
    correctOption: question.options.find((item) => item.isCorrect)?.label || '',
  };
}

async function saveOptions(questionId: string, body: Record<string, unknown>) {
  await prisma.questionOption.deleteMany({ where: { questionId } });
  const options = ['A', 'B', 'C', 'D', 'E']
    .map((label) => ({ label, text: String(body[`option${label}`] || '').trim() }))
    .filter((item) => item.text);
  if (!options.length) throw new Error('Minimal satu opsi harus diisi.');

  await prisma.questionOption.createMany({
    data: options.map((option) => ({
      questionId,
      label: option.label,
      optionText: option.text,
      isCorrect: String(body.correctOption || '') === option.label,
    })),
  });
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.code || !body.topicId || !body.questionHtml) {
    return NextResponse.json({ error: 'Kode soal, topik, dan isi soal wajib diisi.' }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      code: String(body.code),
      topicId: String(body.topicId),
      blueprintId: body.blueprintId ? String(body.blueprintId) : null,
      authorId: user.id,
      stimulusOrder: toInt(body.stimulusOrder, 1),
      questionText: String(body.questionHtml).replace(/<[^>]+>/g, ' ').trim(),
      questionHtml: String(body.questionHtml),
      explanation: body.explanation ? String(body.explanation) : null,
      difficulty: body.difficulty ? String(body.difficulty) : null,
      status: body.status || 'DRAFT',
    },
  });
  await saveOptions(question.id, body);
  return NextResponse.json({ data: await serialize(question.id) });
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID soal wajib ada.' }, { status: 400 });

  const owned = await prisma.question.findUnique({ where: { id: String(body.id) } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Soal tidak ditemukan.' }, { status: 404 });

  await prisma.question.update({
    where: { id: String(body.id) },
    data: {
      code: String(body.code),
      topicId: String(body.topicId),
      blueprintId: body.blueprintId ? String(body.blueprintId) : null,
      stimulusOrder: toInt(body.stimulusOrder, 1),
      questionText: String(body.questionHtml).replace(/<[^>]+>/g, ' ').trim(),
      questionHtml: String(body.questionHtml),
      explanation: body.explanation ? String(body.explanation) : null,
      difficulty: body.difficulty ? String(body.difficulty) : null,
      status: body.status || 'DRAFT',
    },
  });
  await saveOptions(String(body.id), body);
  return NextResponse.json({ data: await serialize(String(body.id)) });
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const owned = await prisma.question.findUnique({ where: { id: String(body.id) } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Soal tidak ditemukan.' }, { status: 404 });

  await prisma.question.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
