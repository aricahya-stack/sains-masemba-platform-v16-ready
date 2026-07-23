import fs from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { prisma } from '../src/client';
import { createDatabaseBackupBuffer, DATABASE_BACKUP_FORMAT } from '../src/excel-backup';

type Row = Record<string, unknown>;
type FieldType = 'int' | 'float' | 'boolean' | 'date' | 'json' | 'stringArray';

type RestoreSpec = {
  sheet: string;
  delegate: string;
  fieldTypes?: Record<string, FieldType>;
  nullable?: string[];
};

const specs: RestoreSpec[] = [
  { sheet: 'APP_SETTINGS', delegate: 'appSetting', fieldTypes: { updatedAt: 'date' } },
  { sheet: 'USERS', delegate: 'user', fieldTypes: { authVersion: 'int', createdAt: 'date', updatedAt: 'date' }, nullable: ['passwordHash', 'phone', 'className'] },
  { sheet: 'PARENT_STUDENT_LINKS', delegate: 'parentStudentLink', fieldTypes: { isActive: 'boolean', createdAt: 'date' } },
  { sheet: 'TOPICS', delegate: 'topic', fieldTypes: { orderNo: 'int' }, nullable: ['description'] },
  { sheet: 'MATERIALS', delegate: 'material', fieldTypes: { createdAt: 'date', updatedAt: 'date' }, nullable: ['summaryText', 'summaryHtml', 'coverImageUrl', 'level'] },
  { sheet: 'MATERIAL_SECTIONS', delegate: 'materialSection', fieldTypes: { orderNo: 'int' }, nullable: ['contentText', 'contentHtml', 'imageUrl'] },
  { sheet: 'LEARNING_OBJECTIVES', delegate: 'learningObjective', fieldTypes: { orderNo: 'int' } },
  { sheet: 'TKAD_TIPS', delegate: 'tkadTip', fieldTypes: { orderNo: 'int', createdAt: 'date', updatedAt: 'date' } },
  { sheet: 'BLUEPRINTS', delegate: 'blueprint', fieldTypes: { targetQuestionCount: 'int' }, nullable: ['periodCode', 'periodName', 'testGroup', 'topicId', 'materialName', 'blueprintText', 'labelRahasia', 'cognitiveLevel', 'targetDifficulty'] },
  { sheet: 'QUESTIONS', delegate: 'question', fieldTypes: { stimulusOrder: 'int', maxScore: 'float' }, nullable: ['blueprintId', 'questionHtml', 'explanation', 'difficulty'] },
  { sheet: 'QUESTION_OPTIONS', delegate: 'questionOption', fieldTypes: { isCorrect: 'boolean' } },
  { sheet: 'TRYOUTS', delegate: 'tryout', fieldTypes: { durationMinutes: 'int', startAt: 'date', endAt: 'date' }, nullable: ['description', 'startAt', 'endAt', 'rulesHtml'] },
  { sheet: 'TRYOUT_QUESTIONS', delegate: 'tryoutQuestion', fieldTypes: { orderNo: 'int' } },
  { sheet: 'ATTEMPTS', delegate: 'attempt', fieldTypes: { score: 'float', warnings: 'int', startedAt: 'date', submittedAt: 'date' }, nullable: ['submittedAt'] },
  { sheet: 'ATTEMPT_ANSWERS', delegate: 'attemptAnswer', fieldTypes: { selectedOptionIds: 'stringArray', trueFalseAnswers: 'json', score: 'float', isCorrect: 'boolean', answeredAt: 'date' }, nullable: ['selectedOptionId', 'trueFalseAnswers'] },
  { sheet: 'PRACTICE_ATTEMPTS', delegate: 'practiceAttempt', fieldTypes: { score: 'float', startedAt: 'date', completedAt: 'date', updatedAt: 'date' }, nullable: ['completedAt'] },
  { sheet: 'PRACTICE_ANSWERS', delegate: 'practiceAnswer', fieldTypes: { selectedOptionIds: 'stringArray', trueFalseAnswers: 'json', score: 'float', isCorrect: 'boolean', isAnswered: 'boolean', answeredAt: 'date' }, nullable: ['selectedOptionId', 'trueFalseAnswers'] },
  { sheet: 'TRYOUT_INCIDENTS', delegate: 'tryoutIncident', fieldTypes: { createdAt: 'date' }, nullable: ['attemptId', 'userId', 'message'] },
];

const deleteOrder = [
  'tryoutIncident',
  'practiceAnswer',
  'practiceAttempt',
  'attemptAnswer',
  'attempt',
  'tryoutQuestion',
  'tryout',
  'questionOption',
  'question',
  'blueprint',
  'tkadTip',
  'learningObjective',
  'materialSection',
  'material',
  'parentStudentLink',
  'topic',
  'appSetting',
  'user',
];

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '';
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'ya'].includes(normalized)) return true;
  if (['false', '0', 'no', 'tidak'].includes(normalized)) return false;
  throw new Error(`Nilai boolean tidak valid: ${String(value)}`);
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
}

function parseField(value: unknown, type: FieldType | undefined, nullable: boolean) {
  if (isBlank(value)) {
    if (type === 'stringArray') return [];
    if (nullable) return null;
    if (type === 'boolean') return false;
    if (type === 'int' || type === 'float') return 0;
    return '';
  }

  if (type === 'int') return Number.parseInt(String(value), 10);
  if (type === 'float') return Number(value);
  if (type === 'boolean') return parseBoolean(value);
  if (type === 'date') {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error(`Tanggal tidak valid: ${String(value)}`);
    return date;
  }
  if (type === 'json') return parseJson(value);
  if (type === 'stringArray') {
    const parsed = parseJson(value);
    if (!Array.isArray(parsed)) throw new Error(`Array JSON tidak valid: ${String(value)}`);
    return parsed.map((item) => String(item));
  }
  return value;
}

function worksheetRows(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error(`Sheet wajib tidak ditemukan: ${sheetName}`);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: true });
  const headers = (matrix[0] || []).map((value) => String(value).trim());
  if (!headers.length) throw new Error(`Sheet ${sheetName} tidak memiliki header.`);
  return matrix
    .slice(1)
    .filter((row) => row.some((value) => !isBlank(value)))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function buildLongTextMap(workbook: XLSX.WorkBook) {
  const worksheet = workbook.Sheets.LONG_TEXT;
  const result = new Map<string, string>();
  if (!worksheet) return result;
  const rows = XLSX.utils.sheet_to_json<Row>(worksheet, { defval: '', raw: true });
  const grouped = new Map<string, Array<{ chunkNo: number; content: string }>>();
  for (const row of rows) {
    const reference = String(row.reference || '').trim();
    if (!reference) continue;
    const list = grouped.get(reference) || [];
    list.push({ chunkNo: Number(row.chunkNo || 0), content: String(row.content || '') });
    grouped.set(reference, list);
  }
  for (const [reference, chunks] of grouped) {
    result.set(reference, chunks.sort((a, b) => a.chunkNo - b.chunkNo).map((chunk) => chunk.content).join(''));
  }
  return result;
}

function resolveLongText(value: unknown, longTextMap: Map<string, string>) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^\[\[LONG_TEXT:(.+)\]\]$/);
  if (!match) return value;
  const restored = longTextMap.get(match[1]);
  if (restored === undefined) throw new Error(`Referensi teks panjang tidak ditemukan: ${match[1]}`);
  return restored;
}

function validateBackupFormat(workbook: XLSX.WorkBook) {
  const rows = worksheetRows(workbook, 'README_BACKUP');
  const formatRow = rows.find((row) => String(row.KUNCI || '') === 'backupFormat');
  if (!formatRow || String(formatRow.NILAI || '') !== DATABASE_BACKUP_FORMAT) {
    throw new Error('Format workbook bukan backup resmi Sains Masemba atau versinya tidak didukung.');
  }
}

function transformRows(workbook: XLSX.WorkBook, spec: RestoreSpec, longTextMap: Map<string, string>) {
  const nullable = new Set(spec.nullable || []);
  const fieldTypes = spec.fieldTypes || {};
  return worksheetRows(workbook, spec.sheet).map((row, index) => {
    const transformed: Row = {};
    for (const [field, originalValue] of Object.entries(row)) {
      if (!field) continue;
      const value = resolveLongText(originalValue, longTextMap);
      try {
        transformed[field] = parseField(value, fieldTypes[field], nullable.has(field));
      } catch (error) {
        throw new Error(`${spec.sheet} baris ${index + 2}, kolom ${field}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return transformed;
  });
}

async function createPreRestoreBackup() {
  const outputDir = path.resolve(process.env.BACKUP_DIR || 'backups');
  await fs.mkdir(outputDir, { recursive: true });
  const result = await createDatabaseBackupBuffer({ generatedBy: 'Automatic pre-restore backup', includePasswordHashes: true });
  const fileName = `pre-restore-${result.generatedAt.toISOString().replace(/[:.]/g, '-')}.xlsx`;
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, result.buffer);
  return filePath;
}

async function createManyInChunks(delegate: any, rows: Row[], chunkSize = 500) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    await delegate.createMany({ data: rows.slice(index, index + chunkSize) });
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Gunakan: npm run db:restore-excel -- /lokasi/file-backup.xlsx');
  if (process.env.ALLOW_EXCEL_RESTORE !== 'YES') {
    throw new Error('Restore diblokir. Set ALLOW_EXCEL_RESTORE=YES setelah memastikan DATABASE_URL dan file backup benar.');
  }
  if (process.env.RESTORE_MODE !== 'REPLACE') {
    throw new Error('Restore penuh memerlukan RESTORE_MODE=REPLACE. Mode ini menghapus isi tabel saat ini sebelum mengisi backup.');
  }

  const inputPath = path.resolve(input);
  const workbook = XLSX.readFile(inputPath, { cellDates: false, raw: true });
  validateBackupFormat(workbook);
  const longTextMap = buildLongTextMap(workbook);
  const payloads = specs.map((spec) => ({ spec, rows: transformRows(workbook, spec, longTextMap) }));

  const userPayload = payloads.find((item) => item.spec.sheet === 'USERS')?.rows || [];
  if (!userPayload.some((row) => row.role === 'SUPER_ADMIN')) {
    throw new Error('Restore dibatalkan: backup tidak memiliki akun SUPER_ADMIN.');
  }

  const preRestorePath = await createPreRestoreBackup();
  console.log(`Backup otomatis sebelum restore: ${preRestorePath}`);

  await prisma.$transaction(async (tx: any) => {
    for (const delegateName of deleteOrder) await tx[delegateName].deleteMany({});
    for (const { spec, rows } of payloads) {
      if (rows.length) await createManyInChunks(tx[spec.delegate], rows);
      console.log(`${spec.sheet}: ${rows.length} baris dipulihkan`);
    }
  }, {
    maxWait: 30_000,
    timeout: Number(process.env.RESTORE_TIMEOUT_MS || 900_000),
  });

  console.log('Restore Excel selesai. Jalankan aplikasi dan verifikasi akun, materi, tryout, dan hasil siswa.');
}

main()
  .catch((error) => {
    console.error('Restore Excel gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
