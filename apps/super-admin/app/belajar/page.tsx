import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function BelajarAdminPage() {
  const admin = await requireRole(UserRole.SUPER_ADMIN);
  const [authors, topics] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [UserRole.GURU, UserRole.SUPER_ADMIN] } },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: { id: true, fullName: true, role: true },
    }),
    prisma.topic.findMany({
      include: {
        materials: {
          include: {
            author: true,
            objectives: { orderBy: { orderNo: 'asc' } },
            sections: { orderBy: { orderNo: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
    }),
  ]);

  const authorOptions = authors.map((author) => ({
    value: author.id,
    label: `${author.fullName} • ${author.role === UserRole.GURU ? 'Guru' : 'Super Admin'}`,
  }));

  const fields: InlineFieldDef[] = [
    { name: 'topicTitle', label: 'Nama topik' },
    { name: 'subject', label: 'Mata pelajaran / rumpun', placeholder: 'Contoh: IPA SMP' },
    { name: 'orderNo', label: 'Urutan tampil', type: 'number' },
    { name: 'topicDescription', label: 'Deskripsi topik', type: 'richtext', full: true },
    { name: 'materialTitle', label: 'Judul materi' },
    { name: 'authorId', label: 'Pemilik materi', type: 'select', options: authorOptions },
    { name: 'level', label: 'Level / kelas' },
    { name: 'status', label: 'Status materi', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'coverImageUrl', label: 'URL gambar cover' },
    { name: 'summaryHtml', label: 'Ringkasan materi', type: 'richtext', full: true },
    { name: 'objectivesText', label: 'Tujuan pembelajaran', type: 'richtext', full: true },
    { name: 'sectionsHtml', label: 'Isi materi utama', type: 'richtext', full: true },
  ];

  const initialRows = topics.flatMap((topic) => {
    if (!topic.materials.length) {
      return [{
        id: `topic:${topic.id}`,
        _persisted: 'true',
        topicId: topic.id,
        materialId: '',
        topicTitle: topic.title,
        subject: topic.subject,
        orderNo: String(topic.orderNo),
        topicDescription: topic.description || '',
        materialTitle: '',
        authorId: admin.id,
        authorLabel: '-',
        level: '',
        status: 'DRAFT',
        summaryHtml: '',
        objectivesText: '',
        sectionsHtml: '',
        coverImageUrl: '',
      }];
    }
    return topic.materials.map((material) => ({
      id: material.id,
      _persisted: 'true',
      topicId: topic.id,
      materialId: material.id,
      topicTitle: topic.title,
      subject: topic.subject,
      orderNo: String(topic.orderNo),
      topicDescription: topic.description || '',
      materialTitle: material.title,
      authorId: material.authorId,
      authorLabel: material.author.fullName,
      level: material.level || '',
      status: material.status,
      summaryHtml: material.summaryHtml || material.summaryText || '',
      objectivesText: material.objectives.map((item) => `<p>${item.objective}</p>`).join(''),
      sectionsHtml: material.sections.map((item) => item.contentHtml || item.contentText || '').join('\n<hr />\n'),
      coverImageUrl: material.coverImageUrl || '',
    }));
  });

  return (
    <InlineEditableManager
      eyebrow="Akademik • Topik & Materi"
      title="Kelola seluruh topik dan materi"
      description="Topik dan materi seluruh guru dikelola dari satu tabel. Super Admin dapat mengubah pemilik materi, status publikasi, dan seluruh isi dengan editor WYSIWYG."
      entityName="topik dan materi"
      endpoint="/api/topic-materials"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ authorId: admin.id, subject: 'IPA SMP', status: 'DRAFT', orderNo: '0' }}
      addLabel="Tambah topik & materi"
      tableTitle="Tabel topik dan materi"
      tableColumns={[
        { key: 'orderNo', label: 'Urutan' },
        { key: 'topicTitle', label: 'Topik' },
        { key: 'materialTitle', label: 'Materi' },
        { key: 'authorLabel', label: 'Pemilik' },
        { key: 'level', label: 'Kelas' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
