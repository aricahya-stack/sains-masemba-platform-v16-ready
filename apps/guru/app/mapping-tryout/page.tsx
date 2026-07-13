import { prisma, UserRole } from '@sh/db';
import { requireRole, tryoutCodeFromPeriodCode } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

type MappingGroup = {
  tryoutCode: string;
  groupName: string;
  sourceAuthorId: string;
  sourceOwner: string;
  questionCodes: string[];
};

export default async function MappingTryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const [questions, tryouts] = await Promise.all([
    prisma.question.findMany({
      where: {
        AND: [
          {
            author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } },
          },
          {
            blueprint: {
              is: {
                OR: [
                  { periodCode: { startsWith: 'TRYOUT_CONTENT' } },
                  { testGroup: { startsWith: 'Tryout', mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
      include: { blueprint: true, author: { select: { id: true, fullName: true, role: true } } },
      orderBy: [{ authorId: 'asc' }, { stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
    prisma.tryout.findMany({
      where: { author: { is: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } } } },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        questions: {
          include: { question: { include: { blueprint: true, author: { select: { fullName: true } } } } },
          orderBy: { orderNo: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    }),
  ]);

  const candidates = new Map<string, MappingGroup>();

  // Soal berstatus DRAFT, REVIEW, maupun PUBLISHED tetap dibaca.
  // Pemisahan paket didasarkan pada kode tryout + pemilik sumber agar kode yang sama tidak tercampur.
  for (const question of questions) {
    const groupName = question.blueprint?.testGroup?.trim();
    if (!groupName) continue;
    const tryoutCode = tryoutCodeFromPeriodCode(question.blueprint?.periodCode, groupName);
    const candidateKey = `${question.authorId}::${tryoutCode}`;
    const current = candidates.get(candidateKey) || {
      tryoutCode,
      groupName,
      sourceAuthorId: question.authorId,
      sourceOwner: question.author.role === UserRole.SUPER_ADMIN
        ? `Konten pusat • ${question.author.fullName}`
        : `Konten guru • ${question.author.fullName}`,
      questionCodes: [],
    };
    if (!current.questionCodes.includes(question.code)) current.questionCodes.push(question.code);
    candidates.set(candidateKey, current);
  }

  // Untuk kode yang sama, paket lengkap 30 soal diprioritaskan. Jika tingkat kelengkapannya sama,
  // konten milik guru dipilih lebih dahulu daripada konten pusat.
  const groups = new Map<string, MappingGroup>();
  for (const candidate of candidates.values()) {
    const current = groups.get(candidate.tryoutCode);
    const candidateComplete = candidate.questionCodes.length === 30;
    const currentComplete = current?.questionCodes.length === 30;
    const shouldReplace = !current
      || (candidateComplete && !currentComplete)
      || (candidateComplete === currentComplete && candidate.questionCodes.length > current.questionCodes.length)
      || (candidateComplete === currentComplete
        && candidate.questionCodes.length === current.questionCodes.length
        && candidate.sourceOwner.localeCompare(current.sourceOwner, 'id') < 0);
    if (shouldReplace) groups.set(candidate.tryoutCode, candidate);
  }

  // Paket lama seluruh guru tetap ditampilkan walaupun sumber blueprint-nya belum memakai format terbaru.
  for (const tryout of tryouts) {
    const firstBlueprint = tryout.questions.map((row) => row.question.blueprint).find(Boolean);
    const tryoutCode = tryoutCodeFromPeriodCode(firstBlueprint?.periodCode, firstBlueprint?.testGroup || tryout.title);
    if (groups.has(tryoutCode)) continue;
    const sourceAuthor = tryout.questions[0]?.question.author;
    groups.set(tryoutCode, {
      tryoutCode,
      groupName: firstBlueprint?.testGroup?.trim() || tryout.title,
      sourceAuthorId: tryout.authorId,
      sourceOwner: sourceAuthor?.fullName ? `Paket lama • ${sourceAuthor.fullName}` : 'Paket lama',
      questionCodes: tryout.questions.map((row) => row.question.code),
    });
  }

  const fields: InlineFieldDef[] = [
    { name: 'tryoutCode', label: 'Kode tryout', readOnly: true },
    { name: 'sourceGroup', label: 'Sumber data tryout', readOnly: true },
    { name: 'sourceOwner', label: 'Pembuat sumber soal', readOnly: true },
    { name: 'scheduleOwner', label: 'Pembuat jadwal', readOnly: true },
    { name: 'title', label: 'Judul tryout untuk siswa' },
    { name: 'description', label: 'Deskripsi', type: 'richtext', full: true },
    { name: 'durationMinutes', label: 'Durasi (menit)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    { name: 'startAt', label: 'Mulai', type: 'datetime-local' },
    { name: 'endAt', label: 'Selesai', type: 'datetime-local' },
    { name: 'rulesHtml', label: 'Aturan ujian', type: 'richtext', full: true },
  ];

  const initialRows = Array.from(groups.values()).map(({ tryoutCode, groupName, sourceOwner, questionCodes }) => {
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
      _readOnly: 'false',
      _deleteDisabled: existing && existing.authorId !== user.id ? 'true' : 'false',
      tryoutCode,
      sourceGroup: groupName,
      sourceOwner,
      scheduleOwner: existing
        ? `Dibuat oleh ${existing.author.fullName}${existing.author.role === UserRole.SUPER_ADMIN ? ' (Super Admin)' : ' (Guru)'}`
        : 'Belum dijadwalkan',
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
      mappingStatus: existing
        ? 'Sudah dijadwalkan'
        : questionCodes.length === 30
          ? 'Siap dijadwalkan • DRAFT diperbolehkan'
          : `Belum lengkap (${questionCodes.length}/30)`,
    };
  });

  return (
    <InlineEditableManager
      eyebrow="Ujian • Mapping Tryout"
      title="Mapping dan penjadwalan tryout"
      description="Mapping dan jadwal tryout digunakan bersama oleh seluruh guru. Setiap guru dapat menjadwalkan maupun mengubah jadwal yang sudah dibuat guru lain. Soal DRAFT tetap dapat dipetakan selama paket berisi tepat 30 soal; soal latihan tidak ikut terbaca karena sumbernya wajib memakai namespace blueprint tryout."
      entityName="jadwal tryout"
      endpoint="/api/tryouts"
      fields={fields}
      initialRows={initialRows}
      allowAdd={false}
      tableTitle="Tabel mapping dan jadwal tryout"
      tableColumns={[
        { key: 'tryoutCode', label: 'Kode tryout' },
        { key: 'sourceGroup', label: 'Paket sumber' },
        { key: 'sourceOwner', label: 'Pembuat soal' },
        { key: 'scheduleOwner', label: 'Pembuat jadwal' },
        { key: 'questionCount', label: 'Jumlah soal' },
        { key: 'mappingStatus', label: 'Kesiapan' },
        { key: 'status', label: 'Status ujian' },
        { key: 'startAt', label: 'Mulai' },
        { key: 'endAt', label: 'Selesai' },
      ]}
    />
  );
}
