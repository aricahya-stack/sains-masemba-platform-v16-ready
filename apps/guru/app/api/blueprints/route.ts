import { NextResponse } from 'next/server';
import { prisma, UserRole } from '@sh/db';
import { getCurrentUser, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

function serialize(item: {
  id: string;
  code: string;
  topicId: string | null;
  competency: string;
  indicator: string;
  materialName: string | null;
  cognitiveLevel: string | null;
  targetDifficulty: string | null;
  targetQuestionCount: number;
  blueprintText: string | null;
  testGroup: string | null;
}) {
  return {
    id: item.id,
    code: item.code,
    testGroup: item.testGroup || '',
    topicId: item.topicId || '',
    competency: item.competency,
    indicator: item.indicator,
    materialName: item.materialName || '',
    cognitiveLevel: item.cognitiveLevel || '',
    targetDifficulty: item.targetDifficulty || '',
    targetQuestionCount: String(item.targetQuestionCount),
    blueprintText: item.blueprintText || '',
  };
}

export async function POST(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.code || !body.competency || !body.indicator) {
    return NextResponse.json({ error: 'Kode, kompetensi, dan indikator wajib diisi.' }, { status: 400 });
  }

  const blueprint = await prisma.blueprint.create({
    data: {
      code: String(body.code),
      testGroup: body.testGroup ? String(body.testGroup) : null,
      topicId: body.topicId ? String(body.topicId) : null,
      competency: String(body.competency),
      indicator: String(body.indicator),
      materialName: body.materialName ? String(body.materialName) : null,
      cognitiveLevel: body.cognitiveLevel ? String(body.cognitiveLevel) : null,
      targetDifficulty: body.targetDifficulty ? String(body.targetDifficulty) : null,
      targetQuestionCount: toInt(body.targetQuestionCount, 0),
      blueprintText: body.blueprintText ? String(body.blueprintText) : null,
    },
  });
  return NextResponse.json({ data: serialize(blueprint) });
}

export async function PUT(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'ID kisi-kisi wajib ada.' }, { status: 400 });

  const blueprint = await prisma.blueprint.update({
    where: { id: String(body.id) },
    data: {
      code: String(body.code),
      testGroup: body.testGroup ? String(body.testGroup) : null,
      topicId: body.topicId ? String(body.topicId) : null,
      competency: String(body.competency),
      indicator: String(body.indicator),
      materialName: body.materialName ? String(body.materialName) : null,
      cognitiveLevel: body.cognitiveLevel ? String(body.cognitiveLevel) : null,
      targetDifficulty: body.targetDifficulty ? String(body.targetDifficulty) : null,
      targetQuestionCount: toInt(body.targetQuestionCount, 0),
      blueprintText: body.blueprintText ? String(body.blueprintText) : null,
    },
  });
  return NextResponse.json({ data: serialize(blueprint) });
}

export async function DELETE(request: Request) {
  if (!(await ensureTeacher())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  await prisma.blueprint.delete({ where: { id: String(body.id) } });
  return NextResponse.json({ ok: true });
}
