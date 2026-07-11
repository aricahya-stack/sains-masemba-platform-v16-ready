import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function MappingTryoutAdminPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [authors, questions, tryouts] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: { id: true, fullName: true, role: true },
    }),
    prisma.question.findMany({
      where: { blueprint: { is: { testGroup: { not: null } } } },
      include: { author: true, blueprint: true },
      orderBy: [{ author: { fullName: 'asc' } }, { stimulusOrder: 'asc' }, { code: 'asc' }],
    }),
    prisma.tryout.findMany({
      include: { author: true, questions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
      orderBy: [{ author: { fullName: 'asc' } }, { title: 'asc' }],
    }),
  ]);

  const groups = new Map<string, { authorId: string; authorLabel: string; groupName: string; codes: string[] }>();
  for (const question of questions) {
    const groupName = question.blueprint?.testGroup?.trim();
    if (!groupName) continue;
    const key = `${question.authorId}::${groupName}`;
    const current = groups.get(key) || { authorId: question.authorId, authorLabel: question.author.fullName, groupName, codes: [] };
    current.codes.push(question.code);
    groups.set(key, current);
  }

  const fields: InlineFieldDef[] = [
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

  const initialRows = Array.from(groups.values()).map(({ authorId, authorLabel, groupName, codes }) => {
    const expectedCodes = [...codes].sort().join('|');
    const existing = tryouts.find((tryout) => {
      if (tryout.authorId !== authorId) return false;
      if (tryout.title === groupName) return true;
      const mappedCodes = tryout.questions.map((row) => row.question.code).sort().join('|');
      return mappedCodes === expectedCodes;
    });
    return {
      id: existing?.id || `group:${encodeURIComponent(`${authorId}::${groupName}`)}`,
      _persisted: existing ? 'true' : 'false',
      sourceGroup: groupName,
      importedGroup: `${authorId}::${groupName}`,
      authorId,
      authorLabel,
      title: existing?.title || groupName,
      description: existing?.description || '',
      durationMinutes: String(existing?.durationMinutes || 60),
      status: existing?.status || 'DRAFT',
      startAt: existing?.startAt ? existing.startAt.toISOString().slice(0, 16) : '',
      endAt: existing?.endAt ? existing.endAt.toISOString().slice(0, 16) : '',
      rulesHtml: existing?.rulesHtml || '',
      questionCodes: codes.join('\n'),
      questionCount: String(codes.length),
      mappingStatus: existing ? 'Sudah dijadwalkan' : codes.length === 30 ? 'Siap dijadwalkan' : `Belum lengkap (${codes.length}/30)`,
    };
  });

  return (
    <InlineEditableManager
      eyebrow="Ujian • Mapping Tryout"
      title="Mapping dan penjadwalan seluruh tryout"
      description="Paket hasil impor dijadwalkan dari halaman ini, bukan melalui Excel. Paket dipisahkan berdasarkan pemilik dan hanya dapat dijadwalkan setelah berisi tepat 30 soal."
      entityName="jadwal tryout"
      endpoint="/api/tryouts"
      fields={fields}
      initialRows={initialRows}
      allowAdd={false}
      tableTitle="Tabel mapping dan jadwal tryout"
      tableColumns={[
        { key: 'authorLabel', label: 'Pemilik' },
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
