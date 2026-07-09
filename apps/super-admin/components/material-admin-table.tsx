'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from './toast-provider';

export type AdminMaterialRow = {
  id: string;
  title: string;
  topic: string;
  author: string;
  status: string;
  updatedAt: string;
};

async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { error: `Respons server tidak valid (${response.status}). Silakan muat ulang dan coba lagi.` };
  }
}

export function MaterialAdminTable({ initialRows }: { initialRows: AdminMaterialRow[] }) {
  const { notify } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const remove = async (row: AdminMaterialRow) => {
    if (!window.confirm(`Hapus materi "${row.title}"? Bagian materi dan tujuan pembelajarannya juga akan dihapus.`)) return;

    try {
      setLoadingId(row.id);
      const response = await fetch('/api/materials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        notify('Gagal menghapus', payload.error || 'Terjadi kesalahan pada server.');
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      notify('Data dihapus', payload.message || 'Materi berhasil dihapus.');
    } catch (error) {
      notify('Gagal menghapus', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setLoadingId(null);
    }
  };

  if (!rows.length) return <div className="empty-state">Belum ada materi tersimpan. Basis data siap untuk import materi baru.</div>;

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Judul materi</th>
            <th>Topik</th>
            <th>Guru / penulis</th>
            <th>Status</th>
            <th>Diperbarui</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.title}</strong></td>
              <td>{row.topic}</td>
              <td>{row.author}</td>
              <td><span className="badge">{row.status}</span></td>
              <td>{row.updatedAt}</td>
              <td>
                <button className="button-danger" type="button" disabled={loadingId === row.id} onClick={() => remove(row)}>
                  <Trash2 size={16} />
                  {loadingId === row.id ? 'Menghapus...' : 'Hapus'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
