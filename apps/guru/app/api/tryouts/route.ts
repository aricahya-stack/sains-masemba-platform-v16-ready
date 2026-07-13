import { NextResponse } from 'next/server';
import { prisma, TryoutStatus, UserRole } from '@sh/db';
import { getCurrentUser, normalizeTryoutCode, splitLines, toDateOrNull, toInt, tryoutCodeFromPeriodCode } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}


type ResolvedTryoutQuestion = {
  id: string;
  code: string;
  blueprint: { periodCode: string | null; testGroup: string | null } | null;
};

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
    include: { questions: { include: { question: { include: { blueprint: true } } }, orderBy: { orderNo: 'asc' } } },
  });
  const firstBlueprint = item.questions.map((row) => row.question.blueprint).find(Boolean);
  const tryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || item.title);
  return {
    id: item.id,
    _persisted: 'true',
    tryoutCode,
    sourceGroup: firstBlueprint?.testGroup || item.title,
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

async function resolveQuestions(
  authorId: string,
  questionCodesText: string,
  requireThirty: boolean,
  expectedTryoutCode = '',
) {
  const codes = splitLines(questionCodesText.replace(/,/g, '\n'));
  if (requireThirty && codes.length !== 30) {
    throw new Error(`Paket tryout wajib berisi tepat 30 kode soal. Saat ini terdapat ${codes.length} kode.`);
  }
  if (new Set(codes).size !== codes.length) throw new Error('Kode soal tryout tidak boleh duplikat dalam satu paket.');
  if (!codes.length) return [] as ResolvedTryoutQuestion[];

  const questions = await prisma.question.findMany({
    where: {
      code: { in: codes },
      OR: [
        { authorId },
        { author: { is: { role: UserRole.SUPER_ADMIN } } },
        { tryoutQuestions: { some: { tryout: { authorId } } } },
      ],
    },
    select: {
      id: true,
      code: true,
      blueprint: { select: { periodCode: true, testGroup: true } },
    },
  });

  const typedQuestions = questions as ResolvedTryoutQuestion[];
  const byCode = new Map(typedQuestions.map((question) => [question.code, question]));
  const missing = codes.filter((code) => !byCode.has(code));
  if (missing.length) {
    throw new Error(`Soal tryout berikut tidak ditemukan atau bukan milik guru ini: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`);
  }

  const ordered = codes.map((code) => byCode.get(code)!);
  if (requireThirty && ordered.length !== 30) throw new Error('Paket tryout wajib berisi tepat 30 soal yang valid.');

  if (requireThirty && expectedTryoutCode) {
    const normalizedExpected = normalizeTryoutCode(expectedTryoutCode);
    const mismatched = ordered.filter((question) =>
      tryoutCodeFromPeriodCode(question.blueprint?.periodCode, question.blueprint?.testGroup || '') !== normalizedExpected,
    );
    if (mismatched.length) {
      throw new Error(`Mapping ditolak: ${mismatched.length} soal tidak berasal dari kode tryout ${normalizedExpected}. Periksa kode_tryout pada file import.`);
    }
  }

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
    // Status soal (termasuk DRAFT) tidak membatasi penjadwalan; yang wajib adalah tepat 30 soal valid.
    const requireThirty = Boolean(body.sourceGroup);
    const questions = await resolveQuestions(user.id, String(body.questionCodes || ''), requireThirty, String(body.tryoutCode || body.sourceGroup || ''));
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
    const questions = await resolveQuestions(user.id, String(body.questionCodes || ''), requireThirty, String(body.tryoutCode || body.sourceGroup || ''));
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
