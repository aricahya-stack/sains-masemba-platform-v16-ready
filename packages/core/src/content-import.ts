import bcrypt from 'bcryptjs';
import {
  prisma,
  PublishStatus,
  QuestionType,
  ScoringMode,
  TryoutStatus,
  UserRole,
} from '@sh/db';
import { splitLines, toDateOrNull, toFloat, toInt } from './utils';
import {
  makeInternalTryoutTopicSlug,
  normalizeTopicCode,
  normalizeTryoutCode,
  toTryoutPeriodCode,
} from './content-scope';

export type ImportKind = 'MATERIAL' | 'BLUEPRINT' | 'QUESTION' | 'TRYOUT_CONTENT' | 'TRYOUT' | 'USER' | 'PARENT_LINK';
export type ImportRow = Record<string, unknown>;

export type ImportActor = {
  id: string;
  role: UserRole;
};

export type ImportResult = {
  kind: ImportKind;
  processedRows: number;
  created: number;
  updated: number;
  linked: number;
  warnings: string[];
  details: Record<string, number>;
};

const publishStatuses = new Set(Object.values(PublishStatus));
const questionTypes = new Set(Object.values(QuestionType));
const scoringModes = new Set(Object.values(ScoringMode));
const tryoutStatuses = new Set(Object.values(TryoutStatus));
const userRoles = new Set(Object.values(UserRole));
const userStatuses = new Set(['ACTIVE', 'INACTIVE']);

function text(value: unknown) {
  return String(value ?? '').trim();
}

function stripHtml(value: unknown) {
  return text(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePublishStatus(value: unknown): PublishStatus {
  const normalized = text(value).toUpperCase() as PublishStatus;
  return publishStatuses.has(normalized) ? normalized : PublishStatus.DRAFT;
}

function normalizeQuestionType(value: unknown): QuestionType {
  const normalized = text(value).toUpperCase() as QuestionType;
  return questionTypes.has(normalized) ? normalized : QuestionType.SINGLE_CHOICE;
}

function normalizeScoringMode(value: unknown): ScoringMode {
  const normalized = text(value).toUpperCase() as ScoringMode;
  return scoringModes.has(normalized) ? normalized : ScoringMode.EXACT_MATCH;
}

function normalizeTryoutStatus(value: unknown): TryoutStatus {
  const normalized = text(value).toUpperCase() as TryoutStatus;
  return tryoutStatuses.has(normalized) ? normalized : TryoutStatus.DRAFT;
}

function splitTokens(value: unknown) {
  return text(value)
    .replace(/\r?\n/g, ',')
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trueFalseTokenToBoolean(value: string | undefined) {
  const token = text(value).toLowerCase();
  if (['b', 'benar', 'true', 't', '1', 'ya', 'y'].includes(token)) return true;
  if (['s', 'salah', 'false', 'f', '0', 'tidak', 'n'].includes(token)) return false;
  return null;
}

function parseBoolean(value: unknown, fallback = true) {
  const token = text(value).toLowerCase();
  if (!token) return fallback;
  if (['true', '1', 'ya', 'y', 'aktif', 'active'].includes(token)) return true;
  if (['false', '0', 'tidak', 'n', 'nonaktif', 'inactive'].includes(token)) return false;
  return fallback;
}

function questionOptionData(row: ImportRow, questionType: QuestionType) {
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const options = labels
    .map((label) => ({
      label,
      optionText: text(row[`opsi_${label.toLowerCase()}`]),
    }))
    .filter((item) => item.optionText);

  if (options.length < 2) throw new Error('Minimal dua opsi/pernyataan harus tersedia.');

  const keyTokens = splitTokens(row.kunci_jawaban).map((token) => token.toUpperCase());
  const available = new Set(options.map((item) => item.label));

  if (questionType === QuestionType.TRUE_FALSE) {
    if (keyTokens.length !== options.length) {
      throw new Error(`Kunci benar-salah harus berjumlah ${options.length} sesuai jumlah pernyataan.`);
    }
    return options.map((option, index) => {
      const parsed = trueFalseTokenToBoolean(keyTokens[index]);
      if (parsed === null) throw new Error(`Kunci benar-salah ke-${index + 1} harus B atau S.`);
      return { ...option, isCorrect: parsed };
    });
  }

  if (questionType === QuestionType.SINGLE_CHOICE) {
    if (keyTokens.length !== 1 || !available.has(keyTokens[0])) {
      throw new Error('Pilihan ganda biasa harus memiliki tepat satu kunci yang cocok dengan opsi tersedia.');
    }
    return options.map((option) => ({ ...option, isCorrect: option.label === keyTokens[0] }));
  }

  if (!keyTokens.length || keyTokens.some((token) => !available.has(token))) {
    throw new Error('Kunci pilihan ganda kompleks harus cocok dengan opsi tersedia, contoh A,C,D.');
  }
  const correct = new Set(keyTokens);
  return options.map((option) => ({ ...option, isCorrect: correct.has(option.label) }));
}

async function importMaterials(rows: ImportRow[], actor: ImportActor): Promise<ImportResult> {
  const groups = new Map<string, { first: ImportRow; rows: ImportRow[] }>();
  for (const row of rows) {
    const topicTitle = text(row.topicTitle);
    const materialTitle = text(row.materialTitle);
    if (!topicTitle || !materialTitle) throw new Error('Setiap baris materi wajib memiliki topicTitle dan materialTitle.');
    const topicSlug = normalizeTopicCode(row.kode_topik || row.topicCode || row.topicSlug, topicTitle);
    const key = `${topicSlug}::${materialTitle.toLowerCase()}`;
    const group = groups.get(key) || { first: row, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  const result: ImportResult = {
    kind: 'MATERIAL',
    processedRows: rows.length,
    created: 0,
    updated: 0,
    linked: 0,
    warnings: [],
    details: { topicsCreated: 0, topicsUpdated: 0, materialsCreated: 0, materialsUpdated: 0, sections: 0, objectives: 0 },
  };

  await prisma.$transaction(async (tx) => {
    for (const { first, rows: groupRows } of groups.values()) {
      const topicTitle = text(first.topicTitle);
      const topicSlug = normalizeTopicCode(first.kode_topik || first.topicCode || first.topicSlug, topicTitle);
      const existingTopic = await tx.topic.findUnique({ where: { slug: topicSlug } });
      const topic = existingTopic
        ? await tx.topic.update({
            where: { id: existingTopic.id },
            data: {
              title: topicTitle,
              subject: text(first.subject) || 'IPA SMP',
              description: text(first.topicDescription) || null,
              orderNo: toInt(first.topicOrder, existingTopic.orderNo),
            },
          })
        : await tx.topic.create({
            data: {
              title: topicTitle,
              slug: topicSlug,
              subject: text(first.subject) || 'IPA SMP',
              description: text(first.topicDescription) || null,
              orderNo: toInt(first.topicOrder, 0),
            },
          });

      if (existingTopic) result.details.topicsUpdated += 1;
      else result.details.topicsCreated += 1;

      const materialTitle = text(first.materialTitle);
      const existingMaterial = await tx.material.findFirst({
        where: actor.role === UserRole.SUPER_ADMIN
          ? { topicId: topic.id, title: materialTitle }
          : { topicId: topic.id, title: materialTitle, authorId: actor.id },
      });

      const materialData = {
        topicId: topic.id,
        title: materialTitle,
        level: text(first.materialLevel) || null,
        status: normalizePublishStatus(first.materialStatus),
        summaryHtml: text(first.summaryHtml) || null,
        summaryText: stripHtml(first.summaryHtml) || null,
      };

      const material = existingMaterial
        ? await tx.material.update({ where: { id: existingMaterial.id }, data: materialData })
        : await tx.material.create({ data: { ...materialData, authorId: actor.id } });

      if (existingMaterial) {
        result.updated += 1;
        result.details.materialsUpdated += 1;
        await tx.learningObjective.deleteMany({ where: { materialId: material.id } });
        await tx.materialSection.deleteMany({ where: { materialId: material.id } });
      } else {
        result.created += 1;
        result.details.materialsCreated += 1;
      }

      const objectives = splitLines(first.objectivesText);
      if (objectives.length) {
        await tx.learningObjective.createMany({
          data: objectives.map((objective, index) => ({ materialId: material.id, orderNo: index + 1, objective })),
        });
      }
      result.details.objectives += objectives.length;

      const sections = groupRows
        .map((row, index) => ({
          orderNo: Math.max(1, toInt(row.sectionOrder, index + 1)),
          title: text(row.sectionTitle) || `Bagian ${index + 1}`,
          contentHtml: text(row.sectionHtml) || null,
          contentText: stripHtml(row.sectionHtml) || null,
        }))
        .filter((section) => section.title || section.contentHtml)
        .sort((a, b) => a.orderNo - b.orderNo);

      if (sections.length) {
        await tx.materialSection.createMany({
          data: sections.map((section) => ({ materialId: material.id, ...section })),
        });
      }
      result.details.sections += sections.length;
    }
  }, { timeout: 60000 });

  return result;
}

async function importBlueprints(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    kind: 'BLUEPRINT', processedRows: rows.length, created: 0, updated: 0, linked: 0, warnings: [],
    details: { blueprintsCreated: 0, blueprintsUpdated: 0, missingTopics: 0 },
  };

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const code = text(row.code);
      if (!code || !text(row.competency) || !text(row.indicator)) {
        throw new Error('Setiap kisi-kisi wajib memiliki code, competency, dan indicator.');
      }
      const topicSlug = text(row.topicSlug);
      const topic = topicSlug ? await tx.topic.findUnique({ where: { slug: topicSlug } }) : null;
      if (topicSlug && !topic) {
        result.details.missingTopics += 1;
        result.warnings.push(`Topik ${topicSlug} belum ditemukan untuk kisi-kisi ${code}; relasi topik dikosongkan.`);
      }
      const existing = await tx.blueprint.findUnique({ where: { code } });
      const data = {
        testGroup: text(row.testGroup) || null,
        topicId: topic?.id || null,
        competency: text(row.competency),
        indicator: text(row.indicator),
        materialName: text(row.materialName) || null,
        cognitiveLevel: text(row.cognitiveLevel) || null,
        targetDifficulty: text(row.targetDifficulty) || null,
        targetQuestionCount: toInt(row.targetQuestionCount, 0),
        blueprintText: text(row.blueprintText) || null,
      };
      if (existing) {
        await tx.blueprint.update({ where: { id: existing.id }, data });
        result.updated += 1;
        result.details.blueprintsUpdated += 1;
      } else {
        await tx.blueprint.create({ data: { code, ...data } });
        result.created += 1;
        result.details.blueprintsCreated += 1;
      }
    }
  }, { timeout: 60000 });
  result.warnings = result.warnings.slice(0, 20);
  return result;
}

async function importQuestions(rows: ImportRow[], actor: ImportActor): Promise<ImportResult> {
  const result: ImportResult = {
    kind: 'QUESTION', processedRows: rows.length, created: 0, updated: 0, linked: 0, warnings: [],
    details: { questionsCreated: 0, questionsUpdated: 0, options: 0, topicsCreated: 0, missingBlueprints: 0 },
  };

  await prisma.$transaction(async (tx) => {
    const topicCache = new Map<string, string>();
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const code = text(row.kode_soal);
      const topicTitle = text(row.topik);
      const promptHtml = text(row.pertanyaan_html);
      if (!code || !topicTitle || !promptHtml) {
        throw new Error(`Baris ${index + 1}: kode_soal, topik, dan pertanyaan_html wajib diisi.`);
      }

      const topicSlug = normalizeTopicCode(row.kode_topik || row.topicCode, topicTitle);
      let topicId = topicCache.get(topicSlug);
      if (!topicId) {
        let topic = await tx.topic.findUnique({ where: { slug: topicSlug } });
        if (!topic) {
          topic = await tx.topic.create({ data: { title: topicTitle, slug: topicSlug, subject: 'IPA SMP' } });
          result.details.topicsCreated += 1;
        }
        topicId = topic.id;
        topicCache.set(topicSlug, topic.id);
      }

      const questionType = normalizeQuestionType(row.jenis_soal);
      const options = questionOptionData(row, questionType);
      const stimulusHtml = text(row.stimulus_html);
      const questionHtml = [stimulusHtml, promptHtml].filter(Boolean).join('\n');
      const existing = await tx.question.findUnique({ where: { code } });
      if (existing && actor.role !== UserRole.SUPER_ADMIN && existing.authorId !== actor.id) {
        throw new Error(`Kode soal ${code} sudah dimiliki guru lain dan tidak dapat ditimpa.`);
      }
      if (existing?.blueprintId) {
        throw new Error(`Kode soal ${code} sudah digunakan sebagai soal tryout. Gunakan kode lain untuk latihan.`);
      }

      const data = {
        topicId,
        blueprintId: null,
        stimulusOrder: Math.max(1, toInt(row.urutan_stimulus, index + 1)),
        questionType,
        scoringMode: normalizeScoringMode(row.sistem_penilaian),
        maxScore: Math.max(0.1, toFloat(row.bobot, 1)),
        questionText: stripHtml(questionHtml),
        questionHtml,
        explanation: text(row.pembahasan_html) || null,
        difficulty: text(row.tingkat_kesulitan) || null,
        status: normalizePublishStatus(row.status),
      };

      const question = existing
        ? await tx.question.update({ where: { id: existing.id }, data })
        : await tx.question.create({ data: { code, authorId: actor.id, ...data } });

      if (existing) {
        result.updated += 1;
        result.details.questionsUpdated += 1;
        await tx.questionOption.deleteMany({ where: { questionId: question.id } });
      } else {
        result.created += 1;
        result.details.questionsCreated += 1;
      }

      await tx.questionOption.createMany({ data: options.map((option) => ({ questionId: question.id, ...option })) });
      result.details.options += options.length;

    }
  }, { timeout: 60000 });

  return result;
}


async function importTryoutContent(rows: ImportRow[], actor: ImportActor): Promise<ImportResult> {
  const groups = new Map<string, { name: string; count: number }>();
  const seenQuestionCodes = new Set<string>();

  for (const row of rows) {
    const groupName = text(row.nama_tryout);
    const tryoutCode = normalizeTryoutCode(row.kode_tryout || row.tryoutCode, groupName);
    const questionCode = text(row.kode_soal);

    if (!groupName) throw new Error('Setiap baris tryout wajib memiliki nama_tryout.');
    if (!questionCode) throw new Error('Setiap baris tryout wajib memiliki kode_soal.');
    if (seenQuestionCodes.has(questionCode)) throw new Error(`Kode soal ${questionCode} duplikat dalam file tryout.`);
    seenQuestionCodes.add(questionCode);

    const current = groups.get(tryoutCode);
    if (current && current.name.toLowerCase() !== groupName.toLowerCase()) {
      throw new Error(`Kode tryout ${tryoutCode} dipakai oleh dua nama paket berbeda: "${current.name}" dan "${groupName}".`);
    }
    groups.set(tryoutCode, { name: current?.name || groupName, count: (current?.count || 0) + 1 });
  }

  for (const [tryoutCode, group] of groups) {
    if (group.count !== 30) {
      throw new Error(`Paket ${group.name} (${tryoutCode}) harus berisi tepat 30 soal. File ini berisi ${group.count} soal.`);
    }
  }

  const result: ImportResult = {
    kind: 'TRYOUT_CONTENT',
    processedRows: rows.length,
    created: 0,
    updated: 0,
    linked: 0,
    warnings: [],
    details: {
      blueprintsCreated: 0,
      blueprintsUpdated: 0,
      questionsCreated: 0,
      questionsUpdated: 0,
      options: 0,
      topicsCreated: 0,
      legacyTopicsCleaned: 0,
      tryoutGroups: groups.size,
      tryoutCodes: groups.size,
    },
  };

  await prisma.$transaction(async (tx) => {
    const topicCache = new Map<string, string>();
    const legacyTopicIds = new Set<string>();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const groupName = text(row.nama_tryout);
      const tryoutCode = normalizeTryoutCode(row.kode_tryout || row.tryoutCode, groupName);
      const blueprintCode = text(row.kode_kisi_kisi);
      const competency = text(row.kompetensi);
      const indicator = text(row.indikator);
      const questionCode = text(row.kode_soal);
      const topicTitle = text(row.topik);
      const topicCode = normalizeTopicCode(row.kode_topik || row.topicCode, topicTitle);
      const promptHtml = text(row.pertanyaan_html);

      if (!blueprintCode || !competency || !indicator) {
        throw new Error(`Baris ${index + 1}: kode_kisi_kisi, kompetensi, dan indikator wajib diisi.`);
      }
      if (!questionCode || !topicTitle || !promptHtml) {
        throw new Error(`Baris ${index + 1}: kode_soal, topik, dan pertanyaan_html wajib diisi.`);
      }

      // PENTING: soal tryout memakai namespace topik internal tersendiri.
      // Dengan demikian import tryout tidak pernah menambah/mengotori daftar topik belajar siswa.
      const internalTopicSlug = makeInternalTryoutTopicSlug(tryoutCode, topicCode, topicTitle);
      let topicId = topicCache.get(internalTopicSlug);
      if (!topicId) {
        let topic = await tx.topic.findUnique({ where: { slug: internalTopicSlug } });
        if (!topic) {
          topic = await tx.topic.create({
            data: {
              title: topicTitle,
              slug: internalTopicSlug,
              subject: 'IPA SMP',
              description: `Topik internal untuk ${groupName} (${tryoutCode}). Tidak ditampilkan sebagai materi siswa.`,
            },
          });
          result.details.topicsCreated += 1;
        }
        topicId = topic.id;
        topicCache.set(internalTopicSlug, topic.id);
      }

      const existingBlueprint = await tx.blueprint.findUnique({ where: { code: blueprintCode } });
      if (existingBlueprint?.topicId && existingBlueprint.topicId !== topicId) {
        legacyTopicIds.add(existingBlueprint.topicId);
      }

      const blueprintData = {
        periodCode: toTryoutPeriodCode(tryoutCode, groupName),
        periodName: groupName,
        testGroup: groupName,
        topicId,
        competency,
        indicator,
        materialName: text(row.nama_materi) || null,
        cognitiveLevel: text(row.level_kognitif) || null,
        targetDifficulty: text(row.target_kesulitan) || null,
        targetQuestionCount: Math.max(1, toInt(row.target_jumlah_soal, 1)),
        blueprintText: text(row.catatan_kisi_kisi) || null,
      };

      const blueprint = existingBlueprint
        ? await tx.blueprint.update({ where: { id: existingBlueprint.id }, data: blueprintData })
        : await tx.blueprint.create({ data: { code: blueprintCode, ...blueprintData } });

      if (existingBlueprint) result.details.blueprintsUpdated += 1;
      else result.details.blueprintsCreated += 1;

      const questionType = normalizeQuestionType(row.jenis_soal);
      const options = questionOptionData(row, questionType);
      const stimulusHtml = text(row.stimulus_html);
      const questionHtml = [stimulusHtml, promptHtml].filter(Boolean).join('\n');
      const existingQuestion = await tx.question.findUnique({ where: { code: questionCode } });

      if (existingQuestion && actor.role !== UserRole.SUPER_ADMIN && existingQuestion.authorId !== actor.id) {
        throw new Error(`Kode soal ${questionCode} sudah dimiliki guru lain dan tidak dapat ditimpa.`);
      }
      if (existingQuestion && !existingQuestion.blueprintId) {
        throw new Error(`Kode soal ${questionCode} sudah digunakan sebagai soal latihan. Gunakan kode lain untuk tryout.`);
      }
      if (existingQuestion?.topicId && existingQuestion.topicId !== topicId) {
        legacyTopicIds.add(existingQuestion.topicId);
      }

      const questionData = {
        topicId,
        blueprintId: blueprint.id,
        stimulusOrder: Math.max(1, toInt(row.urutan_soal, index + 1)),
        questionType,
        scoringMode: normalizeScoringMode(row.sistem_penilaian),
        maxScore: Math.max(0.1, toFloat(row.bobot, 1)),
        questionText: stripHtml(questionHtml),
        questionHtml,
        explanation: text(row.pembahasan_html) || null,
        difficulty: text(row.tingkat_kesulitan) || null,
        status: normalizePublishStatus(row.status),
      };

      const question = existingQuestion
        ? await tx.question.update({ where: { id: existingQuestion.id }, data: questionData })
        : await tx.question.create({ data: { code: questionCode, authorId: actor.id, ...questionData } });

      if (existingQuestion) {
        result.updated += 1;
        result.details.questionsUpdated += 1;
        await tx.questionOption.deleteMany({ where: { questionId: question.id } });
      } else {
        result.created += 1;
        result.details.questionsCreated += 1;
      }

      await tx.questionOption.createMany({
        data: options.map((option) => ({ questionId: question.id, ...option })),
      });
      result.details.options += options.length;
      result.linked += 1;
    }

    // Bersihkan topik lama yang dulu tercipta hanya karena import tryout,
    // tetapi jangan pernah menghapus topik yang masih dipakai materi/latihan lain.
    for (const topicId of legacyTopicIds) {
      const usage = await tx.topic.findUnique({
        where: { id: topicId },
        select: { _count: { select: { materials: true, questions: true, blueprints: true } } },
      });
      if (usage && usage._count.materials + usage._count.questions + usage._count.blueprints === 0) {
        await tx.topic.delete({ where: { id: topicId } });
        result.details.legacyTopicsCleaned += 1;
      }
    }
  }, { timeout: 60000 });

  return result;
}

async function importTryouts(rows: ImportRow[], actor: ImportActor): Promise<ImportResult> {
  const result: ImportResult = {
    kind: 'TRYOUT', processedRows: rows.length, created: 0, updated: 0, linked: 0, warnings: [],
    details: { tryoutsCreated: 0, tryoutsUpdated: 0, questionLinks: 0, missingQuestions: 0 },
  };

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const title = text(row.tryoutTitle);
      if (!title) throw new Error('Setiap baris mapping tryout wajib memiliki tryoutTitle.');
      const existing = await tx.tryout.findFirst({ where: { title, authorId: actor.id } });
      const data = {
        description: text(row.description) || null,
        durationMinutes: Math.max(1, toInt(row.durationMinutes, 60)),
        status: normalizeTryoutStatus(row.status),
        startAt: toDateOrNull(row.startAt),
        endAt: toDateOrNull(row.endAt),
        rulesHtml: text(row.rulesHtml) || null,
      };
      const tryout = existing
        ? await tx.tryout.update({ where: { id: existing.id }, data })
        : await tx.tryout.create({ data: { title, authorId: actor.id, ...data } });
      if (existing) {
        result.updated += 1;
        result.details.tryoutsUpdated += 1;
      } else {
        result.created += 1;
        result.details.tryoutsCreated += 1;
      }

      const codes = splitTokens(row.questionCodes);
      await tx.tryoutQuestion.deleteMany({ where: { tryoutId: tryout.id } });
      for (let index = 0; index < codes.length; index += 1) {
        const question = await tx.question.findUnique({ where: { code: codes[index] } });
        if (!question) {
          result.details.missingQuestions += 1;
          if (result.warnings.length < 20) result.warnings.push(`Soal ${codes[index]} tidak ditemukan untuk ${title}.`);
          continue;
        }
        await tx.tryoutQuestion.create({ data: { tryoutId: tryout.id, questionId: question.id, orderNo: index + 1 } });
        result.linked += 1;
        result.details.questionLinks += 1;
      }
    }
  }, { timeout: 60000 });
  return result;
}

async function importUsers(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    kind: 'USER', processedRows: rows.length, created: 0, updated: 0, linked: 0, warnings: [],
    details: {
      usersCreated: 0,
      usersUpdated: 0,
      withoutPassword: 0,
      superAdmins: 0,
      teachers: 0,
      students: 0,
      parents: 0,
    },
  };

  // Validasi seluruh file lebih dahulu. Dengan demikian, satu baris yang rusak tidak
  // membuat baris pertama telanjur tersimpan lalu proses berhenti di tengah jalan.
  const seenEmails = new Set<string>();
  const prepared: Array<{
    fullName: string;
    email: string;
    role: UserRole;
    phone: string | null;
    className: string | null;
    status: string;
    passwordHash?: string;
  }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 1;
    const fullName = text(row.full_name);
    const email = text(row.email).toLowerCase();
    const role = text(row.role).toUpperCase() as UserRole;

    if (!fullName) throw new Error(`Baris ${rowNumber}: full_name wajib diisi.`);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Baris ${rowNumber}: email tidak valid (${email || 'kosong'}).`);
    }
    if (!userRoles.has(role)) throw new Error(`Baris ${rowNumber}: role "${text(row.role)}" tidak valid.`);
    if (seenEmails.has(email)) throw new Error(`Baris ${rowNumber}: email ${email} duplikat dalam file.`);
    seenEmails.add(email);

    const status = text(row.status).toUpperCase() || 'ACTIVE';
    if (!userStatuses.has(status)) throw new Error(`Baris ${rowNumber}: status harus ACTIVE atau INACTIVE.`);

    const password = text(row.password);
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    prepared.push({
      fullName,
      email,
      role,
      phone: text(row.phone) || null,
      className: role === UserRole.SISWA ? (text(row.class_name) || null) : null,
      status,
      passwordHash,
    });

    if (role === UserRole.SUPER_ADMIN) result.details.superAdmins += 1;
    else if (role === UserRole.GURU) result.details.teachers += 1;
    else if (role === UserRole.SISWA) result.details.students += 1;
    else if (role === UserRole.ORANG_TUA) result.details.parents += 1;
  }

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: prepared.map((row) => row.email) } },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map<string, { id: string; email: string }>(
    existingUsers.map((user: { id: string; email: string }) => [user.email.toLowerCase(), user]),
  );

  await prisma.$transaction(async (tx) => {
    for (const row of prepared) {
      const existing = existingByEmail.get(row.email);
      const data = {
        fullName: row.fullName,
        role: row.role,
        phone: row.phone,
        className: row.className,
        status: row.status,
        ...(row.passwordHash ? { passwordHash: row.passwordHash } : {}),
      };

      if (existing) {
        await tx.user.update({ where: { id: existing.id }, data });
        result.updated += 1;
        result.details.usersUpdated += 1;
      } else {
        await tx.user.create({
          data: {
            email: row.email,
            ...data,
            passwordHash: row.passwordHash || null,
          },
        });
        result.created += 1;
        result.details.usersCreated += 1;
        if (!row.passwordHash) result.details.withoutPassword += 1;
      }
    }
  }, { maxWait: 10000, timeout: 60000 });

  if (result.details.withoutPassword) {
    result.warnings.push(`${result.details.withoutPassword} akun baru dibuat tanpa password dan belum dapat login sampai password ditetapkan.`);
  }
  return result;
}

async function importParentLinks(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    kind: 'PARENT_LINK', processedRows: rows.length, created: 0, updated: 0, linked: 0, warnings: [],
    details: { linksCreated: 0, linksUpdated: 0 },
  };

  const seenPairs = new Set<string>();
  const prepared = rows.map((row, index) => {
    const rowNumber = index + 1;
    const parentEmail = text(row.parent_email).toLowerCase();
    const studentEmail = text(row.student_email).toLowerCase();
    if (!parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      throw new Error(`Baris ${rowNumber}: parent_email tidak valid.`);
    }
    if (!studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      throw new Error(`Baris ${rowNumber}: student_email tidak valid.`);
    }
    const pairKey = `${parentEmail}::${studentEmail}`;
    if (seenPairs.has(pairKey)) throw new Error(`Baris ${rowNumber}: relasi ${parentEmail} dan ${studentEmail} duplikat dalam file.`);
    seenPairs.add(pairKey);
    return {
      rowNumber,
      parentEmail,
      studentEmail,
      relationType: text(row.relation_type) || 'Wali',
      isActive: parseBoolean(row.is_active, true),
    };
  });

  const emails = [...new Set(prepared.flatMap((row) => [row.parentEmail, row.studentEmail]))];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, role: true },
  });
  const usersByEmail = new Map<string, { id: string; email: string; role: UserRole }>(
    users.map((user: { id: string; email: string; role: UserRole }) => [user.email.toLowerCase(), user]),
  );

  const resolved = prepared.map((row) => {
    const parent = usersByEmail.get(row.parentEmail);
    const student = usersByEmail.get(row.studentEmail);
    if (!parent) throw new Error(`Baris ${row.rowNumber}: akun orang tua ${row.parentEmail} tidak ditemukan.`);
    if (!student) throw new Error(`Baris ${row.rowNumber}: akun siswa ${row.studentEmail} tidak ditemukan.`);
    if (parent.role !== UserRole.ORANG_TUA) throw new Error(`Baris ${row.rowNumber}: ${row.parentEmail} bukan akun ORANG_TUA.`);
    if (student.role !== UserRole.SISWA) throw new Error(`Baris ${row.rowNumber}: ${row.studentEmail} bukan akun SISWA.`);
    return { ...row, parentId: parent.id, studentId: student.id };
  });

  const existingLinks = await prisma.parentStudentLink.findMany({
    where: {
      parentId: { in: [...new Set(resolved.map((row) => row.parentId))] },
      studentId: { in: [...new Set(resolved.map((row) => row.studentId))] },
    },
    select: { id: true, parentId: true, studentId: true },
  });
  const existingByPair = new Map<string, { id: string; parentId: string; studentId: string }>(
    existingLinks.map((link: { id: string; parentId: string; studentId: string }) => [`${link.parentId}::${link.studentId}`, link]),
  );

  await prisma.$transaction(async (tx) => {
    for (const row of resolved) {
      const existing = existingByPair.get(`${row.parentId}::${row.studentId}`);
      const data = { relationType: row.relationType, isActive: row.isActive };
      if (existing) {
        await tx.parentStudentLink.update({ where: { id: existing.id }, data });
        result.updated += 1;
        result.details.linksUpdated += 1;
      } else {
        await tx.parentStudentLink.create({ data: { parentId: row.parentId, studentId: row.studentId, ...data } });
        result.created += 1;
        result.details.linksCreated += 1;
      }
      result.linked += 1;
    }
  }, { maxWait: 10000, timeout: 60000 });

  return result;
}

export async function importRowsToDatabase(args: {
  kind: ImportKind;
  rows: ImportRow[];
  actor: ImportActor;
  allowAdminImports?: boolean;
}): Promise<ImportResult> {
  const { kind, rows, actor, allowAdminImports = false } = args;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Tidak ada baris data untuk diimpor.');
  if (rows.length > 1000) throw new Error('Maksimal 1000 baris per permintaan import.');

  switch (kind) {
    case 'MATERIAL': return importMaterials(rows, actor);
    case 'BLUEPRINT': return importBlueprints(rows);
    case 'QUESTION': return importQuestions(rows, actor);
    case 'TRYOUT_CONTENT': return importTryoutContent(rows, actor);
    case 'TRYOUT': return importTryouts(rows, actor);
    case 'USER':
      if (!allowAdminImports) throw new Error('Import user hanya tersedia untuk Super Admin.');
      return importUsers(rows);
    case 'PARENT_LINK':
      if (!allowAdminImports) throw new Error('Import relasi orang tua-siswa hanya tersedia untuk Super Admin.');
      return importParentLinks(rows);
    default:
      throw new Error('Jenis import tidak dikenali.');
  }
}
