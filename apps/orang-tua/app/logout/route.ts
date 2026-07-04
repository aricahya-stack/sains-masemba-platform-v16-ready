import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from '@sh/core';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}
