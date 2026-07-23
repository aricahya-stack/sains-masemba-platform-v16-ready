import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Fitur upload tidak tersedia pada portal ini.' }, { status: 403 });
}
