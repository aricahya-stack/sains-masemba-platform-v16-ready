import { NextRequest, NextResponse } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_API_BODY_BYTES = 15 * 1024 * 1024;

export function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 });
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site request ditolak.' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origin request tidak valid.' }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === 'production' && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return NextResponse.json({ error: 'Origin request wajib tersedia.' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
