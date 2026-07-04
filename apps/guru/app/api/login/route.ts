import { NextResponse } from 'next/server';
import { authenticateByRole, encodeSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '@sh/core';
import { appMeta } from '../../../lib/app';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const user = await authenticateByRole(appMeta.role, email, password);
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=1', request.url), { status: 303 });
    }
    const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    }), sessionCookieOptions());
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=server', request.url), { status: 303 });
  }
}
