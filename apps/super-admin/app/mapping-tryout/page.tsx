import { prisma, UserRole } from '@sh/db';
import { requireRole, tryoutCodeFromPeriodCode } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

type MappingGroup = {
  authorId: string;
  authorLabel: string;
  tryoutCode: string;
  groupName: string;
  questionCodes: string[];
};

export default async function MappingTryoutAdminPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [authors, questions, tryouts] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: { id: true, fullName: true, role: true },
    }),
    prisma.question.findMany({
      where: {
        blueprint: {
          is: {
            OR: [
              { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
              { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
            ],
          },
        },
      },
      include: { author: true, blueprint: true },
      orderBy: [{ author: { fullName: 'asc' } }, { stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
    prisma.tryout.findMany({
      include: {
        author: true,
        questions: {
          include: { question: { include: { blueprint: true } } },
          orderBy: { orderNo: 'asc' },
        },
      },
      orderBy: [{ author: { fullName: 'asc' } }, { title: 'asc' }],
    }),
  ]);

  const groups = new Map<string, MappingGroup>();

  // Sumber utama mapping adalah soal hasil import terbaru, dipisahkan per pemilik
  // dan kode tryout. Re-import tidak menggabungkan set soal lama dan baru.
  for (const question of questions) {
    const groupName = question.blueprint?.testGroup?.trim();
    if (!groupName) continue;
    const tryoutCode = tryoutCodeFromPeriodCode(question.blueprint?.periodCode, groupName);
    const key = `${question.authorId}::${tryoutCode}`;
    const current = groups.get(key) || {
      authorId: question.authorId,
      authorLabel: question.author.fullName,
      tryoutCode,
      groupName,
      questionCodes: [],
    };
    if (!current.questionCodes.includes(question.code)) current.questionCodes.push(question.code);
    groups.set(key, current);
  }

  // Pertahankan paket lama yang tidak lagi mempunyai sumber soal import aktif,
  // tanpa menimpa paket import terbaru dengan kode yang sama.
  for (const tryout of tryouts) {
    const firstBlueprint = tryout.questions.map((row) => row.question.blueprint).find(Boolean);
    const tryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || tryout.title);
    const key = `${tryout.authorId}::${tryoutCode}`;
    if (groups.has(key)) continue;
    groups.set(key, {
      authorId: tryout.authorId,
      authorLabel: tryout.author.fullName,
      tryoutCode,
      groupName: firstBlueprint?.testGroup?.trim() || tryout.title,
      questionCodes: tryout.questions.map((row) => row.question.code),
    });
  }

  const fields: InlineFieldDef[] = [
    { name: 'tryoutCode', label: 'Kode tryout', readOnly: true },
    { name: 'sourceGroup', label: 'Sumber data tryout', readOnly: true },
    { name: 'authorId', label: 'Pemilik paket dan jadwal', type: 'select', readOnly: true, options: authors.map((author) => ({ value: author.id, label: `${author.fullName} • ${author.role === UserRole.GURU ? 'Guru' : 'Super Admin'}` })) },
    { name: 'title', label: 'Judul tryout untuk siswa' },
    { name: 'description', label: 'Deskripsi', type: 'richtext', full: true },
    { name: 'durationMinutes', label: 'Durasi (menit)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    { name: 'startAt', label: 'Mulai', type: 'datetime-local' },
    { name: 'endAt', label: 'Selesai', type: 'datetime-local' },
    { name: 'rulesHtml', label: 'Aturan ujian', type: 'richtext', full: true },
  ];

  const initialRows = Array.from(groups.values()).map(({ authorId, authorLabel, tryoutCode, groupName, questionCodes }) => {
    const expectedCodes = [...questionCodes].sort().join('|');
    const existing = tryouts.find((tryout) => {
      if (tryout.authorId !== authorId) return false;
      const firstBlueprint = tryout.questions.map((row) => row.question.blueprint).find(Boolean);
      const existingTryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || tryout.title);
      const mappedCodes = tryout.questions.map((row) => row.question.code).sort().join('|');
      return existingTryoutCode === tryoutCode || mappedCodes === expectedCodes;
    });

    return {
      id: existing?.id || `group:${encodeURIComponent(`${authorId}::${tryoutCode}`)}`,
      _persisted: existing ? 'true' : 'false',
      tryoutCode,
      sourceGroup: groupName,
      importedGroup: `${authorId}::${tryoutCode}`,
      authorId,
      authorLabel,
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
      title="Mapping dan penjadwalan seluruh tryout"
      description="Paket dipisahkan berdasarkan pemilik dan kode tryout. Konten tryout tidak lagi menambah topik materi siswa, dan hanya paket dengan tepat 30 soal yang dapat dijadwalkan."
      entityName="jadwal tryout"
      endpoint="/api/tryouts"
      fields={fields}
      initialRows={initialRows}
      allowAdd={false}
      tableTitle="Tabel mapping dan jadwal tryout"
      tableColumns={[
        { key: 'authorLabel', label: 'Pemilik' },
        { key: 'tryoutCode', label: 'Kode tryout' },
        { key: 'sourceGroup', label: 'Paket impor' },
        { key: 'questionCount', label: 'Jumlah soal' },
        { key: 'mappingStatus', label: 'Kesiapan' },
        { key: 'status', label: 'Status ujian' },
      ]}
    />
  );
}
