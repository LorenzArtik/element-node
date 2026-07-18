import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings';
import { ACCESS_COOKIE, accessToken } from '@/lib/site-access';

export const dynamic = 'force-dynamic';

/** POST { password } — sblocca il sito protetto (cookie 7 giorni). */
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const site = await getSiteSettings();
  const access = (site.integrations as { siteAccess?: { mode: string; password: string } }).siteAccess;
  if (!access || access.mode !== 'password' || !access.password) {
    return NextResponse.json({ ok: false, error: 'not_protected' }, { status: 400 });
  }
  if ((body.password || '') !== access.password) {
    return NextResponse.json({ ok: false, error: 'wrong_password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, accessToken(access.password), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600,
  });
  return res;
}
