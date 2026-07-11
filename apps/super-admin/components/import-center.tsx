'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';

type ImportKind = 'MATERIAL' | 'QUESTION' | 'TRYOUT_CONTENT' | 'USER' | 'PARENT_LINK';
type ImportRow = Record<string, unknown>;

type ValidationState = {
  kind: ImportKind;
  validRows: number;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
};

type ImportResult = {
  kind: ImportKind;
  processedRows: number;
  created: number;
  updated: number;
  linked: number;
  warnings: string[];
  details: Record<string, number>;
};

const kindLabels: Record<ImportKind, string> = {
  MATERIAL: 'Materi & topik',
  QUESTION: 'Soal latihan',
  TRYOUT_CONTENT: 'Kisi-kisi & soal tryout',
  USER: 'User',
  PARENT_LINK: 'Relasi orang tua-siswa',
};

const allowedQuestionTypes = new Set(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']);
const allowedScoringModes = new Set(['EXACT_MATCH', 'PARTIAL_NO_PENALTY']);
const allowedPublishStatuses = new Set(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);
const allowedUserRoles = new Set(['SUPER_ADMIN', 'GURU', 'SISWA', 'ORANG_TUA']);

function text(value: unknown) {
  return String(value ?? '').trim();
}

function normalizedHeaders(headers: string[]) {
  return new Set(headers.map((header) => header.trim()));
}

function detectImportKind(headers: string[]): ImportKind | null {
  const set = normalizedHeaders(headers);
  if (set.has('topicTitle') && set.has('materialTitle') && set.has('sectionHtml')) return 'MATERIAL';
  if (set.has('nama_tryout') && set.has('kode_kisi_kisi') && set.has('kode_soal') && set.has('pertanyaan_html')) return 'TRYOUT_CONTENT';
  if (set.has('kode_soal') && set.has('jenis_soal') && set.has('pertanyaan_html')) return 'QUESTION';
  if (set.has('full_name') && set.has('email') && set.has('role')) return 'USER';
  if (set.has('parent_email') && set.has('student_email')) return 'PARENT_LINK';
  return null;
}

function required(row: ImportRow, keys: string[]) {
  return keys.filter((key) => !text(row[key]));
}

function splitTokens(value: unknown) {
  return text(value)
    .replace(/\r?\n/g, ',')
    .split(/[,;|/]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function validateRows(kind: ImportKind, rows: ImportRow[]): ValidationState {
  const errors: string[] = [];
  const warnings: string[] = [];
  let errorCount = 0;
  let warningCount = 0;
  const seenQuestionCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const tryoutGroupCounts = new Map<string, { name: string; count: number }>();

  const addError = (message: string) => {
    errorCount += 1;
    if (errors.length < 15) errors.push(message);
  };
  const addWarning = (message: string) => {
    warningCount += 1;
    if (warnings.length < 15) warnings.push(message);
  };

  rows.forEach((row, index) => {
    const line = index + 1;

    if (kind === 'MATERIAL') {
      const missing = required(row, ['topicTitle', 'materialTitle']);
      if (missing.length) addError(`Baris data ${line}: kolom wajib kosong (${missing.join(', ')}).`);
      if (!text(row.kode_topik) && !text(row.topicCode) && !text(row.topicSlug)) {
        addWarning(`Baris data ${line}: kode topik kosong; sistem akan membuat kode otomatis dari topicTitle.`);
      }
      const status = text(row.materialStatus).toUpperCase();
      if (status && !allowedPublishStatuses.has(status)) addError(`Baris data ${line}: materialStatus "${status}" tidak valid.`);
      if (!text(row.sectionHtml)) addWarning(`Baris data ${line}: sectionHtml kosong; bagian materi mungkin tidak memiliki isi.`);
    }


    if (kind === 'QUESTION') {
      const missing = required(row, ['kode_soal', 'jenis_soal', 'topik', 'pertanyaan_html', 'kunci_jawaban']);
      if (missing.length) addError(`Baris data ${line}: kolom wajib kosong (${missing.join(', ')}).`);
      if (!text(row.kode_topik) && !text(row.topicCode)) {
        addWarning(`Baris data ${line}: kode_topik kosong; sistem akan memakai nama topik sebagai fallback.`);
      }

      const code = text(row.kode_soal).toUpperCase();
      if (code && seenQuestionCodes.has(code)) addError(`Baris data ${line}: kode soal ${code} duplikat dalam file.`);
      seenQuestionCodes.add(code);

      const questionType = text(row.jenis_soal).toUpperCase();
      const scoringMode = text(row.sistem_penilaian).toUpperCase();
      const status = text(row.status).toUpperCase();
      if (questionType && !allowedQuestionTypes.has(questionType)) addError(`Baris data ${line}: jenis_soal "${questionType}" tidak valid.`);
      if (scoringMode && !allowedScoringModes.has(scoringMode)) addError(`Baris data ${line}: sistem_penilaian "${scoringMode}" tidak valid.`);
      if (status && !allowedPublishStatuses.has(status)) addError(`Baris data ${line}: status "${status}" tidak valid.`);

      const options = ['A', 'B', 'C', 'D', 'E'].filter((label) => text(row[`opsi_${label.toLowerCase()}`]));
      const keys = splitTokens(row.kunci_jawaban);
      if (options.length < 2) addError(`Baris data ${line}: minimal dua opsi/pernyataan harus tersedia.`);
      if (questionType === 'SINGLE_CHOICE') {
        if (keys.length !== 1 || !options.includes(keys[0])) addError(`Baris data ${line}: SINGLE_CHOICE harus memiliki satu kunci yang cocok dengan opsi.`);
      }
      if (questionType === 'MULTIPLE_CHOICE') {
        if (!keys.length || keys.some((key) => !options.includes(key))) addError(`Baris data ${line}: kunci MULTIPLE_CHOICE harus cocok dengan opsi, contoh A,C,D.`);
      }
      if (questionType === 'TRUE_FALSE') {
        if (keys.length !== options.length || keys.some((key) => !['B', 'S'].includes(key))) {
          addError(`Baris data ${line}: kunci TRUE_FALSE harus B/S dan jumlahnya sama dengan jumlah pernyataan.`);
        }
      }
      if (!text(row.pembahasan_html)) addWarning(`Baris data ${line}: pembahasan_html kosong.`);
    }


    if (kind === 'TRYOUT_CONTENT') {
      const missing = required(row, ['nama_tryout', 'kode_kisi_kisi', 'kompetensi', 'indikator', 'kode_soal', 'jenis_soal', 'topik', 'pertanyaan_html', 'kunci_jawaban']);
      if (missing.length) addError(`Baris data ${line}: kolom wajib kosong (${missing.join(', ')}).`);

      const groupName = text(row.nama_tryout);
      const tryoutCode = text(row.kode_tryout || row.tryoutCode).toUpperCase() || groupName.toUpperCase();
      if (!text(row.kode_tryout) && !text(row.tryoutCode)) {
        addWarning(`Baris data ${line}: kode_tryout kosong; sistem akan membuat kode otomatis dari nama_tryout.`);
      }
      if (!text(row.kode_topik) && !text(row.topicCode)) {
        addWarning(`Baris data ${line}: kode_topik kosong; sistem akan memakai nama topik sebagai fallback internal tryout.`);
      }
      if (groupName) {
        const current = tryoutGroupCounts.get(tryoutCode);
        if (current && current.name.toLowerCase() !== groupName.toLowerCase()) {
          addError(`Baris data ${line}: kode tryout ${tryoutCode} dipakai oleh nama paket berbeda (${current.name} dan ${groupName}).`);
        }
        tryoutGroupCounts.set(tryoutCode, { name: current?.name || groupName, count: (current?.count || 0) + 1 });
      }
      const code = text(row.kode_soal).toUpperCase();
      if (code && seenQuestionCodes.has(code)) addError(`Baris data ${line}: kode soal ${code} duplikat dalam file.`);
      seenQuestionCodes.add(code);

      const questionType = text(row.jenis_soal).toUpperCase();
      const scoringMode = text(row.sistem_penilaian).toUpperCase();
      const status = text(row.status).toUpperCase();
      if (questionType && !allowedQuestionTypes.has(questionType)) addError(`Baris data ${line}: jenis_soal "${questionType}" tidak valid.`);
      if (scoringMode && !allowedScoringModes.has(scoringMode)) addError(`Baris data ${line}: sistem_penilaian "${scoringMode}" tidak valid.`);
      if (status && !allowedPublishStatuses.has(status)) addError(`Baris data ${line}: status "${status}" tidak valid.`);

      const options = ['A', 'B', 'C', 'D', 'E'].filter((label) => text(row[`opsi_${label.toLowerCase()}`]));
      const keys = splitTokens(row.kunci_jawaban);
      if (options.length < 2) addError(`Baris data ${line}: minimal dua opsi/pernyataan harus tersedia.`);
      if (questionType === 'SINGLE_CHOICE' && (keys.length !== 1 || !options.includes(keys[0]))) {
        addError(`Baris data ${line}: SINGLE_CHOICE harus memiliki satu kunci yang cocok dengan opsi.`);
      }
      if (questionType === 'MULTIPLE_CHOICE' && (!keys.length || keys.some((key) => !options.includes(key)))) {
        addError(`Baris data ${line}: kunci MULTIPLE_CHOICE harus cocok dengan opsi, contoh A,C,D.`);
      }
      if (questionType === 'TRUE_FALSE' && (keys.length !== options.length || keys.some((key) => !['B', 'S'].includes(key)))) {
        addError(`Baris data ${line}: kunci TRUE_FALSE harus B/S dan jumlahnya sama dengan jumlah pernyataan.`);
      }
      if (!text(row.pembahasan_html)) addWarning(`Baris data ${line}: pembahasan_html kosong.`);
    }

    if (kind === 'USER') {
      const missing = required(row, ['full_name', 'email', 'role']);
      if (missing.length) addError(`Baris data ${line}: kolom wajib kosong (${missing.join(', ')}).`);
      const email = text(row.email).toLowerCase();
      const role = text(row.role).toUpperCase();
      if (email && seenEmails.has(email)) addError(`Baris data ${line}: email ${email} duplikat dalam file.`);
      seenEmails.add(email);
      if (role && !allowedUserRoles.has(role)) addError(`Baris data ${line}: role "${role}" tidak valid.`);
      if (!text(row.password)) addWarning(`Baris data ${line}: password kosong; akun baru belum dapat login sampai password ditetapkan.`);
    }

    if (kind === 'PARENT_LINK') {
      const missing = required(row, ['parent_email', 'student_email']);
      if (missing.length) addError(`Baris data ${line}: kolom wajib kosong (${missing.join(', ')}).`);
    }
  });


  if (kind === 'TRYOUT_CONTENT') {
    for (const [tryoutCode, group] of tryoutGroupCounts) {
      if (group.count !== 30) addError(`Paket ${group.name} (${tryoutCode}): jumlah soal harus tepat 30, tetapi file berisi ${group.count} soal.`);
    }
  }

  return {
    kind,
    validRows: Math.max(0, rows.length - errorCount),
    errorCount,
    warningCount,
    errors,
    warnings,
  };
}

function mergeResults(current: ImportResult | null, incoming: ImportResult): ImportResult {
  if (!current) return incoming;
  const details = { ...current.details };
  Object.entries(incoming.details || {}).forEach(([key, value]) => {
    details[key] = (details[key] || 0) + Number(value || 0);
  });
  return {
    kind: incoming.kind,
    processedRows: current.processedRows + incoming.processedRows,
    created: current.created + incoming.created,
    updated: current.updated + incoming.updated,
    linked: current.linked + incoming.linked,
    warnings: [...current.warnings, ...incoming.warnings].slice(0, 20),
    details,
  };
}

async function readJsonResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new Error(`Server mengembalikan respons non-JSON (${response.status}).`);
  }
}

export function ImportCenter({
  eyebrow,
  title,
  description,
  templates,
}: {
  eyebrow: string;
  title: string;
  description: string;
  templates: Array<{ title: string; description: string; href: string; code: string }>;
}) {
  const { notify } = useToast();
  const [summary, setSummary] = useState<string>('Belum ada file dipilih.');
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [kind, setKind] = useState<ImportKind | null>(null);
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const canImport = Boolean(validation && validation.errorCount === 0 && rows.length > 0 && kind && !importing);

  const resultDetails = useMemo(() => Object.entries(importResult?.details || {}).filter(([, value]) => Number(value) > 0), [importResult]);

  const resetAfterFile = () => {
    setValidation(null);
    setImportResult(null);
    setProgress('');
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    resetAfterFile();
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
      const headerIndex = matrix.findIndex((candidate) => detectImportKind((candidate || []).map((value) => text(value))) !== null);
      if (headerIndex < 0) throw new Error('Header template tidak dikenali. Gunakan template resmi aplikasi.');

      const headers = (matrix[headerIndex] || []).map((value) => text(value));
      const detectedKind = detectImportKind(headers);
      if (!detectedKind) throw new Error('Jenis import tidak dapat dikenali dari header file.');

      const parsedRows = matrix
        .slice(headerIndex + 1)
        .filter((candidate) => (candidate || []).some((value) => text(value)))
        .map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate?.[index] ?? ''])) as ImportRow);

      if (!parsedRows.length) throw new Error('File tidak memiliki baris data setelah header.');

      setKind(detectedKind);
      setRows(parsedRows);
      setPreviewRows(parsedRows.slice(0, 5));
      setSummary(`File: ${file.name} • Sheet: ${firstSheetName} • Jenis: ${kindLabels[detectedKind]} • Total baris: ${parsedRows.length}`);
      notify('File berhasil dibaca', `${parsedRows.length} baris ${kindLabels[detectedKind]} siap divalidasi.`);
    } catch (error) {
      setRows([]);
      setPreviewRows([]);
      setKind(null);
      setSummary(error instanceof Error ? error.message : 'File gagal dibaca.');
      notify('Gagal membaca file', error instanceof Error ? error.message : 'Format file tidak valid.');
    }
  };

  const validateCurrentFile = async () => {
    if (!kind || !rows.length) return;
    setValidating(true);
    setImportResult(null);
    try {
      const result = validateRows(kind, rows);
      setValidation(result);
      if (result.errorCount === 0) {
        notify('Validasi berhasil', `${rows.length} baris siap diimpor ke database.`);
      } else {
        notify('Validasi menemukan error', `${result.errorCount} masalah harus diperbaiki sebelum import.`);
      }
    } finally {
      setValidating(false);
    }
  };

  const importToDatabase = async () => {
    if (!kind || !canImport) return;
    setImporting(true);
    setImportResult(null);
    setProgress('Menyiapkan import...');

    try {
      const chunkSize = kind === 'QUESTION' ? 40 : kind === 'USER' ? 100 : rows.length;
      const chunks: ImportRow[][] = [];
      for (let index = 0; index < rows.length; index += chunkSize) chunks.push(rows.slice(index, index + chunkSize));

      let aggregate: ImportResult | null = null;
      for (let index = 0; index < chunks.length; index += 1) {
        setProgress(`Mengimpor bagian ${index + 1} dari ${chunks.length} (${Math.min((index + 1) * chunkSize, rows.length)}/${rows.length} baris)...`);
        const response = await fetch('/api/imports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, rows: chunks[index] }),
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) throw new Error(payload.error || `Import gagal pada bagian ${index + 1}.`);
        aggregate = mergeResults(aggregate, payload.data as ImportResult);
      }

      setImportResult(aggregate);
      setProgress('Import selesai dan tersimpan ke database.');
      notify('Import berhasil', `${aggregate?.processedRows || rows.length} baris telah diproses ke database.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import gagal diproses.';
      setProgress(`Import berhenti: ${message}`);
      notify('Import gagal', message);
    } finally {
      setImporting(false);
    }
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
        <div>
          <div className="eyebrow">Import ke database</div>
          <strong>1. Pilih file → 2. Validasi → 3. Import</strong>
          <p className="muted">Data tidak otomatis disimpan saat file dipilih. Tombol Import ke Database baru aktif setelah validasi berhasil tanpa error.</p>
        </div>

        <input className="input" type="file" accept=".xlsx,.xls" onChange={(event) => onFile(event.target.files?.[0] || null)} />
        <div className="notice">{summary}</div>

        <div className="button-row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button className="button-secondary" type="button" onClick={validateCurrentFile} disabled={!rows.length || validating || importing}>
            {validating ? 'Memvalidasi...' : 'Validasi File'}
          </button>
          <button className="button" type="button" onClick={importToDatabase} disabled={!canImport}>
            {importing ? 'Mengimpor...' : `Import ${rows.length || 0} Data ke Database`}
          </button>
        </div>

        {validation ? (
          <div className="stack" style={{ gap: 10 }}>
            <div className="button-row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <span className="badge success">Valid: {validation.validRows}</span>
              <span className={validation.errorCount ? 'badge danger' : 'badge success'}>Error: {validation.errorCount}</span>
              <span className={validation.warningCount ? 'badge warning' : 'badge success'}>Peringatan: {validation.warningCount}</span>
            </div>
            {validation.errors.length ? (
              <div className="notice" style={{ borderColor: 'var(--danger)' }}>
                <strong>Error yang harus diperbaiki:</strong>
                <ul>{validation.errors.map((message) => <li key={message}>{message}</li>)}</ul>
                {validation.errorCount > validation.errors.length ? <div className="muted">...dan {validation.errorCount - validation.errors.length} error lainnya.</div> : null}
              </div>
            ) : null}
            {validation.warnings.length ? (
              <div className="notice">
                <strong>Peringatan:</strong>
                <ul>{validation.warnings.map((message) => <li key={message}>{message}</li>)}</ul>
                {validation.warningCount > validation.warnings.length ? <div className="muted">...dan {validation.warningCount - validation.warnings.length} peringatan lainnya.</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {progress ? <div className="notice"><strong>Status:</strong> {progress}</div> : null}

        {importResult ? (
          <div className="card stack" style={{ background: 'color-mix(in srgb, var(--success) 7%, var(--surface))' }}>
            <div className="eyebrow">Hasil import</div>
            <div className="button-row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <span className="badge success">Diproses: {importResult.processedRows}</span>
              <span className="badge success">Dibuat: {importResult.created}</span>
              <span className="badge">Diperbarui: {importResult.updated}</span>
              <span className="badge">Dihubungkan: {importResult.linked}</span>
            </div>
            {resultDetails.length ? (
              <div className="kv-list">
                {resultDetails.map(([key, value]) => <div key={key}><strong>{key}</strong><span>{value}</span></div>)}
              </div>
            ) : null}
            {importResult.warnings?.length ? <div className="notice">{importResult.warnings.join(' • ')}</div> : null}
          </div>
        ) : null}
      </section>

      {previewRows.length ? (
        <section className="card stack">
          <div>
            <div className="eyebrow">Preview 5 baris pertama</div>
            <strong>{fileName || 'File Excel'}</strong>
          </div>
          <div className="table-list">
            {previewRows.map((row, index) => (
              <div className="item-card" key={index}>
                <div className="kv-list">
                  {Object.entries(row).slice(0, 12).map(([key, value]) => (
                    <div key={key}><strong>{key}</strong><span>{String(value)}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
