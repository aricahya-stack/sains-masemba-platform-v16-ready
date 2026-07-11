import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function MappingTryoutPage() {
  const user = await requireRole(UserRole.GURU);
  const [questions, tryouts] = await Promise.all([
    prisma.question.findMany({
      where: {
        authorId: user.id,
        blueprint: {
          is: {
            OR: [
              { periodCode: 'TRYOUT_CONTENT' },
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
      include: { questions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
      orderBy: { title: 'asc' },
    }),
  ]);

  const groups = new Map<string, string[]>();
  for (const tryout of tryouts) {
    groups.set(tryout.title, tryout.questions.map((row) => row.question.code));
  }
  for (const question of questions) {
    const groupName = question.blueprint?.testGroup?.trim();
    if (!groupName) continue;
    const current = groups.get(groupName) || [];
    if (!current.includes(question.code)) current.push(question.code);
    groups.set(groupName, current);
  }

  const fields: InlineFieldDef[] = [
    { name: 'sourceGroup', label: 'Sumber data tryout', readOnly: true },
    { name: 'title', label: 'Judul tryout untuk siswa' },
    { name: 'description', label: 'Deskripsi', type: 'richtext', full: true },
    { name: 'durationMinutes', label: 'Durasi (menit)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'ARCHIVED'] },
    { name: 'startAt', label: 'Mulai', type: 'datetime-local' },
    { name: 'endAt', label: 'Selesai', type: 'datetime-local' },
    { name: 'rulesHtml', label: 'Aturan ujian', type: 'richtext', full: true },
  ];

  const initialRows = Array.from(groups.entries()).map(([groupName, questionCodes]) => {
    const expectedCodes = [...questionCodes].sort().join('|');
    const existing = tryouts.find((tryout) => {
      if (tryout.title === groupName) return true;
      const mappedCodes = tryout.questions.map((row) => row.question.code).sort().join('|');
      return mappedCodes === expectedCodes;
    });
    return {
      id: existing?.id || `group:${encodeURIComponent(groupName)}`,
      _persisted: existing ? 'true' : 'false',
      sourceGroup: groupName,
      importedGroup: groupName,
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
      description="Paket tryout hasil impor maupun Tryout lama dipetakan dan dijadwalkan di halaman ini, bukan melalui Excel. Hanya paket dengan tepat 30 soal yang dapat disimpan sebagai jadwal tryout."
      entityName="jadwal tryout"
      endpoint="/api/tryouts"
      fields={fields}
      initialRows={initialRows}
      allowAdd={false}
      tableTitle="Tabel mapping dan jadwal tryout"
      tableColumns={[
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
