import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

function parseEnvFile(raw: string) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, valueRaw] = match;
    if (process.env[key] !== undefined) continue;
    let value = valueRaw.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, '\n');
  }
}

function ensureWorkspaceEnvLoaded() {
  if (process.env.__SH_ENV_LOADED === '1') return;
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '../.env'),
    path.resolve(cwd, '../../.env'),
    path.resolve(cwd, '../../../.env'),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      parseEnvFile(fs.readFileSync(filePath, 'utf8'));
      process.env.__SH_ENV_LOADED = '1';
      break;
    } catch {
      // ignore and try the next candidate
    }
  }
}

ensureWorkspaceEnvLoaded();

declare global {
  // eslint-disable-next-line no-var
  var __shPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__shPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__shPrisma = prisma;
}

export * from '@prisma/client';
