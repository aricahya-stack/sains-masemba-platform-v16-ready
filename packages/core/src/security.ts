import crypto from 'crypto';
import { prisma } from '@sh/db';

export const MIN_PASSWORD_LENGTH = 12;

export function validatePassword(password: string, minimumLength = MIN_PASSWORD_LENGTH) {
  const value = String(password || '');
  if (value.length < minimumLength) return `Password minimal ${minimumLength} karakter.`;
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Password harus memuat huruf besar, huruf kecil, angka, dan simbol.';
  }
  return null;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}

const LOGIN_IDLE_RESET_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

function rateKey(identity: string) {
  return crypto.createHash('sha256').update(identity).digest('hex');
}

export async function checkLoginRateLimit(identity: string) {
  const now = new Date();
  const key = rateKey(identity);
  const current = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!current) return { allowed: true, retryAfterSeconds: 0 };

  if (current.blockedUntil && current.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000)),
    };
  }

  if (now.getTime() - current.updatedAt.getTime() >= LOGIN_IDLE_RESET_MS || current.blockedUntil) {
    await prisma.loginThrottle.delete({ where: { key } }).catch(() => undefined);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function registerLoginFailure(identity: string) {
  const now = new Date();
  const key = rateKey(identity);
  const current = await prisma.loginThrottle.findUnique({ where: { key } });
  const stale = !current || now.getTime() - current.updatedAt.getTime() >= LOGIN_IDLE_RESET_MS || Boolean(current.blockedUntil);
  const failures = stale ? 1 : current.failures + 1;
  const blockedUntil = failures >= LOGIN_MAX_FAILURES ? new Date(now.getTime() + LOGIN_BLOCK_MS) : null;

  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, failures, blockedUntil },
    update: { failures, blockedUntil },
  });

  return blockedUntil
    ? { allowed: false, retryAfterSeconds: Math.ceil(LOGIN_BLOCK_MS / 1000) }
    : { allowed: true, retryAfterSeconds: 0 };
}

export async function clearLoginRateLimit(identity: string) {
  await prisma.loginThrottle.delete({ where: { key: rateKey(identity) } }).catch(() => undefined);
}

export function truncateLogValue(value: unknown, maxLength = 300) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, maxLength);
}
