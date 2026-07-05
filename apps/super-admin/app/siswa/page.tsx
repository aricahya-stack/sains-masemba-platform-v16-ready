
import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function SiswaPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const students = await prisma.user.findMany({
    where: { role: UserRole.SISWA },
    orderBy: { fullName: 'asc' },
  });

  const fields: FieldDef[] = [
    { name: 'fullName', label: 'Nama lengkap' },
    { name: 'email', label: 'Email' },
    { name: 'role', label: 'Role', type: 'select', options: [{ label: 'Siswa', value: 'SISWA' }] },
    { name: 'phone', label: 'Nomor HP' },
    { name: 'className', label: 'Kelas', placeholder: 'Contoh: 7A, 8B, 9C' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'password', label: 'Password baru', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
  ];

  const initialRows = students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    role: student.role,
    phone: student.phone || '',
    className: student.className || '',
    status: student.status,
    password: '',
  }));

  return (
    <EditableManager
      eyebrow="Siswa"
      title="Kelola akun siswa"
      description="Edit akun siswa, nonaktifkan, atau hapus dari sistem."
      entityName="siswa"
      endpoint="/api/users"
      fields={fields}
      initialRows={initialRows}
      tableColumns={[
        { key: 'fullName', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'className', label: 'Kelas' },
        { key: 'phone', label: 'No. HP' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
