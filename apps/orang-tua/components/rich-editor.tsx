'use client';

import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Bold, Code2, Heading2, Heading3, Image, Italic, Link as LinkIcon, List, ListOrdered, Redo2, Sigma, Table2, Underline, Undo2 } from 'lucide-react';
import { useToast } from './toast-provider';

type RichEditorProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function RichEditor({ label, value, onChange, placeholder }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastHtmlRef = useRef(value || '');
  const { notify } = useToast();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = value || '';
    if (next !== editor.innerHTML) {
      editor.innerHTML = next;
      lastHtmlRef.current = next;
    }
  }, [value]);

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

  const toggleCode = () => {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      insertHtml('<code>kode</code>');
      return;
    }
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString() || 'kode';
    const code = document.createElement('code');
    code.textContent = selectedText;
    range.deleteContents();
    range.insertNode(code);
    range.setStartAfter(code);
    range.setEndAfter(code);
    selection.removeAllRanges();
    selection.addRange(range);
    commit();
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

  const tools = [
    { title: 'Tebal', icon: Bold, action: () => runCommand('bold') },
    { title: 'Miring', icon: Italic, action: () => runCommand('italic') },
    { title: 'Garis bawah', icon: Underline, action: () => runCommand('underline') },
    { title: 'Heading 2', icon: Heading2, action: () => runCommand('formatBlock', 'H2') },
    { title: 'Heading 3', icon: Heading3, action: () => runCommand('formatBlock', 'H3') },
    { title: 'Daftar poin', icon: List, action: () => runCommand('insertUnorderedList') },
    { title: 'Daftar nomor', icon: ListOrdered, action: () => runCommand('insertOrderedList') },
    { title: 'Tautan', icon: LinkIcon, action: createLink },
    { title: 'Masukkan gambar', icon: Image, action: () => fileInputRef.current?.click() },
    { title: 'Rumus LaTeX', icon: Sigma, action: () => insertHtml('<span class="latex-token">$x^2 + y^2$</span>&nbsp;') },
    { title: 'Kode', icon: Code2, action: toggleCode },
    { title: 'Tabel', icon: Table2, action: () => insertHtml('<table><tbody><tr><th>Kolom 1</th><th>Kolom 2</th></tr><tr><td>Isi</td><td>Isi</td></tr></tbody></table>') },
    { title: 'Undo', icon: Undo2, action: () => runCommand('undo') },
    { title: 'Redo', icon: Redo2, action: () => runCommand('redo') },
  ];

  return (
    <div className="field full">
      <label>{label}</label>
      <div className="editor-shell enhanced-editor wysiwyg-editor">
        <div className="editor-toolbar" role="toolbar" aria-label="Toolbar editor">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button key={tool.title} type="button" className="editor-tool-button" onClick={tool.action} title={tool.title} aria-label={tool.title}>
                <Icon size={20} />
              </button>
            );
          })}
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} />
        </div>

        <div className="editor-content wysiwyg-content">
          <div
            ref={editorRef}
            className="editor-canvas"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={label}
            data-placeholder={placeholder || 'Tulis konten di sini. Gunakan toolbar untuk format teks, gambar, tabel, kode, dan LaTeX.'}
            onInput={commit}
            onBlur={commit}
          />
        </div>
      </div>
    </div>
  );
}
