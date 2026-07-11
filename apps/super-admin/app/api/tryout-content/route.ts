import { NextResponse } from 'next/server';
import { prisma, PublishStatus, QuestionType, ScoringMode, UserRole } from '@sh/db';
import { getCurrentUser, toFloat, toInt } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

async function resolveAuthorId(value: unknown, fallbackId: string) {
  const authorId = String(value || fallbackId);
  const author = await prisma.user.findFirst({
    where: { id: authorId, role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } },
    select: { id: true },
  });
  if (!author) throw new Error('Pemilik soal tryout tidak valid.');
  return author.id;
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
  return value === PublishStatus.REVIEW || value === PublishStatus.PUBLISHED || value === PublishStatus.ARCHIVED
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
  const parts = String(value || '').split(/[,;|/]+/).map((item) => item.trim()).filter(Boolean);
  const result = new Map<string, boolean>();
  for (let index = 0; index < parts.length; index += 1) {
    const pair = parts[index].match(/^([A-Ea-e]|\d+)\s*[:=]\s*(.+)$/);
    if (pair) {
      const rawLabel = pair[1].toUpperCase();
      const label = /^\d+$/.test(rawLabel) ? labels[Number(rawLabel) - 1] : rawLabel;
      const parsed = trueFalseTokenToBoolean(pair[2]);
      if (label && parsed !== null) result.set(label, parsed);
      continue;
    }
    const parsed = trueFalseTokenToBoolean(parts[index]);
    if (labels[index] && parsed !== null) result.set(labels[index], parsed);
  }
  return result;
}

function buildOptions(body: Record<string, unknown>) {
  const questionType = normalizeQuestionType(body.questionType);
  const options = optionLabels
    .map((label) => ({ label, optionText: String(body[`option${label}`] || '').trim() }))
    .filter((item) => item.optionText);
  if (options.length < 2) throw new Error('Minimal dua opsi atau pernyataan harus diisi.');

  const keySource = body.correctAnswers;
  const correctSet = new Set(splitKey(keySource).map((item) => item.toUpperCase()));
  const trueFalseMap = parseTrueFalseKey(keySource, options.map((option) => option.label));
  const data = options.map((option) => {
    if (questionType === QuestionType.TRUE_FALSE) {
      if (!trueFalseMap.has(option.label)) throw new Error('Kunci benar-salah harus diisi untuk setiap pernyataan dengan format B,S,B.');
      return { ...option, isCorrect: Boolean(trueFalseMap.get(option.label)) };
    }
    if (questionType === QuestionType.SINGLE_CHOICE) {
      const key = splitKey(keySource)[0]?.toUpperCase() || '';
      return { ...option, isCorrect: option.label === key };
    }
    return { ...option, isCorrect: correctSet.has(option.label) };
  });

  if (questionType === QuestionType.SINGLE_CHOICE && data.filter((item) => item.isCorrect).length !== 1) {
    throw new Error('Pilihan ganda biasa harus memiliki tepat satu kunci jawaban.');
  }
  if (questionType === QuestionType.MULTIPLE_CHOICE && !data.some((item) => item.isCorrect)) {
    throw new Error('Pilihan ganda kompleks harus memiliki minimal satu jawaban benar.');
  }
  return data;
}

function correctAnswers(questionType: QuestionType, options: Array<{ label: string; isCorrect: boolean }>) {
  return questionType === QuestionType.TRUE_FALSE
    ? options.map((option) => (option.isCorrect ? 'B' : 'S')).join(',')
    : options.filter((option) => option.isCorrect).map((option) => option.label).join(',');
}

async function serialize(questionId: string) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { author: true, topic: true, blueprint: true, options: { orderBy: { label: 'asc' } } },
  });
  if (!question.blueprint) throw new Error('Soal tryout tidak memiliki kisi-kisi.');
  const byLabel = Object.fromEntries(question.options.map((option) => [option.label, option.optionText])) as Record<string, string>;
  return {
    id: question.id,
    _persisted: 'true',
    authorId: question.authorId,
    authorLabel: question.author.fullName,
    testGroup: question.blueprint.testGroup || '',
    blueprintId: question.blueprint.id,
    blueprintCode: question.blueprint.code,
    competency: question.blueprint.competency,
    indicator: question.blueprint.indicator,
    materialName: question.blueprint.materialName || '',
    cognitiveLevel: question.blueprint.cognitiveLevel || '',
    targetDifficulty: question.blueprint.targetDifficulty || '',
    targetQuestionCount: String(question.blueprint.targetQuestionCount || 1),
    blueprintText: question.blueprint.blueprintText || '',
    code: question.code,
    topicId: question.topicId,
    topicLabel: question.topic.title,
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
    correctAnswers: correctAnswers(question.questionType, question.options),
  };
}

function blueprintData(body: Record<string, unknown>) {
  return {
    testGroup: String(body.testGroup || '').trim() || null,
    topicId: body.topicId ? String(body.topicId) : null,
    competency: String(body.competency || '').trim(),
    indicator: String(body.indicator || '').trim(),
    materialName: body.materialName ? String(body.materialName) : null,
    cognitiveLevel: body.cognitiveLevel ? String(body.cognitiveLevel) : null,
    targetDifficulty: body.targetDifficulty ? String(body.targetDifficulty) : null,
    targetQuestionCount: Math.max(1, toInt(body.targetQuestionCount, 1)),
    blueprintText: body.blueprintText ? String(body.blueprintText) : null,
  };
}

function questionData(body: Record<string, unknown>, blueprintId: string) {
  const html = String(body.questionHtml || '');
  return {
    code: String(body.code || '').trim(),
    topicId: String(body.topicId || ''),
    blueprintId,
    stimulusOrder: Math.max(1, toInt(body.stimulusOrder, 1)),
    questionType: normalizeQuestionType(body.questionType),
    scoringMode: normalizeScoringMode(body.scoringMode),
    maxScore: Math.max(0.1, toFloat(body.maxScore, 1)),
    questionText: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    questionHtml: html,
    explanation: body.explanation ? String(body.explanation) : null,
    difficulty: body.difficulty ? String(body.difficulty) : null,
    status: normalizePublishStatus(body.status),
  };
}

function validateBody(body: Record<string, unknown>) {
  if (!String(body.testGroup || '').trim()) throw new Error('Nama kelompok tryout wajib diisi.');
  if (!String(body.blueprintCode || '').trim()) throw new Error('Kode kisi-kisi wajib diisi.');
  if (!String(body.competency || '').trim() || !String(body.indicator || '').trim()) throw new Error('Kompetensi dan indikator kisi-kisi wajib diisi.');
  if (!String(body.code || '').trim() || !String(body.topicId || '').trim() || !String(body.questionHtml || '').trim()) throw new Error('Kode soal, topik, dan isi soal wajib diisi.');
}

export async function POST(request: Request) {
  const user = await ensureAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  try {
    validateBody(body);
    const options = buildOptions(body);
    const blueprintCode = String(body.blueprintCode).trim();
    const question = await prisma.$transaction(async (tx) => {
      const blueprint = await tx.blueprint.upsert({
        where: { code: blueprintCode },
        update: blueprintData(body),
        create: { code: blueprintCode, ...blueprintData(body) },
      });
      const authorId = await resolveAuthorId(body.authorId, user.id);
      const created = await tx.question.create({
        data: { ...questionData(body, blueprint.id), authorId },
      });
      await tx.questionOption.createMany({
        data: options.map((option) => ({ questionId: created.id, ...option })),
      });
      return created;
    });
    return NextResponse.json({ data: await serialize(question.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan data tryout.' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await ensureAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const questionId = String(body.id || '');
  if (!questionId) return NextResponse.json({ error: 'ID soal wajib ada.' }, { status: 400 });
  const owned = await prisma.question.findUnique({ where: { id: questionId } });
  if (!owned || !owned.blueprintId) {
    return NextResponse.json({ error: 'Soal tryout tidak ditemukan.' }, { status: 404 });
  }

  try {
    validateBody(body);
    const options = buildOptions(body);
    const blueprintCode = String(body.blueprintCode).trim();
    await prisma.$transaction(async (tx) => {
      const blueprint = await tx.blueprint.update({
        where: { id: owned.blueprintId! },
        data: { code: blueprintCode, ...blueprintData(body) },
      });
      const authorId = await resolveAuthorId(body.authorId, owned.authorId);
      await tx.question.update({ where: { id: questionId }, data: { ...questionData(body, blueprint.id), authorId } });
      await tx.questionOption.deleteMany({ where: { questionId } });
      await tx.questionOption.createMany({ data: options.map((option) => ({ questionId, ...option })) });
    });
    return NextResponse.json({ data: await serialize(questionId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui data tryout.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await ensureAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const questionId = String(body.id || '');
  const owned = await prisma.question.findUnique({ where: { id: questionId } });
  if (!owned || !owned.blueprintId) {
    return NextResponse.json({ error: 'Soal tryout tidak ditemukan.' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const blueprintId = owned.blueprintId!;
      await tx.question.delete({ where: { id: questionId } });
      const remaining = await tx.question.count({ where: { blueprintId } });
      if (remaining === 0) await tx.blueprint.delete({ where: { id: blueprintId } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Soal tidak dapat dihapus karena sudah digunakan pada data pengerjaan siswa.' }, { status: 400 });
  }
}
