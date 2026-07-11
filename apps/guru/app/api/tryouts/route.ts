import { NextResponse } from 'next/server';
import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { getCurrentUser, splitLines, toDateOrNull, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}


function normalizeTryoutStatus(value: unknown): TryoutStatus {
  return value === TryoutStatus.SCHEDULED ||
    value === TryoutStatus.OPEN ||
    value === TryoutStatus.PAUSED ||
    value === TryoutStatus.ENDED ||
    value === TryoutStatus.ARCHIVED
    ? value
    : TryoutStatus.DRAFT;
}

async function serialize(tryoutId: string) {
  const item = await prisma.tryout.findUniqueOrThrow({
    where: { id: tryoutId },
    include: { questions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
  });
  return {
    id: item.id,
    _persisted: 'true',
    title: item.title,
    description: item.description || '',
    durationMinutes: String(item.durationMinutes),
    status: item.status,
    startAt: item.startAt ? item.startAt.toISOString().slice(0, 16) : '',
    endAt: item.endAt ? item.endAt.toISOString().slice(0, 16) : '',
    questionCodes: item.questions.map((row) => row.question.code).join('\n'),
    questionCount: String(item.questions.length),
    mappingStatus: item.questions.length === 30 ? 'Sudah dijadwalkan' : `Belum lengkap (${item.questions.length}/30)`,
    rulesHtml: item.rulesHtml || '',
  };
}

async function resolveQuestions(authorId: string, questionCodesText: string, requireThirty: boolean) {
  const codes = splitLines(questionCodesText.replace(/,/g, '\n'));
  if (requireThirty && codes.length !== 30) {
    throw new Error(`Paket tryout wajib berisi tepat 30 kode soal. Saat ini terdapat ${codes.length} kode.`);
  }
  if (new Set(codes).size !== codes.length) throw new Error('Kode soal tryout tidak boleh duplikat dalam satu paket.');
  if (!codes.length) return [] as Array<{ id: string; code: string }>;

  const questions = await prisma.question.findMany({
    where: {
      code: { in: codes },
      OR: [
        { authorId },
        { tryoutQuestions: { some: { tryout: { authorId } } } },
      ],
    },
    select: { id: true, code: true },
  }) as Array<{ id: string; code: string }>;
  const byCode = new Map(questions.map((question) => [question.code, question]));
  const missing = codes.filter((code) => !byCode.has(code));
  if (missing.length) {
    throw new Error(`Soal tryout berikut tidak ditemukan atau bukan milik guru ini: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`);
  }
  const ordered = codes.map((code) => byCode.get(code)!);
  if (requireThirty && ordered.length !== 30) throw new Error('Paket tryout wajib berisi tepat 30 soal yang valid.');
  return ordered;
}

function tryoutData(body: Record<string, unknown>) {
  const startAt = toDateOrNull(body.startAt);
  const endAt = toDateOrNull(body.endAt);
  if (startAt && endAt && endAt <= startAt) throw new Error('Waktu selesai harus setelah waktu mulai.');
  return {
    title: String(body.title || '').trim(),
    description: body.description ? String(body.description) : null,
    durationMinutes: Math.max(1, toInt(body.durationMinutes, 60)),
    status: normalizeTryoutStatus(body.status),
    startAt,
    endAt,
    rulesHtml: body.rulesHtml ? String(body.rulesHtml) : null,
  };
}

export async function POST(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const data = tryoutData(body);
    if (!data.title) throw new Error('Judul tryout wajib diisi.');
    const requireThirty = Boolean(body.sourceGroup);
    const questions = await resolveQuestions(user.id, String(body.questionCodes || ''), requireThirty);
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.tryout.create({ data: { authorId: user.id, ...data } });
      if (questions.length) {
        await tx.tryoutQuestion.createMany({
          data: questions.map((question, index) => ({ tryoutId: created.id, questionId: question.id, orderNo: index + 1 })),
        });
      }
      return created;
    });
    return NextResponse.json({ data: await serialize(item.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan jadwal tryout.' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const tryoutId = String(body.id || '');
  const owned = await prisma.tryout.findUnique({ where: { id: tryoutId } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });

  try {
    const data = tryoutData(body);
    if (!data.title) throw new Error('Judul tryout wajib diisi.');
    const requireThirty = Boolean(body.sourceGroup);
    const questions = await resolveQuestions(user.id, String(body.questionCodes || ''), requireThirty);
    await prisma.$transaction(async (tx) => {
      await tx.tryout.update({ where: { id: tryoutId }, data });
      await tx.tryoutQuestion.deleteMany({ where: { tryoutId } });
      if (questions.length) {
        await tx.tryoutQuestion.createMany({
          data: questions.map((question, index) => ({ tryoutId, questionId: question.id, orderNo: index + 1 })),
        });
      }
    });
    return NextResponse.json({ data: await serialize(tryoutId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui jadwal tryout.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await ensureTeacher();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const tryoutId = String(body.id || '');
  const owned = await prisma.tryout.findUnique({ where: { id: tryoutId } });
  if (!owned || owned.authorId !== user.id) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });

  try {
    await prisma.tryout.delete({ where: { id: tryoutId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Jadwal tryout tidak dapat dihapus karena sudah memiliki pengerjaan siswa.' }, { status: 400 });
  }
}
