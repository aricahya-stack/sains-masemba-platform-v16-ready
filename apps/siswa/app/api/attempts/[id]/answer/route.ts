import { NextResponse } from 'next/server';
import { prisma, QuestionType, UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';
import { attemptAccessState, finalizeAttempt } from '../../../../../lib/attempt-security';

async function ensureStudent() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SISWA ? user : null;
}

function uniqueIds(value: unknown) {
  return Array.isArray(value) ? Array.from(new Set(value.filter(Boolean).map(String))) : [];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await ensureStudent();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Payload JSON tidak valid.' }, { status: 400 });

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      tryout: {
        select: {
          status: true,
          startAt: true,
          endAt: true,
          durationMinutes: true,
          questions: { select: { questionId: true } },
        },
      },
    },
  });
  if (!attempt || attempt.userId !== user.id || attempt.submittedAt) {
    return NextResponse.json({ error: 'Attempt tidak valid.' }, { status: 404 });
  }
  const accessState = attemptAccessState(attempt, attempt.tryout);
  if (accessState === 'EXPIRED') {
    await finalizeAttempt(id, user.id);
    return NextResponse.json({ error: 'Waktu tryout telah berakhir. Jawaban sudah dikunci.' }, { status: 409 });
  }
  if (accessState !== 'ACTIVE') {
    return NextResponse.json({ error: accessState === 'PAUSED' ? 'Tryout sedang dijeda.' : 'Tryout belum dapat dikerjakan.' }, { status: 423 });
  }

  if (!body.questionId) return NextResponse.json({ error: 'Question ID wajib ada.' }, { status: 400 });
  const questionId = String(body.questionId);
  if (!attempt.tryout.questions.some((row) => row.questionId === questionId)) {
    return NextResponse.json({ error: 'Soal tidak termasuk dalam tryout ini.' }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      questionType: true,
      options: { select: { id: true }, orderBy: { label: 'asc' } },
    },
  });
  if (!question) return NextResponse.json({ error: 'Soal tidak ditemukan.' }, { status: 404 });

  const validOptionIds = new Set(question.options.map((option) => option.id));
  let selectedOptionId: string | null = null;
  let selectedOptionIds: string[] = [];
  let trueFalseAnswers: Record<string, boolean> | null = null;

  if (question.questionType === QuestionType.SINGLE_CHOICE) {
    selectedOptionId = body.selectedOptionId ? String(body.selectedOptionId) : null;
    if (selectedOptionId && !validOptionIds.has(selectedOptionId)) {
      return NextResponse.json({ error: 'Opsi jawaban tidak valid.' }, { status: 400 });
    }
    selectedOptionIds = selectedOptionId ? [selectedOptionId] : [];
  } else if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
    selectedOptionIds = uniqueIds(body.selectedOptionIds);
    if (selectedOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
      return NextResponse.json({ error: 'Opsi jawaban tidak valid.' }, { status: 400 });
    }
  } else {
    const raw = body.trueFalseAnswers;
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
      trueFalseAnswers = {};
    } else {
      trueFalseAnswers = {};
      for (const [optionId, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!validOptionIds.has(optionId) || typeof value !== 'boolean') {
          return NextResponse.json({ error: 'Jawaban benar-salah tidak valid.' }, { status: 400 });
        }
        trueFalseAnswers[optionId] = value;
      }
    }
  }

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId: id, questionId } },
    update: {
      selectedOptionId,
      selectedOptionIds,
      trueFalseAnswers,
      score: 0,
      isCorrect: false,
      answeredAt: new Date(),
    },
    create: {
      attemptId: id,
      questionId,
      selectedOptionId,
      selectedOptionIds,
      trueFalseAnswers,
      score: 0,
      isCorrect: false,
    },
  });

  return NextResponse.json({ ok: true });
}
