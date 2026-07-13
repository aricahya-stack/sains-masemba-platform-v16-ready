import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { EditableManager, type FieldDef } from '../../components/editable-manager';

export default async function SuperAdminPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const admins = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN },
    orderBy: { fullName: 'asc' },
  });

  const fields: FieldDef[] = [
    { name: 'fullName', label: 'Nama lengkap' },
    { name: 'email', label: 'Email' },
    { name: 'role', label: 'Role', type: 'select', options: [{ label: 'Super Admin', value: 'SUPER_ADMIN' }] },
    { name: 'phone', label: 'Nomor HP' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'password', label: 'Password baru', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
  ];

  const initialRows = admins.map((admin) => ({
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    phone: admin.phone || '',
    status: admin.status,
    password: '',
  }));

  return (
    <EditableManager
      eyebrow="Super Admin"
      title="Kelola akun Super Admin"
      description="Sistem mendukung lebih dari satu Super Admin. Akun aktif terakhir dilindungi agar akses administrasi tidak terputus."
      entityName="Super Admin"
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
