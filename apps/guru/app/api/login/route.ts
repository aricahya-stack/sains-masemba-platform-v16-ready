import { NextResponse } from 'next/server';
import { authenticateByRole, encodeSession } from '@sh/core';
import { appMeta } from '../../../lib/app';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const user = await authenticateByRole(appMeta.role, email, password);
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=1', request.url));
    }
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('sh_session', encodeSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=server', request.url));
  }
}
