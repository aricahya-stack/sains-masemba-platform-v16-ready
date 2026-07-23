
import { prisma } from '@sh/db';
import { unstable_cache } from 'next/cache';

export const DEFAULT_MOTTO = 'OJO KUMINTER MUNDAK KEBLINGER, OJO CIDRA MUNDAK CILAKA';

export const THEME_OPTIONS = [
  { key: 'ocean', label: 'Ocean', preview: 'linear-gradient(135deg,#0A7C6E,#F59E0B 58%,#FF6B35)', brand: '#0A7C6E', warning: '#F59E0B', accent: '#FF6B35', canvas: '#FAFAFA' },
  { key: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg,#1D4ED8,#22C55E 58%,#06B6D4)', brand: '#1D4ED8', warning: '#22C55E', accent: '#06B6D4', canvas: '#F8FAFC' },
  { key: 'royal', label: 'Royal', preview: 'linear-gradient(135deg,#4C1D95,#8B5CF6 58%,#F59E0B)', brand: '#4C1D95', warning: '#8B5CF6', accent: '#F59E0B', canvas: '#FAF5FF' },
  { key: 'ember', label: 'Ember', preview: 'linear-gradient(135deg,#C2410C,#F59E0B 55%,#EF4444)', brand: '#C2410C', warning: '#F59E0B', accent: '#EF4444', canvas: '#FFFBEB' },
  { key: 'forest', label: 'Forest', preview: 'linear-gradient(135deg,#166534,#84CC16 55%,#22C55E)', brand: '#166534', warning: '#84CC16', accent: '#22C55E', canvas: '#F7FEE7' },
  { key: 'rose', label: 'Rose', preview: 'linear-gradient(135deg,#BE123C,#FB7185 58%,#FDBA74)', brand: '#BE123C', warning: '#FB7185', accent: '#FDBA74', canvas: '#FFF1F2' },
  { key: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg,#0F172A,#334155 58%,#38BDF8)', brand: '#0F172A', warning: '#334155', accent: '#38BDF8', canvas: '#F8FAFC' },
  { key: 'skyline', label: 'Skyline', preview: 'linear-gradient(135deg,#0369A1,#38BDF8 58%,#F59E0B)', brand: '#0369A1', warning: '#38BDF8', accent: '#F59E0B', canvas: '#F0F9FF' },
  { key: 'lavender', label: 'Lavender', preview: 'linear-gradient(135deg,#7C3AED,#C084FC 58%,#FB7185)', brand: '#7C3AED', warning: '#C084FC', accent: '#FB7185', canvas: '#FAF5FF' },
  { key: 'earth', label: 'Earth', preview: 'linear-gradient(135deg,#57534E,#A16207 58%,#65A30D)', brand: '#57534E', warning: '#A16207', accent: '#65A30D', canvas: '#FAFAF9' },
] as const;


export const FONT_OPTIONS = [
  { key: 'system', label: 'System / Inter', css: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { key: 'poppins', label: 'Poppins', css: 'Poppins, Inter, ui-sans-serif, system-ui, sans-serif' },
  { key: 'nunito', label: 'Nunito', css: 'Nunito, Inter, ui-sans-serif, system-ui, sans-serif' },
  { key: 'serif', label: 'Serif Akademik', css: 'Georgia, "Times New Roman", Times, serif' },
  { key: 'mono', label: 'Mono', css: '"SFMono-Regular", Consolas, "Liberation Mono", monospace' },
] as const;

export type FontKey = typeof FONT_OPTIONS[number]['key'];

export function isFontKey(value: string): value is FontKey {
  return FONT_OPTIONS.some((item) => item.key === value);
}

export type ThemeKey = typeof THEME_OPTIONS[number]['key'];

export function isThemeKey(value: string): value is ThemeKey {
  return THEME_OPTIONS.some((item) => item.key === value);
}

type BrandingSettings = {
  theme: ThemeKey;
  motto: string;
  font: FontKey;
};

const getCachedBranding = unstable_cache(
  async (): Promise<BrandingSettings> => {
    try {
      const rows = await prisma.appSetting.findMany({
        where: { key: { in: ['theme', 'motto', 'font'] } },
        select: { key: true, value: true },
      });
      const settings = new Map(rows.map((row) => [row.key, row.value]));

      const themeValue = settings.get('theme') || '';
      const theme = (THEME_OPTIONS.find((item) => item.key === themeValue)?.key || 'ocean') as ThemeKey;

      const fontValue = settings.get('font') || '';
      const font = (FONT_OPTIONS.find((item) => item.key === fontValue)?.key || 'system') as FontKey;

      const motto = settings.get('motto')?.trim() || DEFAULT_MOTTO;
      return { theme, motto, font };
    } catch {
      return { theme: 'ocean', motto: DEFAULT_MOTTO, font: 'system' };
    }
  },
  ['global-branding'],
  { revalidate: 300, tags: ['global-branding'] },
);

export async function getActiveTheme(): Promise<ThemeKey> {
  return (await getCachedBranding()).theme;
}

export async function getGlobalMotto(): Promise<string> {
  return (await getCachedBranding()).motto;
}

export async function getActiveFont(): Promise<FontKey> {
  return (await getCachedBranding()).font;
}

export async function getGlobalBranding() {
  return getCachedBranding();
}

