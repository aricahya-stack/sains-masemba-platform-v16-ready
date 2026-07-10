import { NextResponse } from 'next/server';
import { prisma, PublishStatus, QuestionType, ScoringMode, UserRole } from '@sh/db';
import { getCurrentUser, toFloat, toInt } from '@sh/core';

async function ensureTeacher() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.GURU ? user : null;
}

const optionLabels = ['A', 'B', 'C', 'D', 'E'];

function normalizeQuestionType(value: unknown): QuestionType {
  return value === QuestionType.MULTIPLE_CHOICE || value === QuestionType.TRUE_FALSE
    ? value
    : QuestionType.SINGLE_CHOICE;
}

function normalizeScoringMode(value: unknown): ScoringMode {
  return value === ScoringMode.PARTIAL_NO_PENALTY ? value : ScoringMode.EXACT_MATCH;
}

function normalizePublishStatus(value: unknown): PublishStatus {
  return value === PublishStatus.REVIEW ||
    value === PublishStatus.PUBLISHED ||
    value === PublishStatus.ARCHIVED
    ? value
    : PublishStatus.DRAFT;
}

function splitKey(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, '')
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trueFalseTokenToBoolean(value: string | undefined) {
  const token = String(value || '').trim().toLowerCase();
  if (['b', 'benar', 'true', 't', '1', 'ya', 'y'].includes(token)) return true;
  if (['s', 'salah', 'false', 'f', '0', 'tidak', 'n'].includes(token)) return false;
  return null;
}

function parseTrueFalseKey(value: unknown, labels: string[]) {
  const raw = String(value || '').trim();
  const result = new Map<string, boolean>();
  if (!raw) return result;

  const parts = raw.split(/[,;|/]+/).map((item) => item.trim()).filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const pair = part.match(/^([A-Ea-e]|\d+)\s*[:=]\s*(.+)$/);
    if (pair) {
      const labelRaw = pair[1].toUpperCase();
      const label = /^\d+$/.test(labelRaw) ? labels[Number(labelRaw) - 1] : labelRaw;
      const parsed = trueFalseTokenToBoolean(pair[2]);
      if (label && parsed !== null) result.set(label, parsed);
      continue;
    }

    const parsed = trueFalseTokenToBoolean(part);
    const label = labels[index];
    if (label && parsed !== null) result.set(label, parsed);
  }
  return result;
}

function getCorrectAnswers(questionType: QuestionType, options: Array<{ label: string; isCorrect: boolean }>) {
  if (questionType === QuestionType.TRUE_FALSE) {
    return options.map((option) => (option.isCorrect ? 'B' : 'S')).join(',');
  }
  return options.filter((option) => option.isCorrect).map((option) => option.label).join(',');
}

async function serialize(questionId: string) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      topic: true,
      blueprint: true,
      options: { orderBy: { label: 'asc' } },
    },
  });
  const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
  return {
    id: question.id,
    code: question.code,
    topicId: question.topicId,
    topicLabel: question.topic.title,
    blueprintId: question.blueprintId || '',
    blueprintLabel: question.blueprint?.code || 'Tanpa kisi-kisi',
    difficulty: question.difficulty || '',
    status: question.status,
    stimulusOrder: String(question.stimulusOrder),
    questionType: question.questionType,
    scoringMode: question.scoringMode,
    maxScore: String(question.maxScore || 1),
    questionHtml: question.questionHtml || question.questionText,
    explanation: question.explanation || '',
    optionA: byLabel.A || '',
    optionB: byLabel.B || '',
    optionC: byLabel.C || '',
    optionD: byLabel.D || '',
    optionE: byLabel.E || '',
    correctAnswers: getCorrectAnswers(question.questionType, question.options),
  };
}

async function saveOptions(questionId: string, body: Record<string, unknown>) {
  await prisma.questionOption.deleteMany({ where: { questionId } });
  const questionType = normalizeQuestionType(body.questionType);
  const options = optionLabels
    .map((label) => ({ label, text: String(body[`option${label}`] || '').trim() }))
    .filter((item) => item.text);
  if (!options.length) throw new Error('Minimal satu opsi atau pernyataan harus diisi.');

  const keySource = body.correctAnswers || body.correctOption;
  const correctLabelSet = new Set(splitKey(keySource).map((item) => item.toUpperCase()));
  const trueFalseKey = parseTrueFalseKey(keySource, options.map((option) => option.label));

  const data = options.map((option, index) => {
    let isCorrect = false;
    if (questionType === QuestionType.TRUE_FALSE) {
      isCorrect = trueFalseKey.has(option.label) ? Boolean(trueFalseKey.get(option.label)) : false;
    } else if (questionType === QuestionType.SINGLE_CHOICE) {
      const firstKey = splitKey(keySource)[0]?.toUpperCase() || '';
      isCorrect = option.label === firstKey;
    } else {
      isCorrect = correctLabelSet.has(option.label);
    }
    return {
      questionId,
      label: option.label,
      optionText: option.text,
      isCorrect,
    };
  });

  const hasCorrect = data.some((item) => item.isCorrect);
  if (questionType !== QuestionType.TRUE_FALSE && !hasCorrect) {
    throw new Error('Kunci jawaban wajib diisi. Untuk pilihan ganda kompleks, gunakan format A,C,D.');
  }
  if (questionType === QuestionType.SINGLE_CHOICE && data.filter((item) => item.isCorrect).length !== 1) {
    throw new Error('Pilihan ganda biasa harus memiliki tepat satu jawaban benar.');
  }

  await prisma.questionOption.createMany({ data });
}

function buildQuestionData(body: Record<string, unknown>) {
  return {
    code: String(body.code),
    topicId: String(body.topicId),
    blueprintId: body.blueprintId ? String(body.blueprintId) : null,
    stimulusOrder: toInt(body.stimulusOrder, 1),
    questionType: normalizeQuestionType(body.questionType),
    scoringMode: normalizeScoringMode(body.scoringMode),
    maxScore: Math.max(0.1, toFloat(body.maxScore, 1)),
    questionText: String(body.questionHtml).replace(/<[^>]+>/g, ' ').trim(),
    questionHtml: String(body.questionHtml),
    explanation: body.explanation ? String(body.explanation) : null,
    difficulty: body.difficulty ? String(body.difficulty) : null,
    status: normalizePublishStatus(body.status),
  };
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
      ...buildQuestionData(body),
      authorId: user.id,
    },
  });
  try {
    await saveOptions(question.id, body);
  } catch (error) {
    await prisma.question.delete({ where: { id: question.id } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Opsi soal tidak valid.' }, { status: 400 });
  }
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
    data: buildQuestionData(body),
  });
  try {
    await saveOptions(String(body.id), body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Opsi soal tidak valid.' }, { status: 400 });
  }
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
