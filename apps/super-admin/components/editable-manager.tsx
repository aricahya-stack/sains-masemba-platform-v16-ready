
'use client';
import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { PageHero } from './page-hero';
import { RichEditor } from './rich-editor';
import { useToast } from './toast-provider';

type SelectOption = string | { label: string; value: string };
export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'richtext' | 'select' | 'password';
  options?: SelectOption[];
  placeholder?: string;
  full?: boolean;
};

export type TableColumn = { key: string; label: string };

function optionValue(option: SelectOption) {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option: SelectOption) {
  return typeof option === 'string' ? option : option.label;
}

function stripHtml(value: string) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function readJsonResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { error: `Respons server tidak valid (${response.status}). Silakan muat ulang halaman dan coba lagi.` };
  }
}

export function EditableManager({
  eyebrow,
  title,
  description,
  entityName,
  endpoint,
  fields,
  initialRows,
  tableColumns,
}: {
  eyebrow: string;
  title: string;
  description: string;
  entityName: string;
  endpoint: string;
  fields: FieldDef[];
  initialRows: Array<Record<string, string>>;
  tableColumns?: TableColumn[];
}) {
  const { notify } = useToast();
  const [rows, setRows] = useState(initialRows);
  const blankForm = useMemo(
    () =>
      fields.reduce(
        (acc, field) => {
          const options = field.type === 'select' ? field.options || [] : [];
          const hasActiveOption = options.some((option) => optionValue(option) === 'ACTIVE');
          const hasTrueOption = options.some((option) => optionValue(option) === 'true');

          if (options.length === 1) acc[field.name] = optionValue(options[0]);
          else if (field.name === 'status' && hasActiveOption) acc[field.name] = 'ACTIVE';
          else if (field.name === 'isActive' && hasTrueOption) acc[field.name] = 'true';
          else acc[field.name] = '';
          return acc;
        },
        { id: '' } as Record<string, string>,
      ),
    [fields],
  );
  // Selalu buka halaman dalam mode tambah. Memilih baris tabel adalah satu-satunya
  // cara masuk ke mode edit, sehingga input akun berikutnya tidak menimpa akun pertama.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...blankForm });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const visibleColumns = tableColumns || fields.slice(0, 5).map((field) => ({ key: field.name, label: field.label }));
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      visibleColumns.some((column) => stripHtml(String(row[column.key] || '')).toLowerCase().includes(keyword)),
    );
  }, [rows, search, visibleColumns]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pick = (row: Record<string, string>) => {
    setSelectedId(row.id);
    setForm({ ...row, password: '' });
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm({ ...blankForm });
  };

  const save = async () => {
    try {
      setLoading(true);
      const method = form.id ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        notify('Gagal menyimpan', payload.error || 'Terjadi kesalahan pada server.');
        return;
      }
      const next = payload.data as Record<string, string>;
      setRows((prev) =>
        prev.some((item) => item.id === next.id) ? prev.map((item) => (item.id === next.id ? next : item)) : [next, ...prev],
      );

      if (method === 'POST') {
        // Setelah membuat data baru, kembali ke form kosong agar entri berikutnya
        // menghasilkan record baru, bukan memperbarui record yang barusan dibuat.
        setSelectedId(null);
        setForm({ ...blankForm });
        setPage(1);
        notify('Data baru tersimpan', `${entityName} berhasil ditambahkan. Form siap untuk data berikutnya.`);
      } else {
        setForm({ ...next, password: '' });
        setSelectedId(next.id);
        notify('Perubahan tersimpan', `${entityName} berhasil diperbarui.`);
      }
    } catch (error) {
      notify('Gagal menyimpan', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Apakah anda yakin untuk menghapus?')) return;
    try {
      setLoading(true);
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        notify('Gagal menghapus', payload.error || 'Terjadi kesalahan pada server.');
        return;
      }
      setRows((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) resetForm();
      notify('Data dihapus', `${entityName} berhasil dihapus.`);
    } catch (error) {
      notify('Gagal menghapus', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <button className="button" type="button" onClick={save} disabled={loading}>
              {loading ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : `Tambah ${entityName}`}
            </button>
            <button className="button-secondary" type="button" onClick={resetForm} disabled={loading}>
              {form.id ? 'Batal Edit' : 'Kosongkan Form'}
            </button>
          </>
        }
      />
      <div className="grid-2">
        <section className="card stack">
          <div>
            <div className="eyebrow">Form</div>
            <strong>{form.id ? `Edit ${entityName}` : `Tambah ${entityName} baru`}</strong>
            <p className="muted">
              {form.id
                ? 'Anda sedang mengubah data yang dipilih dari tabel. Klik Batal Edit untuk kembali ke mode tambah.'
                : 'Setelah data ditambahkan, form otomatis dikosongkan agar Anda dapat langsung memasukkan akun berikutnya.'}
            </p>
          </div>
          <div className="form-grid">
            {fields.map((field) => {
              if (field.type === 'richtext')
                return (
                  <RichEditor
                    key={field.name}
                    label={field.label}
                    value={form[field.name] ?? ''}
                    onChange={(next) => setForm((prev) => ({ ...prev, [field.name]: next }))}
                    placeholder={field.placeholder}
                  />
                );
              if (field.type === 'select')
                return (
                  <div key={field.name} className={`field${field.full ? ' full' : ''}`}>
                    <label>{field.label}</label>
                    <select
                      className="select"
                      value={form[field.name] ?? ''}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    >
                      <option value="">Pilih...</option>
                      {(field.options || []).map((option) => (
                        <option key={optionValue(option)} value={optionValue(option)}>
                          {optionLabel(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              if (field.type === 'textarea')
                return (
                  <RichEditor
                    key={field.name}
                    label={field.label}
                    value={form[field.name] ?? ''}
                    onChange={(next) => setForm((prev) => ({ ...prev, [field.name]: next }))}
                    placeholder={field.placeholder}
                  />
                );
              return (
                <div key={field.name} className={`field${field.full ? ' full' : ''}`}>
                  <label>{field.label}</label>
                  <input
                    className="input"
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={form[field.name] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <section className="card stack">
          <div>
            <div className="eyebrow">Data tersimpan</div>
            <strong>Tabel {entityName}</strong>
            <p className="muted">Menampilkan maksimal {pageSize} data per halaman agar daftar besar tetap ringan.</p>
          </div>
          {rows.length > 0 ? (
            <div className="field full">
              <label>Cari data</label>
              <input
                className="input"
                type="search"
                value={search}
                placeholder="Cari nama, email, kelas, nomor HP, atau status..."
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
          {rows.length === 0 ? <div className="empty-state">Belum ada data.</div> : null}
          {rows.length > 0 && filteredRows.length === 0 ? <div className="empty-state">Data tidak ditemukan.</div> : null}
          {pagedRows.length > 0 ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {visibleColumns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    <th className="actions-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.id} className={selectedId === row.id ? 'is-selected' : ''}>
                      {visibleColumns.map((column) => (
                        <td key={column.key} title={stripHtml(String(row[column.key] || '-'))}>
                          {stripHtml(String(row[column.key] || '-')).slice(0, 120) || '-'}
                        </td>
                      ))}
                      <td className="actions-col">
                        <div className="row-actions">
                          <button className="button-secondary" type="button" onClick={() => pick(row)}>
                            <Pencil size={15} />
                            Edit
                          </button>
                          <button className="button-danger" type="button" onClick={() => remove(row.id)} disabled={loading}>
                            <Trash2 size={15} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {filteredRows.length > pageSize ? (
            <div className="button-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="muted">
                Halaman {currentPage} dari {pageCount} • {filteredRows.length} data
              </span>
              <div className="button-row">
                <button
                  className="button-secondary"
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Sebelumnya
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
