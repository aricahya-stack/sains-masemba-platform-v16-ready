'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Bold, Code2, Heading2, Heading3, Image, Italic, Link as LinkIcon, List, ListOrdered, Redo2, Sigma, Table2, Underline, Undo2 } from 'lucide-react';
import { useToast } from './toast-provider';

type RichEditorProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
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

export function RichEditor({ label, value, onChange, placeholder }: RichEditorProps) {
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
    const html = event.target.value;
    lastHtmlRef.current = html;
    onChange(html);
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
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
    { title: 'Tebal', icon: Bold, action: () => runCommand('bold'), disabled: isSourceMode },
    { title: 'Miring', icon: Italic, action: () => runCommand('italic'), disabled: isSourceMode },
    { title: 'Garis bawah', icon: Underline, action: () => runCommand('underline'), disabled: isSourceMode },
    { title: 'Heading 2', icon: Heading2, action: () => runCommand('formatBlock', 'H2'), disabled: isSourceMode },
    { title: 'Heading 3', icon: Heading3, action: () => runCommand('formatBlock', 'H3'), disabled: isSourceMode },
    { title: 'Daftar poin', icon: List, action: () => runCommand('insertUnorderedList'), disabled: isSourceMode },
    { title: 'Daftar nomor', icon: ListOrdered, action: () => runCommand('insertOrderedList'), disabled: isSourceMode },
    { title: 'Tautan', icon: LinkIcon, action: createLink, disabled: isSourceMode },
    { title: 'Masukkan gambar', icon: Image, action: () => fileInputRef.current?.click(), disabled: isSourceMode },
    { title: 'Rumus LaTeX', icon: Sigma, action: () => insertHtml('<span class="latex-token">$x^2 + y^2$</span>&nbsp;'), disabled: isSourceMode },
    { title: isSourceMode ? 'Tutup source HTML' : 'Lihat source HTML', icon: Code2, action: toggleSourceMode, active: isSourceMode },
    { title: 'Tabel', icon: Table2, action: () => insertHtml('<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th></tr><tr><td>Isi</td><td>Isi</td></tr></tbody></table>'), disabled: isSourceMode },
    { title: 'Undo', icon: Undo2, action: () => runCommand('undo'), disabled: isSourceMode },
    { title: 'Redo', icon: Redo2, action: () => runCommand('redo'), disabled: isSourceMode },
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
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} />
        </div>

        <div className="editor-content wysiwyg-content">
          {isSourceMode ? (
            <textarea
              className="editor-source"
              aria-label={`${label} source HTML`}
              value={value || ''}
              spellCheck={false}
              onChange={handleSourceChange}
            />
          ) : (
            <div
              ref={editorRef}
              className="editor-canvas"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={label}
              data-placeholder={placeholder || 'Tulis konten di sini. Gunakan toolbar untuk format teks, gambar, tabel, dan LaTeX.'}
              onInput={commit}
              onBlur={commit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
