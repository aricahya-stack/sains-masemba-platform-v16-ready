
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma, UserRole } from '@sh/db';
import { DEFAULT_MOTTO, FONT_OPTIONS, getCurrentUser, THEME_OPTIONS } from '@sh/core';

async function ensureAdmin() {
  const user = await getCurrentUser();
  return user && user.role === UserRole.SUPER_ADMIN ? user : null;
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const theme = String(body.theme || '');
  const motto = String(body.motto || DEFAULT_MOTTO).trim() || DEFAULT_MOTTO;
  const font = String(body.font || 'system');
  if (!THEME_OPTIONS.some((item) => item.key === theme)) {
    return NextResponse.json({ error: 'Tema tidak valid.' }, { status: 400 });
  }
  if (!FONT_OPTIONS.some((item) => item.key === font)) {
    return NextResponse.json({ error: 'Font tidak valid.' }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: 'theme' },
      update: { value: theme },
      create: { key: 'theme', value: theme },
    }),
    prisma.appSetting.upsert({
      where: { key: 'motto' },
      update: { value: motto },
      create: { key: 'motto', value: motto },
    }),
    prisma.appSetting.upsert({
      where: { key: 'font' },
      update: { value: font },
      create: { key: 'font', value: font },
    }),
  ]);
  revalidateTag('global-branding');
  return NextResponse.json({ ok: true, theme, motto, font });
}
