import { prisma, UserRole } from '@sh/db';
import { requireRole, tryoutCodeFromPeriodCode } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

type MappingGroup = {
  tryoutCode: string;
  groupName: string;
  questionCodes: string[];
};

export default async function MappingTryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const [questions, tryouts] = await Promise.all([
    prisma.question.findMany({
      where: {
        authorId: user.id,
        blueprint: {
          is: {
            OR: [
              { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
              { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
            ],
          },
        },
      },
      include: { blueprint: true },
      orderBy: [{ stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
    prisma.tryout.findMany({
      where: { authorId: user.id },
      include: {
        questions: {
          include: { question: { include: { blueprint: true } } },
          orderBy: { orderNo: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    }),
  ]);

  const groups = new Map<string, MappingGroup>();

  // Sumber utama mapping adalah soal hasil import terbaru.
  // Dengan urutan ini, re-import paket yang sama tidak menggabungkan 30 soal lama
  // dengan 30 soal baru menjadi 31+ soal.
  for (const question of questions) {
    const groupName = question.blueprint?.testGroup?.trim();
    if (!groupName) continue;
    const tryoutCode = tryoutCodeFromPeriodCode(question.blueprint?.periodCode, groupName);
    const current = groups.get(tryoutCode) || { tryoutCode, groupName, questionCodes: [] };
    if (!current.questionCodes.includes(question.code)) current.questionCodes.push(question.code);
    groups.set(tryoutCode, current);
  }

  // Paket lama yang belum lagi memiliki sumber soal import tetap ditampilkan,
  // tetapi tidak menimpa isi paket import terbaru dengan kode yang sama.
  for (const tryout of tryouts) {
    const firstBlueprint = tryout.questions.map((row) => row.question.blueprint).find(Boolean);
    const tryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || tryout.title);
    if (groups.has(tryoutCode)) continue;
    groups.set(tryoutCode, {
      tryoutCode,
      groupName: firstBlueprint?.testGroup?.trim() || tryout.title,
      questionCodes: tryout.questions.map((row) => row.question.code),
    });
  }

  const fields: InlineFieldDef[] = [
    { name: 'tryoutCode', label: 'Kode tryout', readOnly: true },
    { name: 'sourceGroup', label: 'Sumber data tryout', readOnly: true },
    { name: 'title', label: 'Judul tryout untuk siswa' },
    { name: 'description', label: 'Deskripsi', type: 'richtext', full: true },
    { name: 'durationMinutes', label: 'Durasi (menit)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    { name: 'startAt', label: 'Mulai', type: 'datetime-local' },
    { name: 'endAt', label: 'Selesai', type: 'datetime-local' },
    { name: 'rulesHtml', label: 'Aturan ujian', type: 'richtext', full: true },
  ];

  const initialRows = Array.from(groups.values()).map(({ tryoutCode, groupName, questionCodes }) => {
    const expectedCodes = [...questionCodes].sort().join('|');
    const existing = tryouts.find((tryout) => {
      const firstBlueprint = tryout.questions.map((row) => row.question.blueprint).find(Boolean);
      const existingTryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || tryout.title);
      const mappedCodes = tryout.questions.map((row) => row.question.code).sort().join('|');
      return existingTryoutCode === tryoutCode || mappedCodes === expectedCodes;
    });

    return {
      id: existing?.id || `group:${encodeURIComponent(tryoutCode)}`,
      _persisted: existing ? 'true' : 'false',
      tryoutCode,
      sourceGroup: groupName,
      importedGroup: tryoutCode,
      title: existing?.title || groupName,
      description: existing?.description || '',
      durationMinutes: String(existing?.durationMinutes || 60),
      status: existing?.status || 'DRAFT',
      startAt: existing?.startAt ? existing.startAt.toISOString().slice(0, 16) : '',
      endAt: existing?.endAt ? existing.endAt.toISOString().slice(0, 16) : '',
      rulesHtml: existing?.rulesHtml || '',
      questionCodes: questionCodes.join('\n'),
      questionCount: String(questionCodes.length),
      mappingStatus: existing ? 'Sudah dijadwalkan' : questionCodes.length === 30 ? 'Siap dijadwalkan' : `Belum lengkap (${questionCodes.length}/30)`,
    };
  });

  return (
    <InlineEditableManager
      eyebrow="Ujian • Mapping Tryout"
      title="Mapping dan penjadwalan tryout"
      description="Paket kini dikelompokkan berdasarkan kode tryout, bukan nama topik atau nama materi. Konten tryout tetap terpisah dari topik belajar siswa dan hanya paket berisi tepat 30 soal yang dapat dijadwalkan."
      entityName="jadwal tryout"
      endpoint="/api/tryouts"
      fields={fields}
      initialRows={initialRows}
      allowAdd={false}
      tableTitle="Tabel mapping dan jadwal tryout"
      tableColumns={[
        { key: 'tryoutCode', label: 'Kode tryout' },
        { key: 'sourceGroup', label: 'Paket impor' },
        { key: 'questionCount', label: 'Jumlah soal' },
        { key: 'mappingStatus', label: 'Kesiapan' },
        { key: 'status', label: 'Status ujian' },
        { key: 'startAt', label: 'Mulai' },
        { key: 'endAt', label: 'Selesai' },
      ]}
    />
  );
}
