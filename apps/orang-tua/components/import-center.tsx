'use client';
import { useState } from 'react';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';
export function ImportCenter({ eyebrow, title, description, templates }: { eyebrow: string; title: string; description: string; templates: Array<{ title: string; description: string; href: string; code: string }> }) {
  const { notify } = useToast();
  const [summary, setSummary] = useState<string>('Belum ada file dipilih.');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      notify('File ditolak', 'Hanya format .xlsx yang diizinkan.');
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      notify('File ditolak', 'Ukuran file Excel maksimal 5 MB.');
      return;
    }
    const buffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>;
    if (json.length > 5000) throw new Error('Maksimal 5.000 baris per file import.');
    setSummary(`Workbook: ${workbook.SheetNames.join(', ')} • Total baris preview: ${json.length}`);
    setRows(json.slice(0, 5));
    notify('Import terbaca', `File ${file.name} berhasil dipreview.`);
  };
  return (
    <div className="stack">
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <section className="card stack">
        <div className="eyebrow">Template Excel</div>
        <div className="template-grid">
          {templates.map((template) => (
            <article className="template-card" key={template.href}>
              <div className="badge">{template.code}</div>
              <strong>{template.title}</strong>
              <div className="muted">{template.description}</div>
              <a className="button" href={template.href} download>Unduh template</a>
            </article>
          ))}
        </div>
      </section>
      <section className="card stack">
        <div><div className="eyebrow">Preview import</div><strong>Unggah file Excel</strong><p className="muted">Sistem membaca workbook lalu menampilkan preview awal.</p></div>
        <input className="input" type="file" accept=".xlsx" onChange={(event) => onFile(event.target.files?.[0] || null)} />
        <div className="notice">{summary}</div>
        <div className="table-list">{rows.map((row, index) => <div className="item-card" key={index}><div className="kv-list">{Object.entries(row).slice(0, 8).map(([key, value]) => <div key={key}><strong>{key}</strong><span>{String(value)}</span></div>)}</div></div>)}</div>
      </section>
    </div>
  );
}
