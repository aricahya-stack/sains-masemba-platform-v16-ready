import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function TopikPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const topics = await prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] });

  const fields: FieldDef[] = [
    { name: 'title', label: 'Judul topik' },
    { name: 'slug', label: 'Slug' },
    { name: 'subject', label: 'Mata pelajaran' },
    { name: 'orderNo', label: 'Urutan' },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
  ];

  const initialRows = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    subject: topic.subject,
    orderNo: String(topic.orderNo),
    description: topic.description || '',
  }));

  return (
    <EditableManager
      eyebrow="Topik"
      title="Kelola topik IPA SMP"
      description="Topik dipakai untuk materi, kisi-kisi, bank soal, dan analitik."
      entityName="topik"
      endpoint="/api/topics"
      fields={fields}
      initialRows={initialRows}
    />
  );
}
