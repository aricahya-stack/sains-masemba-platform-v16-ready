'use client';
import katex from 'katex';
import { useMemo } from 'react';

function renderMath(html: string) {
  const source = html || '';
  const block = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    try {
      return katex.renderToString(String(expr).trim(), { throwOnError: false, displayMode: true });
    } catch {
      return `<code>$$${expr}$$</code>`;
    }
  });
  return block.replace(/\$(.+?)\$/g, (_, expr) => {
    try {
      return katex.renderToString(String(expr).trim(), { throwOnError: false, displayMode: false });
    } catch {
      return `<code>$${expr}$</code>`;
    }
  });
}

export function MathHtml({ html, className }: { html: string; className?: string }) {
  const rendered = useMemo(() => renderMath(html || ''), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
}

export function toSpeechText(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$|\$/g, ' ')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 per $2')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'akar dari $1')
    .replace(/\\times/g, ' kali ')
    .replace(/\\div/g, ' bagi ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\^2/g, ' kuadrat')
    .replace(/\^3/g, ' pangkat tiga')
    .replace(/=/g, ' sama dengan ')
    .replace(/\+/g, ' ditambah ')
    .replace(/-/g, ' dikurangi ')
    .replace(/\s+/g, ' ')
    .trim();
}
