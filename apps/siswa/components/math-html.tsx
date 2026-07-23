'use client';

import katex from 'katex';
import { useEffect, useState } from 'react';

const DISPLAY_PLACEHOLDER_PREFIX = '%%SAINS_MASEMBA_KATEX_BLOCK_';
const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong',
  'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'form', 'svg']);
const GLOBAL_ATTRIBUTES = new Set(['class', 'title']);
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span']),
};

function safeUrl(value: string, type: 'href' | 'src') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  if (type === 'src' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, window.location.origin);
    if (type === 'href' && ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return trimmed;
    if (type === 'src' && ['http:', 'https:'].includes(url.protocol)) return trimmed;
  } catch {}
  return '';
}

export function sanitizeStoredHtml(source: string) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const documentNode = new DOMParser().parseFromString(`<body>${String(source || '')}</body>`, 'text/html');
  const elements = Array.from(documentNode.body.querySelectorAll('*'));

  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      if (DROP_WITH_CONTENT.has(tag)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const allowed = GLOBAL_ATTRIBUTES.has(name) || TAG_ATTRIBUTES[tag]?.has(name);
      if (!allowed || name.startsWith('on') || name === 'style' || name === 'srcset') {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === 'href' || name === 'src') {
        const cleaned = safeUrl(attribute.value, name);
        if (cleaned) element.setAttribute(name, cleaned);
        else element.removeAttribute(name);
      }
    }

    if (tag === 'a' && element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
    if (tag === 'img') {
      element.setAttribute('loading', 'lazy');
      element.removeAttribute('class');
    }
  }

  const walker = documentNode.createTreeWalker(documentNode.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  let comment = walker.nextNode();
  while (comment) {
    comments.push(comment);
    comment = walker.nextNode();
  }
  for (const item of comments) item.parentNode?.removeChild(item);
  return documentNode.body.innerHTML;
}

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
    const escaped = normalized.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
    return `<code>${delimiter[0]}${escaped}${delimiter[1]}</code>`;
  }
}

function looksLikeDollarMath(expression: string) {
  const normalized = normalizeExpression(expression);
  if (!normalized) return false;
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
  const sanitized = sanitizeStoredHtml(String(html || ''));
  const renderedBlocks: string[] = [];
  const protectedHtml = protectDisplayMath(sanitized, renderedBlocks);
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
  const [rendered, setRendered] = useState('');

  useEffect(() => {
    setRendered(renderMathHtml(html || ''));
  }, [html]);

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
