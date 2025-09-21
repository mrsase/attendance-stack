import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { sha256, COOKIE_NAME } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST() {
  const store = await cookies(); // read-only
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.delete({ where: { tokenHash: sha256(token) } }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
  return res;
}
