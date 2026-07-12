import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function TipsTkadPage() {
  const user = await requireRole(UserRole.GURU);
  const tips = await prisma.tkadTip.findMany({
    where: { authorId: user.id },
    orderBy: [{ orderNo: 'asc' }, { updatedAt: 'desc' }],
  });

  const fields: InlineFieldDef[] = [
    { name: 'orderNo', label: 'Urutan tampil', type: 'number', placeholder: 'Contoh: 1' },
    { name: 'category', label: 'Kategori', placeholder: 'Contoh: Strategi inti' },
    { name: 'title', label: 'Judul tips', placeholder: 'Tulis judul tips TKAD' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'],
    },
    {
      name: 'contentHtml',
      label: 'Isi Tips TKAD',
      type: 'richtext',
      placeholder: 'Tulis isi tips. Mendukung daftar, tabel, gambar, tautan, dan LaTeX.',
      full: true,
    },
  ];

  const initialRows = tips.map((tip) => ({
    id: tip.id,
    _persisted: 'true',
    category: tip.category,
    title: tip.title,
    orderNo: String(tip.orderNo),
    status: tip.status,
    contentHtml: tip.contentHtml,
  }));

  return (
    <InlineEditableManager
      eyebrow="Tips TKAD"
      title="Kelola strategi dan tips TKAD"
      description="Tambah dan edit tips langsung pada baris tabel. Hanya tips berstatus PUBLISHED yang tampil pada aplikasi siswa."
      entityName="tips TKAD"
      endpoint="/api/tkad-tips"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ orderNo: '0', status: 'DRAFT' }}
      addLabel="Tambah tips"
      tableTitle="Tabel Tips TKAD"
      tableColumns={[
        { key: 'orderNo', label: 'Urutan' },
        { key: 'category', label: 'Kategori' },
        { key: 'title', label: 'Judul' },
        { key: 'status', label: 'Status' },
        { key: 'contentHtml', label: 'Isi tips' },
      ]}
    />
  );
}
