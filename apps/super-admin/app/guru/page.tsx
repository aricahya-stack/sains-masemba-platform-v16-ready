
import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function GuruPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const teachers = await prisma.user.findMany({
    where: { role: UserRole.GURU },
    orderBy: { fullName: 'asc' },
  });

  const fields: FieldDef[] = [
    { name: 'fullName', label: 'Nama lengkap' },
    { name: 'email', label: 'Email' },
    { name: 'role', label: 'Role', type: 'select', options: [{ label: 'Guru', value: 'GURU' }] },
    { name: 'phone', label: 'Nomor HP' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'password', label: 'Password baru', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
  ];

  const initialRows = teachers.map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fullName,
    email: teacher.email,
    role: teacher.role,
    phone: teacher.phone || '',
    status: teacher.status,
    password: '',
  }));

  return (
    <EditableManager
      eyebrow="Guru"
      title="Kelola akun guru"
      description="Tambahkan banyak akun guru, edit data, nonaktifkan, atau hapus. Form otomatis kembali ke mode tambah setelah akun baru disimpan."
      entityName="guru"
      endpoint="/api/users"
      fields={fields}
      initialRows={initialRows}
      tableColumns={[
        { key: 'fullName', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'No. HP' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
