import * as XLSX from 'xlsx';
import { prisma } from './client';

export const DATABASE_BACKUP_FORMAT = 'SAINS_MASEMBA_EXCEL_BACKUP_V1';
export const DATABASE_BACKUP_APP_VERSION = '18.1';

export type DatabaseBackupOptions = {
  generatedBy?: string;
  includePasswordHashes?: boolean;
};

type BackupRow = Record<string, unknown>;

type BackupSheet = {
  name: string;
  model: string;
  headers: string[];
  rows: unknown[];
  description: string;
};

const EXCEL_CELL_TEXT_LIMIT = 32_000;

type LongTextChunk = {
  reference: string;
  sourceSheet: string;
  sourceRow: number;
  sourceColumn: string;
  chunkNo: number;
  content: string;
};

function primitiveCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

function backupCellValue(
  value: unknown,
  source: { sheet: string; row: number; column: string },
  longTextChunks: LongTextChunk[],
): string | number | boolean {
  const normalized = primitiveCellValue(value);
  if (typeof normalized !== 'string' || normalized.length <= EXCEL_CELL_TEXT_LIMIT) return normalized;

  const reference = `${source.sheet}-${source.row}-${source.column}-${longTextChunks.length + 1}`;
  for (let index = 0, chunkNo = 1; index < normalized.length; index += EXCEL_CELL_TEXT_LIMIT, chunkNo += 1) {
    longTextChunks.push({
      reference,
      sourceSheet: source.sheet,
      sourceRow: source.row,
      sourceColumn: source.column,
      chunkNo,
      content: normalized.slice(index, index + EXCEL_CELL_TEXT_LIMIT),
    });
  }
  return `[[LONG_TEXT:${reference}]]`;
}

function rowsToMatrix(sheet: BackupSheet, longTextChunks: LongTextChunk[]) {
  return [sheet.headers, ...sheet.rows.map((row, rowIndex) => {
    const record = row as BackupRow;
    return sheet.headers.map((header) => backupCellValue(
      record[header],
      { sheet: sheet.name, row: rowIndex + 2, column: header },
      longTextChunks,
    ));
  })];
}

function widthFor(header: string, rows: unknown[]) {
  const sampled = rows.slice(0, 250);
  const longest = sampled.reduce<number>((max, row) => {
    const record = row as BackupRow;
    return Math.max(max, String(primitiveCellValue(record[header])).length);
  }, header.length);
  return { wch: Math.min(Math.max(longest + 2, 12), 48) };
}

function appendSheet(workbook: XLSX.WorkBook, sheet: BackupSheet, longTextChunks: LongTextChunk[]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rowsToMatrix(sheet, longTextChunks));
  worksheet['!cols'] = sheet.headers.map((header) => widthFor(header, sheet.rows));
  worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(Math.max(0, sheet.headers.length - 1))}${Math.max(1, sheet.rows.length + 1)}` };
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
}

function cellValueForLongTextSheet(chunk: LongTextChunk, header: string): string | number {
  return chunk[header as keyof LongTextChunk];
}

export async function collectDatabaseBackupSheets(includePasswordHashes = true): Promise<BackupSheet[]> {
  const [
    appSettings,
    users,
    parentLinks,
    topics,
    materials,
    materialSections,
    learningObjectives,
    tkadTips,
    blueprints,
    questions,
    questionOptions,
    tryouts,
    tryoutQuestions,
    attempts,
    attemptAnswers,
    practiceAttempts,
    practiceAnswers,
    tryoutIncidents,
    notifications,
  ] = await Promise.all([
    prisma.appSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.user.findMany({ orderBy: [{ createdAt: 'asc' }, { email: 'asc' }] }),
    prisma.parentStudentLink.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { slug: 'asc' }] }),
    prisma.material.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    prisma.materialSection.findMany({ orderBy: [{ materialId: 'asc' }, { orderNo: 'asc' }] }),
    prisma.learningObjective.findMany({ orderBy: [{ materialId: 'asc' }, { orderNo: 'asc' }] }),
    prisma.tkadTip.findMany({ orderBy: [{ orderNo: 'asc' }, { createdAt: 'asc' }] }),
    prisma.blueprint.findMany({ orderBy: { code: 'asc' } }),
    prisma.question.findMany({ orderBy: { code: 'asc' } }),
    prisma.questionOption.findMany({ orderBy: [{ questionId: 'asc' }, { label: 'asc' }] }),
    prisma.tryout.findMany({ orderBy: [{ startAt: 'asc' }, { title: 'asc' }] }),
    prisma.tryoutQuestion.findMany({ orderBy: [{ tryoutId: 'asc' }, { orderNo: 'asc' }] }),
    prisma.attempt.findMany({ orderBy: [{ startedAt: 'asc' }, { id: 'asc' }] }),
    prisma.attemptAnswer.findMany({ orderBy: [{ attemptId: 'asc' }, { answeredAt: 'asc' }] }),
    prisma.practiceAttempt.findMany({ orderBy: [{ startedAt: 'asc' }, { id: 'asc' }] }),
    prisma.practiceAnswer.findMany({ orderBy: [{ attemptId: 'asc' }, { answeredAt: 'asc' }] }),
    prisma.tryoutIncident.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    prisma.notification.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
  ]);

  const userHeaders = [
    'id',
    'fullName',
    'email',
    ...(includePasswordHashes ? ['passwordHash'] : []),
    'role',
    'phone',
    'className',
    'status',
    'createdAt',
    'updatedAt',
  ];

  return [
    {
      name: 'APP_SETTINGS',
      model: 'AppSetting',
      headers: ['key', 'value', 'updatedAt'],
      rows: appSettings,
      description: 'Pengaturan aplikasi dan tema.',
    },
    {
      name: 'USERS',
      model: 'User',
      headers: userHeaders,
      rows: users,
      description: includePasswordHashes
        ? 'Seluruh akun termasuk hash password. Simpan file secara rahasia.'
        : 'Seluruh akun tanpa hash password.',
    },
    {
      name: 'PARENT_STUDENT_LINKS',
      model: 'ParentStudentLink',
      headers: ['id', 'parentId', 'studentId', 'relationType', 'isActive', 'createdAt'],
      rows: parentLinks,
      description: 'Relasi akun orang tua dan siswa.',
    },
    {
      name: 'TOPICS',
      model: 'Topic',
      headers: ['id', 'title', 'slug', 'subject', 'description', 'orderNo'],
      rows: topics,
      description: 'Master topik pembelajaran.',
    },
    {
      name: 'MATERIALS',
      model: 'Material',
      headers: ['id', 'topicId', 'authorId', 'title', 'summaryText', 'summaryHtml', 'coverImageUrl', 'level', 'status', 'createdAt', 'updatedAt'],
      rows: materials,
      description: 'Master materi pembelajaran.',
    },
    {
      name: 'MATERIAL_SECTIONS',
      model: 'MaterialSection',
      headers: ['id', 'materialId', 'orderNo', 'title', 'contentText', 'contentHtml', 'imageUrl'],
      rows: materialSections,
      description: 'Bagian atau bab pada setiap materi.',
    },
    {
      name: 'LEARNING_OBJECTIVES',
      model: 'LearningObjective',
      headers: ['id', 'materialId', 'orderNo', 'objective'],
      rows: learningObjectives,
      description: 'Tujuan pembelajaran materi.',
    },
    {
      name: 'TKAD_TIPS',
      model: 'TkadTip',
      headers: ['id', 'authorId', 'category', 'title', 'contentHtml', 'orderNo', 'status', 'createdAt', 'updatedAt'],
      rows: tkadTips,
      description: 'Konten tips TKAD/TIP.',
    },
    {
      name: 'BLUEPRINTS',
      model: 'Blueprint',
      headers: ['id', 'code', 'periodCode', 'periodName', 'testGroup', 'topicId', 'competency', 'indicator', 'materialName', 'blueprintText', 'labelRahasia', 'cognitiveLevel', 'targetDifficulty', 'targetQuestionCount'],
      rows: blueprints,
      description: 'Kisi-kisi atau blueprint soal.',
    },
    {
      name: 'QUESTIONS',
      model: 'Question',
      headers: ['id', 'code', 'topicId', 'blueprintId', 'authorId', 'stimulusOrder', 'questionType', 'scoringMode', 'maxScore', 'questionText', 'questionHtml', 'explanation', 'difficulty', 'status'],
      rows: questions,
      description: 'Bank soal.',
    },
    {
      name: 'QUESTION_OPTIONS',
      model: 'QuestionOption',
      headers: ['id', 'questionId', 'label', 'optionText', 'isCorrect'],
      rows: questionOptions,
      description: 'Pilihan dan kunci jawaban soal.',
    },
    {
      name: 'TRYOUTS',
      model: 'Tryout',
      headers: ['id', 'authorId', 'title', 'description', 'durationMinutes', 'status', 'startAt', 'endAt', 'rulesHtml'],
      rows: tryouts,
      description: 'Master tryout.',
    },
    {
      name: 'TRYOUT_QUESTIONS',
      model: 'TryoutQuestion',
      headers: ['id', 'tryoutId', 'questionId', 'orderNo'],
      rows: tryoutQuestions,
      description: 'Mapping soal ke paket tryout.',
    },
    {
      name: 'ATTEMPTS',
      model: 'Attempt',
      headers: ['id', 'userId', 'tryoutId', 'score', 'warnings', 'startedAt', 'submittedAt'],
      rows: attempts,
      description: 'Percobaan atau hasil pengerjaan tryout siswa.',
    },
    {
      name: 'ATTEMPT_ANSWERS',
      model: 'AttemptAnswer',
      headers: ['id', 'attemptId', 'questionId', 'selectedOptionId', 'selectedOptionIds', 'trueFalseAnswers', 'score', 'isCorrect', 'answeredAt'],
      rows: attemptAnswers,
      description: 'Jawaban siswa pada tryout.',
    },
    {
      name: 'PRACTICE_ATTEMPTS',
      model: 'PracticeAttempt',
      headers: ['id', 'userId', 'topicId', 'score', 'startedAt', 'completedAt', 'updatedAt'],
      rows: practiceAttempts,
      description: 'Progres latihan berdasarkan topik.',
    },
    {
      name: 'PRACTICE_ANSWERS',
      model: 'PracticeAnswer',
      headers: ['id', 'attemptId', 'questionId', 'selectedOptionId', 'selectedOptionIds', 'trueFalseAnswers', 'score', 'isCorrect', 'isAnswered', 'answeredAt'],
      rows: practiceAnswers,
      description: 'Jawaban latihan siswa.',
    },
    {
      name: 'TRYOUT_INCIDENTS',
      model: 'TryoutIncident',
      headers: ['id', 'tryoutId', 'attemptId', 'userId', 'type', 'message', 'createdAt'],
      rows: tryoutIncidents,
      description: 'Log audit insiden selama tryout.',
    },
    {
      name: 'NOTIFICATIONS',
      model: 'Notification',
      headers: ['id', 'recipientId', 'senderId', 'type', 'title', 'message', 'link', 'isRead', 'readAt', 'createdAt'],
      rows: notifications,
      description: 'Pusat notifikasi seluruh pengguna.',
    },
  ];
}

export async function createDatabaseBackupWorkbook(options: DatabaseBackupOptions = {}) {
  const includePasswordHashes = options.includePasswordHashes !== false;
  const generatedAt = new Date();
  const sheets = await collectDatabaseBackupSheets(includePasswordHashes);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `Backup Database Sains Masemba ${DATABASE_BACKUP_APP_VERSION}`,
    Subject: 'Backup data aplikasi dalam format Excel',
    Author: options.generatedBy || 'Super Admin',
    CreatedDate: generatedAt,
  };

  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  const readmeRows: Array<Array<string | number>> = [
    ['KUNCI', 'NILAI'],
    ['backupFormat', DATABASE_BACKUP_FORMAT],
    ['appVersion', DATABASE_BACKUP_APP_VERSION],
    ['generatedAt', generatedAt.toISOString()],
    ['generatedBy', options.generatedBy || 'Super Admin'],
    ['includePasswordHashes', includePasswordHashes ? 'YES' : 'NO'],
    ['sheetCount', sheets.length],
    ['totalDataRows', totalRows],
    ['', ''],
    ['PERINGATAN', 'File ini memuat data aplikasi. Simpan di lokasi privat dan jangan dikirim melalui kanal publik.'],
    ['PEMULIHAN', 'Pertahankan nama sheet, nama kolom, ID, dan format nilai. Perubahan manual dapat membuat proses restore gagal.'],
    ['FILE EKSTERNAL', 'URL gambar atau berkas ikut dicatat, tetapi isi file pada Vercel Blob/penyimpanan eksternal tidak disalin ke workbook.'],
    ['TEKS PANJANG', 'Nilai lebih dari 32.000 karakter diganti referensi [[LONG_TEXT:...]] dan disimpan utuh dalam sheet LONG_TEXT.'],
    ['PASSWORD', includePasswordHashes ? 'Sheet USERS memuat hash password untuk pemulihan penuh. Hash bukan password asli, tetapi tetap data sensitif.' : 'Hash password tidak disertakan; pemulihan akun akan memerlukan reset password.'],
  ];
  const readme = XLSX.utils.aoa_to_sheet(readmeRows);
  readme['!cols'] = [{ wch: 24 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, readme, 'README_BACKUP');

  const manifestRows = [
    ['NO', 'SHEET', 'MODEL', 'JUMLAH_BARIS', 'KETERANGAN'],
    ...sheets.map((sheet, index) => [index + 1, sheet.name, sheet.model, sheet.rows.length, sheet.description]),
  ];
  const manifest = XLSX.utils.aoa_to_sheet(manifestRows);
  manifest['!cols'] = [{ wch: 7 }, { wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 64 }];
  manifest['!autofilter'] = { ref: `A1:E${manifestRows.length}` };
  XLSX.utils.book_append_sheet(workbook, manifest, 'MANIFEST');

  const longTextChunks: LongTextChunk[] = [];
  for (const sheet of sheets) appendSheet(workbook, sheet, longTextChunks);

  const longTextHeaders = ['reference', 'sourceSheet', 'sourceRow', 'sourceColumn', 'chunkNo', 'content'];
  const longTextWorksheet = XLSX.utils.aoa_to_sheet([
    longTextHeaders,
    ...longTextChunks.map((chunk) => longTextHeaders.map((header) => cellValueForLongTextSheet(chunk, header))),
  ]);
  longTextWorksheet['!cols'] = [{ wch: 36 }, { wch: 28 }, { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 80 }];
  longTextWorksheet['!autofilter'] = { ref: `A1:F${Math.max(1, longTextChunks.length + 1)}` };
  XLSX.utils.book_append_sheet(workbook, longTextWorksheet, 'LONG_TEXT');

  return { workbook, generatedAt, totalRows, sheets, longTextChunks: longTextChunks.length };

}

export async function createDatabaseBackupBuffer(options: DatabaseBackupOptions = {}) {
  const result = await createDatabaseBackupWorkbook(options);
  const buffer = XLSX.write(result.workbook, {
    bookType: 'xlsx',
    type: 'buffer',
    compression: true,
  }) as Buffer;
  return { ...result, buffer };
}

export async function getDatabaseBackupCounts() {
  const counts = await Promise.all([
    prisma.appSetting.count(),
    prisma.user.count(),
    prisma.parentStudentLink.count(),
    prisma.topic.count(),
    prisma.material.count(),
    prisma.materialSection.count(),
    prisma.learningObjective.count(),
    prisma.tkadTip.count(),
    prisma.blueprint.count(),
    prisma.question.count(),
    prisma.questionOption.count(),
    prisma.tryout.count(),
    prisma.tryoutQuestion.count(),
    prisma.attempt.count(),
    prisma.attemptAnswer.count(),
    prisma.practiceAttempt.count(),
    prisma.practiceAnswer.count(),
    prisma.tryoutIncident.count(),
    prisma.notification.count(),
  ]);
  const definitions = [
    ['APP_SETTINGS', 'AppSetting', 'Pengaturan aplikasi dan tema.'],
    ['USERS', 'User', 'Seluruh akun pengguna.'],
    ['PARENT_STUDENT_LINKS', 'ParentStudentLink', 'Relasi akun orang tua dan siswa.'],
    ['TOPICS', 'Topic', 'Master topik pembelajaran.'],
    ['MATERIALS', 'Material', 'Master materi pembelajaran.'],
    ['MATERIAL_SECTIONS', 'MaterialSection', 'Bagian atau bab pada setiap materi.'],
    ['LEARNING_OBJECTIVES', 'LearningObjective', 'Tujuan pembelajaran materi.'],
    ['TKAD_TIPS', 'TkadTip', 'Konten tips TKAD/TIP.'],
    ['BLUEPRINTS', 'Blueprint', 'Kisi-kisi atau blueprint soal.'],
    ['QUESTIONS', 'Question', 'Bank soal.'],
    ['QUESTION_OPTIONS', 'QuestionOption', 'Pilihan dan kunci jawaban soal.'],
    ['TRYOUTS', 'Tryout', 'Master tryout.'],
    ['TRYOUT_QUESTIONS', 'TryoutQuestion', 'Mapping soal ke paket tryout.'],
    ['ATTEMPTS', 'Attempt', 'Hasil pengerjaan tryout siswa.'],
    ['ATTEMPT_ANSWERS', 'AttemptAnswer', 'Jawaban siswa pada tryout.'],
    ['PRACTICE_ATTEMPTS', 'PracticeAttempt', 'Progres latihan berdasarkan topik.'],
    ['PRACTICE_ANSWERS', 'PracticeAnswer', 'Jawaban latihan siswa.'],
    ['TRYOUT_INCIDENTS', 'TryoutIncident', 'Log audit insiden selama tryout.'],
    ['NOTIFICATIONS', 'Notification', 'Pusat notifikasi seluruh pengguna.'],
  ] as const;
  return definitions.map(([sheet, model, description], index) => ({
    sheet,
    model,
    count: counts[index],
    description,
  }));
}
