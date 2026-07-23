import { NextResponse } from 'next/server';
import {
  authenticateByRole,
  checkLoginRateLimit,
  clearLoginRateLimit,
  encodeSession,
  getClientIp,
  registerLoginFailure,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@sh/core';
import { appMeta } from '../../../lib/app';

function redirectWithError(request: Request, code: string, retryAfterSeconds = 0) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.url), { status: 303 });
  response.headers.set('Cache-Control', 'no-store');
  if (retryAfterSeconds > 0) response.headers.set('Retry-After', String(retryAfterSeconds));
  return response;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase().slice(0, 254);
  const password = String(formData.get('password') || '').slice(0, 512);
  const clientIp = getClientIp(request);
  const ipIdentity = `ip:${appMeta.role}:${clientIp}`;
  const accountIdentity = `account:${appMeta.role}:${email}`;

  try {
    const ipLimit = await checkLoginRateLimit(ipIdentity);
    if (!ipLimit.allowed) return redirectWithError(request, 'rate', ipLimit.retryAfterSeconds);
    const accountLimit = await checkLoginRateLimit(accountIdentity);
    if (!accountLimit.allowed) return redirectWithError(request, 'rate', accountLimit.retryAfterSeconds);

    const user = await authenticateByRole(appMeta.role, email, password);
    if (!user) {
      const [ipFailure, accountFailure] = await Promise.all([
        registerLoginFailure(ipIdentity),
        registerLoginFailure(accountIdentity),
      ]);
      const blocked = !ipFailure.allowed ? ipFailure : accountFailure;
      return redirectWithError(request, blocked.allowed ? '1' : 'rate', blocked.retryAfterSeconds);
    }

    await Promise.all([clearLoginRateLimit(ipIdentity), clearLoginRateLimit(accountIdentity)]);
    const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
    response.cookies.set(SESSION_COOKIE_NAME, encodeSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      authVersion: user.authVersion,
    }), sessionCookieOptions());
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error(`[${appMeta.role}_LOGIN_ERROR]`, error);
    return redirectWithError(request, 'server');
  }
}
