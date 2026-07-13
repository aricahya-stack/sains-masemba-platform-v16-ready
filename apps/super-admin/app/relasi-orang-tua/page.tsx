import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function ParentLinksPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const [parents, students, links] = await Promise.all([
    prisma.user.findMany({ where: { role: UserRole.ORANG_TUA, status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
    prisma.user.findMany({ where: { role: UserRole.SISWA, status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
    prisma.parentStudentLink.findMany({
      include: { parent: true, student: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const fields: FieldDef[] = [
    { name: 'parentId', label: 'Orang tua', type: 'select', options: parents.map((item) => ({ value: item.id, label: `${item.fullName} • ${item.email}` })) },
    { name: 'studentId', label: 'Siswa', type: 'select', options: students.map((item) => ({ value: item.id, label: `${item.fullName} • ${item.email}${item.className ? ` • ${item.className}` : ''}` })) },
    { name: 'relationType', label: 'Relasi' },
    { name: 'isActive', label: 'Aktif', type: 'select', options: [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }] },
  ];

  const initialRows = links.map((link) => ({
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    relationType: link.relationType,
    isActive: String(link.isActive),
    parentName: link.parent.fullName,
    studentName: link.student.fullName,
    studentClass: link.student.className || '-',
  }));

  return (
    <EditableManager
      eyebrow="Relasi orang tua"
      title="Hubungkan orang tua dan siswa"
      description="Hubungkan akun orang tua/wali dengan siswa. Untuk relasi massal, gunakan template Parent Mapping pada menu Import Excel."
      entityName="relasi"
      endpoint="/api/parent-links"
      fields={fields}
      initialRows={initialRows}
      tableColumns={[
        { key: 'studentName', label: 'Siswa' },
        { key: 'studentClass', label: 'Kelas' },
        { key: 'parentName', label: 'Orang Tua' },
        { key: 'relationType', label: 'Relasi' },
        { key: 'isActive', label: 'Aktif' },
      ]}
    />
  );
}
