import { prisma } from '@repo/db';
import crypto from 'node:crypto';

export const COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ?? 'attendance_session';
const SESSION_TTL_DAYS = parseInt(
  process.env.SESSION_TTL_DAYS ?? '30',
  10
);

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Create DB session. Returns { token, expiresAt }.
 * The API route must attach the cookie to its NextResponse.
 */
export async function issueSession(userId: string, req?: Request) {
  const token = base64url(crypto.randomBytes(32));
  const tokenHash = sha256(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const ip =
    req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req?.headers.get('x-real-ip') ??
    undefined;
  const ua = req?.headers.get('user-agent') ?? undefined;

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ip, userAgent: ua },
  });

  return { token, expiresAt };
}

/**
 * Returns the current user (with roles & department) or null.
 * Compatible with Next 15 where cookies() is async.
 */
export async function getCurrentUser() {
  const { cookies } = await import('next/headers');
  const store = await cookies(); // Promise<ReadonlyRequestCookies> in Next 15
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = sha256(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { roles: true, department: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    }
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error('unauthorized');
    // (optional) attach a status so your routes can branch on it
    (err as any).status = 401;
    throw err;
  }
  return user;
}