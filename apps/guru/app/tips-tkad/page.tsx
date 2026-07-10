import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function TipsTkadPage() {
  const user = await requireRole(UserRole.GURU);
  const tips = await prisma.tkadTip.findMany({
    where: { authorId: user.id },
    orderBy: [{ orderNo: 'asc' }, { updatedAt: 'desc' }],
  });

  const fields: FieldDef[] = [
    { name: 'category', label: 'Kategori', placeholder: 'Contoh: Strategi inti' },
    { name: 'title', label: 'Judul tips' },
    { name: 'orderNo', label: 'Urutan tampil' },
    { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] },
    { name: 'contentHtml', label: 'Isi Tips TKAD', type: 'richtext' },
  ];

  const initialRows = tips.map((tip) => ({
    id: tip.id,
    category: tip.category,
    title: tip.title,
    orderNo: String(tip.orderNo),
    status: tip.status,
    contentHtml: tip.contentHtml,
  }));

  return (
    <EditableManager
      eyebrow="Tips TKAD"
      title="Kelola strategi dan tips TKAD"
      description="Guru dapat menambah, mengubah urutan, mengedit isi, dan menentukan status publikasi. Hanya tips berstatus PUBLISHED yang tampil pada aplikasi siswa."
      entityName="tips TKAD"
      endpoint="/api/tkad-tips"
      fields={fields}
      initialRows={initialRows}
      tableColumns={[
        { key: 'orderNo', label: 'Urutan' },
        { key: 'category', label: 'Kategori' },
        { key: 'title', label: 'Judul' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
