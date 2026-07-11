import { prisma, UserRole } from '@sh/db';
import { isInternalTryoutTopicSlug, isTryoutBlueprintLike, requireRole } from '@sh/core';
import { InlineEditableManager, type InlineFieldDef } from '../../components/inline-editable-manager';

export default async function BelajarPage() {
  await requireRole(UserRole.GURU);

  const allTopics = await prisma.topic.findMany({
    include: {
      materials: {
        include: {
          objectives: { orderBy: { orderNo: 'asc' } },
          sections: { orderBy: { orderNo: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      questions: {
        select: {
          id: true,
          blueprint: { select: { periodCode: true, testGroup: true } },
        },
      },
      blueprints: {
        select: { periodCode: true, testGroup: true },
      },
    },
    orderBy: [{ orderNo: 'asc' }, { title: 'asc' }],
  });

  // Pisahkan domain belajar dari domain tryout.
  // - Topik internal tryout selalu disembunyikan.
  // - Topik legacy yang hanya dipakai kisi-kisi/soal tryout juga disembunyikan.
  // - Topik kosong yang memang dibuat guru tetap dipertahankan agar bisa diisi materi nanti.
  const topics = allTopics.filter((topic) => {
    if (isInternalTryoutTopicSlug(topic.slug)) return false;
    if (topic.materials.length > 0) return true;

    const hasPracticeQuestion = topic.questions.some((question) => !isTryoutBlueprintLike(question.blueprint));
    if (hasPracticeQuestion) return true;

    const hasAnyQuestion = topic.questions.length > 0;
    const hasTryoutBlueprint = topic.blueprints.some((blueprint) => isTryoutBlueprintLike(blueprint));
    const isLegacyTryoutOnly = hasTryoutBlueprint && (!hasAnyQuestion || topic.questions.every((question) => isTryoutBlueprintLike(question.blueprint)));

    return !isLegacyTryoutOnly;
  });

  const fields: InlineFieldDef[] = [
    { name: 'topicCode', label: 'Kode topik' },
    { name: 'topicTitle', label: 'Nama topik' },
    { name: 'subject', label: 'Mata pelajaran / rumpun', placeholder: 'Contoh: IPA SMP' },
    { name: 'orderNo', label: 'Urutan tampil', type: 'number' },
    { name: 'topicDescription', label: 'Deskripsi topik', type: 'richtext', full: true },
    { name: 'materialTitle', label: 'Judul materi' },
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
        topicCode: topic.slug,
        topicTitle: topic.title,
        subject: topic.subject,
        orderNo: String(topic.orderNo),
        topicDescription: topic.description || '',
        materialTitle: '',
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
      topicCode: topic.slug,
      topicTitle: topic.title,
      subject: topic.subject,
      orderNo: String(topic.orderNo),
      topicDescription: topic.description || '',
      materialTitle: material.title,
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
      eyebrow="Belajar"
      title="Topik dan materi"
      description="Topik belajar dan konten tryout sekarang dipisahkan secara tegas. Kode topik menjadi identitas stabil untuk materi dan latihan, sedangkan paket tryout memakai kode tryout tersendiri."
      entityName="topik dan materi"
      endpoint="/api/topic-materials"
      fields={fields}
      initialRows={initialRows}
      newRowDefaults={{ subject: 'IPA SMP', status: 'DRAFT', orderNo: '0' }}
      addLabel="Tambah topik & materi"
      tableTitle="Tabel topik dan materi"
      tableColumns={[
        { key: 'topicCode', label: 'Kode topik' },
        { key: 'orderNo', label: 'Urutan' },
        { key: 'topicTitle', label: 'Topik' },
        { key: 'materialTitle', label: 'Materi' },
        { key: 'level', label: 'Kelas' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
