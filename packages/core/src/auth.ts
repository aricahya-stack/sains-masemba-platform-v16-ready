import crypto from 'crypto';
import { cache } from 'react';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, UserRole } from '@sh/db';

export const SESSION_COOKIE_NAME = 'sh_session';
const SESSION_MAX_AGE = 60 * 60 * 12;
const DUMMY_PASSWORD_HASH = '$2b$12$t8OIXC13gYzwKVoMGlzz6uhsKUXq3E04buLSg7hJuuwYIUaWrOtRy';

export type SessionPayload = {
  userId: string;
  role: UserRole;
  email: string;
  fullName: string;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
  authVersion: number;
};

type SessionInput = Omit<SessionPayload, 'issuedAt' | 'expiresAt' | 'sessionId'> & Partial<Pick<SessionPayload, 'issuedAt' | 'expiresAt' | 'sessionId'>>;

function secret() {
  const value = process.env.AUTH_SECRET?.trim();
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET wajib tersedia dan minimal 32 karakter pada environment production.');
  }
  return 'development-only-secret-change-before-production-2026';
}

function sign(data: string) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

function safeSignatureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    priority: 'high' as const,
  };
}

export function clearSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}

export function encodeSession(input: SessionInput) {
  const issuedAt = input.issuedAt || Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: input.userId,
    role: input.role,
    email: input.email,
    fullName: input.fullName,
    issuedAt,
    expiresAt: input.expiresAt || issuedAt + SESSION_MAX_AGE,
    sessionId: input.sessionId || crypto.randomUUID(),
    authVersion: input.authVersion,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeSession(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature || !safeSignatureEqual(sign(body), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      !payload.userId
      || !payload.role
      || !payload.email
      || !payload.fullName
      || !payload.issuedAt
      || !payload.expiresAt
      || !payload.sessionId
      || typeof payload.authVersion !== 'number'
      || payload.expiresAt <= now
      || payload.issuedAt > now + 60
      || payload.expiresAt - payload.issuedAt > SESSION_MAX_AGE + 60
    ) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionPayload() {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE_NAME)?.value);
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || user.status !== 'ACTIVE' || user.role !== session.role || user.email !== session.email || user.authVersion !== session.authVersion) return null;
  return user;
});

export async function requireRole(roles: UserRole | UserRole[]) {
  const user = await getCurrentUser();
  const roleList = Array.isArray(roles) ? roles : [roles];
  if (!user || !roleList.includes(user.role)) {
    redirect('/login');
  }
  return user;
}

export async function createSessionForUser(user: { id: string; role: UserRole; email: string; fullName: string; authVersion: number }) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, encodeSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    authVersion: user.authVersion,
  }), sessionCookieOptions());
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());
}

export async function authenticateByRole(role: UserRole, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordHash = user?.passwordHash || DUMMY_PASSWORD_HASH;
  const ok = await bcrypt.compare(password, passwordHash);
  if (!ok || !user || user.role !== role || user.status !== 'ACTIVE' || !user.passwordHash) {
    return null;
  }
  return user;
}

export function roleLabel(role: UserRole) {
  const map: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    GURU: 'Guru',
    SISWA: 'Siswa',
    ORANG_TUA: 'Orang Tua',
  };
  return map[role];
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
