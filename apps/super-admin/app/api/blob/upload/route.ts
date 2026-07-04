import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 });
    const blob = await put(file.name, file, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: 'Upload blob gagal. Pastikan BLOB_READ_WRITE_TOKEN tersedia.' }, { status: 500 });
  }
}
