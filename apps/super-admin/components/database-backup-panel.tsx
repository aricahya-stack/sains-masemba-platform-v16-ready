'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileKey2,
  FileSpreadsheet,
  HardDriveDownload,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';

type BackupCount = {
  sheet: string;
  model: string;
  count: number;
  description: string;
};

function parseDownloadName(response: Response) {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `sains-masemba-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
}

export function DatabaseBackupPanel({ counts }: { counts: BackupCount[] }) {
  const { notify } = useToast();
  const [downloading, setDownloading] = useState<'full' | 'safe' | null>(null);
  const totalRows = useMemo(() => counts.reduce((sum, item) => sum + item.count, 0), [counts]);

  const downloadBackup = async (includeSecrets: boolean) => {
    if (includeSecrets) {
      const accepted = window.confirm(
        'Backup lengkap memuat hash password akun. File tidak berisi password asli, tetapi tetap sensitif. Simpan di tempat privat. Lanjutkan?',
      );
      if (!accepted) return;
    }

    const mode = includeSecrets ? 'full' : 'safe';
    setDownloading(mode);
    try {
      const response = await fetch(`/api/backups/excel?includeSecrets=${includeSecrets ? 'true' : 'false'}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: includeSecrets ? { 'X-Confirm-Sensitive-Backup': 'INCLUDE_PASSWORD_HASHES' } : undefined,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Backup gagal (${response.status}).`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = parseDownloadName(response);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      notify('Backup selesai', `${totalRows.toLocaleString('id-ID')} baris data telah diekspor ke Excel.`);
    } catch (error) {
      notify('Backup gagal', error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat backup.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="database-backup-page">
      <PageHero
        eyebrow="Operasional · Backup"
        title="Backup seluruh data ke Excel"
        description="Ekspor seluruh tabel database ke satu workbook dengan sheet terpisah. Lakukan backup sebelum db push, migrasi, pemindahan server, atau pemasangan versi baru. Fitur ini tidak mengubah struktur database."
        actions={(
          <a className="button-secondary" href="/templates/database-backup-template.xlsx" download>
            <FileSpreadsheet size={18} /> Unduh Template Kosong
          </a>
        )}
      />

      <section className="backup-summary-grid">
        <article className="backup-summary-card backup-summary-card-primary">
          <span className="backup-summary-icon"><DatabaseBackup size={24} /></span>
          <div>
            <small>Total data saat ini</small>
            <strong>{totalRows.toLocaleString('id-ID')}</strong>
            <p>baris dari {counts.length} tabel database</p>
          </div>
        </article>
        <article className="backup-summary-card">
          <span className="backup-summary-icon"><FileSpreadsheet size={24} /></span>
          <div>
            <small>Format backup</small>
            <strong>.XLSX</strong>
            <p>README, manifest, dan sheet per tabel</p>
          </div>
        </article>
        <article className="backup-summary-card">
          <span className="backup-summary-icon"><ShieldCheck size={24} /></span>
          <div>
            <small>Akses</small>
            <strong>Super Admin</strong>
            <p>endpoint dilindungi sesi dan role</p>
          </div>
        </article>
      </section>

      <section className="backup-action-grid">
        <article className="card backup-action-card backup-action-card-featured">
          <div className="backup-card-heading">
            <span className="backup-card-icon"><HardDriveDownload size={24} /></span>
            <div>
              <div className="eyebrow">Direkomendasikan sebelum update</div>
              <h2>Backup Excel lengkap</h2>
            </div>
          </div>
          <p>
            Mengekspor seluruh data termasuk ID relasi, jawaban, hasil tryout, insiden, pengaturan, dan hash password.
            Pilihan ini paling sesuai untuk kebutuhan pemulihan database.
          </p>
          <div className="backup-security-note">
            <FileKey2 size={18} />
            <span>Hash password bukan password asli, tetapi file tetap harus diperlakukan sebagai data rahasia.</span>
          </div>
          <button className="button backup-download-button" type="button" disabled={downloading !== null} onClick={() => downloadBackup(true)}>
            {downloading === 'full' ? <LoaderCircle className="spin" size={19} /> : <Download size={19} />}
            {downloading === 'full' ? 'Membuat backup...' : 'Unduh Backup Excel Lengkap'}
          </button>
        </article>

        <article className="card backup-action-card">
          <div className="backup-card-heading">
            <span className="backup-card-icon backup-card-icon-muted"><FileSpreadsheet size={24} /></span>
            <div>
              <div className="eyebrow">Untuk audit atau arsip</div>
              <h2>Backup tanpa hash password</h2>
            </div>
          </div>
          <p>
            Seluruh data tetap diekspor, tetapi kolom hash password dikeluarkan. File lebih aman untuk pemeriksaan data,
            namun akun harus direset jika digunakan untuk pemulihan total.
          </p>
          <button className="button-secondary backup-download-button" type="button" disabled={downloading !== null} onClick={() => downloadBackup(false)}>
            {downloading === 'safe' ? <LoaderCircle className="spin" size={19} /> : <Download size={19} />}
            {downloading === 'safe' ? 'Membuat backup...' : 'Unduh Backup Excel Aman'}
          </button>
        </article>
      </section>

      <section className="card backup-warning-card">
        <div className="backup-warning-title"><AlertTriangle size={22} /><strong>Batas perlindungan backup Excel</strong></div>
        <p>
          Workbook mencadangkan isi database PostgreSQL yang digunakan aplikasi. Berkas fisik pada Vercel Blob atau penyimpanan eksternal tidak ikut disalin;
          yang tersimpan hanya URL-nya. Untuk perlindungan paling kuat, simpan juga dump PostgreSQL dan salinan berkas eksternal.
        </p>
      </section>

      <section className="card">
        <div className="backup-table-heading">
          <div>
            <div className="eyebrow">Manifest data</div>
            <h2>Data yang masuk ke workbook</h2>
          </div>
          <span className="badge"><CheckCircle2 size={16} /> {counts.length} sheet data</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table backup-manifest-table">
            <thead>
              <tr>
                <th>Sheet Excel</th>
                <th>Model database</th>
                <th>Jumlah baris</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((item) => (
                <tr key={item.sheet}>
                  <td><strong>{item.sheet}</strong></td>
                  <td><code>{item.model}</code></td>
                  <td>{item.count.toLocaleString('id-ID')}</td>
                  <td>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
