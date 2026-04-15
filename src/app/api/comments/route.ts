import { NextResponse } from 'next/server';

const DATA_API = 'http://127.0.0.1:3010';
const TIMEOUT_MS = 2000;

async function safeFetch(url: string, options?: RequestInit) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  const res = await safeFetch(`${DATA_API}/api/comments${qs ? '?' + qs : ''}`);
  if (!res || !res.ok) {
    return NextResponse.json({ error: 'Service unavailable', comments: [] });
  }
  try { return NextResponse.json(await res.json()); } catch { return NextResponse.json({ comments: [] }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await safeFetch(`${DATA_API}/api/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res || !res.ok) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const res = await safeFetch(`${DATA_API}/api/comments${qs ? '?' + qs : ''}`, { method: 'DELETE' });
  if (!res || !res.ok) return NextResponse.json({ deleted: 0 });
  try { return NextResponse.json(await res.json()); } catch { return NextResponse.json({ deleted: 0 }); }
}
