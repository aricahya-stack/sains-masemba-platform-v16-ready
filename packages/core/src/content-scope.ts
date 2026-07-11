import { slugify } from './utils';

/**
 * Namespace internal untuk topik yang hanya dipakai soal tryout.
 * Topik dengan prefix ini tidak boleh tampil sebagai topik belajar siswa.
 */
export const TRYOUT_TOPIC_PREFIX = '__tryout__-';

/**
 * Prefix periodCode Blueprint untuk konten tryout hasil import/editor.
 * Bentuk akhir: TRYOUT_CONTENT:<KODE_TRYOUT>
 */
export const TRYOUT_PERIOD_PREFIX = 'TRYOUT_CONTENT:';

export function normalizeTopicCode(value: unknown, fallback: unknown = '') {
  const raw = String(value ?? '').trim() || String(fallback ?? '').trim();
  return slugify(raw);
}

export function normalizeTryoutCode(value: unknown, fallback: unknown = '') {
  const raw = String(value ?? '').trim() || String(fallback ?? '').trim();
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'TRYOUT';
}

export function toTryoutPeriodCode(tryoutCode: unknown, fallbackName: unknown = '') {
  return `${TRYOUT_PERIOD_PREFIX}${normalizeTryoutCode(tryoutCode, fallbackName)}`;
}

export function isTryoutPeriodCode(value: unknown) {
  const code = String(value ?? '').trim().toUpperCase();
  return code === 'TRYOUT_CONTENT' || code.startsWith(TRYOUT_PERIOD_PREFIX);
}

export function tryoutCodeFromPeriodCode(value: unknown, fallbackName: unknown = '') {
  const code = String(value ?? '').trim();
  if (code.toUpperCase().startsWith(TRYOUT_PERIOD_PREFIX)) {
    return normalizeTryoutCode(code.slice(TRYOUT_PERIOD_PREFIX.length), fallbackName);
  }
  return normalizeTryoutCode(fallbackName || code || 'TRYOUT');
}

export function makeInternalTryoutTopicSlug(
  tryoutCode: unknown,
  topicCodeOrTitle: unknown,
  fallbackTopicTitle: unknown = '',
) {
  const packagePart = slugify(normalizeTryoutCode(tryoutCode));
  const topicPart = normalizeTopicCode(topicCodeOrTitle, fallbackTopicTitle) || 'umum';
  return `${TRYOUT_TOPIC_PREFIX}${packagePart}-${topicPart}`;
}

export function isInternalTryoutTopicSlug(value: unknown) {
  return String(value ?? '').trim().toLowerCase().startsWith(TRYOUT_TOPIC_PREFIX);
}

export function isTryoutBlueprintLike(blueprint: {
  periodCode?: string | null;
  testGroup?: string | null;
} | null | undefined) {
  if (!blueprint) return false;
  if (isTryoutPeriodCode(blueprint.periodCode)) return true;
  return /^tryout\b/i.test(String(blueprint.testGroup || '').trim());
}
