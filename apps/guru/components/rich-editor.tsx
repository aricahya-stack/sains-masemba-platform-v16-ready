'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Bold, Code2, Heading2, Heading3, Image, Italic, Link as LinkIcon, List, ListOrdered, Redo2, Sigma, Table2, Underline, Undo2 } from 'lucide-react';
import { useToast } from './toast-provider';
import { MathHtml } from './math-html';

type RichEditorProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  readOnly?: boolean;
};

type EditorTool = {
  title: string;
  icon: typeof Bold;
  action: () => void;
  disabled?: boolean;
  active?: boolean;
};

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


export function RichEditor({ label, value, onChange, placeholder, readOnly = false }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHtmlRef = useRef(value || '');
  const [isSourceMode, setIsSourceMode] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    if (isSourceMode) return;
    const editor = editorRef.current;
    if (!editor) return;
    const next = value || '';
    if (next !== editor.innerHTML) {
      editor.innerHTML = next;
      lastHtmlRef.current = next;
    }
  }, [value, isSourceMode]);

  const commit = () => {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML === '<br>' ? '' : editor.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, payload?: string) => {
    focusEditor();
    document.execCommand(command, false, payload);
    commit();
  };

  const insertHtml = (html: string) => {
    focusEditor();
    document.execCommand('insertHTML', false, html);
    commit();
  };

  const createLink = () => {
    const url = window.prompt('Masukkan tautan/URL:', 'https://');
    if (!url) return;
    runCommand('createLink', url);
  };

  const toggleSourceMode = () => {
    if (!isSourceMode) {
      commit();
    }
    setIsSourceMode((current) => !current);
  };

  const handleSourceChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const html = event.target.value;
    lastHtmlRef.current = html;
    onChange(html);
  };

  const insertLatex = () => {
    const expression = window.prompt('Masukkan rumus LaTeX tanpa pembatas:', String.raw`\frac{a}{b}`);
    if (!expression?.trim()) return;

    const displayMode = window.confirm(
      'Tampilkan sebagai rumus blok?\n\nPilih OK untuk rumus blok atau Batal untuk rumus sebaris.',
    );
    const safeExpression = escapeHtml(expression.trim());
    insertHtml(
      displayMode
        ? `<div class="latex-token">\\[${safeExpression}\\]</div>`
        : `<span class="latex-token">\\(${safeExpression}\\)</span>&nbsp;`,
    );
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('File tidak valid', 'Pilih file gambar seperti PNG, JPG, atau WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      const alt = escapeAttribute(file.name.replace(/\.[^.]+$/, '') || 'gambar');
      insertHtml(`<figure><img src="${src}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>`);
    };
    reader.readAsDataURL(file);
  };

  const tools: EditorTool[] = [
    { title: 'Tebal', icon: Bold, action: () => runCommand('bold'), disabled: readOnly || isSourceMode },
    { title: 'Miring', icon: Italic, action: () => runCommand('italic'), disabled: readOnly || isSourceMode },
    { title: 'Garis bawah', icon: Underline, action: () => runCommand('underline'), disabled: readOnly || isSourceMode },
    { title: 'Heading 2', icon: Heading2, action: () => runCommand('formatBlock', 'H2'), disabled: readOnly || isSourceMode },
    { title: 'Heading 3', icon: Heading3, action: () => runCommand('formatBlock', 'H3'), disabled: readOnly || isSourceMode },
    { title: 'Daftar poin', icon: List, action: () => runCommand('insertUnorderedList'), disabled: readOnly || isSourceMode },
    { title: 'Daftar nomor', icon: ListOrdered, action: () => runCommand('insertOrderedList'), disabled: readOnly || isSourceMode },
    { title: 'Tautan', icon: LinkIcon, action: createLink, disabled: readOnly || isSourceMode },
    { title: 'Masukkan gambar', icon: Image, action: () => fileInputRef.current?.click(), disabled: readOnly || isSourceMode },
    { title: 'Rumus LaTeX', icon: Sigma, action: insertLatex, disabled: readOnly || isSourceMode },
    { title: isSourceMode ? 'Tutup source HTML' : 'Lihat source HTML', icon: Code2, action: toggleSourceMode, active: isSourceMode, disabled: readOnly },
    { title: 'Tabel', icon: Table2, action: () => insertHtml('<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th></tr><tr><td>Isi</td><td>Isi</td></tr></tbody></table>'), disabled: readOnly || isSourceMode },
    { title: 'Undo', icon: Undo2, action: () => runCommand('undo'), disabled: readOnly || isSourceMode },
    { title: 'Redo', icon: Redo2, action: () => runCommand('redo'), disabled: readOnly || isSourceMode },
  ];

  return (
    <div className="field full">
      <label>{label}</label>
      <div className="editor-shell enhanced-editor wysiwyg-editor">
        <div className="editor-toolbar" role="toolbar" aria-label="Toolbar editor">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.title}
                type="button"
                className={`editor-tool-button${tool.active ? ' is-active' : ''}`}
                onClick={tool.action}
                title={tool.title}
                aria-label={tool.title}
                aria-pressed={tool.active || undefined}
                disabled={tool.disabled}
              >
                <Icon size={20} />
              </button>
            );
          })}
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} disabled={readOnly} />
        </div>

        <div className="editor-content wysiwyg-content">
          {isSourceMode ? (
            <textarea
              className="editor-source"
              aria-label={`${label} source HTML`}
              value={value || ''}
              spellCheck={false}
              readOnly={readOnly}
              onChange={handleSourceChange}
            />
          ) : (
            <div
              ref={editorRef}
              className="editor-canvas"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              role="textbox"
              aria-label={label}
              aria-readonly={readOnly}
              data-placeholder={placeholder || 'Tulis konten di sini. Gunakan toolbar untuk format teks, gambar, tabel, dan LaTeX.'}
              onInput={readOnly ? undefined : commit}
              onBlur={readOnly ? undefined : commit}
            />
          )}
        </div>

        <div
          aria-live="polite"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            padding: '18px 22px',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <strong>Pratinjau konten dan LaTeX</strong>
            <div className="muted" style={{ marginTop: 4, fontSize: '.9rem' }}>
              Mendukung <code>\(...\)</code> atau <code>$...$</code> untuk rumus sebaris, serta <code>\[...\]</code> atau <code>$$...$$</code> untuk rumus blok.
            </div>
          </div>
          {value ? (
            <MathHtml html={value} className="reading-content" />
          ) : (
            <div className="muted">Pratinjau akan tampil setelah konten ditulis.</div>
          )}
        </div>
      </div>
    </div>
  );
}
