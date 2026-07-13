'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { PageHero } from './page-hero';
import { RichEditor } from './rich-editor';
import { useToast } from './toast-provider';

type SelectOption = string | { label: string; value: string };

export type InlineFieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'datetime-local' | 'textarea' | 'richtext' | 'select' | 'password';
  options?: SelectOption[];
  placeholder?: string;
  full?: boolean;
  readOnly?: boolean;
};

export type InlineTableColumn = { key: string; label: string };
type PageSize = 10 | 20 | 30 | 60 | 'all';

function optionValue(option: SelectOption) {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option: SelectOption) {
  return typeof option === 'string' ? option : option.label;
}

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>|<\/div>|<\/li>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
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

export function InlineEditableManager({
  eyebrow,
  title,
  description,
  entityName,
  endpoint,
  fields,
  initialRows,
  tableColumns,
  newRowDefaults,
  addLabel = 'Tambah data',
  tableTitle,
  allowAdd = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  entityName: string;
  endpoint: string;
  fields: InlineFieldDef[];
  initialRows: Array<Record<string, string>>;
  tableColumns?: InlineTableColumn[];
  newRowDefaults?: Record<string, string>;
  addLabel?: string;
  tableTitle?: string;
  allowAdd?: boolean;
}) {
  const { notify } = useToast();
  const [rows, setRows] = useState(initialRows);
  const blankForm = useMemo(
    () =>
      fields.reduce(
        (acc, field) => {
          acc[field.name] = newRowDefaults?.[field.name] ?? '';
          return acc;
        },
        { id: '', _persisted: 'false', ...(newRowDefaults || {}) } as Record<string, string>,
      ),
    [fields, newRowDefaults],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(blankForm);
  const [loading, setLoading] = useState(false);
  const formReadOnly = form._readOnly === 'true';
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const visibleColumns = tableColumns || fields.slice(0, 6).map((field) => ({ key: field.name, label: field.label }));
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
    setEditingId(row.id);
    setForm({ ...row, password: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...blankForm });
  };

  const addNew = () => {
    const temporaryId = `new:${Date.now()}`;
    setEditingId(temporaryId);
    setForm({ ...blankForm, id: temporaryId, _persisted: 'false' });
    setCurrentPage(1);
  };

  const save = async () => {
    try {
      setLoading(true);
      const persisted = form._persisted !== 'false' && Boolean(form.id) && !form.id.startsWith('new:') && !form.id.startsWith('group:');
      const method = persisted ? 'PUT' : 'POST';
      const requestBody = { ...form, id: persisted ? form.id : '' };
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        notify('Gagal menyimpan', payload.error || 'Terjadi kesalahan pada server.');
        return;
      }
      const next: Record<string, string> = { ...form, ...(payload.data as Record<string, string>), _persisted: 'true' };
      setRows((prev) => {
        const existingId = persisted ? form.id : '';
        if (existingId && prev.some((item) => item.id === existingId)) {
          return prev.map((item) => (item.id === existingId ? next : item));
        }
        const sourceGroup = form.sourceGroup || form.importedGroup;
        if (sourceGroup) {
          const matchIndex = prev.findIndex((item) => (item.sourceGroup || item.importedGroup) === sourceGroup);
          if (matchIndex >= 0) return prev.map((item, index) => (index === matchIndex ? next : item));
        }
        return [next, ...prev];
      });
      setForm(next);
      setEditingId(next.id);
      setCurrentPage(1);
      notify('Sudah tersimpan', `${entityName} berhasil disimpan langsung dari tabel.`);
    } catch (error) {
      notify('Gagal menyimpan', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: Record<string, string>) => {
    if (row._persisted === 'false' || row.id.startsWith('group:')) {
      notify('Belum dijadwalkan', `${entityName} ini belum tersimpan sehingga tidak perlu dihapus.`);
      return;
    }
    if (!window.confirm('Apakah anda yakin untuk menghapus?')) return;
    try {
      setLoading(true);
      const response = await fetch(endpoint, {
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
      if (editingId === row.id) cancelEdit();
      notify('Data dihapus', `${entityName} berhasil dihapus.`);
    } catch (error) {
      notify('Gagal menghapus', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const renderEditor = () => (
    <div className="inline-table-editor">
      <div className="inline-table-editor-head">
        <div>
          <div className="eyebrow">Edit langsung dalam tabel</div>
          <strong>{formReadOnly ? `Lihat ${entityName} (hanya-baca)` : form._persisted === 'false' ? `Tambah ${entityName}` : `Ubah ${entityName}`}</strong>
        </div>
        <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Tutup editor"><X size={18} /></button>
      </div>
      <div className="form-grid inline-form-grid">
        {fields.map((field) => {
          if (field.type === 'richtext' || field.type === 'textarea') {
            return (
              <RichEditor
                key={field.name}
                label={field.label}
                value={form[field.name] ?? ''}
                onChange={(next) => setForm((prev) => ({ ...prev, [field.name]: next }))}
                placeholder={field.placeholder}
                readOnly={formReadOnly || field.readOnly}
              />
            );
          }
          if (field.type === 'select') {
            return (
              <div key={field.name} className={`field${field.full ? ' full' : ''}`}>
                <label>{field.label}</label>
                <select
                  className="select"
                  value={form[field.name] ?? ''}
                  disabled={formReadOnly || field.readOnly}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                >
                  <option value="">Pilih...</option>
                  {(field.options || []).map((option) => (
                    <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>
                  ))}
                </select>
              </div>
            );
          }
          return (
            <div key={field.name} className={`field${field.full ? ' full' : ''}`}>
              <label>{field.label}</label>
              <input
                className="input"
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : field.type === 'datetime-local' ? 'datetime-local' : 'text'}
                value={form[field.name] ?? ''}
                placeholder={field.placeholder}
                readOnly={formReadOnly || field.readOnly}
                onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
              />
            </div>
          );
        })}
      </div>
      <div className="button-row inline-editor-actions">
        {!formReadOnly ? (
          <button className="button" type="button" onClick={save} disabled={loading}>
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        ) : null}
        <button className="button-secondary" type="button" onClick={cancelEdit} disabled={loading}>
          <X size={16} /> Batal
        </button>
      </div>
    </div>
  );

  return (
    <div className="stack">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={allowAdd ? (
          <button className="button" type="button" onClick={addNew} disabled={loading}>
            <Plus size={16} /> {addLabel}
          </button>
        ) : undefined}
      />

      <section className="card stack inline-manager-card">
        <div className="manager-table-heading">
          <div>
            <div className="eyebrow">Data tersimpan</div>
            <strong>{tableTitle || `Tabel ${entityName}`}</strong>
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
              <option value="30">30</option>
              <option value="60">60</option>
              <option value="all">Semua</option>
            </select>
          </label>
        </div>

        {rows.length === 0 && !editingId ? <div className="empty-state">Belum ada data yang tersedia.</div> : null}
        {rows.length > 0 && filteredRows.length === 0 ? <div className="empty-state">Tidak ada data yang cocok dengan pencarian “{searchText}”.</div> : null}

        {pagedRows.length > 0 || editingId?.startsWith('new:') ? (
          <div className="table-wrapper inline-table-wrapper">
            <table className="data-table inline-data-table">
              <thead>
                <tr>
                  <th className="expand-col">Detail</th>
                  {visibleColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {editingId?.startsWith('new:') ? (
                  <tr className="inline-editor-row inline-new-editor-row">
                    <td colSpan={visibleColumns.length + 2}>{renderEditor()}</td>
                  </tr>
                ) : null}
                {pagedRows.map((row) => {
                  const expanded = editingId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr key={row.id} className={expanded ? 'is-selected' : ''}>
                        <td className="expand-col">
                          <button className="icon-button" type="button" onClick={() => (expanded ? cancelEdit() : pick(row))} aria-label={expanded ? 'Tutup detail' : 'Buka detail'}>
                            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                          </button>
                        </td>
                        {visibleColumns.map((column) => (
                          <td key={column.key} title={stripHtml(String(row[column.key] || '-'))}>
                            {stripHtml(String(row[column.key] || '-')).slice(0, 120) || '-'}
                          </td>
                        ))}
                        <td className="actions-col">
                          <div className="row-actions">
                            <button className="button-secondary" type="button" onClick={() => pick(row)}>
                              <Pencil size={15} /> {row._readOnly === 'true' ? 'Lihat' : 'Edit'}
                            </button>
                            <button className="button-danger" type="button" onClick={() => remove(row)} disabled={loading || row._persisted === 'false' || row._readOnly === 'true' || row._deleteDisabled === 'true'}>
                              <Trash2 size={15} /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr key={`${row.id}:editor`} className="inline-editor-row">
                          <td colSpan={visibleColumns.length + 2}>{renderEditor()}</td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {filteredRows.length > 0 ? (
          <div className="manager-pagination">
            <span>Menampilkan {rangeStart}–{rangeEnd} dari {filteredRows.length} data</span>
            {pageSize !== 'all' ? (
              <div className="manager-pagination-actions">
                <button className="button-secondary" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label="Halaman sebelumnya">
                  <ChevronLeft size={16} />
                </button>
                <strong>Halaman {currentPage} dari {totalPages}</strong>
                <button className="button-secondary" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} aria-label="Halaman berikutnya">
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : <strong>Semua data ditampilkan</strong>}
          </div>
        ) : null}
      </section>
    </div>
  );
}
