import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function UsersPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const fields: FieldDef[] = [
    { name: 'fullName', label: 'Nama lengkap' },
    { name: 'email', label: 'Email' },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'Super Admin', value: 'SUPER_ADMIN' },
        { label: 'Guru', value: 'GURU' },
        { label: 'Siswa', value: 'SISWA' },
        { label: 'Orang Tua', value: 'ORANG_TUA' },
      ],
    },
    { name: 'phone', label: 'Nomor HP' },
    { name: 'className', label: 'Kelas siswa', placeholder: 'Diisi jika role Siswa' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'password', label: 'Password baru', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
  ];

  const initialRows = users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    className: user.className || '',
    status: user.status,
    password: '',
  }));

  return (
    <EditableManager
      eyebrow="Manajemen user"
      title="Kelola semua akun"
      description="Super admin dapat menambah, mengubah role, menonaktifkan user, dan mereset password."
      entityName="user"
      endpoint="/api/users"
      fields={fields}
      initialRows={initialRows}
      tableColumns={[
        { key: 'fullName', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'className', label: 'Kelas' },
        { key: 'phone', label: 'No. HP' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
