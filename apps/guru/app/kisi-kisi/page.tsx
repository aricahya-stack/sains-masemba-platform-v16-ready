import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function BlueprintPage() {
  const user = await requireRole(UserRole.GURU);
  const [topics, tryouts, blueprints] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ orderNo: 'asc' }, { title: 'asc' }] }),
    prisma.tryout.findMany({ where: { authorId: user.id }, orderBy: { title: 'asc' } }),
    prisma.blueprint.findMany({ include: { topic: true }, orderBy: [{ testGroup: 'asc' }, { code: 'asc' }] }),
  ]);

  const tryoutOptions = tryouts.map((tryout) => ({ value: tryout.title, label: tryout.title }));
  const fields: FieldDef[] = [
    { name: 'testGroup', label: 'Nama tryout', type: 'select', options: [{ value: '', label: 'Umum / belum dipetakan' }, ...tryoutOptions] },
    { name: 'code', label: 'Kode kisi-kisi' },
    { name: 'topicId', label: 'Topik', type: 'select', options: topics.map((topic) => ({ value: topic.id, label: topic.title })) },
    { name: 'competency', label: 'Kompetensi', type: 'textarea' },
    { name: 'indicator', label: 'Indikator', type: 'textarea' },
    { name: 'materialName', label: 'Nama materi' },
    { name: 'cognitiveLevel', label: 'Level kognitif' },
    { name: 'targetDifficulty', label: 'Target kesulitan' },
    { name: 'targetQuestionCount', label: 'Target jumlah soal' },
    { name: 'blueprintText', label: 'Catatan kisi-kisi', type: 'richtext' },
  ];

  const initialRows = blueprints.map((item) => ({
    id: item.id,
    testGroup: item.testGroup || '',
    code: item.code,
    topicId: item.topicId || '',
    competency: item.competency,
    indicator: item.indicator,
    materialName: item.materialName || '',
    cognitiveLevel: item.cognitiveLevel || '',
    targetDifficulty: item.targetDifficulty || '',
    targetQuestionCount: String(item.targetQuestionCount),
    blueprintText: item.blueprintText || '',
  }));

  const grouped: Record<string, number> = blueprints.reduce((acc, item) => {
    const key = item.testGroup || 'Umum / belum dipetakan';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="stack">
      <section className="card stack">
        <div>
          <div className="eyebrow">Kisi-kisi berdasarkan tryout</div>
          <strong>Struktur kisi-kisi mengikuti Tryout 1, Tryout 2, Tryout 3, dan seterusnya</strong>
          <p className="muted">Setiap kisi-kisi sekarang memiliki kolom nama tryout agar bank soal dan paket ujian lebih mudah ditelusuri.</p>
        </div>
        <div className="tryout-card-grid">
          {Object.entries(grouped).map(([name, count]) => (
            <div key={name} className="mini-tryout-card">
              <span className="badge">Kisi-kisi</span>
              <strong>{name}</strong>
              <small>{Number(count)} indikator / kisi-kisi</small>
            </div>
          ))}
        </div>
      </section>
      <EditableManager
        eyebrow="Kisi-kisi"
        title="Kelola kisi-kisi / blueprint per tryout"
        description="Buat kisi-kisi terlebih dahulu, lalu lanjutkan ke bank soal sesuai paket tryout."
        entityName="kisi-kisi"
        endpoint="/api/blueprints"
        fields={fields}
        initialRows={initialRows}
        tableColumns={[
          { key: 'testGroup', label: 'Tryout' },
          { key: 'code', label: 'Kode' },
          { key: 'topicId', label: 'Topik' },
          { key: 'targetQuestionCount', label: 'Target soal' },
          { key: 'targetDifficulty', label: 'Kesulitan' },
        ]}
      />
    </div>
  );
}
