'use client';

import katex from 'katex';
import { useMemo } from 'react';

const DISPLAY_PLACEHOLDER_PREFIX = '%%SAINS_MASEMBA_KATEX_BLOCK_';

function decodeHtmlEntities(value: string) {
  return String(value || '')
    .replace(/&amp;(le|ge|ne|times|middot|plusmn|radic|infin|deg);/gi, '&$1;')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&le;|&#8804;/gi, '≤')
    .replace(/&ge;|&#8805;/gi, '≥')
    .replace(/&ne;|&#8800;/gi, '≠')
    .replace(/&times;|&#215;/gi, '×')
    .replace(/&middot;|&#183;/gi, '·')
    .replace(/&plusmn;|&#177;/gi, '±')
    .replace(/&radic;|&#8730;/gi, '√')
    .replace(/&infin;|&#8734;/gi, '∞')
    .replace(/&deg;|&#176;/gi, '°')
    .replace(/&amp;|&#38;/gi, '&');
}

function normalizeExpression(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr)>/gi, '\n')
    .replace(/<(?:p|div|li|tr)(?:\s[^>]*)?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function renderExpression(expression: string, displayMode: boolean) {
  const normalized = normalizeExpression(expression);
  if (!normalized) return '';

  try {
    return katex.renderToString(normalized, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml',
    });
  } catch {
    const delimiter = displayMode ? ['\\[', '\\]'] : ['\\(', '\\)'];
    return `<code>${delimiter[0]}${normalized}${delimiter[1]}</code>`;
  }
}

function looksLikeDollarMath(expression: string) {
  const normalized = normalizeExpression(expression);
  if (!normalized) return false;

  // Hindari salah membaca teks nominal seperti "$5 dan $10" sebagai rumus.
  if (/\s/.test(normalized) && !/[\\^_={}<>+\-*/=]/.test(normalized)) return false;
  return true;
}

function protectDisplayMath(source: string, renderedBlocks: string[]) {
  const store = (expression: string) => {
    const index = renderedBlocks.push(renderExpression(expression, true)) - 1;
    return `${DISPLAY_PLACEHOLDER_PREFIX}${index}%%`;
  };

  return source
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expression) => store(String(expression)))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expression) => store(String(expression)));
}

function renderInlineMathInText(text: string) {
  const withParentheses = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, expression) =>
    renderExpression(String(expression), false),
  );

  return withParentheses.replace(/(^|[^\\])\$(?!\$)([^$]+?)\$/g, (match, prefix, expression) => {
    if (!looksLikeDollarMath(String(expression))) return match;
    return `${prefix}${renderExpression(String(expression), false)}`;
  });
}

export function renderMathHtml(html: string) {
  const renderedBlocks: string[] = [];
  const protectedHtml = protectDisplayMath(String(html || ''), renderedBlocks);

  // Rumus inline dirender hanya pada bagian teks, bukan pada tag/atribut HTML.
  const renderedInline = protectedHtml
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith('<') ? part : renderInlineMathInText(part)))
    .join('');

  return renderedInline.replace(
    new RegExp(`${DISPLAY_PLACEHOLDER_PREFIX}(\\d+)%%`, 'g'),
    (_, index) => renderedBlocks[Number(index)] || '',
  );
}

export function MathHtml({ html, className }: { html: string; className?: string }) {
  const rendered = useMemo(() => renderMathHtml(html || ''), [html]);

  return (
    <div
      className={className}
      style={{ maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

export function toSpeechText(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$|\$/g, ' ')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 per $2')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'akar dari $1')
    .replace(/\\times|\\cdot/g, ' kali ')
    .replace(/\\div/g, ' bagi ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\Delta/g, ' delta ')
    .replace(/\\leq?|≤/g, ' kurang dari atau sama dengan ')
    .replace(/\\geq?|≥/g, ' lebih dari atau sama dengan ')
    .replace(/\^2/g, ' kuadrat')
    .replace(/\^3/g, ' pangkat tiga')
    .replace(/=/g, ' sama dengan ')
    .replace(/\+/g, ' ditambah ')
    .replace(/-/g, ' dikurangi ')
    .replace(/\s+/g, ' ')
    .trim();
}
