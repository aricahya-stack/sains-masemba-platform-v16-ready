import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, UserRole } from '@sh/db';

const COOKIE_NAME = 'sh_session';

export type SessionPayload = {
  userId: string;
  role: UserRole;
  email: string;
  fullName: string;
};

function secret() {
  return process.env.AUTH_SECRET || 'dev-secret-sh';
}

function sign(data: string) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

export function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeSession(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionPayload() {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      parentChildren: { where: { isActive: true } },
      childParents: { where: { isActive: true } },
    },
  });
  if (!user || user.status !== 'ACTIVE') return null;
  return user;
}

export async function requireRole(roles: UserRole | UserRole[]) {
  const user = await getCurrentUser();
  const roleList = Array.isArray(roles) ? roles : [roles];
  if (!user || !roleList.includes(user.role)) {
    redirect('/login');
  }
  return user;
}

export async function createSessionForUser(user: { id: string; role: UserRole; email: string; fullName: string }) {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession({
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
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function authenticateByRole(role: UserRole, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== role || user.status !== 'ACTIVE' || !user.passwordHash) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
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
  return bcrypt.hash(password, 10);
}
