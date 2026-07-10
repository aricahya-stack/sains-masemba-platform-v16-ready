
'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react';
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
type PageSize = 10 | 20 | 40 | 60 | 'all';

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
          acc[field.name] = '';
          return acc;
        },
        { id: '' } as Record<string, string>,
      ),
    [fields],
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialRows[0]?.id ?? null);
  const [form, setForm] = useState<Record<string, string>>(initialRows[0] ? { ...initialRows[0], password: '' } : blankForm);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const visibleColumns = tableColumns || fields.slice(0, 5).map((field) => ({ key: field.name, label: field.label }));
  const filteredRows = useMemo(() => {
    const keyword = stripHtml(searchText).toLocaleLowerCase('id-ID');
    if (!keyword) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => stripHtml(String(value || '')).toLocaleLowerCase('id-ID').includes(keyword)),
    );
  }, [rows, searchText]);
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    if (pageSize === 'all') return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);
  const rangeStart = filteredRows.length === 0 ? 0 : pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = pageSize === 'all' ? filteredRows.length : Math.min(currentPage * pageSize, filteredRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
      setCurrentPage(1);
      setForm({ ...next, password: '' });
      setSelectedId(next.id);
      notify('Sudah tersimpan', `${entityName} berhasil disimpan.`);
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
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button className="button-secondary" type="button" onClick={resetForm} disabled={loading}>
              Data Baru
            </button>
          </>
        }
      />
      <div className="grid-2">
        <section className="card stack">
          <div>
            <div className="eyebrow">Form</div>
            <strong>Editor {entityName}</strong>
            <p className="muted">Setiap klik simpan memunculkan notifikasi. Data dapat diedit ulang kapan saja.</p>
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
          <div className="manager-table-heading">
            <div>
              <div className="eyebrow">Data tersimpan</div>
              <strong>Tabel {entityName}</strong>
            </div>
            <span className="badge">{filteredRows.length} data</span>
          </div>
          <div className="manager-table-tools">
            <label className="manager-search" aria-label={`Cari ${entityName}`}>
              <Search size={17} />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={`Cari ${entityName}, topik, kode, atau status...`}
              />
            </label>
            <label className="manager-page-size">
              <span>Tampilkan</span>
              <select
                className="select"
                value={String(pageSize)}
                onChange={(event) => {
                  const value = event.target.value;
                  setPageSize(value === 'all' ? 'all' : (Number(value) as PageSize));
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="40">40</option>
                <option value="60">60</option>
                <option value="all">Semua</option>
              </select>
            </label>
          </div>
          {rows.length === 0 ? <div className="empty-state">Belum ada data.</div> : null}
          {rows.length > 0 && filteredRows.length === 0 ? (
            <div className="empty-state">Tidak ada data yang cocok dengan pencarian “{searchText}”.</div>
          ) : null}
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
          {filteredRows.length > 0 ? (
            <div className="manager-pagination">
              <span>
                Menampilkan {rangeStart}–{rangeEnd} dari {filteredRows.length} data
              </span>
              {pageSize !== 'all' ? (
                <div className="manager-pagination-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>Halaman {currentPage} dari {totalPages}</strong>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <strong>Semua data ditampilkan</strong>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
