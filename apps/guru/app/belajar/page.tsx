import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function BelajarPage() {
  const user = await requireRole(UserRole.GURU);
  const [topics, materials] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.material.findMany({
      where: { authorId: user.id },
      include: {
        topic: true,
        objectives: { orderBy: { orderNo: 'asc' } },
        sections: { orderBy: { orderNo: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const topicFields: FieldDef[] = [
    { name: 'title', label: 'Nama topik' },
    { name: 'subject', label: 'Mata pelajaran / rumpun', placeholder: 'Contoh: IPA SMP' },
    { name: 'orderNo', label: 'Urutan tampil' },
    { name: 'description', label: 'Deskripsi topik', type: 'textarea' },
  ];

  const materialFields: FieldDef[] = [
    { name: 'title', label: 'Judul materi' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
    { name: 'level', label: 'Level / kelas' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'summaryHtml', label: 'Ringkasan materi (HTML / LaTeX)', type: 'richtext' },
    { name: 'objectivesText', label: 'Tujuan pembelajaran (1 baris = 1 tujuan)', type: 'textarea' },
    { name: 'sectionsHtml', label: 'Isi materi utama (HTML / LaTeX)', type: 'richtext' },
    { name: 'coverImageUrl', label: 'URL gambar cover', full: true },
  ];

  const topicRows = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    subject: topic.subject,
    description: topic.description || '',
    orderNo: String(topic.orderNo),
  }));

  const materialRows = materials.map((material) => ({
    id: material.id,
    title: material.title,
    topicId: material.topicId,
    topicLabel: material.topic.title,
    level: material.level || '',
    status: material.status,
    summaryHtml: material.summaryHtml || material.summaryText || '',
    objectivesText: material.objectives.map((item) => item.objective).join('\n'),
    sectionsHtml: material.sections.map((item) => item.contentHtml || item.contentText || '').join('\n<hr />\n'),
    coverImageUrl: material.coverImageUrl || '',
  }));

  return (
    <div className="stack">
      <EditableManager
        eyebrow="Belajar • Topik"
        title="Kelola topik pembelajaran"
        description="Tambah, ubah, urutkan, dan hapus topik. Topik yang sedang digunakan tidak dapat dihapus agar relasi materi dan soal tetap aman. Setelah menambah topik baru, muat ulang halaman agar topik muncul di pilihan materi."
        entityName="topik"
        endpoint="/api/topics"
        fields={topicFields}
        initialRows={topicRows}
        tableColumns={[
          { key: 'orderNo', label: 'Urutan' },
          { key: 'title', label: 'Topik' },
          { key: 'subject', label: 'Rumpun' },
          { key: 'description', label: 'Deskripsi' },
        ]}
      />

      <EditableManager
        eyebrow="Belajar • Materi"
        title="Kelola materi belajar"
        description="Guru dapat membuat, mengedit, dan memublikasikan materi berdasarkan topik. Editor mendukung HTML ringan dan LaTeX."
        entityName="materi"
        endpoint="/api/materials"
        fields={materialFields}
        initialRows={materialRows}
        tableColumns={[
          { key: 'title', label: 'Judul materi' },
          { key: 'topicLabel', label: 'Topik' },
          { key: 'level', label: 'Level' },
          { key: 'status', label: 'Status' },
        ]}
      />
    </div>
  );
}
