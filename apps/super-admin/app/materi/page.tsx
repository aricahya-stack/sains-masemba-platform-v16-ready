import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { MaterialAdminTable } from '../../components/material-admin-table';

export default async function MateriAdminPage() {
  await requireRole(UserRole.SUPER_ADMIN);
  const materials = await prisma.material.findMany({
    include: { topic: true, author: true },
    orderBy: { updatedAt: 'desc' },
  });

  const rows = materials.map((material) => ({
    id: material.id,
    title: material.title,
    topic: material.topic.title,
    author: material.author.fullName,
    status: material.status,
    updatedAt: material.updatedAt.toLocaleString('id-ID'),
  }));

  return (
    <div className="stack">
      <PageHero
        eyebrow="Materi"
        title="Kelola seluruh materi belajar"
        description="Super Admin dapat membersihkan materi lama sebelum mengimpor 30 topik dan materi IPA Fase D yang baru. Penghapusan materi juga menghapus bagian materi dan tujuan pembelajaran terkait."
      />
      <section className="card stack">
        <div>
          <div className="eyebrow">Data tersimpan</div>
          <strong>Daftar seluruh materi</strong>
          <p className="muted">Gunakan tombol hapus untuk membersihkan materi lama satu per satu. Respons kegagalan sekarang selalu ditampilkan secara aman dan tidak lagi memunculkan error parse JSON mentah.</p>
        </div>
        <MaterialAdminTable initialRows={rows} />
      </section>
    </div>
  );
}
