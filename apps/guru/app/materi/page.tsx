import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function MateriPage() {
  const user = await requireRole(UserRole.GURU);
  const [topics, materials] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.material.findMany({
      where: { authorId: user.id },
      include: { objectives: { orderBy: { orderNo: 'asc' } }, sections: { orderBy: { orderNo: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const fields: FieldDef[] = [
    { name: 'title', label: 'Judul materi' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
    { name: 'level', label: 'Level / kelas' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'summaryHtml', label: 'Ringkasan materi (HTML / LaTeX)', type: 'richtext' },
    { name: 'objectivesText', label: 'Tujuan pembelajaran (1 baris = 1 tujuan)', type: 'textarea' },
    { name: 'sectionsHtml', label: 'Isi materi utama (HTML / LaTeX)', type: 'richtext' },
    { name: 'coverImageUrl', label: 'URL gambar cover', full: true },
  ];

  const initialRows = materials.map((material) => ({
    id: material.id,
    title: material.title,
    topicId: material.topicId,
    level: material.level || '',
    status: material.status,
    summaryHtml: material.summaryHtml || material.summaryText || '',
    objectivesText: material.objectives.map((item) => item.objective).join('\n'),
    sectionsHtml: material.sections.map((item) => item.contentHtml || item.contentText || '').join('\n<hr />\n'),
    coverImageUrl: material.coverImageUrl || '',
  }));

  return (
    <EditableManager
      eyebrow="Materi"
      title="Kelola materi belajar"
      description="WYSIWYG mendukung HTML ringan dan LaTeX. Semua materi bisa disimpan sebagai draft lalu dipublish."
      entityName="materi"
      endpoint="/api/materials"
      fields={fields}
      initialRows={initialRows}
    />
  );
}
