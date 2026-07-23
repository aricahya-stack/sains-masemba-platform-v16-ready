import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { UserRole } from '@sh/db';
import { getCurrentUser } from '@sh/core';

export const runtime = 'nodejs';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { extension: string; matches: (bytes: Uint8Array) => boolean }> = {
  'image/png': { extension: 'png', matches: (b) => b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) },
  'image/jpeg': { extension: 'jpg', matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/gif': { extension: 'gif', matches: (b) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...b.slice(0, 6))) },
  'image/webp': { extension: 'webp', matches: (b) => b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' },
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.GURU)) {
    return NextResponse.json({ error: 'Upload hanya tersedia untuk Guru dan Super Admin.' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Ukuran file harus lebih dari 0 dan maksimal 5 MB.' }, { status: 413 });
    }

    const type = TYPES[file.type.toLowerCase()];
    if (!type) return NextResponse.json({ error: 'Hanya PNG, JPG, GIF, dan WEBP yang diizinkan.' }, { status: 415 });
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!type.matches(bytes)) return NextResponse.json({ error: 'Isi file tidak cocok dengan tipe gambar.' }, { status: 415 });

    const pathname = `uploads/${user.role.toLowerCase()}/${crypto.randomUUID()}.${type.extension}`;
    const blob = await put(pathname, file, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('[BLOB_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Upload gagal diproses.' }, { status: 500 });
  }
}
