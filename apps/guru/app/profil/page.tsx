import Link from 'next/link';
import { requireRole, roleLabel } from '@sh/core';
import { PageHero } from '../../components/page-hero';
import { ProfilePasswordForm } from '../../components/profile-password-form';
import { appMeta } from '../../lib/app';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(value);
}

export default async function ProfilPage() {
  const user = await requireRole(appMeta.role);
  const profileItems = [
    { label: 'Nama lengkap', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Peran', value: roleLabel(user.role) },
    { label: 'Nomor telepon', value: user.phone || 'Tidak tersedia' },
    { label: 'Kelas', value: user.className || 'Tidak tersedia' },
    { label: 'Status akun', value: user.status },
    { label: 'Akun dibuat', value: formatDate(user.createdAt) },
  ];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Profil"
        title={`Profil ${user.fullName}`}
        description="Data diri hanya dapat dilihat. Perubahan data utama dilakukan oleh pengelola akun."
      />
      <div className="profile-layout">
        <section className="card stack">
          <div className="section-title-row">
            <div>
              <div className="eyebrow">Data diri</div>
              <strong>Informasi akun</strong>
            </div>
            <Link className="button-danger" href="/logout" prefetch={false}>Keluar</Link>
          </div>
          <div className="profile-kv">
            {profileItems.map((item) => (
              <div className="profile-kv-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="notice">Data nama, email, peran, kelas, nomor telepon, dan status akun tidak dapat diubah dari halaman ini.</div>
        </section>
        <section className="card">
          <ProfilePasswordForm />
        </section>
      </div>
    </div>
  );
}
